import { test } from "node:test";
import assert from "node:assert/strict";
import { clasificarPorReglas, propensionTallerPorReglas } from "../lib/crm/reglas.js";
import { anonimizarTexto } from "../lib/crm/ia.js";
import { decidir } from "../lib/crm/clasificacion.js";
import { pasoPendiente, motivoSinSeguimiento, diasSinContestar, proximoSeguimiento, respondioANuestroContacto } from "../lib/crm/seguimiento-plan.js";
import { linkWhatsApp, CORREOS, primerNombre } from "../lib/crm/plantillas.js";
import { enviarCorreoLead } from "../lib/crm/correo.js";

const base = {
  codigo: "CAP-TEST",
  perfil: "quiere_traspaso",
  resumen: "Préstamo 8000 a 9 % mensual, 6 meses.",
  probabilidad: 80,
  institucion_origen: "Prendamex",
  tasa_actual: "9.00",
  tasa_oferta: "3.50",
  ahorro: "2600.00",
  etapa: "cita_solicitada",
  consent_at: new Date("2026-09-28T16:00:00Z"),
};

test("reglas: ahorro claro, datos completos y probabilidad alta aplica en automático (el usuario no paga)", () => {
  const r = clasificarPorReglas(base);
  assert.equal(r.clasificacion, "aplica_auto");
  assert.equal(r.confianza, "alta");
  assert.match(r.motivo, /Ahorro de \$2,600/);
  assert.doesNotMatch(r.motivo, /comisi|neto/);
});

test("reglas: ahorro chico no compensa el trámite", () => {
  assert.equal(clasificarPorReglas({ ...base, ahorro: "300" }).clasificacion, "no_aplica");
  assert.equal(clasificarPorReglas({ ...base, ahorro: "0" }).clasificacion, "no_aplica");
});

test("reglas: casos grises y especiales", () => {
  assert.equal(clasificarPorReglas({ ...base, probabilidad: 50 }, { comision: 100 }).clasificacion, "revision");
  assert.equal(clasificarPorReglas({ ...base, institucion_origen: null }).clasificacion, "revision");
  assert.equal(clasificarPorReglas({ ...base, etapa: "descartado" }).clasificacion, "no_aplica");
  assert.equal(clasificarPorReglas({ ...base, perfil: "restauracion" }).clasificacion, "taller");
  assert.equal(clasificarPorReglas({ ...base, perfil: "boleta_vencida", ahorro: null, tasa_oferta: null }).clasificacion, "revision");
  const danada = { ...base, resumen: "Cadena de oro rota, le falta una piedra", ahorro: "900" };
  assert.equal(clasificarPorReglas(danada).clasificacion, "taller");
  assert.equal(propensionTallerPorReglas(danada), 60);
  assert.equal(clasificarPorReglas({ ...base, perfil: "curioso", probabilidad: 10, ahorro: null, tasa_oferta: null, consent_at: null }).clasificacion, "no_aplica");
});

test("decidir: regla segura se aplica; desacuerdo con la IA va a revisión; lo gris espera aprobación", () => {
  const segura = { clasificacion: "aplica_auto", motivo: "x", confianza: "alta", propensionTaller: 10 };
  assert.deepEqual(decidir(segura, null), { clasificacion: "aplica_auto", fuente: "regla", motivo: "x", revisionPendiente: false, sugerencia: null });
  const ia = { clasificacion: "revision", motivo: "dudoso", confianza: 70 };
  const d = decidir(segura, ia);
  assert.equal(d.clasificacion, "aplica_auto");
  assert.equal(d.revisionPendiente, true);
  assert.equal(d.sugerencia.clasificacion, "revision");
  const noAplica = { clasificacion: "no_aplica", motivo: "La cotización no da ahorro.", confianza: "alta" };
  assert.equal(decidir(noAplica, null).revisionPendiente, false, "sin datos: basta la regla");
  assert.equal(decidir(noAplica, null, { conDatos: true }).revisionPendiente, true, "con datos: lo confirma una persona");
  const gris = decidir({ clasificacion: "revision", motivo: "y", confianza: "media" }, { clasificacion: "aplica_auto", motivo: "z", confianza: 80 });
  assert.equal(gris.clasificacion, "revision");
  assert.equal(gris.revisionPendiente, true);
  assert.equal(gris.sugerencia.fuente, "ia");
});

test("seguimiento: paso 0 al dejar datos, luego en días hábiles; se detiene si responde o avanza", () => {
  const lunes = new Date("2026-09-28T16:00:00Z"); // 10:00 CDMX
  const lead = { ...base, seguimiento_paso: 0 };
  assert.equal(pasoPendiente(lead, lunes).paso, 0);
  assert.equal(proximoSeguimiento(0, lunes).toISOString(), "2026-09-29T16:00:00.000Z", "un día hábil");
  const p1 = { ...lead, seguimiento_paso: 1, proximo_seguimiento_at: new Date("2026-09-29T16:00:00Z") };
  assert.equal(pasoPendiente(p1, lunes), null, "todavía no toca");
  assert.equal(pasoPendiente(p1, new Date("2026-09-29T17:00:00Z")).paso, 1);
  assert.equal(motivoSinSeguimiento({ ...p1, etapa: "cita_confirmada" }), "avanzo");
  assert.equal(motivoSinSeguimiento({ ...p1, no_contactar_at: lunes }), "baja");
  assert.equal(motivoSinSeguimiento({ ...p1, seguimiento_paso: 4 }), "terminado");
  // Dejar datos no es "responder": sin contacto nuestro, el seguimiento sigue.
  assert.equal(motivoSinSeguimiento({ ...p1, ultima_respuesta_at: lunes }), null);
  const conversaron = { ...p1, ultimo_contacto_at: lunes, ultima_respuesta_at: new Date(lunes.getTime() + 60_000), esperando_respuesta_desde: null };
  assert.equal(respondioANuestroContacto(conversaron), true);
  assert.equal(motivoSinSeguimiento(conversaron), "respondio");
});

test("días sin contestar", () => {
  const ahora = new Date("2026-10-02T16:00:00Z");
  assert.deepEqual(diasSinContestar({ ...base, ultimo_contacto_at: null }, ahora), { estado: "sin_atender", dias: 4 });
  assert.deepEqual(diasSinContestar({ ...base, ultimo_contacto_at: new Date("2026-09-30T16:00:00Z"), esperando_respuesta_desde: new Date("2026-09-29T16:00:00Z") }, ahora), { estado: "esperando_respuesta", dias: 3 });
  assert.deepEqual(diasSinContestar({ ...base, ultimo_contacto_at: new Date("2026-09-30T16:00:00Z"), esperando_respuesta_desde: null }, ahora), { estado: "al_dia", dias: 0 });
});

test("plantillas: WhatsApp al teléfono de la persona y correos sin promesas", () => {
  const lead = { ...base, nombre: "Ana María López", telefono: "5512345678", baja_token: "a".repeat(32) };
  assert.equal(primerNombre(lead.nombre), "Ana");
  const w = linkWhatsApp(lead, "primer_contacto", "Luis");
  assert.match(w.url, /^https:\/\/wa\.me\/525512345678\?text=/);
  assert.match(w.texto, /Hola, Ana, soy Luis/);
  assert.equal(linkWhatsApp({ ...lead, telefono: null }, "primer_contacto"), null);
  for (const [nombre, f] of Object.entries(CORREOS)) {
    const c = f(lead);
    assert.match(c.texto, /baja\/a{32}/, `${nombre} trae link de baja`);
    assert.doesNotMatch(c.texto, /mejor|garantiz/i, `${nombre} sin superlativos`);
  }
});

test("correo: no sale sin correo, con baja o sin configurar; con Resend manda al correo de la persona", async () => {
  const lead = { ...base, email: "ana@correo.mx", nombre: "Ana" };
  assert.equal((await enviarCorreoLead({ ...lead, email: null }, "bienvenida")).motivo, "sin_correo");
  assert.equal((await enviarCorreoLead({ ...lead, no_contactar_at: new Date() }, "bienvenida")).motivo, "baja");
  delete process.env.RESEND_API_KEY;
  assert.equal((await enviarCorreoLead(lead, "bienvenida")).motivo, "sin_configurar");
  process.env.RESEND_API_KEY = "re_test";
  process.env.CORREO_REMITENTE = "CAP & Co. <hola@casa-ap.com>";
  let enviado;
  const fetchImpl = async (url, init) => {
    enviado = JSON.parse(init.body);
    return { ok: true, json: async () => ({ id: "x1" }) };
  };
  try {
    const r = await enviarCorreoLead(lead, "bienvenida", { fetchImpl });
    assert.deepEqual(r, { enviado: true, id: "x1" });
    assert.deepEqual(enviado.to, ["ana@correo.mx"]);
    assert.match(enviado.subject, /CAP-TEST/);
  } finally {
    delete process.env.RESEND_API_KEY;
    delete process.env.CORREO_REMITENTE;
  }
});

test("IA: el resumen sale sin teléfonos ni correos", () => {
  assert.equal(anonimizarTexto("Llamar al 55 1234 5678 o ana@correo.mx, préstamo 8000"), "Llamar al [número] o [correo], préstamo 8000");
});
