import { test } from "node:test";
import assert from "node:assert/strict";

const URL = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL || "") ? process.env.DATABASE_URL : "";

test("conversaciones: perfil del primer turno, resumen y vista del CRM", { skip: !URL && "sin DATABASE_URL" }, async () => {
  const { registrarTurno, registrarApertura } = await import("../lib/metricas/conversaciones.js");
  const { resumirConversacion } = await import("../lib/metricas/resumen.js");
  const { listarConversaciones, distribucionPerfil } = await import("../lib/crm/conversaciones.js");
  const { query, cerrarPool } = await import("../lib/db/client.js");
  const id = `prueba-perfil-${Date.now()}`;
  const solo = `prueba-solo-abrio-${Date.now()}`;
  try {
    const antes = await distribucionPerfil({ dias: 1 });
    // Abre, elige su caso y escribe; después contesta las preguntas opcionales.
    await registrarApertura({ id });
    await registrarApertura({ id, perfil: { caso: "por_vencer" } });
    assert.equal(await registrarTurno({ id, perfil: { caso: "por_vencer" } }), true);
    await registrarApertura({ id, perfil: { caso: "por_vencer", edad: "35_44", zona: "cdmx:Iztapalapa", origen: "tiktok" } });
    // Un turno sin perfil no borra el que ya había.
    await registrarTurno({ id });
    // Otra persona abre el chat y se va sin escribir; un "abrio" repetido no cambia nada.
    await registrarApertura({ id: solo });
    await registrarApertura({ id: solo });

    // Cliente falso: el resumen pasa por la limpieza antes de guardarse.
    const falso = {
      messages: {
        create: async () => ({ content: [{ type: "text", text: "Boleta por vencer; dejó su número 5512345678." }], usage: { input_tokens: 1000, output_tokens: 50 } }),
      },
    };
    await resumirConversacion(falso, { id, mensajes: [{ role: "user", content: "hola" }], respuesta: "ok" });

    const c = await query(`SELECT perfil, resumen, turnos, costo_usd FROM conversacion WHERE id = $1`, [id]);
    assert.deepEqual(c.rows[0].perfil, { caso: "por_vencer" });
    assert.equal(c.rows[0].resumen, "Boleta por vencer; dejó su número [número].");
    assert.equal(c.rows[0].turnos, 2);
    assert.ok(Number(c.rows[0].costo_usd) > 0);

    const lista = await listarConversaciones({ dias: 1, caso: "por_vencer" });
    const fila = lista.find((x) => x.id === id);
    assert.equal(fila.perfil.edad, "35_44"); // la vista usa el perfil de la apertura, más completo
    assert.ok(!lista.some((x) => x.id === solo));
    assert.ok(!(await listarConversaciones({ dias: 1, caso: "aprender" })).some((x) => x.id === id));

    const despues = await distribucionPerfil({ dias: 1 });
    assert.equal(despues.abrieron - antes.abrieron, 2);
    assert.equal(despues.escribieron - antes.escribieron, 1);
    assert.equal(despues.se_fueron - antes.se_fueron, 1);
    assert.equal(despues.contestaron - antes.contestaron, 1);
    assert.equal((despues.campos.zona["cdmx:Iztapalapa"] || 0) - (antes.campos.zona["cdmx:Iztapalapa"] || 0), 1);
    const tiktok = (d) => d.por_origen.find((o) => o.origen === "tiktok") || { abrieron: 0, escribieron: 0 };
    assert.equal(tiktok(despues).escribieron - tiktok(antes).escribieron, 1);
  } finally {
    await query(`DELETE FROM conversacion WHERE id = $1`, [id]);
    await query(`DELETE FROM chat_apertura WHERE id = ANY($1)`, [[id, solo]]);
    await cerrarPool();
  }
});
