// Citas: disponibilidad, reserva y cambios desde el panel.
// La reserva y el contacto van en una sola transacción: o queda todo, o no queda nada.

import { query, dbDisponible, conTransaccion } from "../db/client.js";
import { AVISO_VERSION } from "../leads/validar.js";
import {
  horariosPosibles,
  horarioValido,
  horarioAtendible,
  franjaValida,
  franjasPosibles,
  capacidadPorHorario,
  capacidadPorFranja,
  limiteAnticipacion,
} from "./horarios.js";

export const ESTADOS_CITA = ["reservada", "confirmada", "atendida", "cancelada", "no_asistio", "expirada"];
const ACTIVOS = "('reservada', 'confirmada')";

// Una cita apartada que nadie confirma se libera tras 8 horas hábiles (un día hábil) desde que
// se apartó o se reprogramó. El mensaje de éxito dice la fecha límite.
export const HORAS_HABILES_PARA_CONFIRMAR = 8;

export function confirmarAntesDe(apartadaAt) {
  return limiteAnticipacion(new Date(apartadaAt), HORAS_HABILES_PARA_CONFIRMAR);
}

/** Franjas de llamada con lugar (el equipo solo alcanza LLAMADAS_POR_FRANJA por franja). */
export async function franjasDisponibles(ahora = new Date()) {
  const dias = franjasPosibles(ahora);
  if (!dbDisponible() || dias.length === 0) return dias;
  const { rows } = await query(
    `SELECT inicio, count(*)::int AS n FROM cita
      WHERE tipo = 'llamada' AND estado IN ${ACTIVOS} AND inicio BETWEEN $1 AND $2 GROUP BY inicio`,
    [dias[0].franjas[0].inicio, dias.at(-1).franjas.at(-1).inicio],
  );
  const llenas = new Set(rows.filter((r) => r.n >= capacidadPorFranja()).map((r) => new Date(r.inicio).getTime()));
  return dias
    .map((d) => ({ fecha: d.fecha, franjas: d.franjas.filter((f) => !llenas.has(f.inicio.getTime())) }))
    .filter((d) => d.franjas.length > 0);
}

/** Reservas creadas en la última hora en todo el sitio (freno contra quien acapare la agenda). */
export async function reservasUltimaHora() {
  if (!dbDisponible()) return 0;
  const { rows } = await query(`SELECT count(*)::int AS n FROM cita WHERE creado_at > now() - interval '1 hour'`);
  return rows[0].n;
}

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
async function hayCupo(cliente, inicio, { tipo = "cita", excluirId = null, excluirLead = null } = {}) {
  await cliente.query(`SELECT pg_advisory_xact_lock(hashtext($1 || ':' || $2::text))`, [tipo, inicio.toISOString()]);
  const { rows } = await cliente.query(
    `SELECT count(*)::int AS n FROM cita
      WHERE tipo = $4 AND estado IN ${ACTIVOS} AND inicio = $1
        AND ($2::bigint IS NULL OR id <> $2) AND ($3::text IS NULL OR lead_codigo <> $3)`,
    [inicio, excluirId, excluirLead, tipo],
  );
  return rows[0].n < (tipo === "llamada" ? capacidadPorFranja() : capacidadPorHorario());
}

/**
 * Aparta una cita (tipo "cita", con `inicio`) o pide una llamada (tipo "llamada", con `fecha` y
 * `franja`) y guarda el contacto con consentimiento, todo en una transacción. Si el lead ya tenía
 * una activa, se reemplaza.
 * @returns {{ok: true, cita} | {ok: false, motivo: "horario_invalido"|"ocupado"|"no_existe"|"otro_telefono"|"ya_tiene_cita"|"sin_db"}}
 */
export async function reservar({ codigo, nombre, telefono, email = null, tipo = "cita", inicio, fecha, franja }, ahora = new Date()) {
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
      // Orden de candados en todo el módulo: teléfono → lead → horario → citas.
      await c.query(`SELECT pg_advisory_xact_lock(hashtext('tel:' || $1))`, [telefono]);
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
      if (!(await hayCupo(c, instante, { tipo, excluirLead: codigo }))) return { ok: false, motivo: "ocupado" };

      await c.query(
        `UPDATE cita SET estado = 'cancelada', actualizado_at = now()
          WHERE lead_codigo = $1 AND estado IN ${ACTIVOS}`,
        [codigo],
      );
      const { rows } = await c.query(
        `INSERT INTO cita (lead_codigo, inicio, tipo, franja) VALUES ($1, $2, $3, $4)
         RETURNING id, inicio, estado, lugar, tipo, franja, apartada_at`,
        [codigo, instante, tipo, tipo === "llamada" ? franja : null],
      );
      await c.query(
        `UPDATE lead SET nombre = $2, telefono = $3, email = COALESCE(email, $5), consent_at = now(), consent_version = $4,
                actualizado_at = now()
          WHERE codigo = $1`,
        [codigo, nombre, telefono, AVISO_VERSION, email],
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
    `SELECT c.id, c.inicio, c.estado, c.lugar, c.tipo, c.franja, c.apartada_at, c.lead_codigo,
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
 * convierte en cita **confirmada**: el asesor la acordó por teléfono con la persona. Reprogramar
 * reinicia el reloj de confirmación.
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
      // Mismo orden de candados que reservar: primero el lead, luego la cita y el horario.
      const lead = await c.query(
        `SELECT l.codigo FROM lead l JOIN cita ci ON ci.lead_codigo = l.codigo WHERE ci.id = $1 FOR UPDATE OF l`,
        [id],
      );
      if (lead.rowCount === 0) return { ok: false, motivo: "no_existe" };
      const actual = await c.query(`SELECT id, inicio, estado, tipo FROM cita WHERE id = $1 FOR UPDATE`, [id]);
      const antes = actual.rows[0];
      const acordada = nuevoInicio && antes.tipo === "llamada" && estado === undefined && ["reservada", "confirmada"].includes(antes.estado);
      const estadoFinal = estado ?? (acordada ? "confirmada" : antes.estado);
      const tipoFinal = nuevoInicio ? "cita" : antes.tipo;
      const inicioFinal = nuevoInicio ?? new Date(antes.inicio);
      const activa = estadoFinal === "reservada" || estadoFinal === "confirmada";
      const cambiaOcupacion = nuevoInicio || tipoFinal !== antes.tipo || (activa && !["reservada", "confirmada"].includes(antes.estado));
      if (activa && cambiaOcupacion) {
        const otra = await c.query(
          `SELECT 1 FROM cita WHERE lead_codigo = $1 AND id <> $2 AND estado IN ${ACTIVOS}`,
          [lead.rows[0].codigo, id],
        );
        if (otra.rowCount > 0) return { ok: false, motivo: "lead_con_otra_cita" };
        if (!(await hayCupo(c, inicioFinal, { tipo: tipoFinal, excluirId: id }))) return { ok: false, motivo: "ocupado" };
      }
      const r = await c.query(
        `UPDATE cita SET estado = $2, lugar = COALESCE($3, lugar), inicio = $4, tipo = $5,
                franja = CASE WHEN $5 = 'cita' THEN NULL ELSE franja END,
                apartada_at = CASE WHEN $6::boolean THEN now() ELSE apartada_at END, actualizado_at = now()
          WHERE id = $1 RETURNING id, lead_codigo, inicio, estado, lugar, tipo, franja, apartada_at`,
        [id, estadoFinal, lugar ?? null, inicioFinal, tipoFinal, Boolean(nuevoInicio)],
      );
      const cita = r.rows[0];
      const mov = estadoFinal !== antes.estado ? ETAPA_POR_ESTADO[estadoFinal] : null;
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
 * Libera reservas que nadie confirmó: citas sin confirmar un día hábil después de apartadas (o
 * cuya hora ya pasó) y llamadas pendientes de hace más de 7 días. Lo llama el cron de la mañana.
 */
export async function expirarCitas(ahora = new Date()) {
  if (!dbDisponible()) return 0;
  const { rows } = await query(
    `SELECT id, inicio, apartada_at FROM cita WHERE estado = 'reservada' AND tipo = 'cita'`,
  );
  const vencidas = rows
    .filter((r) => new Date(r.inicio) < ahora || confirmarAntesDe(r.apartada_at) < ahora)
    .map((r) => r.id);
  const r = await query(
    `UPDATE cita SET estado = 'expirada', actualizado_at = now()
      WHERE estado = 'reservada'
        AND (id = ANY($1::bigint[]) OR (tipo = 'llamada' AND inicio < now() - interval '7 days'))`,
    [vencidas],
  );
  return r.rowCount;
}
