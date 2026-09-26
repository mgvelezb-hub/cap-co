// Límites de uso por ventana fija, contados en PostgreSQL para que valgan entre instancias
// de Vercel. Todas las claves de un request van en una sola consulta. Si la base no responde,
// cae a un contador en memoria y deja de intentar la base 60 s (el chat no se congela).
// Las claves llevan un hash de la IP con sal secreta, nunca la IP.

import { createHash, randomBytes } from "node:crypto";
import { query, dbDisponible } from "../db/client.js";

const DIA = 24 * 60;
export const LIMITES = {
  chat: { max: 30, ventanaMin: 10 }, // mensajes por visitante
  chatDia: { max: 150, ventanaMin: DIA }, // mensajes por visitante al día
  foto: { max: 6, ventanaMin: DIA }, // fotos de boleta por visitante al día
  contacto: { max: 10, ventanaMin: 60 },
  cita: { max: 5, ventanaMin: 60 },
  // Freno de gasto de todo el sitio por día (Vercel: CHAT_TOPE_DIARIO / FOTO_TOPE_DIARIO).
  chatGlobal: { max: Number(process.env.CHAT_TOPE_DIARIO) || 3000, ventanaMin: DIA },
  fotoGlobal: { max: Number(process.env.FOTO_TOPE_DIARIO) || 300, ventanaMin: DIA },
};

// Los días se cuentan en hora de la Ciudad de México (UTC−6, sin horario de verano desde 2022).
const OFFSET_CDMX_MS = -6 * 3600_000;
const PAUSA_TRAS_FALLA_MS = 60_000;

const memoria = new Map();
let baseEnPausaHasta = 0;

let sal = process.env.RATE_SALT;
if (!sal) {
  // Sin sal configurada no se usa una sal conocida: una aleatoria por instancia protege la IP
  // (los contadores se reinician si cambia la instancia, lo cual es aceptable).
  sal = randomBytes(16).toString("hex");
  if (process.env.VERCEL_ENV === "production") console.error("[ratelimit] Falta RATE_SALT en producción");
}

export function hashIp(ip) {
  return createHash("sha256").update(`${sal}:${ip}`).digest("hex").slice(0, 24);
}

export function inicioVentana(ventanaMin, ahora) {
  const ms = ventanaMin * 60_000;
  const local = ahora + OFFSET_CDMX_MS;
  return new Date(Math.floor(local / ms) * ms - OFFSET_CDMX_MS);
}

/**
 * Cuenta un uso en varias claves a la vez y devuelve cuál se pasó, o null si todo va bien.
 * @param {Array<[keyof LIMITES, string]>} pares [tipo, sujeto]
 * @returns {Promise<keyof LIMITES | null>}
 */
export async function revisarLimites(pares, ahora = Date.now()) {
  const filas = pares.map(([tipo, sujeto]) => ({
    tipo,
    clave: `${tipo}:${sujeto}`,
    ventana: inicioVentana(LIMITES[tipo].ventanaMin, ahora),
  }));
  let conteos = null;
  if (dbDisponible() && ahora >= baseEnPausaHasta) {
    try {
      const valores = filas.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2}::timestamptz, 1)`).join(", ");
      const params = filas.flatMap((f) => [f.clave, f.ventana]);
      const { rows } = await query(
        `INSERT INTO limite_uso (clave, ventana, n) VALUES ${valores}
         ON CONFLICT (clave, ventana) DO UPDATE SET n = limite_uso.n + 1
         RETURNING clave, n`,
        params,
      );
      conteos = new Map(rows.map((r) => [r.clave, r.n]));
    } catch (err) {
      baseEnPausaHasta = ahora + PAUSA_TRAS_FALLA_MS;
      console.error("[ratelimit] base no disponible, uso memoria 60 s:", err.message);
    }
  }
  if (!conteos) {
    conteos = new Map();
    for (const f of filas) {
      const llave = `${f.clave}@${f.ventana.getTime()}`;
      const n = (memoria.get(llave) || 0) + 1;
      memoria.set(llave, n);
      conteos.set(f.clave, n);
    }
    if (memoria.size > 5000) memoria.clear();
  }
  for (const f of filas) {
    if (conteos.get(f.clave) > LIMITES[f.tipo].max) return f.tipo;
  }
  return null;
}

/** Atajo para una sola clave. */
export async function permitir(tipo, sujeto, ahora = Date.now()) {
  return (await revisarLimites([[tipo, sujeto]], ahora)) === null;
}

/** Borra contadores de ventanas que ya terminaron (lo llama el cron de la mañana). */
export async function limpiarLimites() {
  if (!dbDisponible()) return 0;
  const r = await query(`DELETE FROM limite_uso WHERE ventana < now() - interval '2 days'`);
  return r.rowCount;
}

export function ipDeRequest(request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "desconocida";
}
