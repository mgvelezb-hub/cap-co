// Límites y eventos contra la base. Solo corre contra una base LOCAL (nunca producción),
// borra únicamente lo que crea, y no envía correos.
import { test } from "node:test";
import assert from "node:assert/strict";

const URL = process.env.DATABASE_URL || "";
const LOCAL = /@(localhost|127\.0\.0\.1)[:/]/.test(URL);
delete process.env.RESEND_API_KEY;

test("límites: ventana diaria en hora de la Ciudad de México", async () => {
  const { inicioVentana } = await import("../lib/chatbot/ratelimit.js");
  // 26-sep 23:30 CDMX = 27-sep 05:30 UTC → el día empieza el 26-sep 00:00 CDMX = 06:00 UTC.
  assert.equal(inicioVentana(24 * 60, Date.UTC(2026, 8, 27, 5, 30)).toISOString(), "2026-09-26T06:00:00.000Z");
});

test("límites en memoria: cuenta por ventana y visitante", { skip: LOCAL && "con base se prueba abajo" }, async () => {
  const { permitir, hashIp } = await import("../lib/chatbot/ratelimit.js");
  const quien = hashIp(`prueba-${Math.random()}`);
  const t = Date.UTC(2026, 8, 26, 12, 0, 0);
  let ok = 0;
  for (let i = 0; i < 8; i += 1) if (await permitir("foto", quien, t)) ok += 1;
  assert.equal(ok, 6);
  assert.equal(await permitir("foto", hashIp("otra-ip"), t), true);
  assert.equal(await permitir("foto", quien, t + 25 * 3600_000), true, "ventana nueva");
});

test("límites en la base: una consulta para varias claves, dice cuál se pasó", { skip: !LOCAL && "sin base local" }, async () => {
  const { revisarLimites, hashIp, limpiarLimites } = await import("../lib/chatbot/ratelimit.js");
  const { query, cerrarPool } = await import("../lib/db/client.js");
  try {
    const quien = hashIp(`prueba-${Math.random()}`);
    const t = Date.now();
    let resultado = null;
    for (let i = 0; i < 7; i += 1) resultado = await revisarLimites([["chat", quien], ["foto", quien]], t);
    assert.equal(resultado, "foto");
    const r = await query(`SELECT clave, n FROM limite_uso WHERE clave LIKE $1 ORDER BY clave`, [`%:${quien}`]);
    assert.deepEqual(r.rows.map((x) => x.n), [7, 7]);
    await query(`INSERT INTO limite_uso (clave, ventana, n) VALUES ('viejo:prueba', now() - interval '3 days', 1)`);
    assert.ok((await limpiarLimites()) >= 1);
    await query(`DELETE FROM limite_uso WHERE clave LIKE $1`, [`%:${quien}`]);
  } finally {
    await cerrarPool();
  }
});

test("eventos: un aviso por tipo aunque lleguen juntos; 5 errores en 15 min = chat caído crítico", { skip: !LOCAL && "sin base local" }, async () => {
  const { registrarEvento } = await import("../lib/alertas/eventos.js");
  const { diagnostico } = await import("../lib/alertas/salud.js");
  const { query, cerrarPool } = await import("../lib/db/client.js");
  const tipos = ["precios_fallo", "error_chat", "chat_caido"];
  const limpiar = async () => {
    await query(`DELETE FROM evento_sistema WHERE tipo = ANY($1) AND creado_at > now() - interval '1 hour'`, [tipos]);
    await query(`DELETE FROM alerta_silencio WHERE tipo = ANY($1)`, [tipos]);
  };
  try {
    await limpiar();
    await Promise.all([1, 2, 3].map((i) => registrarEvento("precios_fallo", "critico", `prueba ${i}`)));
    const avisados = await query(`SELECT count(*)::int AS n FROM evento_sistema WHERE tipo = 'precios_fallo' AND notificado_at IS NOT NULL`);
    assert.equal(avisados.rows[0].n, 1);
    for (let i = 0; i < 5; i += 1) await registrarEvento("error_chat", "aviso", `falla ${i}`);
    const caido = await query(`SELECT nivel, notificado_at FROM evento_sistema WHERE tipo = 'chat_caido'`);
    assert.equal(caido.rows.length, 1);
    assert.equal(caido.rows[0].nivel, "critico");
    assert.ok(caido.rows[0].notificado_at);
    assert.equal((await diagnostico()).estado, "caido");
    await limpiar();
  } finally {
    await cerrarPool();
  }
});
