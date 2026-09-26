// Registro de eventos del sistema y alertas. Nunca lanza: una falla aquí no debe tumbar el
// chat ni el cron. Los eventos críticos se avisan por correo, máximo uno por tipo cada 6 h.

import { query, dbDisponible } from "../db/client.js";
import { enviarCorreo } from "./notificar.js";

const SILENCIO_HORAS = 6;
const UMBRAL_ERRORES_CHAT = 5; // en 15 minutos → el chat se considera caído

const TITULOS = {
  saldo_anthropic: "El chat se quedó sin saldo de Anthropic",
  llave_anthropic: "La llave de Anthropic no funciona",
  limite_anthropic: "Anthropic está limitando las peticiones",
  chat_caido: "El chat está fallando",
  error_chat: "Error en el chat",
  precios_fallo: "No se pudo tomar el precio de los metales",
  precios_viejos: "El precio de los metales está desactualizado",
};

const QUE_HACER = {
  saldo_anthropic: "Recarga saldo en console.anthropic.com → Settings → Billing. El chat vuelve solo, sin redeploy.",
  llave_anthropic: "Revisa ANTHROPIC_API_KEY en Vercel (proyecto cap-co) y que la llave siga activa en console.anthropic.com.",
  limite_anthropic: "Hay mucho tráfico o un abuso. Revisa el panel y, si sigue, el límite de la cuenta en console.anthropic.com.",
  chat_caido: "Revisa los logs de Vercel (vercel logs) del proyecto cap-co.",
  precios_fallo: "Revisa los logs de /api/cron/precios. Si la fuente cambió, hay que ajustar lib/precios/fuentes.js.",
  precios_viejos: "El último precio tiene más de un día hábil. Revisa que los crons de Vercel sigan registrados (vercel crons ls).",
};

export async function registrarEvento(tipo, nivel, detalle = "") {
  if (!dbDisponible()) {
    console.error(`[evento] ${nivel} ${tipo}: ${detalle}`);
    return;
  }
  try {
    const { rows } = await query(
      `INSERT INTO evento_sistema (tipo, nivel, detalle) VALUES ($1, $2, $3) RETURNING id`,
      [tipo, nivel, String(detalle).slice(0, 500)],
    );
    let critico = nivel === "critico";
    let tipoAviso = tipo;
    if (tipo === "error_chat") {
      const r = await query(
        `SELECT count(*)::int AS n FROM evento_sistema
          WHERE tipo = 'error_chat' AND creado_at > now() - interval '15 minutes'`,
      );
      if (r.rows[0].n >= UMBRAL_ERRORES_CHAT) {
        critico = true;
        tipoAviso = "chat_caido";
      }
    }
    if (critico) await avisar(tipoAviso, detalle, rows[0].id);
  } catch (err) {
    console.error("[evento] no se pudo registrar:", err.message);
  }
}

async function avisar(tipo, detalle, idEvento) {
  const reciente = await query(
    `SELECT 1 FROM evento_sistema
      WHERE tipo = $1 AND notificado_at > now() - ($2 || ' hours')::interval LIMIT 1`,
    [tipo, String(SILENCIO_HORAS)],
  );
  if (reciente.rowCount > 0) return;
  const titulo = TITULOS[tipo] || tipo;
  const r = await enviarCorreo(
    `[CAP & Co.] ${titulo}`,
    `${titulo}.\n\nDetalle: ${detalle || "—"}\n\nQué hacer: ${QUE_HACER[tipo] || "Revisa el panel /admin/leads."}\n\nEstado en vivo: https://casa-ap.com/api/salud`,
  );
  // Se marca aunque el correo no esté configurado, para no reintentar en cada error.
  await query(`UPDATE evento_sistema SET notificado_at = now(), tipo = $2 WHERE id = $1`, [idEvento, tipo]);
  if (!r.enviado) console.warn(`[evento] alerta ${tipo} sin correo: ${r.motivo}`);
}

/** Eventos recientes para el panel y /api/salud. */
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

/** Clasifica un error del SDK de Anthropic en un tipo de evento. */
export function tipoDeErrorAnthropic(err) {
  const msg = String(err?.message || "");
  if (/credit balance/i.test(msg)) return { tipo: "saldo_anthropic", nivel: "critico" };
  if (err?.status === 401 || err?.status === 403) return { tipo: "llave_anthropic", nivel: "critico" };
  if (err?.status === 429) return { tipo: "limite_anthropic", nivel: "aviso" };
  return { tipo: "error_chat", nivel: "aviso" };
}
