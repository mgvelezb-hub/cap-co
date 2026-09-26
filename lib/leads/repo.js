// Acceso a la tabla lead. Todas las funciones toleran que no haya DB:
// devuelven null/false y lo registran, para que el chat nunca se caiga por esto.

import { query, dbDisponible } from "../db/client.js";
import { generarCodigo } from "../chatbot/codigo.js";
import { AVISO_VERSION } from "./validar.js";

const INTENTOS_CODIGO = 5;

/**
 * Crea el lead anónimo al cerrar a WhatsApp. Reintenta si el código choca.
 * @returns {Promise<{codigo:string, persistido:boolean}>}
 */
export async function crearLead({
  perfil,
  resumen,
  fuente,
  probabilidad = null,
  institucionOrigen = null,
  tasaActual = null,
  tasaOferta = null,
  ahorro = null,
  conversacionId = null,
}) {
  if (!dbDisponible()) {
    console.warn("[leads] sin DATABASE_URL: lead no persistido");
    return { codigo: generarCodigo(), persistido: false };
  }
  for (let i = 0; i < INTENTOS_CODIGO; i += 1) {
    const codigo = generarCodigo();
    try {
      const prob = Number.isFinite(probabilidad) ? Math.max(0, Math.min(100, Math.round(probabilidad))) : null;
      const num = (v) => (Number.isFinite(v) ? v : null);
      await query(
        `INSERT INTO lead (codigo, perfil, resumen, fuente, probabilidad, institucion_origen, tasa_actual, tasa_oferta, ahorro, conversacion_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          codigo,
          perfil,
          (resumen || "").slice(0, 400),
          JSON.stringify(fuente || {}),
          prob,
          typeof institucionOrigen === "string" ? institucionOrigen.slice(0, 80) : null,
          num(tasaActual),
          num(tasaOferta),
          num(ahorro),
          typeof conversacionId === "string" ? conversacionId.slice(0, 64) : null,
        ],
      );
      return { codigo, persistido: true };
    } catch (err) {
      if (err.code === "23505") continue; // unique_violation: otro código
      console.error("[leads] error al crear lead:", err.message);
      return { codigo, persistido: false };
    }
  }
  console.error("[leads] no se pudo generar un código único");
  return { codigo: generarCodigo(), persistido: false };
}

export async function registrarClickWhatsApp(codigo) {
  if (!dbDisponible()) return false;
  try {
    const r = await query(
      `UPDATE lead SET whatsapp_click_at = COALESCE(whatsapp_click_at, now()), actualizado_at = now() WHERE codigo = $1`,
      [codigo],
    );
    return r.rowCount > 0;
  } catch (err) {
    console.error("[leads] error al registrar click:", err.message);
    return false;
  }
}

/** Guarda nombre y teléfono SOLO con consentimiento (consent_at). */
export async function registrarContacto({ codigo, nombre, telefono }) {
  if (!dbDisponible()) return { ok: false, motivo: "sin_db" };
  try {
    const r = await query(
      `UPDATE lead
         SET nombre = $2, telefono = $3, consent_at = now(), consent_version = $4, actualizado_at = now()
       WHERE codigo = $1`,
      [codigo, nombre, telefono, AVISO_VERSION],
    );
    return r.rowCount > 0 ? { ok: true } : { ok: false, motivo: "no_existe" };
  } catch (err) {
    console.error("[leads] error al registrar contacto:", err.message);
    return { ok: false, motivo: "error" };
  }
}

export async function obtenerLead(codigo) {
  if (!dbDisponible()) return null;
  const { rows } = await query(
    `SELECT codigo, perfil, resumen, fuente, probabilidad, etapa, institucion_origen, tasa_actual, tasa_oferta, ahorro,
            created_at, whatsapp_click_at,
            nombre, telefono, consent_at, contactado_at, notas
       FROM lead WHERE codigo = $1`,
    [codigo],
  );
  return rows[0] || null;
}

/** Estadísticas para la vista interna. */
export async function estadisticas({ dias = 30 } = {}) {
  if (!dbDisponible()) return null;
  const [totales, porPerfil, porDia, porFuente, recientes] = await Promise.all([
    query(
      `SELECT count(*)::int AS leads,
              count(whatsapp_click_at)::int AS clicks,
              count(consent_at)::int AS contactos,
              count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS ultimos_7
         FROM lead`,
    ),
    query(
      `SELECT perfil, count(*)::int AS n, count(whatsapp_click_at)::int AS clicks, count(consent_at)::int AS contactos
         FROM lead GROUP BY perfil ORDER BY n DESC`,
    ),
    query(
      `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'America/Mexico_City'), 'YYYY-MM-DD') AS dia,
              count(*)::int AS n, count(whatsapp_click_at)::int AS clicks
         FROM lead
        WHERE created_at > now() - ($1 || ' days')::interval
        GROUP BY 1 ORDER BY 1 DESC`,
      [String(dias)],
    ),
    query(
      `SELECT COALESCE(NULLIF(fuente->>'utm_source', ''), 'directo') AS fuente, count(*)::int AS n
         FROM lead GROUP BY 1 ORDER BY n DESC LIMIT 10`,
    ),
    query(
      `SELECT codigo, perfil, resumen, probabilidad, institucion_origen, tasa_actual, tasa_oferta, ahorro,
              created_at, whatsapp_click_at, nombre, telefono, consent_at, contactado_at, etapa, notas,
              fuente->>'utm_source' AS utm_source
         FROM lead ORDER BY created_at DESC LIMIT 50`,
    ),
  ]);
  return {
    totales: totales.rows[0],
    porPerfil: porPerfil.rows,
    porDia: porDia.rows,
    porFuente: porFuente.rows,
    recientes: recientes.rows,
  };
}

export const ETAPAS = [
  "cita_solicitada",
  "cita_confirmada",
  "atendido",
  "switcheo_concretado",
  "comision_cobrada",
  "descartado",
];

const TEXTO_MAX = { notas: 2000, casa_destino: 120, motivo_descarte: 300, asesor: 80 };

/**
 * Cambios desde el panel. contactado_at se fija la primera vez que sale de "cita_solicitada";
 * cerrado_at, la primera vez que llega a "switcheo_concretado" o "comision_cobrada".
 */
export async function actualizarLead(codigo, cambios) {
  if (!dbDisponible()) return { ok: false, motivo: "sin_db" };
  const { etapa } = cambios;
  if (etapa !== undefined && !ETAPAS.includes(etapa)) return { ok: false, motivo: "etapa_invalida" };
  for (const [campo, max] of Object.entries(TEXTO_MAX)) {
    const v = cambios[campo];
    if (v !== undefined && v !== null && (typeof v !== "string" || v.length > max)) return { ok: false, motivo: `${campo}_invalido` };
  }
  let comision = cambios.comision_mxn;
  if (comision !== undefined && comision !== null && comision !== "") {
    comision = Number(comision);
    if (!Number.isFinite(comision) || comision < 0 || comision > 10_000_000) return { ok: false, motivo: "comision_invalida" };
  } else if (comision === "") {
    comision = null;
  }
  const r = await query(
    `UPDATE lead SET
       etapa           = COALESCE($2, etapa),
       notas           = CASE WHEN $3::boolean THEN $4 ELSE notas END,
       casa_destino    = CASE WHEN $5::boolean THEN $6 ELSE casa_destino END,
       comision_mxn    = CASE WHEN $7::boolean THEN $8::numeric ELSE comision_mxn END,
       motivo_descarte = CASE WHEN $9::boolean THEN $10 ELSE motivo_descarte END,
       asesor          = CASE WHEN $11::boolean THEN $12 ELSE asesor END,
       contactado_at   = CASE WHEN $2 IS NOT NULL AND $2 <> 'cita_solicitada' THEN COALESCE(contactado_at, now()) ELSE contactado_at END,
       cerrado_at      = CASE WHEN $2 IN ('switcheo_concretado', 'comision_cobrada') THEN COALESCE(cerrado_at, now()) ELSE cerrado_at END,
       cobrado_at      = CASE WHEN $2 = 'comision_cobrada' THEN COALESCE(cobrado_at, now()) ELSE cobrado_at END,
       actualizado_at  = now()
     WHERE codigo = $1
     RETURNING codigo, etapa, notas, casa_destino, comision_mxn, motivo_descarte, asesor, contactado_at, cerrado_at`,
    [
      codigo,
      etapa ?? null,
      cambios.notas !== undefined, cambios.notas ?? null,
      cambios.casa_destino !== undefined, cambios.casa_destino ?? null,
      comision !== undefined, comision ?? null,
      cambios.motivo_descarte !== undefined, cambios.motivo_descarte ?? null,
      cambios.asesor !== undefined, cambios.asesor ?? null,
    ],
  );
  return r.rowCount > 0 ? { ok: true, lead: r.rows[0] } : { ok: false, motivo: "no_existe" };
}

/** Leads para la tabla del panel, con filtro por etapa y búsqueda por código o nombre. */
export async function buscarLeads({ etapa = null, texto = "", limite = 200 } = {}) {
  if (!dbDisponible()) return [];
  const { rows } = await query(
    `SELECT l.codigo, l.perfil, l.resumen, l.probabilidad, l.institucion_origen, l.tasa_actual, l.tasa_oferta, l.ahorro,
            l.created_at, l.whatsapp_click_at, l.nombre, l.telefono, l.consent_at, l.contactado_at, l.etapa, l.notas,
            l.casa_destino, l.comision_mxn, l.motivo_descarte, l.asesor, l.cerrado_at,
            l.fuente->>'utm_source' AS utm_source, l.fuente->>'utm_campaign' AS utm_campaign,
            c.inicio AS cita_inicio, c.estado AS cita_estado
       FROM lead l
       LEFT JOIN LATERAL (SELECT inicio, estado FROM cita WHERE lead_codigo = l.codigo AND estado <> 'cancelada'
                           ORDER BY creado_at DESC LIMIT 1) c ON true
      WHERE ($1::text IS NULL OR l.etapa = $1)
        AND ($2 = '' OR l.codigo ILIKE '%' || $2 || '%' OR l.nombre ILIKE '%' || $2 || '%')
      ORDER BY l.created_at DESC
      LIMIT $3`,
    [etapa, texto.trim().slice(0, 60), limite],
  );
  return rows;
}

/** Números de arriba del panel: lo que hay que atender hoy y lo que entró de dinero en el mes. */
export async function resumenOperacion() {
  if (!dbDisponible()) return null;
  const { rows } = await query(
    `SELECT
       count(*) FILTER (WHERE etapa = 'cita_solicitada')::int AS por_contactar,
       coalesce(round(extract(epoch FROM now() - min(created_at) FILTER (WHERE etapa = 'cita_solicitada')) / 3600), 0)::int AS horas_mas_antiguo,
       count(*) FILTER (WHERE etapa IN ('switcheo_concretado', 'comision_cobrada')
                         AND cerrado_at >= date_trunc('month', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City')::int AS switcheos_mes,
       coalesce(sum(comision_mxn) FILTER (WHERE etapa = 'comision_cobrada'
                         AND coalesce(cobrado_at, cerrado_at) >= date_trunc('month', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City'), 0)::float AS comision_mes,
       coalesce(round(avg(extract(epoch FROM contactado_at - created_at) / 3600) FILTER (WHERE contactado_at IS NOT NULL
                         AND created_at > now() - interval '30 days')::numeric, 1), 0)::float AS horas_primer_contacto
     FROM lead`,
  );
  return rows[0];
}

/** Todos los leads para exportar (incluye datos personales consentidos: solo para el panel). */
export async function leadsParaExportar() {
  if (!dbDisponible()) return [];
  const { rows } = await query(
    `SELECT codigo, created_at, perfil, etapa, probabilidad, institucion_origen, tasa_actual, tasa_oferta, ahorro,
            resumen, fuente->>'utm_source' AS utm_source, fuente->>'utm_campaign' AS utm_campaign,
            whatsapp_click_at, nombre, telefono, consent_at, contactado_at, notas,
            casa_destino, comision_mxn, motivo_descarte, asesor, cerrado_at
       FROM lead ORDER BY created_at DESC`,
  );
  return rows;
}

/**
 * Retención: 12 meses después de la última actividad se borran nombre, teléfono y notas del
 * lead (queda el registro anónimo para estadística). Si se cobró comisión, el registro se
 * conserva 5 años por obligación fiscal (CFF art. 30). Lo llama el cron de la mañana.
 */
export async function anonimizarLeadsViejos() {
  if (!dbDisponible()) return 0;
  const r = await query(
    `UPDATE lead SET nombre = NULL, telefono = NULL, notas = NULL
      WHERE (nombre IS NOT NULL OR telefono IS NOT NULL OR notas IS NOT NULL)
        AND greatest(created_at, contactado_at, cerrado_at, whatsapp_click_at, actualizado_at, cobrado_at,
                     (SELECT max(actualizado_at) FROM cita WHERE cita.lead_codigo = lead.codigo))
            < now() - CASE WHEN cobrado_at IS NOT NULL OR etapa = 'comision_cobrada' THEN interval '5 years' ELSE interval '12 months' END`,
  );
  return r.rowCount;
}
