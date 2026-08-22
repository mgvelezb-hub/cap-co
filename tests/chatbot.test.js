import { test } from "node:test";
import assert from "node:assert/strict";

import { calcularCosto } from "../lib/chatbot/calculo.js";
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
    "Hola, vengo de la página. Código CAP-ABCD. Quiero saber si me conviene mover mi empeño a otra opción.",
  );
});

test("construirLinkWhatsApp cae a 'curioso' con perfil desconocido y rechaza código malo", () => {
  const url = construirLinkWhatsApp({ numero: "525568809606", codigo: "CAP-ABCD", perfil: "xxx" });
  assert.ok(decodeURIComponent(url).includes("Quiero asesoría sobre empeños."));
  assert.throws(() => construirLinkWhatsApp({ numero: "1", codigo: "CAP-0000", perfil: "curioso" }));
});

test("perfiles: cinco perfiles válidos", () => {
  assert.equal(PERFIL_IDS.length, 5);
  assert.equal(esPerfilValido("boleta_vencida"), true);
  assert.equal(esPerfilValido("constructor"), false);
});

import { TOOLS, ejecutarTool } from "../lib/chatbot/tools.js";

test("tools: definiciones estrictas y nombres estables", () => {
  assert.deepEqual(TOOLS.map((t) => t.name), ["calcular_costo", "cerrar_a_whatsapp"]);
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

test("ejecutarTool cerrar_a_whatsapp produce cta con código y link", async () => {
  const r = await ejecutarTool("cerrar_a_whatsapp", { perfil: "boleta_vencida", resumen: "x" });
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
