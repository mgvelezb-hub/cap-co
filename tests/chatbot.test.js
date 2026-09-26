import { test } from "node:test";
import assert from "node:assert/strict";

import { calcularCosto, calcularDesempenoHoy, compararOpciones } from "../lib/chatbot/calculo.js";
import { generarCodigo, construirLinkWhatsApp, PATRON_CODIGO } from "../lib/chatbot/codigo.js";
import { PERFIL_IDS, esPerfilValido } from "../lib/chatbot/perfiles.js";

test("calcularCosto reproduce el ejemplo de la calculadora de la página", () => {
  const r = calcularCosto({ prestamo: 2000, tasaMensual: 8, meses: 6 });
  assert.equal(r.ok, true);
  assert.equal(r.interesMensual, 160);
  assert.equal(r.interesTotal, 960);
  assert.equal(r.total, 2960);
  assert.equal(r.veces, 1.48);
});

test("calcularCosto rechaza valores fuera de rango o no numéricos", () => {
  assert.equal(calcularCosto({ prestamo: 2000, tasaMensual: 95, meses: 6 }).ok, false);
  assert.equal(calcularCosto({ prestamo: "dos mil", tasaMensual: 8, meses: 6 }).ok, false);
  assert.equal(calcularCosto({ prestamo: 2000, tasaMensual: 8, meses: 0 }).ok, false);
});

test("generarCodigo produce CAP-XXXX sin caracteres ambiguos", () => {
  for (let i = 0; i < 200; i += 1) {
    const c = generarCodigo();
    assert.match(c, PATRON_CODIGO);
    assert.doesNotMatch(c, /[0O1I]/);
  }
});

test("generarCodigo es determinista dado el generador aleatorio", () => {
  const fijo = () => new Uint8Array([0, 1, 2, 3]);
  assert.equal(generarCodigo(fijo), "CAP-ABCD");
});

test("construirLinkWhatsApp arma wa.me con código y frase del perfil", () => {
  const url = construirLinkWhatsApp({
    numero: "525568809606",
    codigo: "CAP-ABCD",
    perfil: "quiere_traspaso",
  });
  assert.ok(url.startsWith("https://wa.me/525568809606?text="));
  const texto = decodeURIComponent(url.split("text=")[1]);
  assert.equal(
    texto,
    "Hola, vengo de la página. Código CAP-ABCD. Quiero agendar una cita para cambiar mi boleta a una mejor opción.",
  );
});

test("construirLinkWhatsApp cae a 'curioso' con perfil desconocido y rechaza código malo", () => {
  const url = construirLinkWhatsApp({ numero: "525568809606", codigo: "CAP-ABCD", perfil: "xxx" });
  assert.ok(decodeURIComponent(url).includes("Quiero agendar una cita con un asesor."));
  assert.throws(() => construirLinkWhatsApp({ numero: "1", codigo: "CAP-0000", perfil: "curioso" }));
});

test("perfiles: seis perfiles válidos", () => {
  assert.equal(PERFIL_IDS.length, 6);
  assert.equal(esPerfilValido("restauracion"), true);
  assert.equal(esPerfilValido("boleta_vencida"), true);
  assert.equal(esPerfilValido("constructor"), false);
});

import { TOOLS, ejecutarTool } from "../lib/chatbot/tools.js";

test("tools: definiciones estrictas y nombres estables", () => {
  assert.deepEqual(TOOLS.map((t) => t.name), ["calcular_costo", "calcular_desempeno_hoy", "comparar_opciones", "comparar_instituciones", "cotizar_traspaso", "precio_metales", "estimar_valor_metal", "agendar_cita"]);
  for (const t of TOOLS) {
    assert.equal(t.strict, true);
    assert.equal(t.input_schema.additionalProperties, false);
  }
});

test("ejecutarTool calcular_costo devuelve cifras formateadas y marca errores", async () => {
  const ok = JSON.parse((await ejecutarTool("calcular_costo", { prestamo: 2000, tasa_mensual: 8, meses: 6 })).resultado);
  assert.equal(ok.total_a_pagar, "$2,960");
  assert.equal(ok.veces_el_prestamo, 1.48);
  const malo = await ejecutarTool("calcular_costo", { prestamo: 2000, tasa_mensual: 200, meses: 6 });
  assert.equal(malo.esError, true);
});

test("ejecutarTool agendar_cita produce cta con código y link", async () => {
  const r = await ejecutarTool("agendar_cita", { perfil: "boleta_vencida", resumen: "x", probabilidad: 80, institucion_origen: null, tasa_actual: null, tasa_oferta: null, ahorro: null });
  assert.match(r.cta.codigo, PATRON_CODIGO);
  assert.ok(r.cta.url.includes("wa.me/525568809606"));
  assert.ok(decodeURIComponent(r.cta.url).includes(r.cta.codigo));
  assert.equal(JSON.parse(r.resultado).codigo, r.cta.codigo);
});

import { normalizarTelefono, validarContacto, limpiarFuente } from "../lib/leads/validar.js";

test("normalizarTelefono acepta formatos comunes de México", () => {
  assert.equal(normalizarTelefono("55 1234 5678"), "5512345678");
  assert.equal(normalizarTelefono("+52 55 1234 5678"), "5512345678");
  assert.equal(normalizarTelefono("+52 1 55 1234 5678"), "5512345678");
  assert.equal(normalizarTelefono("12345"), null);
  assert.equal(normalizarTelefono(5512345678), null);
});

test("validarContacto exige consentimiento, nombre y teléfono válidos", () => {
  assert.equal(validarContacto({ nombre: "Ana", telefono: "5512345678", acepta: false }).ok, false);
  assert.equal(validarContacto({ nombre: "A", telefono: "5512345678", acepta: true }).ok, false);
  const ok = validarContacto({ nombre: "  Ana   López ", telefono: "55-12-34-56-78", acepta: true });
  assert.deepEqual(ok, { ok: true, nombre: "Ana López", telefono: "5512345678" });
});

test("limpiarFuente solo conserva llaves conocidas y recorta", () => {
  const f = limpiarFuente({ utm_source: " facebook ", hack: "x", path: "/", utm_campaign: "a".repeat(300) });
  assert.deepEqual(Object.keys(f).sort(), ["path", "utm_campaign", "utm_source"]);
  assert.equal(f.utm_source, "facebook");
  assert.equal(f.utm_campaign.length, 200);
  assert.deepEqual(limpiarFuente(null), {});
});

test("calcularDesempenoHoy: refrendar paga intereses, desempeñar liquida todo", () => {
  const r = calcularDesempenoHoy({ prestamo: 5000, tasaMensual: 7.5, mesesSinPagar: 2, penalizacion: 0 });
  assert.equal(r.ok, true);
  assert.equal(r.interesMensual, 375);
  assert.equal(r.refrendarHoy, 750);
  assert.equal(r.desempenarHoy, 5750);
  assert.equal(calcularDesempenoHoy({ prestamo: 5000, tasaMensual: 7.5, mesesSinPagar: 40, penalizacion: 0 }).ok, false);
});

test("compararOpciones: moverse a tasa menor conviene cuando el ahorro es claro", () => {
  const r = compararOpciones({ prestamo: 5000, tasaActual: 8, tasaNueva: 3.5, mesesRestantes: 6, mesesSinPagar: 1, penalizacion: 0 });
  assert.equal(r.ok, true);
  assert.equal(r.liquidarHoy, 5400);
  assert.equal(r.quedarse.total, 5400 + 2400);
  assert.equal(r.moverse.total, 5400 + 1134);
  assert.equal(r.ahorro, 1266);
  assert.equal(r.conviene, true);
  const corto = compararOpciones({ prestamo: 1000, tasaActual: 8, tasaNueva: 7, mesesRestantes: 1, mesesSinPagar: 0, penalizacion: 0 });
  assert.equal(corto.conviene, false);
});

import { cotizarTraspaso } from "../lib/chatbot/cotizacion.js";
import { rankingPublico, pisoTasa } from "../lib/chatbot/instituciones.js";

test("cotizarTraspaso: tasa alta → oferta = tasa pública del aliado y avanza", () => {
  const r = cotizarTraspaso({ prestamo: 8000, tasaActual: 9, mesesRestantes: 6, mesesSinPagar: 2, penalizacion: 0, valorPieza: 15000, institucionActual: "Prendamex" });
  assert.equal(r.ok, true);
  assert.equal(r.tipoOferta, "tasa_publica");
  assert.equal(r.tasaOferta, 3.5);
  assert.equal(r.institucionActual, "Prendamex");
  assert.equal(r.avanza, true);
  assert.ok(r.comparacion.ahorro > 500);
});

test("cotizarTraspaso: tasa igual o menor a la pública → preferente 5 % abajo con piso", () => {
  const r = cotizarTraspaso({ prestamo: 10000, tasaActual: 3.4, mesesRestantes: 8, mesesSinPagar: 0, penalizacion: 0, valorPieza: 25000, institucionActual: "Nacional Monte de Piedad" });
  assert.equal(r.tipoOferta, "tasa_preferente");
  assert.equal(r.tasaOferta, 3.23);
  assert.equal(r.piso, 2.5);
  assert.equal(r.institucionActual, "Nacional Monte de Piedad");
});

test("cotizarTraspaso: no avanza si la oferta no mejora la tasa (piso) o el ahorro es chico", () => {
  const enPiso = cotizarTraspaso({ prestamo: 5000, tasaActual: 3.0, mesesRestantes: 6, mesesSinPagar: 0, penalizacion: 0, valorPieza: 6000, institucionActual: null });
  assert.equal(enPiso.avanza, false);
  assert.equal(enPiso.tocoPiso, true);
  assert.match(enPiso.mensajeSugerido, /mejor trato posible/);
  const corto = cotizarTraspaso({ prestamo: 1500, tasaActual: 4, mesesRestantes: 1, mesesSinPagar: 0, penalizacion: 0, valorPieza: null, institucionActual: null });
  assert.equal(corto.avanza, false);
  assert.match(corto.motivoNoAvanza, /ahorro/);
});

test("instituciones: ranking por CAT ascendente con fuente; piso por valor de pieza", () => {
  const r = rankingPublico();
  assert.equal(r.conDato[0].catAnual, 69);
  assert.ok(r.conDato.every((i) => i.fuente));
  for (let i = 1; i < r.conDato.length; i += 1) assert.ok(r.conDato[i].catAnual >= r.conDato[i - 1].catAnual);
  assert.equal(pisoTasa(30000), 2.5);
  assert.equal(pisoTasa(7000), 3.0);
  assert.equal(pisoTasa(null), 3.25);
});

import { normalizarPureza, precioGramoPuroMXN, estimarValorMetal, tablaPorGramo, fotografiaVigente } from "../lib/precios/calculo.js";

const FOTO = { capturadoAt: "2026-09-25T15:00:00Z", oroUsdOz: 3110.34768, plataUsdOz: 31.1034768, platinoUsdOz: 1555.17384, paladioUsdOz: 1244.139072, usdMxn: 20 };

test("precios: onza troy en dólares a gramo en pesos", () => {
  assert.equal(Math.round(precioGramoPuroMXN(3110.34768, 20) * 100) / 100, 2000);
  const t = tablaPorGramo(FOTO);
  assert.equal(t.oro.puro, 2000);
  assert.equal(t.oro["14k"], 1170);
  assert.equal(t.plata["925"], 18.5);
});

test("precios: normaliza kilataje y ley", () => {
  assert.equal(normalizarPureza("oro", "14k"), "14k");
  assert.equal(normalizarPureza("oro", "14 kilates"), "14k");
  assert.equal(normalizarPureza("oro", "585"), "14k");
  assert.equal(normalizarPureza("oro", "18"), "18k");
  assert.equal(normalizarPureza("plata", ".925"), "925");
  assert.equal(normalizarPureza("plata", "ley 925"), "925");
  assert.equal(normalizarPureza("platino", "PT950"), "950");
  assert.equal(normalizarPureza("oro", "15k"), null);
});

test("precios: valor de una cadena de 14k y rango de préstamo", () => {
  const r = estimarValorMetal({ metal: "oro", pureza: "14k", gramos: 10, foto: FOTO });
  assert.equal(r.ok, true);
  assert.equal(r.valorMetal, 11700);
  assert.equal(r.prestamoBajo, 4680);
  assert.equal(r.prestamoAlto, 7020);
  assert.equal(estimarValorMetal({ metal: "cobre", pureza: "x", gramos: 1, foto: FOTO }).ok, false);
  assert.equal(estimarValorMetal({ metal: "oro", pureza: "14k", gramos: -1, foto: FOTO }).ok, false);
});

test("precios: una fotografía de más de 4 días no se usa", () => {
  assert.equal(fotografiaVigente(FOTO, new Date("2026-09-28T15:00:00Z")), true);
  assert.equal(fotografiaVigente(FOTO, new Date("2026-09-30T15:00:00Z")), false);
  assert.equal(fotografiaVigente(null), false);
});

import { validarImagen, mensajeConImagen } from "../lib/chatbot/imagen.js";

test("imagen: acepta JPG/PNG/WebP en base64 y rechaza lo demás", () => {
  const data = "A".repeat(200);
  assert.deepEqual(validarImagen(null), { ok: true, imagen: null });
  assert.equal(validarImagen({ media_type: "image/jpeg", data }).ok, true);
  assert.equal(validarImagen({ media_type: "application/pdf", data }).ok, false);
  assert.equal(validarImagen({ media_type: "image/png", data: "no es base64!!" + data }).ok, false);
  assert.equal(validarImagen({ media_type: "image/png", data: "A".repeat(4_000_001) }).ok, false);
});

test("imagen: el mensaje lleva la foto y la fecha de hoy fuera del prompt", () => {
  const m = mensajeConImagen("Analiza mi boleta", { media_type: "image/jpeg", data: "AAAA" }, new Date("2026-09-26T18:00:00Z"));
  assert.equal(m[0].type, "image");
  assert.equal(m[0].source.media_type, "image/jpeg");
  assert.match(m[1].text, /^Analiza mi boleta/);
  assert.match(m[1].text, /26 de septiembre de 2026/);
});

import { tipoDeErrorAnthropic } from "../lib/alertas/eventos.js";

test("alertas: clasifica errores de Anthropic", () => {
  assert.deepEqual(tipoDeErrorAnthropic({ status: 400, message: "Your credit balance is too low" }), { tipo: "saldo_anthropic", nivel: "critico" });
  assert.equal(tipoDeErrorAnthropic({ status: 401, message: "invalid x-api-key" }).tipo, "llave_anthropic");
  assert.equal(tipoDeErrorAnthropic({ status: 429, message: "rate" }).tipo, "limite_anthropic");
  assert.equal(tipoDeErrorAnthropic(new Error("socket hang up")).tipo, "error_chat");
});

test("cotizarTraspaso: con comisión configurada, cuenta el ahorro neto", () => {
  const base = { prestamo: 8000, tasaActual: 9, mesesRestantes: 6, mesesSinPagar: 2, penalizacion: 0, valorPieza: 15000 };
  const sin = cotizarTraspaso(base);
  assert.equal(sin.comision, null);
  assert.equal(sin.ahorroNeto, null);
  assert.match(sin.mensajeSugerido, /antes de nuestra comisión/);
  process.env.COMISION_FIJA_MXN = "300";
  try {
    const con = cotizarTraspaso(base);
    assert.equal(con.comision, 300);
    assert.equal(con.ahorroNeto, Math.round((sin.comparacion.ahorro - 300) * 100) / 100);
    assert.match(con.mensajeSugerido, /ya descontada nuestra comisión/);
    process.env.COMISION_FIJA_MXN = String(Math.ceil(sin.comparacion.ahorro));
    const come = cotizarTraspaso(base);
    assert.equal(come.avanza, false, "si la comisión se come el ahorro, no se propone");
    assert.match(come.motivoNoAvanza, /comisión/);
  } finally {
    delete process.env.COMISION_FIJA_MXN;
  }
});
