// Límites y eventos contra la base. Sin DATABASE_URL corren solo las pruebas en memoria.
import { test } from "node:test";
import assert from "node:assert/strict";

const URL = process.env.DATABASE_URL;

test("límites en memoria: cuenta por ventana y visitante", { skip: Boolean(URL) && "con base se prueba abajo" }, async () => {
  const { permitir, hashIp } = await import("../lib/chatbot/ratelimit.js");
  const quien = hashIp(`prueba-${Math.random()}`);
  const t = Date.UTC(2026, 8, 26, 12, 0, 0);
  let ok = 0;
  for (let i = 0; i < 8; i += 1) if (await permitir("foto", quien, t)) ok += 1;
  assert.equal(ok, 6);
  assert.equal(await permitir("foto", hashIp("otra-ip"), t), true);
  assert.equal(await permitir("foto", quien, t + 25 * 3600_000), true, "ventana nueva");
});

test("límites en la base: valen entre instancias y se limpian", { skip: !URL && "sin DATABASE_URL" }, async () => {
  const { permitir, hashIp, limpiarLimites } = await import("../lib/chatbot/ratelimit.js");
  const { query, cerrarPool } = await import("../lib/db/client.js");
  try {
    const quien = hashIp(`prueba-${Math.random()}`);
    const t = Date.now();
    let ok = 0;
    for (let i = 0; i < 8; i += 1) if (await permitir("foto", quien, t)) ok += 1;
    assert.equal(ok, 6);
    const r = await query(`SELECT n FROM limite_uso WHERE clave = $1`, [`foto:${quien}`]);
    assert.equal(r.rows[0].n, 8);
    assert.doesNotMatch(r.rows.map(String).join(), /\d+\.\d+\.\d+\.\d+/);
    await query(`INSERT INTO limite_uso (clave, ventana, n) VALUES ('viejo:x', now() - interval '3 days', 1)`);
    assert.ok((await limpiarLimites()) >= 1);
  } finally {
    await cerrarPool();
  }
});

test("eventos: el crítico se avisa una vez cada 6 h por tipo; 5 errores en 15 min = chat caído", { skip: !URL && "sin DATABASE_URL" }, async () => {
  const { registrarEvento, eventosRecientes } = await import("../lib/alertas/eventos.js");
  const { query, cerrarPool } = await import("../lib/db/client.js");
  try {
    await query(`DELETE FROM evento_sistema`);
    await registrarEvento("precios_fallo", "critico", "prueba 1");
    await registrarEvento("precios_fallo", "critico", "prueba 2");
    const avisados = await query(`SELECT count(*)::int AS n FROM evento_sistema WHERE tipo = 'precios_fallo' AND notificado_at IS NOT NULL`);
    assert.equal(avisados.rows[0].n, 1);
    for (let i = 0; i < 5; i += 1) await registrarEvento("error_chat", "aviso", `falla ${i}`);
    const caido = await query(`SELECT count(*)::int AS n FROM evento_sistema WHERE tipo = 'chat_caido' AND notificado_at IS NOT NULL`);
    assert.equal(caido.rows[0].n, 1);
    assert.ok((await eventosRecientes()).length >= 7);
    await query(`DELETE FROM evento_sistema`);
  } finally {
    await cerrarPool();
  }
});
