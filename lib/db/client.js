// Conexión a PostgreSQL (local en desarrollo, Neon en producción) con `pg`.
// Si no hay DATABASE_URL, la app sigue funcionando: las funciones de leads no hacen nada
// y lo registran en consola. Así el chatbot nunca depende de la DB para responder.

import pg from "pg";

const URL = process.env.DATABASE_URL || "";

let pool = null;

export function dbDisponible() {
  return URL.length > 0;
}

function obtenerPool() {
  if (!pool) {
    const esLocal = /localhost|127\.0\.0\.1/.test(URL);
    pool = new pg.Pool({
      connectionString: URL,
      ssl: esLocal ? false : { rejectUnauthorized: true },
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
    pool.on("error", (err) => console.error("[db] error en pool:", err.message));
  }
  return pool;
}

export async function query(texto, params = []) {
  if (!dbDisponible()) {
    throw new Error("DATABASE_URL no configurada");
  }
  return obtenerPool().query(texto, params);
}

export async function cerrarPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
