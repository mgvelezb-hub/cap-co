import { test } from "node:test";
import assert from "node:assert/strict";

const URL = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL || "") ? process.env.DATABASE_URL : "";

test("embudo: turnos anónimos, cotización y cita cuentan en orden", { skip: !URL && "sin DATABASE_URL" }, async () => {
  const { registrarTurno, embudo } = await import("../lib/metricas/conversaciones.js");
  const { crearLead, actualizarLead } = await import("../lib/leads/repo.js");
  const { query, cerrarPool } = await import("../lib/db/client.js");
  try {
    const antes = await embudo({ dias: 1 });
    const id = `prueba-${Date.now()}`;
    await registrarTurno({ id, fuente: { utm_source: "test" } });
    await registrarTurno({ id, herramientas: ["cotizar_traspaso"], avanzo: true, foto: true });
    await registrarTurno({ id: "no válido!", herramientas: [] });
    const c = await query(`SELECT turnos, fotos, cotizo, avanzo, herramientas FROM conversacion WHERE id = $1`, [id]);
    assert.deepEqual(
      { ...c.rows[0] },
      { turnos: 2, fotos: 1, cotizo: true, avanzo: true, herramientas: ["cotizar_traspaso"] },
    );
    const { codigo } = await crearLead({ perfil: "quiere_traspaso", resumen: "x", fuente: {}, conversacionId: id });
    assert.equal((await actualizarLead(codigo, { etapa: "cita_confirmada", notas: "Llamar el martes" })).ok, true);
    assert.equal((await actualizarLead(codigo, { etapa: "inventada" })).ok, false);
    const l = await query(`SELECT etapa, notas, contactado_at, conversacion_id FROM lead WHERE codigo = $1`, [codigo]);
    assert.equal(l.rows[0].etapa, "cita_confirmada");
    assert.ok(l.rows[0].contactado_at);
    assert.equal(l.rows[0].conversacion_id, id);
    const despues = await embudo({ dias: 1 });
    assert.equal(despues.conversaciones - antes.conversaciones, 1);
    assert.equal(despues.avanzaron - antes.avanzaron, 1);
    assert.equal(despues.confirmadas - antes.confirmadas, 1);
    await query(`DELETE FROM lead WHERE codigo = $1`, [codigo]);
    await query(`DELETE FROM conversacion WHERE id = $1`, [id]);
  } finally {
    await cerrarPool();
  }
});
