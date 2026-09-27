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
export async function registrarTurno({ id, fuente = {}, foto = false, herramientas = [], avanzo = false, fueraDeTema = false, costoUsd = 0 }) {
  if (!dbDisponible() || !idValido(id)) return;
  try {
    const cotizo = herramientas.includes("cotizar_traspaso");
    await query(
      `INSERT INTO conversacion (id, fuente, turnos, fotos, herramientas, cotizo, avanzo, fuera_de_tema, costo_usd)
       VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         actualizado_at = now(),
         turnos = conversacion.turnos + 1,
         fotos = conversacion.fotos + EXCLUDED.fotos,
         herramientas = ARRAY(SELECT DISTINCT unnest(conversacion.herramientas || EXCLUDED.herramientas)),
         cotizo = conversacion.cotizo OR EXCLUDED.cotizo,
         avanzo = conversacion.avanzo OR EXCLUDED.avanzo,
         fuera_de_tema = conversacion.fuera_de_tema + EXCLUDED.fuera_de_tema,
         costo_usd = conversacion.costo_usd + EXCLUDED.costo_usd`,
      [id, JSON.stringify(fuente), foto ? 1 : 0, [...new Set(herramientas)], cotizo, avanzo, fueraDeTema ? 1 : 0, Number(costoUsd) || 0],
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
      `SELECT count(DISTINCT conversacion_id)::int AS citas,
              count(DISTINCT conversacion_id) FILTER (WHERE whatsapp_click_at IS NOT NULL)::int AS whatsapp,
              count(DISTINCT conversacion_id) FILTER (WHERE consent_at IS NOT NULL)::int AS contacto,
              count(DISTINCT conversacion_id) FILTER (WHERE etapa IN ('cita_confirmada', 'atendido', 'switcheo_concretado', 'comision_cobrada'))::int AS confirmadas,
              count(DISTINCT conversacion_id) FILTER (WHERE etapa IN ('atendido', 'switcheo_concretado', 'comision_cobrada'))::int AS atendidos,
              count(DISTINCT conversacion_id) FILTER (WHERE etapa IN ('switcheo_concretado', 'comision_cobrada'))::int AS switcheos,
              count(DISTINCT conversacion_id) FILTER (WHERE etapa = 'comision_cobrada')::int AS cobrados
         FROM lead
        WHERE created_at > now() - $1::interval
          -- Solo leads que salen de una conversación registrada, para que el embudo no pase de 100 %.
          AND conversacion_id IN (SELECT id FROM conversacion WHERE creado_at > now() - $1::interval)`,
      [intervalo],
    ),
  ]);
  return { dias, ...c.rows[0], ...l.rows[0] };
}

/** Borra conversaciones anónimas de más de 180 días (lo llama el cron de la mañana). */
export async function limpiarConversaciones() {
  if (!dbDisponible()) return 0;
  const r = await query(
    `DELETE FROM conversacion c WHERE c.creado_at < now() - interval '180 days'
       AND NOT EXISTS (SELECT 1 FROM lead l WHERE l.conversacion_id = c.id AND l.created_at > now() - interval '12 months')`,
  );
  return r.rowCount;
}
