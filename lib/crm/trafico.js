// Tráfico e interacción: visitas anónimas, conversaciones del chat y su conversión.

import { query } from "../db/client.js";

const CAMPANA = (col) => `lower(coalesce(nullif(${col}->>'utm_campaign', ''), nullif(${col}->>'utm_source', ''), 'directo'))`;

/** Serie diaria (hora de la Ciudad de México) de visitas, conversaciones, leads y contactos. */
export async function serieDiaria({ dias = 30 } = {}) {
  // Un GROUP BY por tabla con filtro de rango (usa los índices por fecha), no una subconsulta por día.
  const DIA = (col) => `(${col} AT TIME ZONE 'America/Mexico_City')::date`;
  const { rows } = await query(
    `WITH d AS (
       SELECT generate_series(${DIA("now()")} - ($1::int - 1), ${DIA("now()")}, '1 day')::date AS dia
     ), desde AS (SELECT (min(dia)::timestamp AT TIME ZONE 'America/Mexico_City') AS t FROM d),
     v AS (SELECT ${DIA("creado_at")} AS dia, count(DISTINCT sesion) AS n FROM visita, desde WHERE creado_at >= desde.t GROUP BY 1),
     c AS (SELECT ${DIA("creado_at")} AS dia, count(*) AS n, count(*) FILTER (WHERE turnos >= 2) AS inter FROM conversacion, desde WHERE creado_at >= desde.t GROUP BY 1),
     l AS (SELECT ${DIA("created_at")} AS dia, count(*) AS n FROM lead, desde WHERE created_at >= desde.t GROUP BY 1),
     k AS (SELECT ${DIA("consent_at")} AS dia, count(*) AS n FROM lead, desde WHERE consent_at >= desde.t GROUP BY 1)
     SELECT to_char(d.dia, 'YYYY-MM-DD') AS dia, coalesce(v.n,0)::int AS visitas, coalesce(c.n,0)::int AS conversaciones,
            coalesce(c.inter,0)::int AS con_interaccion, coalesce(l.n,0)::int AS leads, coalesce(k.n,0)::int AS contactos
       FROM d LEFT JOIN v USING (dia) LEFT JOIN c USING (dia) LEFT JOIN l USING (dia) LEFT JOIN k USING (dia)
      ORDER BY d.dia`,
    [dias],
  );
  return rows;
}

/**
 * Embudo del periodo con el lead como base (una sola definición para toda la pantalla):
 * visitas → chats → leads → con datos → citas confirmadas → atendidos → cambios → cobrados.
 */
export async function embudoLeads({ dias = 30 } = {}) {
  const intervalo = `${dias} days`;
  const { rows } = await query(
    `SELECT
       (SELECT count(DISTINCT sesion) FROM visita WHERE creado_at > now() - $1::interval)::int AS visitas,
       (SELECT count(*) FROM conversacion WHERE creado_at > now() - $1::interval)::int AS chats,
       (SELECT count(*) FROM conversacion WHERE creado_at > now() - $1::interval AND turnos >= 2)::int AS con_interaccion,
       (SELECT count(*) FROM conversacion WHERE creado_at > now() - $1::interval AND cotizo)::int AS cotizaron,
       count(*)::int AS leads,
       count(consent_at)::int AS con_datos,
       count(*) FILTER (WHERE etapa IN ('cita_confirmada','atendido','switcheo_concretado','comision_cobrada'))::int AS confirmados,
       count(*) FILTER (WHERE etapa IN ('atendido','switcheo_concretado','comision_cobrada'))::int AS atendidos,
       count(*) FILTER (WHERE etapa IN ('switcheo_concretado','comision_cobrada'))::int AS cambios,
       count(*) FILTER (WHERE etapa = 'comision_cobrada')::int AS cobrados
     FROM lead WHERE created_at > now() - $1::interval`,
    [intervalo],
  );
  return rows[0];
}

/** Dinero por campaña: atribuye por la fuente del lead y cuenta la comisión por fecha de cobro. */
export async function dineroPorCampana({ dias = 30 } = {}) {
  const intervalo = `${dias} days`;
  const { rows } = await query(
    `WITH l AS (
       SELECT ${CAMPANA("fuente")} AS campana, count(*) FILTER (WHERE created_at > now() - $1::interval) AS leads,
              count(*) FILTER (WHERE etapa IN ('switcheo_concretado','comision_cobrada') AND cerrado_at > now() - $1::interval) AS cambios,
              coalesce(sum(comision_mxn) FILTER (WHERE etapa = 'comision_cobrada' AND cobrado_at > now() - $1::interval), 0) AS comision,
              count(*) FILTER (WHERE etapa = 'switcheo_concretado') AS por_cobrar
         FROM lead GROUP BY 1
     ), ia AS (
       SELECT ${CAMPANA("fuente")} AS campana, sum(costo_usd) AS usd FROM conversacion WHERE creado_at > now() - $1::interval GROUP BY 1
     ), g AS (
       SELECT lower(utm_campaign) AS campana, sum(monto_mxn) AS gasto FROM gasto_campana WHERE fecha > (now() - $1::interval)::date GROUP BY 1
     )
     SELECT k.campana, coalesce(l.leads,0)::int AS leads, coalesce(l.cambios,0)::int AS cambios, coalesce(l.por_cobrar,0)::int AS por_cobrar,
            coalesce(l.comision,0)::float AS comision_mxn, coalesce(g.gasto,0)::float AS gasto_mxn, coalesce(ia.usd,0)::float AS costo_ia_usd
       FROM (SELECT campana FROM l WHERE leads > 0 OR comision > 0 OR por_cobrar > 0 UNION SELECT campana FROM g UNION SELECT campana FROM ia) k
       LEFT JOIN l USING (campana) LEFT JOIN g USING (campana) LEFT JOIN ia USING (campana)
      ORDER BY comision_mxn DESC, leads DESC LIMIT 50`,
    [intervalo],
  );
  return rows;
}

/** Números del dinero del mes (hora CDMX) y resultados por asesor. */
export async function finanzasMes() {
  const MES = `date_trunc('month', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City'`;
  const [t, a] = await Promise.all([
    query(
      `SELECT coalesce(sum(comision_mxn) FILTER (WHERE etapa = 'comision_cobrada' AND cobrado_at >= ${MES}), 0)::float AS cobrado,
              count(*) FILTER (WHERE etapa = 'comision_cobrada' AND cobrado_at >= ${MES})::int AS cobros,
              count(*) FILTER (WHERE etapa = 'switcheo_concretado')::int AS por_cobrar,
              count(*) FILTER (WHERE etapa IN ('switcheo_concretado','comision_cobrada') AND cerrado_at >= ${MES})::int AS cambios
         FROM lead`,
    ),
    query(
      `SELECT coalesce(u.nombre, 'Sin asignar') AS asesor,
              count(*) FILTER (WHERE l.consent_at >= ${MES})::int AS leads,
              round(avg(extract(epoch FROM l.ultimo_contacto_at - l.consent_at) / 3600) FILTER (WHERE l.consent_at >= ${MES} AND l.ultimo_contacto_at IS NOT NULL)::numeric, 1)::float AS horas_primer_contacto,
              count(*) FILTER (WHERE l.etapa IN ('cita_confirmada','atendido','switcheo_concretado','comision_cobrada') AND l.consent_at >= ${MES})::int AS citas,
              count(*) FILTER (WHERE l.etapa IN ('switcheo_concretado','comision_cobrada') AND l.cerrado_at >= ${MES})::int AS cambios,
              coalesce(sum(l.comision_mxn) FILTER (WHERE l.etapa = 'comision_cobrada' AND l.cobrado_at >= ${MES}), 0)::float AS comision
         FROM lead l LEFT JOIN crm_usuario u ON u.usuario = l.asesor_usuario
        WHERE l.consent_at IS NOT NULL
        GROUP BY 1 ORDER BY comision DESC, cambios DESC`,
    ),
  ]);
  const r = t.rows[0];
  return { ...r, ticket: r.cobros ? r.cobrado / r.cobros : 0, porAsesor: a.rows };
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
