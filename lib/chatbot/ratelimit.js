// Límites de uso por ventana fija, contados en PostgreSQL para que valgan entre instancias
// de Vercel. Sin base, cae a un contador en memoria (freno suave). Las claves llevan un
// hash de la IP, nunca la IP.

import { createHash } from "node:crypto";
import { query, dbDisponible } from "../db/client.js";

export const LIMITES = {
  chat: { max: 30, ventanaMin: 10 }, // mensajes por visitante
  foto: { max: 6, ventanaMin: 24 * 60 }, // fotos de boleta por visitante al día
  contacto: { max: 10, ventanaMin: 60 },
  cita: { max: 5, ventanaMin: 60 },
  chatGlobal: { max: 4000, ventanaMin: 24 * 60 }, // freno de gasto: mensajes al día en todo el sitio
  fotoGlobal: { max: 300, ventanaMin: 24 * 60 }, // fotos al día en todo el sitio
};

const memoria = new Map();

export function hashIp(ip) {
  return createHash("sha256")
    .update(`${process.env.RATE_SALT || "capco"}:${ip}`)
    .digest("hex")
    .slice(0, 24);
}

function inicioVentana(ventanaMin, ahora) {
  const ms = ventanaMin * 60_000;
  return new Date(Math.floor(ahora / ms) * ms);
}

/**
 * Cuenta un uso y dice si está permitido.
 * @param {keyof LIMITES} tipo
 * @param {string} sujeto hash de IP, o "global"
 */
export async function permitir(tipo, sujeto, ahora = Date.now()) {
  const { max, ventanaMin } = LIMITES[tipo];
  const clave = `${tipo}:${sujeto}`;
  const ventana = inicioVentana(ventanaMin, ahora);
  if (dbDisponible()) {
    try {
      const { rows } = await query(
        `INSERT INTO limite_uso (clave, ventana, n) VALUES ($1, $2, 1)
         ON CONFLICT (clave, ventana) DO UPDATE SET n = limite_uso.n + 1
         RETURNING n`,
        [clave, ventana],
      );
      return rows[0].n <= max;
    } catch (err) {
      console.error("[ratelimit] sin base, uso memoria:", err.message);
    }
  }
  const llave = `${clave}@${ventana.getTime()}`;
  const n = (memoria.get(llave) || 0) + 1;
  memoria.set(llave, n);
  if (memoria.size > 5000) memoria.clear();
  return n <= max;
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
