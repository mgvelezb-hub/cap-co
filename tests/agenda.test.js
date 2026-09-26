import { test } from "node:test";
import assert from "node:assert/strict";
import { horariosPosibles, horarioValido, esDiaHabil, instanteLocal, fechaLocal } from "../lib/agenda/horarios.js";
import { rechazarSiOtroOrigen } from "../lib/panel/auth.js";

test("agenda: días hábiles sin fines de semana ni días oficiales", () => {
  assert.equal(esDiaHabil("2026-09-28"), true); // lunes
  assert.equal(esDiaHabil("2026-09-26"), false); // sábado
  assert.equal(esDiaHabil("2026-11-16"), false); // Revolución
  assert.equal(fechaLocal(instanteLocal("2026-09-28", 9)).fecha, "2026-09-28");
  assert.equal(instanteLocal("2026-09-28", 9).toISOString(), "2026-09-28T15:00:00.000Z");
});

test("agenda: horarios de 9 a 16 h, con 2 h de anticipación, 10 días hábiles", () => {
  const sabado = new Date("2026-09-26T18:00:00Z");
  const dias = horariosPosibles(sabado);
  assert.equal(dias.length, 10);
  assert.equal(dias[0].fecha, "2026-09-28");
  assert.equal(dias[0].horas.length, 8);
  assert.equal(dias[0].horas[0].toISOString(), "2026-09-28T15:00:00.000Z");
  const lunes1030 = new Date("2026-09-28T16:30:00Z"); // 10:30 CDMX
  assert.equal(horariosPosibles(lunes1030)[0].horas[0].toISOString(), "2026-09-28T19:00:00.000Z"); // 13:00, porque 12:30 no está en punto
  assert.equal(horarioValido(new Date("2026-09-28T15:00:00Z"), sabado), true);
  assert.equal(horarioValido(new Date("2026-09-28T15:30:00Z"), sabado), false, "no en punto");
  assert.equal(horarioValido(new Date("2026-09-28T23:00:00Z"), sabado), false, "17:00 ya no");
  assert.equal(horarioValido(new Date("2026-09-27T15:00:00Z"), sabado), false, "domingo");
  assert.equal(horarioValido(new Date("2026-12-28T15:00:00Z"), sabado), false, "fuera de los 10 días");
});

test("panel: rechaza peticiones de otro sitio o que no son JSON", () => {
  const req = (h) => new Request("https://casa-ap.com/api/admin/x", { method: "POST", headers: { host: "casa-ap.com", ...h } });
  assert.equal(rechazarSiOtroOrigen(req({ "content-type": "text/plain" })).status, 415);
  assert.equal(rechazarSiOtroOrigen(req({ "content-type": "application/json", "sec-fetch-site": "cross-site" })).status, 403);
  assert.equal(rechazarSiOtroOrigen(req({ "content-type": "application/json", origin: "https://malo.com" })).status, 403);
  assert.equal(rechazarSiOtroOrigen(req({ "content-type": "application/json", "sec-fetch-site": "same-origin", origin: "https://casa-ap.com" })), null);
});
