import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import pg from "pg";

const URL_BASE = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL || "") ? process.env.DATABASE_URL : "";

// Corre en su propia base temporal: re-aplicar el esquema toma candados de tabla que, en la base
// compartida, chocaban con las pruebas que corren en paralelo (deadlock).
test("migración: se puede volver a aplicar con varias llamadas en la misma franja", { skip: !URL_BASE && "sin base local" }, async () => {
  const nombre = `capco_mig_${process.pid}_${Date.now()}`;
  const admin = new pg.Client({ connectionString: URL_BASE });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${nombre}`);
  const url = new URL(URL_BASE);
  url.pathname = `/${nombre}`;
  const c = new pg.Client({ connectionString: url.toString() });
  try {
    await c.connect();
    const sql = readFileSync(new URL("../lib/db/schema.sql", import.meta.url), "utf8");
    await c.query(sql);
    const inicio = new Date(Date.now() + 5 * 86_400_000);
    inicio.setUTCMinutes(0, 0, 0);
    for (const codigo of ["CAP-MIG2", "CAP-MIG3"]) {
      await c.query(`INSERT INTO lead (codigo, perfil) VALUES ($1, 'curioso')`, [codigo]);
      await c.query(`INSERT INTO cita (lead_codigo, inicio, tipo, franja) VALUES ($1, $2, 'llamada', 'manana')`, [codigo, inicio]);
    }
    const marcas = async () => (await c.query(`SELECT nombre, aplicada FROM migracion_unica ORDER BY nombre`)).rows;
    const antes = await marcas();
    await assert.doesNotReject(() => c.query(sql));
    // Los ajustes de datos "de una vez" no se repiten.
    assert.deepEqual(await marcas(), antes);
    assert.deepEqual(antes.map((m) => m.nombre), ["cobro_tipo_previos", "crm_leads_previos"]);
  } finally {
    await c.end().catch(() => {});
    await admin.query(`DROP DATABASE IF EXISTS ${nombre}`);
    await admin.end();
  }
});
