// Aplica lib/db/schema.sql a la base de DATABASE_URL. Idempotente.
// Uso: DATABASE_URL=postgres://... node scripts/migrate.mjs
// Corre antes de cada build (npm run build): sin DATABASE_URL avisa y no hace nada, para
// que un build local sin base no falle; con base, un error de migración detiene el deploy.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

// El SSL va en la opción ssl; sin sslmode en la URL, pg no muestra su aviso de cambio de versión.
function sinModoSsl(url) {
  try {
    const u = new URL(url);
    u.searchParams.delete("sslmode");
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return url;
  }
}

const aqui = path.dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(path.join(aqui, "..", "lib", "db", "schema.sql"), "utf8");
const url = process.env.DATABASE_URL;

if (!url) {
  console.warn("[migrate] Sin DATABASE_URL: no se aplica el esquema.");
  process.exit(0);
}

const esLocal = /localhost|127\.0\.0\.1/.test(url);
const client = new pg.Client({ connectionString: sinModoSsl(url), ssl: esLocal ? false : { rejectUnauthorized: true } });
await client.connect();
try {
  // Si el sitio en vivo tiene ocupada una tabla, mejor que falle el build (producción sigue igual)
  // a que la migración se quede esperando y bloquee al sitio.
  await client.query("SET lock_timeout = '5s'");
  await client.query(sql);
  const { rows } = await client.query(
    "select (select count(*)::int from lead) as leads, (select count(*)::int from precio_metal) as fotos",
  );
  console.log(`[migrate] Esquema aplicado. Leads: ${rows[0].leads} · fotografías de precios: ${rows[0].fotos}`);
} finally {
  await client.end();
}
