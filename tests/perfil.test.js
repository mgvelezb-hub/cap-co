import { test } from "node:test";
import assert from "node:assert/strict";
import { limpiarPerfil, notaDePerfil, etiquetaPerfil, MENSAJE_POR_CASO, PREGUNTAS_PERFIL } from "../lib/chatbot/perfil-visita.js";
import { limpiarResumen, transcripcion } from "../lib/metricas/resumen.js";

test("limpiarPerfil deja solo campos y valores conocidos", () => {
  assert.deepEqual(limpiarPerfil({ edad: "25_34", caso: "vigente", nombre: "Juan", zona: "cdmx:Iztapalapa", prenda: "diamantes" }), {
    edad: "25_34",
    caso: "vigente",
    zona: "cdmx:Iztapalapa",
  });
  assert.deepEqual(limpiarPerfil({ edad: "no_dice" }), { edad: "no_dice" });
  assert.deepEqual(limpiarPerfil({ omitido: true, edad: "25_34" }), { omitido: true });
  assert.equal(limpiarPerfil({ edad: "99" }), null);
  assert.equal(limpiarPerfil("edad"), null);
  assert.equal(limpiarPerfil([]), null);
  assert.equal(limpiarPerfil(null), null);
});

test("notaDePerfil describe lo elegido y omite 'prefiero no decir'", () => {
  const nota = notaDePerfil({ caso: "por_vencer", edad: "no_dice", zona: "edomex" });
  assert.match(nota, /Nota del sistema/);
  assert.match(nota, /por vencer/);
  assert.match(nota, /Estado de México/);
  assert.doesNotMatch(nota, /Prefiero no decir|edad/i);
  assert.equal(notaDePerfil({ omitido: true }), null);
  assert.equal(notaDePerfil({ edad: "no_dice" }), null);
  assert.equal(notaDePerfil(null), null);
});

test("cada caso con mensaje inicial existe en las preguntas", () => {
  for (const caso of Object.keys(MENSAJE_POR_CASO)) assert.ok(etiquetaPerfil("caso", caso), caso);
  assert.equal(PREGUNTAS_PERFIL.zona.opciones.filter(([v]) => v.startsWith("cdmx:")).length, 16);
  assert.equal(etiquetaPerfil("edad", "no_dice"), "Prefiero no decir");
});

test("limpiarResumen quita teléfonos y correos y recorta", () => {
  const r = limpiarResumen('"Tiene boleta de 5,000 con NMP; dejó su tel 55 1234 5678 y correo ana.p@gmail.com."');
  assert.doesNotMatch(r, /1234|gmail/);
  assert.match(r, /\[número\]/);
  assert.match(r, /\[correo\]/);
  assert.match(r, /5,000/);
  assert.equal(limpiarResumen("Su número es 55.1234.5678"), "Su número es [número]");
  assert.ok(limpiarResumen("x".repeat(500)).length <= 280);
  assert.equal(limpiarResumen(null), "");
});

test("transcripcion arma el texto con la respuesta al final", () => {
  const t = transcripcion([{ role: "user", content: "hola" }], "Te ayudo");
  assert.equal(t, "Persona: hola\nAsesor: Te ayudo");
});
