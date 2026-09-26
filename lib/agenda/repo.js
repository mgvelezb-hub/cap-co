// Citas: disponibilidad, reserva y cambios desde el panel.
// La reserva y el contacto van en una sola transacción: o queda todo, o no queda nada.

import { query, dbDisponible, conTransaccion } from "../db/client.js";
import { AVISO_VERSION } from "../leads/validar.js";
import { horariosPosibles, horarioValido, horarioAtendible, franjaValida, capacidadPorHorario } from "./horarios.js";

export const ESTADOS_CITA = ["reservada", "confirmada", "atendida", "cancelada", "no_asistio", "expirada"];
const ACTIVOS = "('reservada', 'confirmada')";

// Una reserva sin confirmar por WhatsApp se libera a las 24 h (el mensaje de éxito lo avisa).
export const HORAS_PARA_CONFIRMAR = 24;

export async function disponibilidad(ahora = new Date()) {
  const dias = horariosPosibles(ahora);
  if (!dbDisponible() || dias.length === 0) return dias;
  const desde = dias[0].horas[0];
  const hasta = dias.at(-1).horas.at(-1);
  const { rows } = await query(
    `SELECT inicio, count(*)::int AS n FROM cita
      WHERE tipo = 'cita' AND estado IN ${ACTIVOS} AND inicio BETWEEN $1 AND $2 GROUP BY inicio`,
    [desde, hasta],
  );
  const capacidad = capacidadPorHorario();
  const llenos = new Set(rows.filter((r) => r.n >= capacidad).map((r) => new Date(r.inicio).getTime()));
  return dias
    .map((d) => ({ fecha: d.fecha, horas: d.horas.filter((h) => !llenos.has(h.getTime())) }))
    .filter((d) => d.horas.length > 0);
}

/** Candado por horario dentro de la transacción; luego cuenta el cupo. */
async function hayCupo(cliente, inicio, { excluirId = null, excluirLead = null } = {}) {
  await cliente.query(`SELECT pg_advisory_xact_lock(hashtext('cita:' || $1::text))`, [inicio.toISOString()]);
  const { rows } = await cliente.query(
    `SELECT count(*)::int AS n FROM cita
      WHERE tipo = 'cita' AND estado IN ${ACTIVOS} AND inicio = $1
        AND ($2::bigint IS NULL OR id <> $2) AND ($3::text IS NULL OR lead_codigo <> $3)`,
    [inicio, excluirId, excluirLead],
  );
  return rows[0].n < capacidadPorHorario();
}

/**
 * Aparta una cita (tipo "cita", con `inicio`) o pide una llamada (tipo "llamada", con `fecha` y
 * `franja`) y guarda el contacto con consentimiento, todo en una transacción. Si el lead ya tenía
 * una activa, se reemplaza.
 * @returns {{ok: true, cita} | {ok: false, motivo: "horario_invalido"|"ocupado"|"no_existe"|"otro_telefono"|"ya_tiene_cita"|"sin_db"}}
 */
export async function reservar({ codigo, nombre, telefono, tipo = "cita", inicio, fecha, franja }, ahora = new Date()) {
  if (!dbDisponible()) return { ok: false, motivo: "sin_db" };
  let instante;
  if (tipo === "llamada") {
    instante = franjaValida(fecha, franja, ahora);
    if (!instante) return { ok: false, motivo: "horario_invalido" };
  } else {
    if (!horarioValido(inicio, ahora)) return { ok: false, motivo: "horario_invalido" };
    instante = inicio;
  }
  try {
    return await conTransaccion(async (c) => {
      const lead = await c.query(`SELECT telefono, consent_at FROM lead WHERE codigo = $1 FOR UPDATE`, [codigo]);
      if (lead.rowCount === 0) return { ok: false, motivo: "no_existe" };
      // Quien conozca un código ajeno no puede cambiarle el teléfono ni la cita.
      const previo = lead.rows[0];
      if (previo.consent_at && previo.telefono && previo.telefono !== telefono) return { ok: false, motivo: "otro_telefono" };
      const otra = await c.query(
        `SELECT 1 FROM cita ci JOIN lead l ON l.codigo = ci.lead_codigo
          WHERE l.telefono = $1 AND l.codigo <> $2 AND ci.estado IN ${ACTIVOS} AND ci.inicio > now() - interval '1 day' LIMIT 1`,
        [telefono, codigo],
      );
      if (otra.rowCount > 0) return { ok: false, motivo: "ya_tiene_cita" };
      if (tipo === "cita" && !(await hayCupo(c, instante, { excluirLead: codigo }))) return { ok: false, motivo: "ocupado" };

      await c.query(
        `UPDATE cita SET estado = 'cancelada', actualizado_at = now()
          WHERE lead_codigo = $1 AND estado IN ${ACTIVOS}`,
        [codigo],
      );
      const { rows } = await c.query(
        `INSERT INTO cita (lead_codigo, inicio, tipo, franja) VALUES ($1, $2, $3, $4)
         RETURNING id, inicio, estado, lugar, tipo, franja`,
        [codigo, instante, tipo, tipo === "llamada" ? franja : null],
      );
      await c.query(
        `UPDATE lead SET nombre = $2, telefono = $3, consent_at = now(), consent_version = $4, actualizado_at = now()
          WHERE codigo = $1`,
        [codigo, nombre, telefono, AVISO_VERSION],
      );
      return { ok: true, cita: rows[0] };
    });
  } catch (err) {
    if (err.code === "23505") return { ok: false, motivo: "ocupado" };
    throw err;
  }
}

export async function citasProximas({ dias = 14 } = {}) {
  if (!dbDisponible()) return [];
  const { rows } = await query(
    `SELECT c.id, c.inicio, c.estado, c.lugar, c.tipo, c.franja, c.creado_at, c.lead_codigo,
            l.nombre, l.telefono, l.perfil, l.ahorro, l.etapa
       FROM cita c JOIN lead l ON l.codigo = c.lead_codigo
      WHERE c.inicio > now() - interval '1 day' AND c.inicio < now() + ($1 || ' days')::interval
        AND c.estado NOT IN ('cancelada', 'expirada')
      ORDER BY c.inicio`,
    [String(dias)],
  );
  return rows;
}

// Cómo mueve la cita la etapa del lead: solo hacia adelante, salvo que la cita se caiga
// (entonces regresa de "cita confirmada" a "por contactar"). Nunca revive un descartado.
const ETAPA_POR_ESTADO = {
  confirmada: { etapa: "cita_confirmada", desde: ["cita_solicitada"] },
  atendida: { etapa: "atendido", desde: ["cita_solicitada", "cita_confirmada"] },
  no_asistio: { etapa: "cita_solicitada", desde: ["cita_confirmada"] },
  cancelada: { etapa: "cita_solicitada", desde: ["cita_confirmada"] },
  expirada: { etapa: "cita_solicitada", desde: ["cita_confirmada"] },
};

/**
 * Cambios desde el panel: estado, lugar o reprogramación (`inicio`). Reprogramar una llamada la
 * convierte en cita acordada.
 */
export async function actualizarCita(id, { estado, lugar, inicio }, ahora = new Date()) {
  if (!dbDisponible()) return { ok: false, motivo: "sin_db" };
  if (estado !== undefined && !ESTADOS_CITA.includes(estado)) return { ok: false, motivo: "estado_invalido" };
  if (lugar !== undefined && (typeof lugar !== "string" || lugar.length > 200)) return { ok: false, motivo: "lugar_invalido" };
  let nuevoInicio = null;
  if (inicio !== undefined) {
    nuevoInicio = new Date(inicio);
    if (!horarioAtendible(nuevoInicio, ahora)) return { ok: false, motivo: "horario_invalido" };
  }
  try {
    return await conTransaccion(async (c) => {
      const actual = await c.query(`SELECT id, inicio, estado, tipo FROM cita WHERE id = $1 FOR UPDATE`, [id]);
      if (actual.rowCount === 0) return { ok: false, motivo: "no_existe" };
      const antes = actual.rows[0];
      const estadoFinal = estado ?? antes.estado;
      const tipoFinal = nuevoInicio ? "cita" : antes.tipo;
      const inicioFinal = nuevoInicio ?? new Date(antes.inicio);
      const activa = estadoFinal === "reservada" || estadoFinal === "confirmada";
      const cambiaOcupacion = nuevoInicio || tipoFinal !== antes.tipo || (activa && !["reservada", "confirmada"].includes(antes.estado));
      if (activa && tipoFinal === "cita" && cambiaOcupacion && !(await hayCupo(c, inicioFinal, { excluirId: id }))) {
        return { ok: false, motivo: "ocupado" };
      }
      const r = await c.query(
        `UPDATE cita SET estado = $2, lugar = COALESCE($3, lugar), inicio = $4, tipo = $5,
                franja = CASE WHEN $5 = 'cita' THEN NULL ELSE franja END, actualizado_at = now()
          WHERE id = $1 RETURNING id, lead_codigo, inicio, estado, lugar, tipo, franja`,
        [id, estadoFinal, lugar ?? null, inicioFinal, tipoFinal],
      );
      const cita = r.rows[0];
      const mov = estado !== undefined && estado !== antes.estado ? ETAPA_POR_ESTADO[estado] : null;
      if (mov) {
        await c.query(
          `UPDATE lead SET etapa = $2, actualizado_at = now(),
                  contactado_at = CASE WHEN $2 <> 'cita_solicitada' THEN COALESCE(contactado_at, now()) ELSE contactado_at END
            WHERE codigo = $1 AND etapa = ANY($3::text[])`,
          [cita.lead_codigo, mov.etapa, mov.desde],
        );
      }
      return { ok: true, cita };
    });
  } catch (err) {
    // Índice único de una cita activa por lead: reactivar una vieja cuando ya tiene otra.
    if (err.code === "23505") return { ok: false, motivo: "ocupado" };
    throw err;
  }
}

/**
 * Libera reservas que nadie confirmó: citas sin confirmar a las HORAS_PARA_CONFIRMAR de apartadas
 * o cuya hora ya pasó, y llamadas pendientes de hace más de 7 días. Lo llama el cron de la mañana.
 */
export async function expirarCitas() {
  if (!dbDisponible()) return 0;
  const r = await query(
    `UPDATE cita SET estado = 'expirada', actualizado_at = now()
      WHERE estado = 'reservada'
        AND ((tipo = 'cita' AND (inicio < now() OR creado_at < now() - ($1 || ' hours')::interval))
          OR (tipo = 'llamada' AND inicio < now() - interval '7 days'))`,
    [String(HORAS_PARA_CONFIRMAR)],
  );
  return r.rowCount;
}
