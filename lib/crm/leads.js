// Servicio de leads del CRM. La pantalla, las server actions y el servidor MCP usan estas
// mismas funciones: una sola lógica para las tres superficies.

import { query, conTransaccion } from "../db/client.js";
import { actualizarLead, ETAPAS } from "../leads/repo.js";
import { registrarEventoLead, historial } from "./eventos.js";
import { cerrarTareasDeLead, tareasAbiertas } from "./tareas.js";
import { diasSinContestar, motivoSinSeguimiento } from "./seguimiento-plan.js";
import { CLASES } from "./reglas.js";
import { linkWhatsApp, WHATSAPP } from "./plantillas.js";

export const CHECKLIST_TRASPASO = [
  ["boleta_original", "Boleta original revisada"],
  ["identificacion", "Identificación coincide con la boleta"],
  ["comision_aceptada", "Ahorro final explicado y aceptado (sin costo para la persona)"],
  ["deuda_liquidada", "Deuda en la casa actual liquidada por la casa de la red"],
  ["pieza_revaluada", "Pieza valuada en la casa nueva"],
  ["boleta_nueva", "Boleta nueva firmada"],
  ["comision_cobrada", "Tarifa cobrada a la casa de la red"],
];

const COLUMNAS = `l.codigo, l.perfil, l.resumen, l.probabilidad, l.institucion_origen, l.tasa_actual, l.tasa_oferta, l.ahorro,
  l.created_at, l.consent_at, l.nombre, l.telefono, l.email, l.etapa, l.notas, l.casa_destino, l.comision_mxn, l.asesor, l.motivo_descarte,
  l.clasificacion, l.clasificacion_fuente, l.clasificacion_motivo, l.revision_pendiente, l.sugerencia, l.propension_taller,
  l.perfil_ia, l.ultimo_contacto_at, l.ultima_respuesta_at, l.esperando_respuesta_desde, l.seguimiento_paso,
  l.proximo_seguimiento_at, l.no_contactar_at, l.traspaso, l.whatsapp_click_at, l.cerrado_at, l.cobrado_at,
  l.asesor_usuario, l.cobro_metodo, l.clasificacion_at, l.email_confirmado_at,
  l.fuente->>'utm_source' AS utm_source, l.fuente->>'utm_campaign' AS utm_campaign`;

// Desde cuándo espera la persona (mismo criterio que diasSinContestar): null si está al día.
const SIN_CONTESTAR_DESDE = `CASE WHEN l.consent_at IS NULL OR l.no_contactar_at IS NOT NULL OR l.etapa IN ('descartado','comision_cobrada') THEN NULL
  WHEN l.ultimo_contacto_at IS NULL THEN l.consent_at ELSE l.esperando_respuesta_desde END`;

function enriquecer(l, ahora = new Date()) {
  return { ...l, sinContestar: diasSinContestar(l, ahora), seguimiento: motivoSinSeguimiento(l) ?? "activo" };
}

/**
 * Leads con filtros. `sinContestarMin` filtra por días sin contestar (sin atender o esperando).
 */
export async function listarLeads({
  etapa = null,
  clasificacion = null,
  revision = null,
  texto = "",
  campana = null,
  sinContestarMin = null,
  conDatos = null,
  asesor = null,
  soloSinAtender = false,
  limite = 200,
} = {}) {
  const { rows } = await query(
    `SELECT ${COLUMNAS}, c.inicio AS cita_inicio, c.estado AS cita_estado, c.tipo AS cita_tipo,
            (SELECT count(*)::int FROM crm_tarea t WHERE t.lead_codigo = l.codigo AND t.hecha_at IS NULL) AS tareas_abiertas
       FROM lead l
       LEFT JOIN LATERAL (SELECT inicio, estado, tipo FROM cita WHERE lead_codigo = l.codigo AND estado NOT IN ('cancelada','expirada')
                           ORDER BY creado_at DESC LIMIT 1) c ON true
      WHERE ($1::text IS NULL OR l.etapa = $1)
        AND ($2::text IS NULL OR l.clasificacion = $2)
        AND ($3::boolean IS NULL OR l.revision_pendiente = $3)
        AND ($4 = '' OR l.codigo ILIKE '%' || $4 || '%' OR l.nombre ILIKE '%' || $4 || '%' OR l.telefono LIKE '%' || $4 || '%')
        AND ($5::text IS NULL OR lower(coalesce(nullif(l.fuente->>'utm_campaign',''), nullif(l.fuente->>'utm_source',''), 'directo')) = lower($5))
        AND ($6::boolean IS NULL OR (l.consent_at IS NOT NULL) = $6)
        AND ($8::text IS NULL OR l.asesor_usuario = $8)
        AND ($9::int IS NULL OR (${SIN_CONTESTAR_DESDE}) <= now() - ($9 || ' days')::interval)
        AND (NOT $10::boolean OR (l.consent_at IS NOT NULL AND l.ultimo_contacto_at IS NULL AND l.etapa = 'cita_solicitada' AND l.no_contactar_at IS NULL))
      ORDER BY ${sinContestarMin !== null ? `(${SIN_CONTESTAR_DESDE}) ASC` : "l.created_at DESC"}
      LIMIT $7`,
    [etapa, clasificacion, revision, (texto || "").trim().slice(0, 60), campana, conDatos, Math.min(limite, 500), asesor, sinContestarMin, soloSinAtender],
  );
  const ahora = new Date();
  return rows.map((l) => enriquecer(l, ahora));
}

export async function fichaLead(codigo) {
  const { rows } = await query(`SELECT ${COLUMNAS} FROM lead l WHERE l.codigo = $1`, [codigo]);
  if (!rows[0]) return null;
  const [eventos, tareas, citas, conv] = await Promise.all([
    historial(codigo),
    tareasAbiertas({ codigo }),
    query(`SELECT id, inicio, estado, lugar, tipo, franja, apartada_at FROM cita WHERE lead_codigo = $1 ORDER BY creado_at DESC`, [codigo]),
    query(
      `SELECT c.turnos, c.fotos, c.cotizo, c.avanzo, c.fuera_de_tema, c.costo_usd, c.creado_at, c.perfil, c.resumen AS resumen_chat
         FROM conversacion c JOIN lead l ON l.conversacion_id = c.id WHERE l.codigo = $1`,
      [codigo],
    ),
  ]);
  return { lead: enriquecer(rows[0]), eventos, tareas, citas: citas.rows, conversacion: conv.rows[0] || null };
}

// Acciones del asesor sobre el contacto.
export const ACCIONES_CONTACTO = ["whatsapp_enviado", "llamada_hecha", "llamada_sin_respuesta", "respondio", "nota"];

export async function registrarAccion(codigo, { tipo, nota = "", usuario, plantilla = null, tareaId = null }) {
  if (!ACCIONES_CONTACTO.includes(tipo)) return { ok: false, motivo: "accion_invalida" };
  if (tipo === "nota" && !nota.trim()) return { ok: false, motivo: "nota_vacia" };
  const existe = await query(`SELECT 1 FROM lead WHERE codigo = $1`, [codigo]);
  if (existe.rowCount === 0) return { ok: false, motivo: "no_existe" };
  const canal = { whatsapp_enviado: "whatsapp", llamada_hecha: "llamada", llamada_sin_respuesta: "llamada", respondio: null, nota: null }[tipo];
  await conTransaccion(async (c) => {
    await registrarEventoLead(codigo, tipo, { canal, usuario, detalle: { nota: nota.slice(0, 1000), plantilla } }, c);
    if (tareaId) await c.query(`UPDATE crm_tarea SET hecha_at = now(), hecha_por = $3 WHERE id = $1 AND lead_codigo = $2 AND hecha_at IS NULL`, [tareaId, codigo, usuario]);
    else if (tipo === "whatsapp_enviado") await cerrarTareasDeLead(codigo, usuario, ["whatsapp"], c, plantilla);
    else if (tipo === "llamada_hecha" || tipo === "llamada_sin_respuesta") await cerrarTareasDeLead(codigo, usuario, ["llamar"], c);
    if (tipo === "llamada_hecha" || tipo === "respondio") {
      // Ya hay conversación con la persona: el seguimiento automático se detiene.
      await c.query(`UPDATE lead SET proximo_seguimiento_at = NULL WHERE codigo = $1`, [codigo]);
    }
  });
  return { ok: true };
}

/** Cambios de etapa, comisión, notas, asesor… con historial. Descartar cierra tareas y seguimiento. */
export async function actualizarCaso(codigo, cambios, usuario, { rol = "asesor" } = {}) {
  const antes = await query(`SELECT etapa FROM lead WHERE codigo = $1`, [codigo]);
  if (antes.rowCount === 0) return { ok: false, motivo: "no_existe" };
  const etapaAntes = antes.rows[0].etapa;
  // El cobro entra solo con registrarCobro (monto, fecha, método); sacar un caso de "cobrado"
  // borraría el dinero de los reportes, así que solo lo hace el dueño.
  if (cambios.etapa === "comision_cobrada" && etapaAntes !== "comision_cobrada") return { ok: false, motivo: "usa_registrar_cobro" };
  if (etapaAntes === "comision_cobrada" && cambios.etapa && cambios.etapa !== "comision_cobrada" && rol !== "dueno") return { ok: false, motivo: "solo_dueno" };
  const r = await actualizarLead(codigo, cambios);
  if (!r.ok) return r;
  if (cambios.etapa && cambios.etapa !== antes.rows[0].etapa) {
    await registrarEventoLead(codigo, "etapa", { usuario, detalle: { de: antes.rows[0].etapa, a: cambios.etapa, motivo: cambios.motivo_descarte ?? null } });
    if (cambios.etapa === "descartado") {
      await cerrarTareasDeLead(codigo, usuario);
      await query(`UPDATE lead SET proximo_seguimiento_at = NULL WHERE codigo = $1`, [codigo]);
    } else if (cambios.etapa !== "cita_solicitada") {
      // Ya hay trato con la persona: los contactos pendientes de captación sobran.
      await cerrarTareasDeLead(codigo, usuario, ["whatsapp", "llamar", "confirmar_cita"]);
    }
  }
  return r;
}

/** Marca o desmarca un paso del checklist del cambio. */
export async function marcarTraspaso(codigo, { paso, hecho, usuario }) {
  if (!CHECKLIST_TRASPASO.some(([k]) => k === paso)) return { ok: false, motivo: "paso_invalido" };
  // El cobro lleva monto, fecha y método: se registra con registrarCobro.
  if (paso === "comision_cobrada") return { ok: false, motivo: "usa_registrar_cobro" };
  const valor = hecho ? { hecho: true, por: usuario, at: new Date().toISOString() } : null;
  const r = await query(
    `UPDATE lead SET traspaso = CASE WHEN $3::jsonb IS NULL THEN traspaso - $2 ELSE jsonb_set(traspaso, ARRAY[$2], $3::jsonb) END,
            actualizado_at = now()
      WHERE codigo = $1 RETURNING traspaso`,
    [codigo, paso, valor ? JSON.stringify(valor) : null],
  );
  if (r.rowCount === 0) return { ok: false, motivo: "no_existe" };
  await registrarEventoLead(codigo, "traspaso", { usuario, detalle: { paso, hecho: Boolean(hecho) } });
  // Boleta nueva firmada = cambio concretado (si no había avanzado ya).
  if (paso === "boleta_nueva" && hecho) {
    const e = await query(
      `UPDATE lead SET etapa = 'switcheo_concretado', cerrado_at = COALESCE(cerrado_at, now()), contactado_at = COALESCE(contactado_at, now())
        WHERE codigo = $1 AND etapa IN ('cita_solicitada', 'cita_confirmada', 'atendido') RETURNING codigo`,
      [codigo],
    );
    if (e.rowCount) await registrarEventoLead(codigo, "etapa", { usuario, detalle: { a: "switcheo_concretado", por: "checklist" } });
  }
  return { ok: true, traspaso: r.rows[0].traspaso };
}

/** WhatsApp listo para mandar desde el teléfono del asesor. */
export async function prepararWhatsApp(codigo, plantilla, asesor, extra) {
  if (!WHATSAPP[plantilla]) return { ok: false, motivo: "plantilla_invalida" };
  const { rows } = await query(`SELECT codigo, nombre, telefono, no_contactar_at FROM lead WHERE codigo = $1`, [codigo]);
  if (!rows[0]) return { ok: false, motivo: "no_existe" };
  if (!rows[0].telefono) return { ok: false, motivo: "sin_telefono" };
  if (rows[0].no_contactar_at) return { ok: false, motivo: "pidio_no_contactar" };
  return { ok: true, ...linkWhatsApp(rows[0], plantilla, asesor, extra) };
}

/** Números de la pantalla de inicio. */
export async function resumenHoy() {
  const { rows } = await query(
    `SELECT
       count(*) FILTER (WHERE created_at > now() - interval '1 day')::int AS nuevos_24h,
       count(*) FILTER (WHERE consent_at IS NOT NULL AND ultimo_contacto_at IS NULL AND etapa = 'cita_solicitada' AND no_contactar_at IS NULL)::int AS sin_atender,
       count(*) FILTER (WHERE (${SIN_CONTESTAR_DESDE}) <= now() - interval '3 days')::int AS sin_respuesta_3d,
       count(*) FILTER (WHERE revision_pendiente)::int AS en_revision,
       count(*) FILTER (WHERE clasificacion = 'aplica_auto' AND etapa = 'cita_solicitada')::int AS aplica_por_agendar,
       count(*) FILTER (WHERE clasificacion = 'taller' OR propension_taller >= 70)::int AS taller
     FROM lead l`,
  );
  const t = await query(`SELECT count(*)::int AS n FROM crm_tarea WHERE hecha_at IS NULL AND vence_at <= now()`);
  return { ...rows[0], tareas_vencidas: t.rows[0].n };
}

/**
 * Reparto por turnos: el lead va al asesor activo que recibe leads y lleva más tiempo sin que
 * le toque uno. Si ya tiene asesor, no cambia.
 */
export async function asignarPorTurno(codigo, db = { query }) {
  const actual = await db.query(`SELECT asesor_usuario FROM lead WHERE codigo = $1`, [codigo]);
  if (!actual.rows[0] || actual.rows[0].asesor_usuario) return actual.rows[0]?.asesor_usuario ?? null;
  const { rows } = await db.query(
    `UPDATE crm_usuario SET asignado_at = now()
      WHERE usuario = (SELECT usuario FROM crm_usuario WHERE activo AND recibe_leads
                        ORDER BY asignado_at NULLS FIRST, usuario LIMIT 1 FOR UPDATE SKIP LOCKED)
      RETURNING usuario`,
  );
  if (!rows[0]) return null;
  await db.query(`UPDATE lead SET asesor_usuario = $2 WHERE codigo = $1 AND asesor_usuario IS NULL`, [codigo, rows[0].usuario]);
  await registrarEventoLead(codigo, "asignado", { canal: "sistema", detalle: { a: rows[0].usuario, por: "turno" } }, db);
  return rows[0].usuario;
}

/** Cambia el asesor a cargo (a mano). */
export async function asignarAsesor(codigo, asesorUsuario, usuario) {
  if (asesorUsuario) {
    const u = await query(`SELECT 1 FROM crm_usuario WHERE usuario = $1 AND activo`, [asesorUsuario]);
    if (u.rowCount === 0) return { ok: false, motivo: "asesor_invalido" };
  }
  const r = await query(`UPDATE lead SET asesor_usuario = $2, actualizado_at = now() WHERE codigo = $1`, [codigo, asesorUsuario || null]);
  if (r.rowCount === 0) return { ok: false, motivo: "no_existe" };
  await registrarEventoLead(codigo, "asignado", { usuario, detalle: { a: asesorUsuario || null, por: "manual" } });
  return { ok: true };
}

/** La persona pidió que no la contactemos (por teléfono, WhatsApp o en persona). */
export async function marcarNoContactar(codigo, { usuario, nota = "" }) {
  const r = await query(
    `UPDATE lead SET no_contactar_at = COALESCE(no_contactar_at, now()), proximo_seguimiento_at = NULL, actualizado_at = now()
      WHERE codigo = $1 RETURNING codigo`,
    [codigo],
  );
  if (r.rowCount === 0) return { ok: false, motivo: "no_existe" };
  await cerrarTareasDeLead(codigo, usuario, ["whatsapp", "llamar"]);
  await registrarEventoLead(codigo, "no_contactar", { usuario, detalle: { nota: String(nota).slice(0, 300) } });
  return { ok: true };
}

/**
 * Derecho de cancelación (ARCO): borra nombre, teléfono, correo y notas del lead y de su
 * historial; queda el registro anónimo, con lo fiscal del cobro (monto, fecha y método), si lo hubo.
 */
export async function anonimizarLead(codigo, { usuario }) {
  const r = await conTransaccion(async (c) => {
    const u = await c.query(
      `UPDATE lead SET nombre = NULL, telefono = NULL, email = NULL, notas = NULL, baja_token = NULL,
              no_contactar_at = COALESCE(no_contactar_at, now()), proximo_seguimiento_at = NULL, actualizado_at = now()
        WHERE codigo = $1 RETURNING codigo`,
      [codigo],
    );
    if (u.rowCount === 0) return false;
    await c.query(`UPDATE lead_evento SET detalle = detalle - 'nota' WHERE lead_codigo = $1`, [codigo]);
    await c.query(`UPDATE crm_tarea SET hecha_at = now(), hecha_por = $2 WHERE lead_codigo = $1 AND hecha_at IS NULL`, [codigo, usuario]);
    await registrarEventoLead(codigo, "anonimizado", { usuario }, c);
    return true;
  });
  return r ? { ok: true } : { ok: false, motivo: "no_existe" };
}

export const METODOS_COBRO = ["efectivo", "transferencia", "tarjeta", "otro"];

/** Registra el cobro de la comisión: monto, fecha y método; mueve la etapa y el checklist. */
export async function registrarCobro(codigo, { monto, fecha = null, metodo, usuario }) {
  const m = Number(monto);
  if (!Number.isFinite(m) || m <= 0 || m > 10_000_000) return { ok: false, motivo: "monto_invalido" };
  if (!METODOS_COBRO.includes(metodo)) return { ok: false, motivo: "metodo_invalido" };
  const cuando = fecha ? new Date(`${fecha}T12:00:00-06:00`) : new Date();
  if (Number.isNaN(cuando.getTime()) || cuando > new Date(Date.now() + 86_400_000)) return { ok: false, motivo: "fecha_invalida" };
  const marca = { hecho: true, por: usuario, at: cuando.toISOString() };
  const r = await query(
    `UPDATE lead SET etapa = 'comision_cobrada', comision_mxn = $2, cobrado_at = $3, cobro_metodo = $4,
            cerrado_at = COALESCE(cerrado_at, $3), contactado_at = COALESCE(contactado_at, $3),
            traspaso = jsonb_set(traspaso, '{comision_cobrada}', $5::jsonb), proximo_seguimiento_at = NULL, actualizado_at = now()
      WHERE codigo = $1 RETURNING codigo`,
    [codigo, m, cuando, metodo, JSON.stringify(marca)],
  );
  if (r.rowCount === 0) return { ok: false, motivo: "no_existe" };
  await cerrarTareasDeLead(codigo, usuario);
  await registrarEventoLead(codigo, "cobro", { usuario, detalle: { monto: m, metodo, fecha: cuando.toISOString() } });
  return { ok: true };
}

/** Otros leads con el mismo teléfono (posibles duplicados). */
export async function duplicados(codigo) {
  const { rows } = await query(
    `SELECT o.codigo, o.etapa, o.created_at FROM lead l JOIN lead o ON o.telefono = l.telefono AND o.codigo <> l.codigo
      WHERE l.codigo = $1 AND l.telefono IS NOT NULL ORDER BY o.created_at DESC LIMIT 10`,
    [codigo],
  );
  return rows;
}

export { ETAPAS, CLASES };

export const CANALES_ALTA = { whatsapp: "WhatsApp", telefono: "Llamada", referido: "Recomendación", presencial: "En persona", otro: "Otro" };

/**
 * Alta manual de un lead que llegó fuera del chat (WhatsApp, llamada, recomendación). Solo con el
 * consentimiento de la persona al aviso de privacidad. Queda asignado a quien lo da de alta,
 * clasificado por reglas y con su historial; el seguimiento automático no aplica (ya hay trato).
 */
export async function crearLeadManual({ nombre, telefono, email = null, perfil, resumen = "", canal, consentimiento, usuario }) {
  if (consentimiento !== true) return { ok: false, motivo: "sin_consentimiento" };
  if (!CANALES_ALTA[canal]) return { ok: false, motivo: "canal_invalido" };
  const { validarContacto } = await import("../leads/validar.js");
  const v = validarContacto({ nombre, telefono, email, acepta: true });
  if (!v.ok) return { ok: false, motivo: "dato_invalido", error: v.error };
  const { crearLead } = await import("../leads/repo.js");
  const { AVISO_VERSION } = await import("../leads/validar.js");
  const { PERFIL_IDS } = await import("../chatbot/perfiles.js");
  const { codigo, persistido } = await crearLead({
    perfil: PERFIL_IDS.includes(perfil) ? perfil : "curioso",
    resumen: String(resumen).slice(0, 400),
    fuente: { utm_source: canal, utm_medium: "alta_manual" },
  });
  if (!persistido) return { ok: false, motivo: "sin_db" };
  await query(
    `UPDATE lead SET nombre = $2, telefono = $3, email = $4, consent_at = now(), consent_version = $5,
            asesor_usuario = $6, seguimiento_paso = 4, actualizado_at = now()
      WHERE codigo = $1`,
    [codigo, v.nombre, v.telefono, v.email, `${AVISO_VERSION}-alta-manual`, usuario],
  );
  await registrarEventoLead(codigo, "lead_creado", { canal, usuario, detalle: { alta: "manual" } });
  const { clasificarLead } = await import("./clasificacion.js");
  await clasificarLead(codigo, { usarIA: false, usuario });
  return { ok: true, codigo };
}
