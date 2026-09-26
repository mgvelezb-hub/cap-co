import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const URL = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL || "") ? process.env.DATABASE_URL : "";

test("migración: se puede volver a aplicar con varias llamadas en la misma franja", { skip: !URL && "sin base local" }, async () => {
  const { crearLead } = await import("../lib/leads/repo.js");
  const { query, cerrarPool } = await import("../lib/db/client.js");
  const creados = [];
  try {
    const inicio = new Date(Date.now() + 5 * 86_400_000);
    inicio.setUTCMinutes(0, 0, 0);
    for (let i = 0; i < 2; i += 1) {
      const { codigo } = await crearLead({ perfil: "curioso", resumen: "migracion", fuente: {} });
      creados.push(codigo);
      await query(`INSERT INTO cita (lead_codigo, inicio, tipo, franja) VALUES ($1, $2, 'llamada', 'manana')`, [codigo, inicio]);
    }
    const sql = readFileSync(new globalThis.URL("../lib/db/schema.sql", import.meta.url), "utf8");
    await assert.doesNotReject(() => query(sql));
  } finally {
    await query(`DELETE FROM lead WHERE codigo = ANY($1)`, [creados]);
    await cerrarPool();
  }
});
