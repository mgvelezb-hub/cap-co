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
  process.env.TARIFA_CAMBIO_MXN = "2000";
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
    assert.deepEqual((await tareas(codigo)).map((x) => x.tipo), ["confirmar_cita", "llamar"], "pidió llamada: la tarea es llamarle en su franja");

    assert.match(correos[0].text, /confirmar\//, "la bienvenida pide confirmar el correo");
    // Sin respuesta: al día siguiente hábil toca el paso 1. Con correo sin confirmar, no hay recordatorio por correo.
    await query(`UPDATE lead SET proximo_seguimiento_at = now() - interval '1 minute' WHERE codigo = $1`, [codigo]);
    let corrida = await correrSeguimiento(new Date(), { fetchImpl, codigos: [codigo] });
    assert.ok(corrida.some((x) => x.codigo === codigo && x.paso === 1));
    assert.equal(correos.length, 1, "sin confirmar el correo no se le insiste por correo");
    // Confirma su correo: el paso 2 sí va por correo.
    const { confirmarCorreo } = await import("../lib/crm/seguimiento.js");
    assert.equal(await confirmarCorreo((await leer(codigo)).baja_token), codigo);
    assert.equal((await leer(codigo)).esperando_respuesta_desde !== null, true, "confirmar el correo no cuenta como respuesta");
    await query(`UPDATE lead SET proximo_seguimiento_at = now() - interval '1 minute', ultima_respuesta_at = NULL, esperando_respuesta_desde = now() - interval '2 days' WHERE codigo = $1`, [codigo]);
    corrida = await correrSeguimiento(new Date(), { fetchImpl, codigos: [codigo] });
    assert.ok(corrida.some((x) => x.codigo === codigo && x.paso === 2));
    assert.match(correos.at(-1).subject, /Seguimos/);

    const lista = await listarLeads({ campana: "prueba-crm", sinContestarMin: 1 });
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
    const c3 = await clasificarLead(codigo, { iaCliente: iaDesacuerdo, forzar: true });
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
    assert.equal((await marcarTraspaso(codigo, { paso: "comision_cobrada", hecho: true, usuario: "luis" })).motivo, "usa_registrar_cobro");
    await marcarTraspaso(codigo, { paso: "boleta_nueva", hecho: true, usuario: "luis" });
    assert.equal((await leer(codigo)).etapa, "switcheo_concretado", "boleta nueva firmada = cambio concretado");
    const { registrarCobro } = await import("../lib/crm/leads.js");
    assert.equal((await registrarCobro(codigo, { monto: 0, metodo: "efectivo", usuario: "luis" })).motivo, "monto_invalido");
    assert.equal((await registrarCobro(codigo, { monto: 1200, metodo: "transferencia", usuario: "luis" })).ok, true);
    l = await leer(codigo);
    assert.equal(l.etapa, "comision_cobrada");
    assert.equal(Number(l.comision_mxn), 1200);
    assert.ok(l.cobrado_at && l.traspaso.comision_cobrada.hecho);
    assert.equal((await actualizarCaso(codigo, { notas: "cobrado y guardado", etapa: "comision_cobrada" }, "luis")).ok, true, "un caso cobrado se puede seguir editando");
    assert.equal((await actualizarCaso(codigo, { etapa: "descartado" }, "luis")).motivo, "solo_dueno", "un asesor no saca un caso de cobrado");
    assert.equal((await actualizarCaso(codigo, { etapa: "comision_cobrada" }, "luis")).ok, true);
    assert.equal((await marcarTraspaso(codigo, { paso: "comision_cobrada", hecho: false, usuario: "luis" })).motivo, "usa_registrar_cobro");
    assert.equal((await actualizarCaso(codigo, { etapa: "descartado", motivo_descarte: "prueba" }, "luis", { rol: "dueno" })).ok, true);
    assert.deepEqual(await tareas(codigo), [], "descartar cierra todo");
    const ficha = await fichaLead(codigo);
    const tipos = ficha.eventos.map((e) => e.tipo);
    for (const tipo of ["lead_creado", "contacto_guardado", "clasificacion", "correo_enviado", "whatsapp_enviado", "respondio", "clasificacion_aprobada", "traspaso", "etapa", "cobro"]) {
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
    delete process.env.TARIFA_CAMBIO_MXN;
    for (const codigo of creados) await query(`DELETE FROM lead WHERE codigo = $1`, [codigo]);
    await cerrarPool();
  }
});

test("CRM en la base: carreras, decisiones humanas, reparto, no contactar y borrado ARCO", { skip: !URL && "sin base local" }, async () => {
  const { crearLead, registrarContacto } = await import("../lib/leads/repo.js");
  const { clasificarLead, aprobarClasificacion } = await import("../lib/crm/clasificacion.js");
  const { ejecutarPaso } = await import("../lib/crm/seguimiento.js");
  const { asignarPorTurno, marcarNoContactar, anonimizarLead, registrarAccion } = await import("../lib/crm/leads.js");
  const { completarTarea } = await import("../lib/crm/tareas.js");
  const { query, cerrarPool } = await import("../lib/db/client.js");
  const creados = [];
  const usuarios = ["qa-uno", "qa-dos"];
  process.env.RESEND_API_KEY = "re_test";
  process.env.CORREO_REMITENTE = "CAP & Co. <hola@casa-ap.com>";
  process.env.TARIFA_CAMBIO_MXN = "2000";
  const leer = async (c) => (await query(`SELECT * FROM lead WHERE codigo = $1`, [c])).rows[0];
  try {
    const nuevo = async () => {
      const { codigo } = await crearLead({ perfil: "quiere_traspaso", resumen: "carreras", fuente: {}, probabilidad: 85, institucionOrigen: "Prendamex", tasaActual: 9, tasaOferta: 3.5, ahorro: 2600 });
      creados.push(codigo);
      await registrarContacto({ codigo, nombre: "Prueba", telefono: tel() });
      await query(`UPDATE lead SET email = 'x@example.com' WHERE codigo = $1`, [codigo]);
      return codigo;
    };
    // Dos ejecuciones del paso 0 a la vez (sitio + cron): un solo correo.
    const a = await nuevo();
    let enviados = 0;
    const fetchImpl = async () => {
      enviados += 1;
      await new Promise((r) => setTimeout(r, 30));
      return { ok: true, json: async () => ({ id: "x" }) };
    };
    const lead = await leer(a);
    await Promise.all([ejecutarPaso(lead, new Date(), { fetchImpl }), ejecutarPaso(lead, new Date(), { fetchImpl })]);
    assert.equal(enviados, 1, "un solo correo");

    // Reclasificar no reabre la tarea que el equipo cerró.
    await clasificarLead(a, { usarIA: false });
    const t = (await query(`SELECT id FROM crm_tarea WHERE lead_codigo = $1 AND tipo = 'confirmar_cita' AND hecha_at IS NULL`, [a])).rows[0];
    assert.ok(t, "aplica: tarea de confirmar cita");
    await completarTarea(t.id, "qa");
    await clasificarLead(a, { usarIA: false });
    assert.equal((await query(`SELECT count(*)::int AS n FROM crm_tarea WHERE lead_codigo = $1 AND tipo = 'confirmar_cita' AND hecha_at IS NULL`, [a])).rows[0].n, 0);

    // La IA tarda y mientras una persona decide: gana la persona.
    const b = await nuevo();
    const lenta = { messages: { create: async () => {
      await aprobarClasificacion(b, { clasificacion: "no_aplica", usuario: "qa" });
      return { content: [{ type: "tool_use", input: { clasificacion: "aplica_auto", motivo: "x", confianza: 90, propension_taller: 5, urgencia: "media", tipo_pieza: "oro", sensibilidad_precio: "media", siguiente_paso: "x" } }] };
    } } };
    await clasificarLead(b, { iaCliente: lenta });
    const lb = await leer(b);
    assert.equal(lb.clasificacion, "no_aplica");
    assert.equal(lb.clasificacion_fuente, "humano");

    // Reparto por turnos entre asesores que reciben leads.
    for (const u of usuarios) {
      await query(`INSERT INTO crm_usuario (usuario, nombre, rol, sal, hash, asignado_at) VALUES ($1, $1, 'asesor', 's', 'h', now() - interval '10 years') ON CONFLICT (usuario) DO NOTHING`, [u]);
    }
    await query(`UPDATE crm_usuario SET recibe_leads = false WHERE usuario NOT IN ('qa-uno', 'qa-dos') AND recibe_leads`);
    const c = await nuevo();
    const d = await nuevo();
    const asignados = [await asignarPorTurno(c), await asignarPorTurno(d)].sort();
    assert.deepEqual(asignados, [...usuarios].sort(), "uno a cada quien");
    assert.equal(await asignarPorTurno(c), (await leer(c)).asesor_usuario, "si ya tiene asesor no cambia");

    // Pidió no ser contactado: sin seguimiento ni tareas de contacto.
    await marcarNoContactar(c, { usuario: "qa", nota: "lo pidió por teléfono" });
    const lc = await leer(c);
    assert.ok(lc.no_contactar_at);
    assert.equal((await query(`SELECT count(*)::int AS n FROM crm_tarea WHERE lead_codigo = $1 AND hecha_at IS NULL AND tipo IN ('whatsapp','llamar')`, [c])).rows[0].n, 0);

    // Borrado a solicitud: sin nombre, teléfono, correo ni notas en el historial.
    await registrarAccion(d, { tipo: "nota", nota: "Su hermana se llama Rosa", usuario: "qa" });
    assert.equal((await anonimizarLead(d, { usuario: "qa" })).ok, true);
    const ld = await leer(d);
    assert.equal(ld.nombre, null);
    assert.equal(ld.telefono, null);
    assert.equal(ld.email, null);
    const notas = (await query(`SELECT count(*)::int AS n FROM lead_evento WHERE lead_codigo = $1 AND detalle ? 'nota'`, [d])).rows[0].n;
    assert.equal(notas, 0);
  } finally {
    delete process.env.RESEND_API_KEY;
    delete process.env.CORREO_REMITENTE;
    delete process.env.TARIFA_CAMBIO_MXN;
    await query(`UPDATE crm_usuario SET recibe_leads = true WHERE usuario NOT IN ('qa-uno', 'qa-dos')`);
    await query(`DELETE FROM lead WHERE codigo = ANY($1)`, [creados]);
    await query(`DELETE FROM crm_usuario WHERE usuario = ANY($1)`, [usuarios]);
    await cerrarPool();
  }
});

test("CRM en la base: no asistió deja tarea de reagendar y la nota de la cita va al historial", { skip: !URL && "sin base local" }, async () => {
  const { crearLead } = await import("../lib/leads/repo.js");
  const { reservar, actualizarCita } = await import("../lib/agenda/repo.js");
  const { franjasPosibles } = await import("../lib/agenda/horarios.js");
  const { videosTikTok } = await import("../lib/crm/trafico.js");
  const { query, cerrarPool } = await import("../lib/db/client.js");
  const { codigo } = await crearLead({ perfil: "quiere_traspaso", resumen: "no asistio", fuente: { utm_source: "tiktok", utm_campaign: "prueba-video" } });
  try {
    const dia = franjasPosibles()[1];
    const r = await reservar({ codigo, nombre: "Prueba", telefono: tel(), tipo: "llamada", fecha: dia.fecha, franja: "tarde" });
    assert.equal(r.ok, true);
    assert.equal((await actualizarCita(r.cita.id, { estado: "no_asistio", nota: "No contestó ni llegó", usuario: "qa" })).ok, true);
    const t = await query(`SELECT detalle->>'plantilla' AS p FROM crm_tarea WHERE lead_codigo = $1 AND hecha_at IS NULL`, [codigo]);
    assert.ok(t.rows.some((x) => x.p === "reagendar"));
    const e = await query(`SELECT detalle FROM lead_evento WHERE lead_codigo = $1 AND tipo = 'cita'`, [codigo]);
    assert.equal(e.rows[0].detalle.nota, "No contestó ni llegó");
    assert.ok((await videosTikTok()).some((v) => v.video === "prueba-video" && v.leads === 1));
  } finally {
    await query(`DELETE FROM lead WHERE codigo = $1`, [codigo]);
    await cerrarPool();
  }
});

test("CRM en la base: alta manual y acordar cita nueva", { skip: !URL && "sin base local" }, async () => {
  const { crearLeadManual } = await import("../lib/crm/leads.js");
  const { acordarCitaNueva, disponibilidad } = await import("../lib/agenda/repo.js");
  const { query, cerrarPool } = await import("../lib/db/client.js");
  let codigo = null;
  try {
    assert.equal((await crearLeadManual({ nombre: "Manual", telefono: tel(), perfil: "quiere_traspaso", canal: "whatsapp", consentimiento: false, usuario: "qa" })).motivo, "sin_consentimiento");
    assert.equal((await crearLeadManual({ nombre: "Manual", telefono: "123", perfil: "quiere_traspaso", canal: "whatsapp", consentimiento: true, usuario: "qa" })).motivo, "dato_invalido");
    const r = await crearLeadManual({ nombre: "Manual Prueba", telefono: tel(), perfil: "quiere_traspaso", resumen: "llegó por WhatsApp", canal: "whatsapp", consentimiento: true, usuario: "qa" });
    assert.equal(r.ok, true);
    codigo = r.codigo;
    const l = (await query(`SELECT * FROM lead WHERE codigo = $1`, [codigo])).rows[0];
    assert.equal(l.asesor_usuario, "qa");
    assert.equal(l.seguimiento_paso, 4, "sin seguimiento automático");
    assert.ok(l.consent_at && l.clasificacion);
    const libre = (await disponibilidad()).at(-1).horas.at(-1);
    assert.equal((await acordarCitaNueva({ codigo, inicio: new Date(libre.getTime() + 1), usuario: "qa" })).motivo, "horario_invalido");
    const c = await acordarCitaNueva({ codigo, inicio: libre.toISOString(), lugar: "Oficina", usuario: "qa" });
    assert.equal(c.ok, true);
    assert.equal(c.cita.estado, "confirmada");
    assert.equal((await query(`SELECT etapa FROM lead WHERE codigo = $1`, [codigo])).rows[0].etapa, "cita_confirmada");
    assert.equal((await acordarCitaNueva({ codigo, inicio: libre.toISOString(), usuario: "qa" })).motivo, "lead_con_otra_cita");
  } finally {
    if (codigo) await query(`DELETE FROM lead WHERE codigo = $1`, [codigo]);
    await cerrarPool();
  }
});
