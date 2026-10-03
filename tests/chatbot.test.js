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
  assert.deepEqual(TOOLS.map((t) => t.name), ["calcular_costo", "calcular_desempeno_hoy", "comparar_opciones", "comparar_instituciones", "comparar_casas", "cotizar_traspaso", "precio_metales", "estimar_valor_metal", "agendar_cita"]);
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
  // Con base local (npm run test:db) el lead sí se guarda: se borra para no ensuciar.
  if (r.cta.persistido) {
    const { query, cerrarPool } = await import("../lib/db/client.js");
    await query(`DELETE FROM lead WHERE codigo = $1`, [r.cta.codigo]);
    await cerrarPool();
  }
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
  assert.deepEqual(ok, { ok: true, nombre: "Ana López", telefono: "5512345678", email: null });
  const conCorreo = validarContacto({ nombre: "Ana", telefono: "5512345678", email: " Ana@Correo.MX ", acepta: true });
  assert.equal(conCorreo.email, "ana@correo.mx");
  assert.equal(validarContacto({ nombre: "Ana", telefono: "5512345678", email: "ana@", acepta: true }).ok, false);
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

// Las pruebas de la red con convenio corren con el convenio activo; el chat hoy lo tiene apagado.
function conConvenio(fn) {
  const antes = process.env.CHAT_CONVENIO;
  process.env.CHAT_CONVENIO = "si";
  try {
    return fn();
  } finally {
    if (antes === undefined) delete process.env.CHAT_CONVENIO;
    else process.env.CHAT_CONVENIO = antes;
  }
}
import { rangosPublicos, pisoTasa, CONVENIOS } from "../lib/chatbot/instituciones.js";

test("cotizarTraspaso: tasa alta → oferta = tasa pública de la red, avanza y no nombra instituciones", () => {
  const r = conConvenio(() => cotizarTraspaso({ prestamo: 8000, tasaActual: 9, mesesRestantes: 6, mesesSinPagar: 2, penalizacion: 0, valorPieza: 15000 }));
  assert.equal(r.ok, true);
  assert.equal(r.tipoOferta, "tasa_publica");
  assert.equal(r.tasaOferta, 3.5);
  assert.equal(r.avanza, true);
  assert.ok(r.comparacion.ahorro > 500);
  assert.match(r.mensajeSugerido, /no te cuesta nada/);
  const texto = JSON.stringify(r);
  for (const c of CONVENIOS) assert.ok(!texto.includes(c.nombreInterno), "no expone el nombre de la casa");
  assert.doesNotMatch(texto, /nuestra comisi[oó]n|comisi[oó]n de cap/i);
});

test("cotizarTraspaso: tasa igual o menor a la pública → preferente 5 % abajo con piso", () => {
  const r = conConvenio(() => cotizarTraspaso({ prestamo: 10000, tasaActual: 3.4, mesesRestantes: 8, mesesSinPagar: 0, penalizacion: 0, valorPieza: 25000 }));
  assert.equal(r.tipoOferta, "tasa_preferente");
  assert.equal(r.tasaOferta, 3.23);
  assert.equal(r.piso, 2.5);
});

test("cotizarTraspaso: no avanza si la oferta no mejora la tasa (piso) o el ahorro es chico", () => {
  const enPiso = conConvenio(() => cotizarTraspaso({ prestamo: 5000, tasaActual: 3.0, mesesRestantes: 6, mesesSinPagar: 0, penalizacion: 0, valorPieza: 6000 }));
  assert.equal(enPiso.avanza, false);
  assert.equal(enPiso.tocoPiso, true);
  assert.match(enPiso.mensajeSugerido, /te conviene quedarte/);
  assert.doesNotMatch(enPiso.mensajeSugerido, /mejor trato/);
  const corto = conConvenio(() => cotizarTraspaso({ prestamo: 1500, tasaActual: 4, mesesRestantes: 1, mesesSinPagar: 0, penalizacion: 0, valorPieza: null }));
  assert.equal(corto.avanza, false);
  assert.match(corto.motivoNoAvanza, /ahorro/);
});

import { compararCasas, casaMasBarata, buscarCasa, CASAS } from "../lib/chatbot/casas.js";

const FOTO_CASAS = { capturadoAt: "2026-09-25T15:00:00Z", oroUsdOz: 3110.34768, plataUsdOz: 31.1034768, platinoUsdOz: 1555.17384, paladioUsdOz: 1244.139072, usdMxn: 20 };
const CASAS_PRUEBA = [
  { id: "a", nombre: "Casa A", tipo: "IAP", tasaMensual: { oro: 4 }, prestamoPct: { oro: 0.8 }, fuente: "prueba" },
  { id: "b", nombre: "Casa B", tipo: "comercial", tasaMensual: { oro: 10 }, ivaSobreIntereses: true, prestamoPct: { oro: 0.9 }, fuente: "prueba" },
  { id: "c", nombre: "Casa C", tipo: "comercial", tasaMensual: { oro: 6 }, fuente: "sin porcentaje" },
];

test("compararCasas: préstamo = valor del metal × porcentaje; ordena por costo o por dinero", () => {
  // 10 g de 14k con oro a $2,000/g puro: 10 × 0.585 × 2000 = $11,700.
  const r = compararCasas({ metal: "oro", pureza: "14k", gramos: 10, meses: 2, prioridad: "menor_costo", foto: FOTO_CASAS, casas: CASAS_PRUEBA });
  assert.equal(r.ok, true);
  assert.equal(r.valor.valorMetal, 11700);
  assert.deepEqual(r.filas.map((f) => f.nombre), ["Casa A", "Casa B"]);
  assert.equal(r.filas[0].prestamo, 9360);
  assert.equal(r.filas[0].costo, 748.8); // 9,360 × 4 % × 2
  assert.equal(r.filas[1].costo, 2442.96); // 10,530 × 10 % × 1.16 × 2
  assert.deepEqual(r.sinDato, ["Casa C"]);
  assert.equal(r.menorCosto, "Casa A");
  assert.equal(r.masDinero, "Casa B");
  assert.equal(r.mismaCasa, false);
  const dinero = compararCasas({ metal: "oro", pureza: "14k", gramos: 10, meses: 2, prioridad: "mas_dinero", foto: FOTO_CASAS, casas: CASAS_PRUEBA });
  assert.equal(dinero.filas[0].nombre, "Casa B");
});

test("compararCasas: valida pieza y meses", () => {
  assert.equal(compararCasas({ metal: "oro", pureza: "9k", gramos: 10, foto: FOTO_CASAS, casas: CASAS_PRUEBA }).ok, false);
  assert.equal(compararCasas({ metal: "oro", pureza: "14k", gramos: 10, meses: 0, foto: FOTO_CASAS, casas: CASAS_PRUEBA }).ok, false);
});

test("casas: datos reales con fuente y fecha; la más barata y búsqueda por nombre", () => {
  assert.ok(CASAS.length >= 4);
  for (const c of CASAS) assert.ok(c.nombre && c.fuente, `fuente de ${c.id}`);
  assert.equal(casaMasBarata("oro", CASAS_PRUEBA).casa.id, "a");
  const cerrada = [{ ...CASAS_PRUEBA[0], cerradaHasta: "2026-10-07" }, CASAS_PRUEBA[1]];
  assert.equal(casaMasBarata("oro", cerrada, new Date("2026-10-01T12:00:00-06:00")).casa.id, "b");
  assert.equal(casaMasBarata("oro", cerrada, new Date("2026-10-07T09:00:00-06:00")).casa.id, "a");
  assert.equal(buscarCasa("la tengo en el nacional monte de piedad")?.id, "nacional_monte_de_piedad");
});

test("cotizarTraspaso sin convenio: compara contra la tasa publicada más baja y la nombra", () => {
  const antes = process.env.CHAT_CONVENIO;
  delete process.env.CHAT_CONVENIO;
  const r = cotizarTraspaso({ prestamo: 8000, tasaActual: 9, mesesRestantes: 6, mesesSinPagar: 0, penalizacion: 0, valorPieza: 15000 });
  assert.equal(r.ok, true);
  assert.equal(r.tipoOferta, "tasa_publicada");
  assert.ok(r.casa);
  assert.equal(r.avanza, true);
  assert.doesNotMatch(JSON.stringify(r), /convenio|preferente/i);
  if (antes !== undefined) process.env.CHAT_CONVENIO = antes;
});

import { estaCerrada, tasaConIva } from "../lib/chatbot/casas.js";
import { SEPARADOR_TABLA, celdas, esFilaTabla } from "../components/chat/tabla.js";

test("compararCasas: una casa cerrada sale en la tabla pero no se recomienda", () => {
  const casas = [{ ...CASAS_PRUEBA[0], cerradaHasta: "2026-10-07", nota: "cerrada" }, CASAS_PRUEBA[1]];
  const r = compararCasas({ metal: "oro", pureza: "14k", gramos: 10, meses: 2, foto: FOTO_CASAS, casas, hoy: new Date("2026-10-01T12:00:00-06:00") });
  assert.equal(r.filas.length, 2);
  assert.equal(r.menorCosto, "Casa B");
  assert.ok(r.filas.find((f) => f.id === "a").cerrada);
  const despues = compararCasas({ metal: "oro", pureza: "14k", gramos: 10, meses: 2, foto: FOTO_CASAS, casas, hoy: new Date("2026-10-08T12:00:00-06:00") });
  assert.equal(despues.menorCosto, "Casa A");
  assert.equal(despues.filas.find((f) => f.id === "a").nota, null, "la nota de cierre caduca");
  assert.equal(estaCerrada({ cerradaHasta: "2026-10-07" }, new Date("2026-10-07T00:30:00-06:00")), false);
});

test("casas: la tasa comparable suma IVA en las comerciales", () => {
  assert.equal(tasaConIva(CASAS_PRUEBA[1]), 11.6);
  assert.equal(tasaConIva(CASAS_PRUEBA[0]), 4);
});

test("markdown: reconoce filas de tabla con y sin pipe final", () => {
  assert.ok(esFilaTabla("| A | 4 % |"));
  assert.ok(esFilaTabla("| B | 5 %"));
  assert.ok(!esFilaTabla("Tasa | 5 %"));
  assert.ok(SEPARADOR_TABLA.test("|---|---|"));
  assert.ok(SEPARADOR_TABLA.test("| :-- | --: |"));
  assert.deepEqual(celdas("| B | 5 %"), ["B", "5 %"]);
});

import { COMISION_LISTA, comisionVigente, enPromocion, textoComision } from "../lib/chatbot/comision.js";

test("comisión: 7 % de lista, 0 % por promoción hasta el 30-abr-2027 en hora de CDMX", () => {
  assert.equal(COMISION_LISTA, 0.07);
  assert.equal(comisionVigente(new Date("2026-10-03T12:00:00-06:00")), 0);
  assert.equal(comisionVigente(new Date("2027-04-30T23:59:00-06:00")), 0, "el 30 de abril aún es promoción");
  assert.equal(comisionVigente(new Date("2027-05-01T05:30:00Z")), 0, "en UTC ya es 1 de mayo, en CDMX sigue siendo 30 de abril");
  assert.equal(comisionVigente(new Date("2027-05-01T00:00:00-06:00")), 0.07);
  assert.equal(enPromocion(new Date("2027-05-01T00:00:00-06:00")), false);
  assert.match(textoComision({ fecha: new Date("2026-10-03"), tachado: "markdown" }), /~~7 %~~ 0 %[\s\S]*30 de abril de 2027/);
  assert.doesNotMatch(textoComision({ fecha: new Date("2027-06-01") }), /promoción|0 %/);
  assert.doesNotMatch(textoComision(), /nos paga|tarifa/, "ninguna casa nos paga");
});

test("cotizarTraspaso sin convenio: comisión 0 % en promoción y 7 % del ahorro después", () => {
  const antes = process.env.CHAT_CONVENIO;
  delete process.env.CHAT_CONVENIO;
  try {
    for (const [hoy, tasa] of [[new Date("2026-10-03T12:00:00-06:00"), 0], [new Date("2027-05-02T12:00:00-06:00"), 0.07]]) {
      for (const tasaActual of [9, 12, 20]) {
        const r = cotizarTraspaso({ prestamo: 8000, tasaActual, mesesRestantes: 6, mesesSinPagar: 0, penalizacion: 0, valorPieza: null, hoy });
        assert.equal(r.ok, true);
        if (!r.comparacion) continue;
        const esperado = Math.round(r.comparacion.ahorro * tasa * 100) / 100;
        assert.equal(r.comisionUsuario, esperado);
        assert.equal(r.comisionLista, Math.round(r.comparacion.ahorro * 0.07 * 100) / 100);
        assert.equal(r.promocion, tasa === 0);
        assert.equal(r.ahorroNeto, Math.round((r.comparacion.ahorro - esperado) * 100) / 100);
        assert.doesNotMatch(r.mensajeSugerido, /nos paga una tarifa|10 %|pláticas/);
        if (r.avanza) assert.match(r.mensajeSugerido, tasa === 0 ? /~~7 %~~ 0 %[\s\S]*30 de abril de 2027/ : /7 % de tu ahorro/);
      }
    }
  } finally {
    if (antes !== undefined) process.env.CHAT_CONVENIO = antes;
  }
});
