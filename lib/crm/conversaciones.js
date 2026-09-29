// Conversaciones del chat para el CRM: perfil anónimo, indicadores y resumen, aunque no haya lead.
// El perfil vive en chat_apertura (se guarda aunque la persona no escriba); conversacion.perfil es
// el que llevaba el último mensaje y sirve de respaldo.

import { query, dbDisponible } from "../db/client.js";
import { CAMPOS_PERFIL } from "../chatbot/perfil-visita.js";

/** Conversaciones recientes, la más nueva primero, con el lead que salió de cada una (si hay). */
export async function listarConversaciones({ dias = 30, limite = 100, caso = null } = {}) {
  if (!dbDisponible()) return [];
  const params = [`${dias} days`, limite];
  let filtro = "";
  if (caso) {
    params.push(caso);
    filtro = `AND coalesce(a.perfil, c.perfil)->>'caso' = $${params.length}`;
  }
  const { rows } = await query(
    `SELECT c.id, c.creado_at, c.actualizado_at, c.fuente, coalesce(a.perfil, c.perfil) AS perfil, c.resumen,
            c.turnos, c.fotos, c.cotizo, c.avanzo, c.fuera_de_tema, c.costo_usd,
            (SELECT l.codigo FROM lead l WHERE l.conversacion_id = c.id ORDER BY l.created_at DESC LIMIT 1) AS lead_codigo
       FROM conversacion c LEFT JOIN chat_apertura a ON a.id = c.id
      WHERE c.creado_at > now() - $1::interval ${filtro}
      ORDER BY c.actualizado_at DESC
      LIMIT $2`,
    params,
  );
  return rows;
}

/**
 * Quién abre el chat y qué contesta.
 * { abrieron, escribieron, contestaron, omitieron, se_fueron, campos: { edad: { "25_34": 3, no_dice: 1 }, ... }, por_origen: [...] }
 * se_fueron = abrieron el chat y no mandaron ningún mensaje.
 */
export async function distribucionPerfil({ dias = 30 } = {}) {
  if (!dbDisponible()) return null;
  const intervalo = `${dias} days`;
  const [tot, porCampo, origen] = await Promise.all([
    query(
      `SELECT count(*)::int AS abrieron,
              count(c.id)::int AS escribieron,
              count(*) FILTER (WHERE a.estado = 'contesto')::int AS contestaron,
              count(*) FILTER (WHERE a.estado = 'omitio')::int AS omitieron,
              count(*) FILTER (WHERE c.id IS NULL)::int AS se_fueron
         FROM chat_apertura a LEFT JOIN conversacion c ON c.id = a.id
        WHERE a.creado_at > now() - $1::interval`,
      [intervalo],
    ),
    query(
      `SELECT k.campo, a.perfil->>k.campo AS valor, count(*)::int AS n
         FROM chat_apertura a CROSS JOIN unnest($2::text[]) AS k(campo)
        WHERE a.creado_at > now() - $1::interval AND a.perfil ? k.campo
        GROUP BY 1, 2`,
      [intervalo, CAMPOS_PERFIL],
    ),
    // Cómo nos conoció contra lo que pasó después: sirve para decidir dónde anunciarse.
    query(
      `SELECT coalesce(a.perfil->>'origen', 'sin_dato') AS origen,
              count(*)::int AS abrieron,
              count(c.id)::int AS escribieron,
              count(*) FILTER (WHERE c.cotizo)::int AS cotizaron,
              count(*) FILTER (WHERE c.avanzo)::int AS conviene,
              count(DISTINCT l.codigo)::int AS leads
         FROM chat_apertura a
         LEFT JOIN conversacion c ON c.id = a.id
         LEFT JOIN lead l ON l.conversacion_id = a.id
        WHERE a.creado_at > now() - $1::interval
        GROUP BY 1 ORDER BY abrieron DESC`,
      [intervalo],
    ),
  ]);
  const campos = Object.fromEntries(CAMPOS_PERFIL.map((c) => [c, {}]));
  for (const r of porCampo.rows) campos[r.campo][r.valor] = r.n;
  return { dias, ...tot.rows[0], campos, por_origen: origen.rows };
}
