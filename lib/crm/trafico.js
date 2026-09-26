// Tráfico e interacción: visitas anónimas, conversaciones del chat y su conversión.

import { query } from "../db/client.js";

const CAMPANA = (col) => `coalesce(nullif(${col}->>'utm_campaign', ''), nullif(${col}->>'utm_source', ''), 'directo')`;

/** Serie diaria (hora de la Ciudad de México) de visitas, conversaciones, leads y contactos. */
export async function serieDiaria({ dias = 30 } = {}) {
  const { rows } = await query(
    `WITH d AS (
       SELECT generate_series((now() AT TIME ZONE 'America/Mexico_City')::date - ($1::int - 1), (now() AT TIME ZONE 'America/Mexico_City')::date, '1 day')::date AS dia
     )
     SELECT to_char(d.dia, 'YYYY-MM-DD') AS dia,
       (SELECT count(DISTINCT sesion) FROM visita v WHERE (v.creado_at AT TIME ZONE 'America/Mexico_City')::date = d.dia)::int AS visitas,
       (SELECT count(*) FROM conversacion c WHERE (c.creado_at AT TIME ZONE 'America/Mexico_City')::date = d.dia)::int AS conversaciones,
       (SELECT count(*) FROM conversacion c WHERE c.turnos >= 2 AND (c.creado_at AT TIME ZONE 'America/Mexico_City')::date = d.dia)::int AS con_interaccion,
       (SELECT count(*) FROM lead l WHERE (l.created_at AT TIME ZONE 'America/Mexico_City')::date = d.dia)::int AS leads,
       (SELECT count(*) FROM lead l WHERE (l.consent_at AT TIME ZONE 'America/Mexico_City')::date = d.dia)::int AS contactos
     FROM d ORDER BY d.dia`,
    [dias],
  );
  return rows;
}

/** Totales y conversión por fuente de tráfico (campaña o fuente). */
export async function porFuente({ dias = 30 } = {}) {
  const intervalo = `${dias} days`;
  const { rows } = await query(
    `WITH v AS (SELECT ${CAMPANA("fuente")} AS f, count(DISTINCT sesion) AS n FROM visita WHERE creado_at > now() - $1::interval GROUP BY 1),
          c AS (SELECT ${CAMPANA("fuente")} AS f, count(*) AS n, count(*) FILTER (WHERE turnos >= 2) AS inter, count(*) FILTER (WHERE cotizo) AS cotizo
                  FROM conversacion WHERE creado_at > now() - $1::interval GROUP BY 1),
          l AS (SELECT ${CAMPANA("fuente")} AS f, count(*) AS n, count(consent_at) AS contactos,
                       count(*) FILTER (WHERE etapa IN ('switcheo_concretado','comision_cobrada')) AS cambios,
                       count(*) FILTER (WHERE clasificacion = 'aplica_auto') AS aplica
                  FROM lead WHERE created_at > now() - $1::interval GROUP BY 1)
     SELECT k.f AS fuente, coalesce(v.n,0)::int AS visitas, coalesce(c.n,0)::int AS conversaciones, coalesce(c.inter,0)::int AS con_interaccion,
            coalesce(c.cotizo,0)::int AS cotizaron, coalesce(l.n,0)::int AS leads, coalesce(l.contactos,0)::int AS contactos,
            coalesce(l.aplica,0)::int AS aplica_auto, coalesce(l.cambios,0)::int AS cambios
       FROM (SELECT f FROM v UNION SELECT f FROM c UNION SELECT f FROM l) k
       LEFT JOIN v ON v.f = k.f LEFT JOIN c ON c.f = k.f LEFT JOIN l ON l.f = k.f
      ORDER BY visitas DESC, conversaciones DESC LIMIT 50`,
    [intervalo],
  );
  return rows;
}

/** Páginas más vistas. */
export async function paginas({ dias = 30 } = {}) {
  const { rows } = await query(
    `SELECT path, count(*)::int AS vistas, count(DISTINCT sesion)::int AS sesiones
       FROM visita WHERE creado_at > now() - ($1 || ' days')::interval GROUP BY path ORDER BY vistas DESC LIMIT 20`,
    [String(dias)],
  );
  return rows;
}

/** Registra una visita anónima (lo llama el sitio). */
export async function registrarVisita({ sesion, path, fuente }) {
  if (typeof sesion !== "string" || !/^[a-z0-9-]{8,64}$/i.test(sesion)) return false;
  if (typeof path !== "string" || !path.startsWith("/") || path.length > 200) return false;
  await query(`INSERT INTO visita (sesion, path, fuente) VALUES ($1, $2, $3)`, [sesion, path, JSON.stringify(fuente || {})]);
  return true;
}

/** Retención: visitas de más de 13 meses se borran (cron). */
export async function limpiarVisitas() {
  const r = await query(`DELETE FROM visita WHERE creado_at < now() - interval '13 months'`);
  return r.rowCount;
}
