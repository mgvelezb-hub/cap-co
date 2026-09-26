// Horarios de cita: lunes a viernes, 9:00 a 17:00 (Ciudad de México), bloques de una hora
// (la última cita empieza a las 16:00). Funciones puras, con pruebas.

export const HORA_INICIO = 9;
export const HORA_FIN = 17; // la última cita empieza a HORA_FIN - 1
export const ANTICIPACION_MIN_HORAS = 2; // horas hábiles: un viernes a las 22:00 no aparta el lunes 9:00
export const DIAS_A_MOSTRAR = 10; // días hábiles

// UTC−6 fijo (México no tiene horario de verano desde 2022).
const OFFSET_H = -6;

// Días inhábiles oficiales (LFT art. 74) y cierres, en fecha local "AAAA-MM-DD".
// MANTENIMIENTO: la lista llega a 2028-01-01; agregar el año siguiente cada diciembre (RUNBOOK).
export const DIAS_INHABILES = new Set([
  "2026-11-16", // Revolución (tercer lunes de noviembre)
  "2026-12-25",
  "2027-01-01",
  "2027-02-01", // Constitución (primer lunes de febrero)
  "2027-03-15", // Juárez (tercer lunes de marzo)
  "2027-05-01",
  "2027-09-16",
  "2027-11-15", // Revolución (tercer lunes de noviembre)
  "2027-12-25",
  "2028-01-01",
]);

/** Fecha local CDMX "AAAA-MM-DD" y día de la semana (0 = domingo) de un instante. */
export function fechaLocal(instante) {
  const d = new Date(instante.getTime() + OFFSET_H * 3600_000);
  return { fecha: d.toISOString().slice(0, 10), dia: d.getUTCDay() };
}

/** Instante UTC de una fecha local y hora CDMX. */
export function instanteLocal(fecha, hora) {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d, hora - OFFSET_H, 0, 0));
}

export function esDiaHabil(fecha) {
  const { dia } = fechaLocal(instanteLocal(fecha, 12));
  return dia >= 1 && dia <= 5 && !DIAS_INHABILES.has(fecha);
}

/** Hora local CDMX (0-23) de un instante. */
function horaLocal(instante) {
  return new Date(instante.getTime() + OFFSET_H * 3600_000).getUTCHours();
}

/** Siguiente fecha local "AAAA-MM-DD". */
function diaSiguiente(fecha) {
  const t = instanteLocal(fecha, 12);
  t.setUTCDate(t.getUTCDate() + 1);
  return fechaLocal(t).fecha;
}

/**
 * Primer instante reservable: `horas` hábiles después de `ahora`, contando solo lunes a viernes
 * de 9:00 a 17:00. Fuera de horario, la cuenta empieza en la siguiente apertura.
 */
export function limiteAnticipacion(ahora = new Date(), horas = ANTICIPACION_MIN_HORAS) {
  let restante = horas * 3600_000;
  let t = new Date(ahora.getTime());
  for (let guarda = 0; guarda < 60; guarda += 1) {
    const { fecha } = fechaLocal(t);
    const apertura = instanteLocal(fecha, HORA_INICIO);
    const cierre = instanteLocal(fecha, HORA_FIN);
    if (!esDiaHabil(fecha) || t >= cierre) {
      t = instanteLocal(diaSiguiente(fecha), HORA_INICIO);
      continue;
    }
    if (t < apertura) t = apertura;
    const disponible = cierre.getTime() - t.getTime();
    if (restante <= disponible) return new Date(t.getTime() + restante);
    restante -= disponible;
    t = instanteLocal(diaSiguiente(fecha), HORA_INICIO);
  }
  return t;
}

/**
 * Horarios posibles de los próximos días hábiles, sin considerar ocupación.
 * @returns {Array<{fecha: string, horas: Date[]}>}
 */
export function horariosPosibles(ahora = new Date(), dias = DIAS_A_MOSTRAR) {
  const limite = limiteAnticipacion(ahora);
  const resultado = [];
  let cursor = fechaLocal(ahora).fecha;
  for (let guarda = 0; resultado.length < dias && guarda < 40; guarda += 1) {
    if (esDiaHabil(cursor)) {
      const horas = [];
      for (let h = HORA_INICIO; h < HORA_FIN; h += 1) {
        const t = instanteLocal(cursor, h);
        if (t >= limite) horas.push(t);
      }
      if (horas.length > 0) resultado.push({ fecha: cursor, horas });
    }
    cursor = diaSiguiente(cursor);
  }
  return resultado;
}

// Franjas para el modo "te llamamos": el asesor llama dentro de la franja para acordar la cita.
export const FRANJAS = { manana: { desde: 9, hasta: 13, texto: "9:00 a 13:00" }, tarde: { desde: 13, hasta: 17, texto: "13:00 a 17:00" } };
export const DIAS_LLAMADA = 5;

/**
 * Franjas de llamada de los próximos días hábiles. Una franja se ofrece si todavía queda al menos
 * una hora de ella.
 * @returns {Array<{fecha: string, franjas: Array<{franja: string, inicio: Date}>}>}
 */
export function franjasPosibles(ahora = new Date(), dias = DIAS_LLAMADA) {
  const resultado = [];
  let cursor = fechaLocal(ahora).fecha;
  for (let guarda = 0; resultado.length < dias && guarda < 30; guarda += 1) {
    if (esDiaHabil(cursor)) {
      const franjas = Object.entries(FRANJAS)
        .filter(([, f]) => instanteLocal(cursor, f.hasta).getTime() - 3600_000 > ahora.getTime())
        .map(([franja, f]) => ({ franja, inicio: instanteLocal(cursor, f.desde) }));
      if (franjas.length > 0) resultado.push({ fecha: cursor, franjas });
    }
    cursor = diaSiguiente(cursor);
  }
  return resultado;
}

/** ¿Es una franja de llamada válida? Devuelve su instante de inicio o null. */
export function franjaValida(fecha, franja, ahora = new Date()) {
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !FRANJAS[franja]) return null;
  const dia = franjasPosibles(ahora).find((d) => d.fecha === fecha);
  return dia?.franjas.find((f) => f.franja === franja)?.inicio ?? null;
}

/** ¿Es un horario válido para reservar? (hábil, en punto, dentro del horario, con anticipación). */
export function horarioValido(inicio, ahora = new Date()) {
  if (!(inicio instanceof Date) || Number.isNaN(inicio.getTime())) return false;
  if (inicio.getUTCMinutes() !== 0 || inicio.getUTCSeconds() !== 0) return false;
  const { fecha } = fechaLocal(inicio);
  const hora = horaLocal(inicio);
  if (!esDiaHabil(fecha) || hora < HORA_INICIO || hora >= HORA_FIN) return false;
  if (inicio < limiteAnticipacion(ahora)) return false;
  const maximo = horariosPosibles(ahora).at(-1);
  return !maximo || fecha <= maximo.fecha;
}

/** Horario que el panel puede asignar al reprogramar: hábil, en punto, dentro del horario y futuro. */
export function horarioAtendible(inicio, ahora = new Date()) {
  if (!(inicio instanceof Date) || Number.isNaN(inicio.getTime()) || inicio <= ahora) return false;
  if (inicio.getUTCMinutes() !== 0 || inicio.getUTCSeconds() !== 0) return false;
  const hora = horaLocal(inicio);
  return esDiaHabil(fechaLocal(inicio).fecha) && hora >= HORA_INICIO && hora < HORA_FIN;
}

const FORMATO = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Mexico_City",
});

export function textoCita(inicio) {
  return FORMATO.format(inicio);
}

export function textoFranja(fecha, franja) {
  const dia = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Mexico_City" });
  return `${dia.format(instanteLocal(fecha, 12))}, de ${FRANJAS[franja].texto}`;
}

/** Modo de la agenda: "llamada" (por defecto: te llamamos para acordar) o "citas" (reserva directa). */
export function modoAgenda() {
  return process.env.AGENDA_MODO === "citas" ? "citas" : "llamada";
}

/** Citas simultáneas por horario (una por asesor). */
export function capacidadPorHorario() {
  const n = Number.parseInt(process.env.CITA_CAPACIDAD || "1", 10);
  return Number.isFinite(n) && n >= 1 && n <= 20 ? n : 1;
}
