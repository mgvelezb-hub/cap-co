// Citas: disponibilidad, reserva y cambios desde el panel.

import { query, dbDisponible } from "../db/client.js";
import { horariosPosibles, horarioValido } from "./horarios.js";

export const ESTADOS_CITA = ["reservada", "confirmada", "atendida", "cancelada", "no_asistio"];

export async function disponibilidad(ahora = new Date()) {
  const dias = horariosPosibles(ahora);
  if (!dbDisponible() || dias.length === 0) return dias;
  const desde = dias[0].horas[0];
  const hasta = dias.at(-1).horas.at(-1);
  const { rows } = await query(
    `SELECT inicio FROM cita WHERE estado IN ('reservada', 'confirmada') AND inicio BETWEEN $1 AND $2`,
    [desde, hasta],
  );
  const ocupados = new Set(rows.map((r) => new Date(r.inicio).getTime()));
  return dias
    .map((d) => ({ fecha: d.fecha, horas: d.horas.filter((h) => !ocupados.has(h.getTime())) }))
    .filter((d) => d.horas.length > 0);
}

/**
 * Reserva un horario para un lead. Si el lead ya tenía una cita activa, se reemplaza.
 * @returns {{ok: true, cita} | {ok: false, motivo: "horario_invalido"|"ocupado"|"no_existe"|"sin_db"}}
 */
export async function reservar(codigo, inicio, ahora = new Date()) {
  if (!dbDisponible()) return { ok: false, motivo: "sin_db" };
  if (!horarioValido(inicio, ahora)) return { ok: false, motivo: "horario_invalido" };
  const lead = await query(`SELECT 1 FROM lead WHERE codigo = $1`, [codigo]);
  if (lead.rowCount === 0) return { ok: false, motivo: "no_existe" };
  try {
    await query(
      `UPDATE cita SET estado = 'cancelada', actualizado_at = now()
        WHERE lead_codigo = $1 AND estado IN ('reservada', 'confirmada')`,
      [codigo],
    );
    const { rows } = await query(
      `INSERT INTO cita (lead_codigo, inicio) VALUES ($1, $2) RETURNING id, inicio, estado, lugar`,
      [codigo, inicio],
    );
    return { ok: true, cita: rows[0] };
  } catch (err) {
    if (err.code === "23505") return { ok: false, motivo: "ocupado" };
    throw err;
  }
}

export async function citasProximas({ dias = 14 } = {}) {
  if (!dbDisponible()) return [];
  const { rows } = await query(
    `SELECT c.id, c.inicio, c.estado, c.lugar, c.lead_codigo, l.nombre, l.telefono, l.perfil, l.ahorro, l.etapa
       FROM cita c JOIN lead l ON l.codigo = c.lead_codigo
      WHERE c.inicio > now() - interval '1 day' AND c.inicio < now() + ($1 || ' days')::interval
        AND c.estado <> 'cancelada'
      ORDER BY c.inicio`,
    [String(dias)],
  );
  return rows;
}

export async function actualizarCita(id, { estado, lugar }) {
  if (!dbDisponible()) return { ok: false, motivo: "sin_db" };
  if (estado !== undefined && !ESTADOS_CITA.includes(estado)) return { ok: false, motivo: "estado_invalido" };
  if (lugar !== undefined && (typeof lugar !== "string" || lugar.length > 200)) return { ok: false, motivo: "lugar_invalido" };
  const r = await query(
    `UPDATE cita SET estado = COALESCE($2, estado), lugar = COALESCE($3, lugar), actualizado_at = now()
      WHERE id = $1 RETURNING id, lead_codigo, inicio, estado, lugar`,
    [id, estado ?? null, lugar ?? null],
  );
  if (r.rowCount === 0) return { ok: false, motivo: "no_existe" };
  // La cita mueve la etapa del lead para que el embudo refleje la operación.
  const c = r.rows[0];
  const etapa = { confirmada: "cita_confirmada", atendida: "atendido" }[c.estado];
  if (etapa) {
    await query(
      `UPDATE lead SET etapa = $2, contactado_at = COALESCE(contactado_at, now())
        WHERE codigo = $1 AND etapa NOT IN ('switcheo_concretado', 'comision_cobrada')`,
      [c.lead_codigo, etapa],
    );
  }
  return { ok: true, cita: c };
}
