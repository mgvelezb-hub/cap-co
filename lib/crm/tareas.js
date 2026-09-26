// Tareas del equipo. Una tarea abierta por lead, tipo y plantilla (índice único parcial): crear
// otra igual solo actualiza su vencimiento.

import { query } from "../db/client.js";

export const TIPOS_TAREA = { whatsapp: "WhatsApp", llamar: "Llamar", revisar: "Revisar clasificación", confirmar_cita: "Confirmar cita" };

export async function crearTarea(codigo, { tipo, titulo, vence = new Date(), detalle = {} }, db = { query }) {
  if (!TIPOS_TAREA[tipo]) throw new Error(`tipo de tarea desconocido: ${tipo}`);
  const { rows } = await db.query(
    `INSERT INTO crm_tarea (lead_codigo, tipo, titulo, vence_at, detalle) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (lead_codigo, tipo, (coalesce(detalle->>'plantilla', ''))) WHERE hecha_at IS NULL
     DO UPDATE SET titulo = EXCLUDED.titulo, vence_at = LEAST(crm_tarea.vence_at, EXCLUDED.vence_at), detalle = EXCLUDED.detalle
     RETURNING id`,
    [codigo, tipo, titulo.slice(0, 160), vence, JSON.stringify(detalle)],
  );
  return rows[0].id;
}

export async function completarTarea(id, usuario) {
  const r = await query(
    `UPDATE crm_tarea SET hecha_at = now(), hecha_por = $2 WHERE id = $1 AND hecha_at IS NULL RETURNING id, lead_codigo, tipo`,
    [id, usuario],
  );
  return r.rows[0] || null;
}

/**
 * Cierra las tareas abiertas de un lead (p. ej. al descartarlo), opcionalmente de ciertos tipos
 * y, para WhatsApp, solo la de una plantilla.
 */
export async function cerrarTareasDeLead(codigo, usuario, tipos = null, db = { query }, plantilla = null) {
  await db.query(
    `UPDATE crm_tarea SET hecha_at = now(), hecha_por = $2
      WHERE lead_codigo = $1 AND hecha_at IS NULL AND ($3::text[] IS NULL OR tipo = ANY($3))
        AND ($4::text IS NULL OR coalesce(detalle->>'plantilla', '') = $4)`,
    [codigo, usuario, tipos, plantilla],
  );
}

/** Tareas abiertas, las vencidas primero. */
export async function tareasAbiertas({ hasta = null, codigo = null, limite = 200 } = {}) {
  const { rows } = await query(
    `SELECT t.id, t.lead_codigo, t.tipo, t.titulo, t.vence_at, t.creado_at, t.detalle,
            l.nombre, l.telefono, l.clasificacion, l.etapa
       FROM crm_tarea t JOIN lead l ON l.codigo = t.lead_codigo
      WHERE t.hecha_at IS NULL AND ($1::timestamptz IS NULL OR t.vence_at <= $1) AND ($2::text IS NULL OR t.lead_codigo = $2)
      ORDER BY t.vence_at LIMIT $3`,
    [hasta, codigo, limite],
  );
  return rows;
}
