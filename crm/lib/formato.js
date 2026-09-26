import { ETAPAS_PANEL } from "@lib/leads/etapas";
import { NOMBRE_CLASE } from "@lib/crm/reglas";

const TZ = "America/Mexico_City";
const FECHA = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: TZ });
const FECHA_HORA = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: TZ });

export const pesos = (n) =>
  n === null || n === undefined || n === "" ? "—" : Number(n).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
export const fecha = (d) => (d ? FECHA.format(new Date(d)) : "—");
export const fechaHora = (d) => (d ? FECHA_HORA.format(new Date(d)) : "—");
export const etapaNombre = (e) => Object.fromEntries(ETAPAS_PANEL)[e] || e;
export const claseNombre = (c) => NOMBRE_CLASE[c] || "Sin clasificar";
export { ETAPAS_PANEL, NOMBRE_CLASE };

export function hace(d, ahora = new Date()) {
  if (!d) return "—";
  const min = Math.round((ahora - new Date(d)) / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.round(h / 24);
  return `hace ${dias} ${dias === 1 ? "día" : "días"}`;
}

export const PERFILES = {
  primera_vez: "Primera vez",
  ya_empeno_confundido: "Ya empeñó, con dudas",
  quiere_traspaso: "Quiere cambiarse",
  boleta_vencida: "Boleta vencida",
  restauracion: "Restauración",
  curioso: "Curioso",
};

/** Hoy en la Ciudad de México, "AAAA-MM-DD". */
export function hoyCDMX() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export const NOMBRE_ESTADO_CITA = {
  reservada: "Por confirmar",
  confirmada: "Confirmada",
  atendida: "Atendida",
  no_asistio: "No asistió",
  cancelada: "Cancelada",
  expirada: "Expirada",
};
