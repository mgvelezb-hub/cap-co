// Registro de eventos del sistema y alertas. Nunca lanza: una falla aquí no debe tumbar el
// chat ni el cron. Los críticos se avisan por correo, máximo uno por tipo cada 6 h; el
// silencio es atómico (tabla alerta_silencio), así que varias fallas simultáneas mandan un
// solo correo. Si el correo falla, se reintenta a los 15 minutos.

import { query, dbDisponible } from "../db/client.js";
import { enviarCorreo } from "./notificar.js";

const SILENCIO_HORAS = 6;
const REINTENTO_MIN = 15;
const UMBRAL_ERRORES_CHAT = 5; // en 15 minutos → el chat se considera caído
const RETENCION_DIAS = 90;

// Los que dejan al chat sin servicio: /api/salud responde 503 con ellos.
export const TIPOS_CAIDA = ["saldo_anthropic", "llave_anthropic", "chat_caido"];

const TITULOS = {
  saldo_anthropic: "El chat se quedó sin saldo de Anthropic",
  llave_anthropic: "La llave de Anthropic no funciona",
  limite_anthropic: "Anthropic está limitando las peticiones",
  tope_diario: "Se alcanzó el tope diario de uso del chat",
  tope_citas: "Se alcanzó el tope de reservas por hora",
  chat_caido: "El chat está fallando",
  error_chat: "Error en el chat",
  precios_fallo: "No se pudo tomar el precio de los metales",
  precios_viejos: "El precio de los metales está desactualizado",
};

const QUE_HACER = {
  saldo_anthropic: "Recarga saldo en console.anthropic.com → Settings → Billing. El chat vuelve solo, sin redeploy.",
  llave_anthropic: "Revisa ANTHROPIC_API_KEY en Vercel (proyecto cap-co) y que la llave siga activa en console.anthropic.com.",
  limite_anthropic: "Anthropic está rechazando peticiones por volumen. Revisa los límites de la cuenta en console.anthropic.com.",
  tope_diario: "Es el freno de gasto propio del sitio (variable CHAT_TOPE_DIARIO en Vercel). Si es tráfico real de una campaña, súbelo y vuelve a desplegar; si es abuso, déjalo así: se reinicia a medianoche.",
  tope_citas: "Más de CITA_TOPE_HORA reservas en una hora en todo el sitio: probable abuso de la agenda. Revisa la agenda del panel y cancela las que no tengan sentido.",
  chat_caido: "Revisa los logs de Vercel (vercel logs) del proyecto cap-co.",
  precios_fallo: "Revisa los logs de /api/cron/precios. Si la fuente cambió, hay que ajustar lib/precios/fuentes.js.",
  precios_viejos: "El último precio tiene más de 96 horas. Revisa que los crons de Vercel sigan registrados (vercel crons ls).",
};

export async function registrarEvento(tipo, nivel, detalle = "") {
  if (!dbDisponible()) {
    console.error(`[evento] ${nivel} ${tipo}: ${detalle}`);
    return;
  }
  try {
    let tipoFinal = tipo;
    let nivelFinal = nivel;
    if (tipo === "error_chat") {
      const r = await query(
        `SELECT count(*)::int AS n FROM evento_sistema
          WHERE tipo IN ('error_chat', 'chat_caido') AND creado_at > now() - interval '15 minutes'`,
      );
      if (r.rows[0].n + 1 >= UMBRAL_ERRORES_CHAT) {
        tipoFinal = "chat_caido";
        nivelFinal = "critico";
      }
    }
    await query(`INSERT INTO evento_sistema (tipo, nivel, detalle) VALUES ($1, $2, $3)`, [
      tipoFinal,
      nivelFinal,
      String(detalle).slice(0, 500),
    ]);
    if (nivelFinal === "critico") await avisar(tipoFinal, detalle);
  } catch (err) {
    console.error("[evento] no se pudo registrar:", err.message);
  }
}

async function avisar(tipo, detalle) {
  // Solo una petición gana la fila; las demás salen sin enviar.
  const gano = await query(
    `INSERT INTO alerta_silencio (tipo, ultimo_at) VALUES ($1, now())
     ON CONFLICT (tipo) DO UPDATE SET ultimo_at = now()
       WHERE alerta_silencio.ultimo_at < now() - ($2 || ' hours')::interval
     RETURNING tipo`,
    [tipo, String(SILENCIO_HORAS)],
  );
  if (gano.rowCount === 0) return;
  const titulo = TITULOS[tipo] || tipo;
  const r = await enviarCorreo(
    `[CAP & Co.] ${titulo}`,
    `${titulo}.\n\nDetalle: ${detalle || "—"}\n\nQué hacer: ${QUE_HACER[tipo] || "Revisa el panel /admin/leads."}\n\nPanel: https://casa-ap.com/admin/leads`,
  );
  if (r.enviado || r.motivo === "sin_configurar") {
    await query(`UPDATE evento_sistema SET notificado_at = now() WHERE id = (
      SELECT id FROM evento_sistema WHERE tipo = $1 ORDER BY creado_at DESC LIMIT 1)`, [tipo]);
    if (!r.enviado) console.warn(`[evento] alerta ${tipo} sin correo configurado`);
    return;
  }
  // El correo falló: que el siguiente evento de este tipo pueda reintentar en 15 minutos.
  await query(
    `UPDATE alerta_silencio SET ultimo_at = now() - ($2 || ' hours')::interval + ($3 || ' minutes')::interval WHERE tipo = $1`,
    [tipo, String(SILENCIO_HORAS), String(REINTENTO_MIN)],
  );
  console.error(`[evento] no se envió la alerta ${tipo}: ${r.motivo}`);
}

/** Eventos recientes para el panel. */
export async function eventosRecientes({ horas = 24, limite = 20 } = {}) {
  if (!dbDisponible()) return [];
  const { rows } = await query(
    `SELECT id, creado_at, tipo, nivel, detalle FROM evento_sistema
      WHERE creado_at > now() - ($1 || ' hours')::interval
      ORDER BY creado_at DESC LIMIT $2`,
    [String(horas), limite],
  );
  return rows;
}

/** Borra eventos de más de 90 días (lo llama el cron de la mañana). */
export async function limpiarEventos() {
  if (!dbDisponible()) return 0;
  const r = await query(`DELETE FROM evento_sistema WHERE creado_at < now() - ($1 || ' days')::interval`, [
    String(RETENCION_DIAS),
  ]);
  return r.rowCount;
}

/** Clasifica un error del SDK de Anthropic en un tipo de evento. */
export function tipoDeErrorAnthropic(err) {
  const msg = String(err?.message || "");
  if (/credit balance/i.test(msg)) return { tipo: "saldo_anthropic", nivel: "critico" };
  if (err?.status === 401 || err?.status === 403) return { tipo: "llave_anthropic", nivel: "critico" };
  if (err?.status === 429) return { tipo: "limite_anthropic", nivel: "aviso" };
  return { tipo: "error_chat", nivel: "aviso" };
}
