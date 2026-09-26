import { test } from "node:test";
import assert from "node:assert/strict";

const URL = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL || "") ? process.env.DATABASE_URL : "";

test("agenda en la base: reservar, choque de horario, reemplazo y etapa del lead", { skip: !URL && "sin base local" }, async () => {
  const { reservar, disponibilidad, actualizarCita } = await import("../lib/agenda/repo.js");
  const { crearLead, actualizarLead, resumenOperacion } = await import("../lib/leads/repo.js");
  const { query, cerrarPool } = await import("../lib/db/client.js");
  const creados = [];
  try {
    const a = await crearLead({ perfil: "quiere_traspaso", resumen: "a", fuente: {} });
    const b = await crearLead({ perfil: "curioso", resumen: "b", fuente: {} });
    creados.push(a.codigo, b.codigo);
    const libres = await disponibilidad();
    const h1 = libres[0].horas[0];
    const h2 = libres[0].horas[1];
    assert.equal((await reservar(a.codigo, h1)).ok, true);
    assert.deepEqual(await reservar(b.codigo, h1), { ok: false, motivo: "ocupado" });
    assert.ok(!(await disponibilidad())[0].horas.some((h) => h.getTime() === h1.getTime()), "ya no se ofrece");
    const re = await reservar(a.codigo, h2);
    assert.equal(re.ok, true, "cambiar de horario libera el anterior");
    assert.equal((await reservar(b.codigo, h1)).ok, true);
    assert.equal((await reservar(a.codigo, new Date(h1.getTime() + 30 * 60_000))).motivo, "horario_invalido");
    assert.equal((await actualizarCita(re.cita.id, { estado: "confirmada", lugar: "Oficina Roma" })).ok, true);
    const l = await query(`SELECT etapa, contactado_at FROM lead WHERE codigo = $1`, [a.codigo]);
    assert.equal(l.rows[0].etapa, "cita_confirmada");
    assert.ok(l.rows[0].contactado_at);
    const antes = await resumenOperacion();
    const r = await actualizarLead(a.codigo, { etapa: "comision_cobrada", comision_mxn: "1500", casa_destino: "Montepío Luz Saviñón", asesor: "ana" });
    assert.equal(r.ok, true);
    assert.ok(r.lead.cerrado_at);
    const despues = await resumenOperacion();
    assert.equal(despues.comision_mes - antes.comision_mes, 1500);
    assert.equal((await actualizarLead(a.codigo, { comision_mxn: "-5" })).ok, false);
  } finally {
    for (const c of creados) await query(`DELETE FROM lead WHERE codigo = $1`, [c]);
    await cerrarPool();
  }
});
