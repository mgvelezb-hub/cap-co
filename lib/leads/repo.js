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
        `INSERT INTO lead (codigo, perfil, resumen, fuente, probabilidad, institucion_origen, tasa_actual, tasa_oferta, ahorro)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
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
      `UPDATE lead SET whatsapp_click_at = COALESCE(whatsapp_click_at, now()) WHERE codigo = $1`,
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
         SET nombre = $2, telefono = $3, consent_at = now(), consent_version = $4
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
              created_at, whatsapp_click_at, nombre, telefono, consent_at, contactado_at,
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
