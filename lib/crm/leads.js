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
  ["comision_aceptada", "Comisión y ahorro final explicados y aceptados"],
  ["deuda_liquidada", "Deuda en la casa actual liquidada"],
  ["pieza_revaluada", "Pieza valuada en la casa nueva"],
  ["boleta_nueva", "Boleta nueva firmada"],
  ["comision_cobrada", "Comisión cobrada"],
];

const COLUMNAS = `l.codigo, l.perfil, l.resumen, l.probabilidad, l.institucion_origen, l.tasa_actual, l.tasa_oferta, l.ahorro,
  l.created_at, l.consent_at, l.nombre, l.telefono, l.email, l.etapa, l.notas, l.casa_destino, l.comision_mxn, l.asesor, l.motivo_descarte,
  l.clasificacion, l.clasificacion_fuente, l.clasificacion_motivo, l.revision_pendiente, l.sugerencia, l.propension_taller,
  l.perfil_ia, l.ultimo_contacto_at, l.ultima_respuesta_at, l.esperando_respuesta_desde, l.seguimiento_paso,
  l.proximo_seguimiento_at, l.no_contactar_at, l.traspaso, l.whatsapp_click_at, l.cerrado_at, l.cobrado_at,
  l.fuente->>'utm_source' AS utm_source, l.fuente->>'utm_campaign' AS utm_campaign`;

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
        AND ($5::text IS NULL OR coalesce(nullif(l.fuente->>'utm_campaign',''), nullif(l.fuente->>'utm_source',''), 'directo') = $5)
        AND ($6::boolean IS NULL OR (l.consent_at IS NOT NULL) = $6)
      ORDER BY l.created_at DESC
      LIMIT $7`,
    [etapa, clasificacion, revision, (texto || "").trim().slice(0, 60), campana, conDatos, Math.min(limite, 500)],
  );
  const ahora = new Date();
  let leads = rows.map((l) => enriquecer(l, ahora));
  if (sinContestarMin !== null) leads = leads.filter((l) => l.sinContestar.estado !== "al_dia" && l.sinContestar.dias >= sinContestarMin);
  return leads;
}

export async function fichaLead(codigo) {
  const { rows } = await query(`SELECT ${COLUMNAS} FROM lead l WHERE l.codigo = $1`, [codigo]);
  if (!rows[0]) return null;
  const [eventos, tareas, citas, conv] = await Promise.all([
    historial(codigo),
    tareasAbiertas({ codigo }),
    query(`SELECT id, inicio, estado, lugar, tipo, franja, apartada_at FROM cita WHERE lead_codigo = $1 ORDER BY creado_at DESC`, [codigo]),
    query(
      `SELECT c.turnos, c.fotos, c.cotizo, c.avanzo, c.fuera_de_tema, c.costo_usd, c.creado_at
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
export async function actualizarCaso(codigo, cambios, usuario) {
  const antes = await query(`SELECT etapa FROM lead WHERE codigo = $1`, [codigo]);
  if (antes.rowCount === 0) return { ok: false, motivo: "no_existe" };
  const r = await actualizarLead(codigo, cambios);
  if (!r.ok) return r;
  if (cambios.etapa && cambios.etapa !== antes.rows[0].etapa) {
    await registrarEventoLead(codigo, "etapa", { usuario, detalle: { de: antes.rows[0].etapa, a: cambios.etapa, motivo: cambios.motivo_descarte ?? null } });
    if (cambios.etapa === "descartado") {
      await cerrarTareasDeLead(codigo, usuario);
      await query(`UPDATE lead SET proximo_seguimiento_at = NULL WHERE codigo = $1`, [codigo]);
    }
  }
  return r;
}

/** Marca o desmarca un paso del checklist del cambio. */
export async function marcarTraspaso(codigo, { paso, hecho, usuario }) {
  if (!CHECKLIST_TRASPASO.some(([k]) => k === paso)) return { ok: false, motivo: "paso_invalido" };
  const valor = hecho ? { hecho: true, por: usuario, at: new Date().toISOString() } : null;
  const r = await query(
    `UPDATE lead SET traspaso = CASE WHEN $3::jsonb IS NULL THEN traspaso - $2 ELSE jsonb_set(traspaso, ARRAY[$2], $3::jsonb) END,
            actualizado_at = now()
      WHERE codigo = $1 RETURNING traspaso`,
    [codigo, paso, valor ? JSON.stringify(valor) : null],
  );
  if (r.rowCount === 0) return { ok: false, motivo: "no_existe" };
  await registrarEventoLead(codigo, "traspaso", { usuario, detalle: { paso, hecho: Boolean(hecho) } });
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
       count(*) FILTER (WHERE esperando_respuesta_desde IS NOT NULL AND esperando_respuesta_desde < now() - interval '3 days' AND etapa = 'cita_solicitada')::int AS sin_respuesta_3d,
       count(*) FILTER (WHERE revision_pendiente)::int AS en_revision,
       count(*) FILTER (WHERE clasificacion = 'aplica_auto' AND etapa = 'cita_solicitada')::int AS aplica_por_agendar,
       count(*) FILTER (WHERE clasificacion = 'taller' OR propension_taller >= 70)::int AS taller
     FROM lead`,
  );
  const t = await query(`SELECT count(*)::int AS n FROM crm_tarea WHERE hecha_at IS NULL AND vence_at <= now()`);
  return { ...rows[0], tareas_vencidas: t.rows[0].n };
}

export { ETAPAS, CLASES };
