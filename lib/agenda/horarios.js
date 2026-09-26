// Horarios de cita: lunes a viernes, 9:00 a 17:00 (Ciudad de México), bloques de una hora
// (la última cita empieza a las 16:00). Funciones puras, con pruebas.

export const HORA_INICIO = 9;
export const HORA_FIN = 17; // la última cita empieza a HORA_FIN - 1
export const ANTICIPACION_MIN_HORAS = 2;
export const DIAS_A_MOSTRAR = 10; // días hábiles

// UTC−6 fijo (México no tiene horario de verano desde 2022).
const OFFSET_H = -6;

// Días inhábiles oficiales (LFT art. 74) y cierres, en fecha local "AAAA-MM-DD".
export const DIAS_INHABILES = new Set([
  "2026-11-16", // Revolución (tercer lunes de noviembre)
  "2026-12-25",
  "2027-01-01",
  "2027-02-01", // Constitución (primer lunes de febrero)
  "2027-03-15", // Juárez (tercer lunes de marzo)
  "2027-05-01",
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

/**
 * Horarios posibles de los próximos días hábiles, sin considerar ocupación.
 * @returns {Array<{fecha: string, horas: Date[]}>}
 */
export function horariosPosibles(ahora = new Date(), dias = DIAS_A_MOSTRAR) {
  const limite = new Date(ahora.getTime() + ANTICIPACION_MIN_HORAS * 3600_000);
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
    const siguiente = instanteLocal(cursor, 12);
    siguiente.setUTCDate(siguiente.getUTCDate() + 1);
    cursor = fechaLocal(siguiente).fecha;
  }
  return resultado;
}

/** ¿Es un horario válido para reservar? (hábil, en punto, dentro del horario, con anticipación). */
export function horarioValido(inicio, ahora = new Date()) {
  if (!(inicio instanceof Date) || Number.isNaN(inicio.getTime())) return false;
  if (inicio.getUTCMinutes() !== 0 || inicio.getUTCSeconds() !== 0) return false;
  const { fecha } = fechaLocal(inicio);
  const hora = new Date(inicio.getTime() + OFFSET_H * 3600_000).getUTCHours();
  if (!esDiaHabil(fecha) || hora < HORA_INICIO || hora >= HORA_FIN) return false;
  if (inicio < new Date(ahora.getTime() + ANTICIPACION_MIN_HORAS * 3600_000)) return false;
  const maximo = horariosPosibles(ahora).at(-1);
  return !maximo || fecha <= maximo.fecha;
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
