// Registro anónimo de conversaciones y embudo de conversión para el panel.

import { query, dbDisponible } from "../db/client.js";

const PATRON_ID = /^[A-Za-z0-9-]{8,64}$/;

export function idValido(id) {
  return typeof id === "string" && PATRON_ID.test(id);
}

/**
 * Suma un turno a la conversación. Nunca lanza.
 * @param {{id: string, fuente: object, foto: boolean, herramientas: string[], avanzo: boolean, fueraDeTema: boolean}} t
 */
export async function registrarTurno({ id, fuente = {}, foto = false, herramientas = [], avanzo = false, fueraDeTema = false }) {
  if (!dbDisponible() || !idValido(id)) return;
  try {
    const cotizo = herramientas.includes("cotizar_traspaso");
    await query(
      `INSERT INTO conversacion (id, fuente, turnos, fotos, herramientas, cotizo, avanzo, fuera_de_tema)
       VALUES ($1, $2, 1, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         actualizado_at = now(),
         turnos = conversacion.turnos + 1,
         fotos = conversacion.fotos + EXCLUDED.fotos,
         herramientas = ARRAY(SELECT DISTINCT unnest(conversacion.herramientas || EXCLUDED.herramientas)),
         cotizo = conversacion.cotizo OR EXCLUDED.cotizo,
         avanzo = conversacion.avanzo OR EXCLUDED.avanzo,
         fuera_de_tema = conversacion.fuera_de_tema + EXCLUDED.fuera_de_tema`,
      [id, JSON.stringify(fuente), foto ? 1 : 0, [...new Set(herramientas)], cotizo, avanzo, fueraDeTema ? 1 : 0],
    );
  } catch (err) {
    console.error("[metricas] no se registró el turno:", err.message);
  }
}

/** Embudo de los últimos `dias` días: de conversaciones a atendidos. */
export async function embudo({ dias = 30 } = {}) {
  if (!dbDisponible()) return null;
  const intervalo = `${dias} days`;
  const [c, l] = await Promise.all([
    query(
      `SELECT count(*)::int AS conversaciones,
              count(*) FILTER (WHERE turnos >= 2)::int AS con_interaccion,
              count(*) FILTER (WHERE fotos > 0)::int AS con_foto,
              count(*) FILTER (WHERE cotizo)::int AS cotizaron,
              count(*) FILTER (WHERE avanzo)::int AS avanzaron,
              count(*) FILTER (WHERE fuera_de_tema > 0)::int AS fuera_de_tema,
              coalesce(round(avg(turnos)::numeric, 1), 0)::float AS turnos_promedio
         FROM conversacion WHERE creado_at > now() - $1::interval`,
      [intervalo],
    ),
    query(
      `SELECT count(*)::int AS citas,
              count(whatsapp_click_at)::int AS whatsapp,
              count(consent_at)::int AS contacto,
              count(*) FILTER (WHERE etapa IN ('cita_confirmada', 'atendido'))::int AS confirmadas,
              count(*) FILTER (WHERE etapa = 'atendido')::int AS atendidos
         FROM lead
        WHERE created_at > now() - $1::interval
          -- Solo leads que salen de una conversación registrada, para que el embudo no pase de 100 %.
          AND conversacion_id IN (SELECT id FROM conversacion WHERE creado_at > now() - $1::interval)`,
      [intervalo],
    ),
  ]);
  return { dias, ...c.rows[0], ...l.rows[0] };
}
