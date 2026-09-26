import { test } from "node:test";
import assert from "node:assert/strict";
import {
  horariosPosibles,
  horarioValido,
  horarioAtendible,
  esDiaHabil,
  instanteLocal,
  fechaLocal,
  limiteAnticipacion,
  franjasPosibles,
  franjaValida,
} from "../lib/agenda/horarios.js";
import { rechazarSiOtroOrigen } from "../lib/panel/auth.js";

test("agenda: días hábiles sin fines de semana ni días oficiales", () => {
  assert.equal(esDiaHabil("2026-09-28"), true); // lunes
  assert.equal(esDiaHabil("2026-09-26"), false); // sábado
  assert.equal(esDiaHabil("2026-11-16"), false); // Revolución
  assert.equal(fechaLocal(instanteLocal("2026-09-28", 9)).fecha, "2026-09-28");
  assert.equal(instanteLocal("2026-09-28", 9).toISOString(), "2026-09-28T15:00:00.000Z");
});

test("agenda: horarios de 9 a 16 h, con 2 h hábiles de anticipación, 10 días hábiles", () => {
  const sabado = new Date("2026-09-26T18:00:00Z");
  const dias = horariosPosibles(sabado);
  assert.equal(dias.length, 10);
  assert.equal(dias[0].fecha, "2026-09-28");
  assert.equal(dias[0].horas.length, 6, "el lunes empieza a las 11:00: dos horas hábiles después de abrir");
  assert.equal(dias[0].horas[0].toISOString(), "2026-09-28T17:00:00.000Z");
  assert.equal(dias[1].horas.length, 8);
  const lunes1030 = new Date("2026-09-28T16:30:00Z"); // 10:30 CDMX
  assert.equal(horariosPosibles(lunes1030)[0].horas[0].toISOString(), "2026-09-28T19:00:00.000Z"); // 13:00, porque 12:30 no está en punto
  assert.equal(horarioValido(new Date("2026-09-28T15:00:00Z"), sabado), false, "lunes 9:00 desde el sábado ya no");
  assert.equal(horarioValido(new Date("2026-09-28T17:00:00Z"), sabado), true);
  assert.equal(horarioValido(new Date("2026-09-28T15:30:00Z"), sabado), false, "no en punto");
  assert.equal(horarioValido(new Date("2026-09-28T17:00:00.500Z"), sabado), false, "con milisegundos");
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

test("agenda: la anticipación cuenta solo horas hábiles", () => {
  // Viernes 16:30 CDMX: queda media hora del viernes y hora y media del lunes.
  assert.equal(limiteAnticipacion(new Date("2026-09-25T22:30:00Z")).toISOString(), "2026-09-28T16:30:00.000Z");
  // Viernes 22:00 CDMX: cuenta desde el lunes 9:00.
  assert.equal(limiteAnticipacion(new Date("2026-09-26T04:00:00Z")).toISOString(), "2026-09-28T17:00:00.000Z");
  // Martes 10:00: 12:00 del mismo día.
  assert.equal(limiteAnticipacion(new Date("2026-09-29T16:00:00Z")).toISOString(), "2026-09-29T18:00:00.000Z");
  // Viernes 13 nov 16:00: el lunes 16 es día oficial, sigue el martes 17 a las 10:00.
  assert.equal(limiteAnticipacion(new Date("2026-11-13T22:00:00Z")).toISOString(), "2026-11-17T16:00:00.000Z");
});

test("agenda: franjas de llamada", () => {
  const lunes1230 = new Date("2026-09-28T18:30:00Z"); // 12:30 CDMX: la mañana ya no (le queda media hora)
  assert.equal(franjasPosibles(new Date("2026-09-28T21:30:00Z"))[0].fecha, "2026-09-29", "15:30: la tarde ya no da 2 h para llamar");
  const dias = franjasPosibles(lunes1230);
  assert.equal(dias.length, 5);
  assert.deepEqual(dias[0].franjas.map((f) => f.franja), ["tarde"]);
  assert.equal(dias[1].franjas.length, 2);
  assert.equal(franjaValida("2026-09-28", "manana", lunes1230), null);
  assert.equal(franjaValida("2026-09-28", "tarde", lunes1230).toISOString(), "2026-09-28T19:00:00.000Z");
  assert.equal(franjaValida("2026-09-28", "noche", lunes1230), null);
  assert.equal(franjaValida("2026-09-27", "tarde", lunes1230), null, "domingo");
  assert.equal(franjaValida("x' OR 1=1", "tarde", lunes1230), null);
});

test("agenda: el panel puede reprogramar sin anticipación, pero en horario y a futuro", () => {
  const lunes10 = new Date("2026-09-28T16:00:00Z");
  assert.equal(horarioAtendible(new Date("2026-09-28T17:00:00Z"), lunes10), true, "11:00 del mismo día");
  assert.equal(horarioAtendible(new Date("2026-09-28T15:00:00Z"), lunes10), false, "ya pasó");
  assert.equal(horarioAtendible(new Date("2026-09-28T23:00:00Z"), lunes10), false, "17:00");
  assert.equal(horarioAtendible(new Date("2026-10-03T17:00:00Z"), lunes10), false, "sábado");
});

test("panel: Origin null se rechaza con 403, no con error", () => {
  const req = new Request("https://casa-ap.com/api/admin/x", {
    method: "POST",
    headers: { host: "casa-ap.com", "content-type": "application/json", origin: "null" },
  });
  assert.equal(rechazarSiOtroOrigen(req).status, 403);
});
