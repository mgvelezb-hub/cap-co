import { test } from "node:test";
import assert from "node:assert/strict";

const URL = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL || "") ? process.env.DATABASE_URL : "";
const tel = () => `55${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;

test("CRM en la base: lead → datos → clasificación → correo y tareas → seguimiento → baja", { skip: !URL && "sin base local" }, async () => {
  const { crearLead } = await import("../lib/leads/repo.js");
  const { reservar } = await import("../lib/agenda/repo.js");
  const { franjasPosibles } = await import("../lib/agenda/horarios.js");
  const { clasificarLead, aprobarClasificacion, colaRevision } = await import("../lib/crm/clasificacion.js");
  const { ejecutarPaso, correrSeguimiento, darDeBaja } = await import("../lib/crm/seguimiento.js");
  const { registrarAccion, listarLeads, fichaLead, marcarTraspaso, prepararWhatsApp, actualizarCaso, resumenHoy } = await import("../lib/crm/leads.js");
  const { registrarEventoLead } = await import("../lib/crm/eventos.js");
  const { query, cerrarPool } = await import("../lib/db/client.js");
  const creados = [];
  const leer = async (codigo) => (await query(`SELECT * FROM lead WHERE codigo = $1`, [codigo])).rows[0];
  const tareas = async (codigo) => (await query(`SELECT tipo, detalle FROM crm_tarea WHERE lead_codigo = $1 AND hecha_at IS NULL ORDER BY tipo`, [codigo])).rows;
  process.env.RESEND_API_KEY = "re_test";
  process.env.CORREO_REMITENTE = "CAP & Co. <hola@casa-ap.com>";
  const correos = [];
  const fetchImpl = async (_u, init) => {
    correos.push(JSON.parse(init.body));
    return { ok: true, json: async () => ({ id: `m${correos.length}` }) };
  };
  try {
    const { codigo } = await crearLead({
      perfil: "quiere_traspaso", resumen: "8000 a 9 % mensual, 6 meses", fuente: { utm_campaign: "prueba-crm" },
      probabilidad: 85, institucionOrigen: "Prendamex", tasaActual: 9, tasaOferta: 3.5, ahorro: 2600,
    });
    creados.push(codigo);
    await registrarEventoLead(codigo, "lead_creado", { canal: "chat" });
    const c1 = await clasificarLead(codigo, { usarIA: false });
    assert.equal(c1.clasificacion, "aplica_auto");
    assert.deepEqual(await tareas(codigo), [], "sin datos todavía no hay tareas de contacto");

    const dia = franjasPosibles()[1];
    const t = tel();
    assert.equal((await reservar({ codigo, nombre: "Ana López", telefono: t, email: "ana@correo.mx", tipo: "llamada", fecha: dia.fecha, franja: "manana" })).ok, true);
    await registrarEventoLead(codigo, "contacto_guardado", { canal: "chat" });
    // IA simulada que coincide con la regla.
    const iaCliente = { messages: { create: async () => ({ content: [{ type: "tool_use", input: { clasificacion: "aplica_auto", motivo: "claro", confianza: 90, propension_taller: 5, urgencia: "media", tipo_pieza: "oro", sensibilidad_precio: "alta", siguiente_paso: "Acordar cita" } }] }) } };
    const c2 = await clasificarLead(codigo, { iaCliente });
    assert.equal(c2.revisionPendiente, false);
    assert.equal((await leer(codigo)).perfil_ia.tipo_pieza, "oro");
    assert.deepEqual((await tareas(codigo)).map((x) => x.tipo), ["confirmar_cita"]);

    // Paso 0: correo de bienvenida con link de baja + tarea de WhatsApp.
    const h = await ejecutarPaso(await leer(codigo), new Date(), { fetchImpl });
    assert.equal(h.correo, "enviado");
    assert.equal(correos[0].to[0], "ana@correo.mx");
    let l = await leer(codigo);
    assert.equal(l.seguimiento_paso, 1);
    assert.ok(l.esperando_respuesta_desde, "el correo cuenta como contacto nuestro");
    assert.match(correos[0].text, new RegExp(`/baja/${l.baja_token}`));
    assert.deepEqual((await tareas(codigo)).map((x) => x.tipo), ["confirmar_cita", "whatsapp"]);

    // Sin respuesta: al día siguiente hábil toca el paso 1.
    await query(`UPDATE lead SET proximo_seguimiento_at = now() - interval '1 minute' WHERE codigo = $1`, [codigo]);
    const corrida = await correrSeguimiento(new Date(), { fetchImpl });
    assert.ok(corrida.some((x) => x.codigo === codigo && x.paso === 1));
    assert.equal(correos.at(-1).subject.includes("sigue abierto"), true);

    const lista = await listarLeads({ campana: "prueba-crm", sinContestarMin: 0 });
    assert.equal(lista[0].sinContestar.estado, "esperando_respuesta");

    // El asesor manda WhatsApp y la persona responde: el seguimiento automático se detiene.
    const w = await prepararWhatsApp(codigo, "primer_contacto", "Luis");
    assert.match(w.url, new RegExp(`wa.me/52${t}`));
    assert.equal((await registrarAccion(codigo, { tipo: "whatsapp_enviado", usuario: "luis" })).ok, true);
    assert.equal((await registrarAccion(codigo, { tipo: "respondio", usuario: "luis" })).ok, true);
    l = await leer(codigo);
    assert.equal(l.proximo_seguimiento_at, null);
    assert.equal(l.esperando_respuesta_desde, null);
    assert.ok(!(await tareas(codigo)).some((x) => x.tipo === "whatsapp"), "WhatsApp enviado cierra su tarea");

    // Revisión humana: un desacuerdo con la IA pasa a la cola y el asesor decide.
    const iaDesacuerdo = { messages: { create: async () => ({ content: [{ type: "tool_use", input: { clasificacion: "taller", motivo: "pieza dañada", confianza: 70, propension_taller: 80, urgencia: "baja", tipo_pieza: "oro", sensibilidad_precio: "media", siguiente_paso: "Ofrecer taller" } }] }) } };
    const c3 = await clasificarLead(codigo, { iaCliente: iaDesacuerdo });
    assert.equal(c3.revisionPendiente, true);
    assert.ok((await colaRevision()).some((x) => x.codigo === codigo));
    assert.equal((await aprobarClasificacion(codigo, { clasificacion: "taller", usuario: "luis" })).ok, true);
    l = await leer(codigo);
    assert.equal(l.clasificacion_fuente, "humano");
    assert.equal(l.revision_pendiente, false);
    assert.equal((await clasificarLead(codigo, { usarIA: false })).sinCambio, true, "lo humano no lo pisa el sistema");

    // Checklist del cambio y etapas con historial.
    assert.equal((await marcarTraspaso(codigo, { paso: "boleta_original", hecho: true, usuario: "luis" })).traspaso.boleta_original.hecho, true);
    assert.equal((await marcarTraspaso(codigo, { paso: "boleta_original", hecho: false, usuario: "luis" })).traspaso.boleta_original, undefined);
    assert.equal((await actualizarCaso(codigo, { etapa: "descartado", motivo_descarte: "prueba" }, "luis")).ok, true);
    assert.deepEqual(await tareas(codigo), [], "descartar cierra todo");
    const ficha = await fichaLead(codigo);
    const tipos = ficha.eventos.map((e) => e.tipo);
    for (const tipo of ["lead_creado", "contacto_guardado", "clasificacion", "correo_enviado", "whatsapp_enviado", "respondio", "clasificacion_aprobada", "traspaso", "etapa"]) {
      assert.ok(tipos.includes(tipo), `historial trae ${tipo}`);
    }
    assert.ok((await resumenHoy()).nuevos_24h >= 1);

    // Baja desde el correo.
    assert.equal(await darDeBaja(l.baja_token), codigo);
    assert.ok((await leer(codigo)).no_contactar_at);
    assert.equal(await darDeBaja("x"), null);
    assert.equal((await prepararWhatsApp(codigo, "recordatorio")).motivo, "pidio_no_contactar");
  } finally {
    delete process.env.RESEND_API_KEY;
    delete process.env.CORREO_REMITENTE;
    for (const codigo of creados) await query(`DELETE FROM lead WHERE codigo = $1`, [codigo]);
    await cerrarPool();
  }
});
