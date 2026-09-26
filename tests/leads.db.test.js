// Pruebas contra la base real. Se saltan si no hay DATABASE_URL.
import { test } from "node:test";
import assert from "node:assert/strict";

const URL = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL || "") ? process.env.DATABASE_URL : "";

test("repo de leads: crear, click, contacto, stats", { skip: !URL && "sin DATABASE_URL" }, async () => {
  const { crearLead, registrarClickWhatsApp, registrarContacto, obtenerLead, estadisticas } = await import(
    "../lib/leads/repo.js"
  );
  const { cerrarPool, query } = await import("../lib/db/client.js");
  let codigo = null;
  try {
    const creado = await crearLead({
      perfil: "quiere_traspaso",
      resumen: "Le ofrecieron liquidar su boleta",
      fuente: { utm_source: "test" },
    });
    codigo = creado.codigo;
    assert.equal(creado.persistido, true);
    assert.match(codigo, /^CAP-[A-Z2-9]{4}$/);

    assert.equal(await registrarClickWhatsApp(codigo), true);
    assert.equal(await registrarClickWhatsApp("CAP-ZZZZ"), false);

    const r = await registrarContacto({ codigo, nombre: "Ana López", telefono: "5512345678" });
    assert.deepEqual(r, { ok: true });

    const lead = await obtenerLead(codigo);
    assert.equal(lead.perfil, "quiere_traspaso");
    assert.equal(lead.nombre, "Ana López");
    assert.ok(lead.consent_at);
    assert.ok(lead.whatsapp_click_at);

    const s = await estadisticas();
    assert.ok(s.totales.leads >= 1);
    assert.ok(s.porPerfil.some((p) => p.perfil === "quiere_traspaso"));
    assert.ok(s.porFuente.some((f) => f.fuente === "test"));
  } finally {
    if (codigo) await query(`DELETE FROM lead WHERE codigo = $1`, [codigo]);
    await cerrarPool();
  }
});

test("repo de leads: la DB rechaza datos personales sin consentimiento", { skip: !URL && "sin DATABASE_URL" }, async () => {
  const { query, cerrarPool } = await import("../lib/db/client.js");
  try {
    await assert.rejects(
      query(`INSERT INTO lead (codigo, perfil, nombre) VALUES ('CAP-TEST', 'curioso', 'Sin consentimiento')`),
      /lead_datos_con_consentimiento/,
    );
  } finally {
    await cerrarPool();
  }
});
