// Aplica lib/db/schema.sql a la base de DATABASE_URL. Idempotente.
// Uso: DATABASE_URL=postgres://... node scripts/migrate.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(path.join(aqui, "..", "lib", "db", "schema.sql"), "utf8");
const url = process.env.DATABASE_URL;

if (!url) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const esLocal = /localhost|127\.0\.0\.1/.test(url);
const client = new pg.Client({ connectionString: url, ssl: esLocal ? false : { rejectUnauthorized: true } });
await client.connect();
try {
  await client.query(sql);
  const { rows } = await client.query("select count(*)::int as n from lead");
  console.log(`Esquema aplicado. Leads existentes: ${rows[0].n}`);
} finally {
  await client.end();
}
