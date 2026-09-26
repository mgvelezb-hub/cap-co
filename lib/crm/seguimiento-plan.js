// Plan de seguimiento automático (funciones puras, con pruebas).
// Cuando la persona deja sus datos, el sistema la contacta y, si no responde, insiste con
// calma en días hábiles; se detiene en cuanto responde, confirma cita, se descarta o pide baja.
//
//   paso 0 → al dejar datos: correo de bienvenida (si dejó correo) + WhatsApp de primer contacto
//   paso 1 → 1 día hábil sin respuesta: correo + WhatsApp de recordatorio
//   paso 2 → 3 días hábiles: correo + llamada
//   paso 3 → 7 días hábiles: correo de cierre ("aquí seguimos cuando quieras"); termina

import { limiteAnticipacion } from "../agenda/horarios.js";

export const PASOS = [
  { paso: 0, correo: "bienvenida", tarea: { tipo: "whatsapp", plantilla: "primer_contacto", titulo: "Primer contacto por WhatsApp" }, siguienteHoras: 8 },
  { paso: 1, correo: "recordatorio", tarea: { tipo: "whatsapp", plantilla: "recordatorio", titulo: "Recordatorio por WhatsApp" }, siguienteHoras: 16 },
  { paso: 2, correo: "segundo_recordatorio", tarea: { tipo: "llamar", plantilla: null, titulo: "Llamar: no ha respondido" }, siguienteHoras: 32 },
  { paso: 3, correo: "cierre", tarea: null, siguienteHoras: null },
];

const HORAS_HABILES_POR_DIA = 8;

/** ¿La persona respondió después de que la contactamos? (Dejar sus datos no cuenta.) */
export function respondioANuestroContacto(lead) {
  if (!lead.ultimo_contacto_at || lead.esperando_respuesta_desde || !lead.ultima_respuesta_at) return false;
  return new Date(lead.ultima_respuesta_at) >= new Date(lead.ultimo_contacto_at);
}

/** ¿Sigue activo el seguimiento automático de este lead? Devuelve el motivo si no. */
export function motivoSinSeguimiento(lead) {
  if (!lead.consent_at) return "sin_datos";
  if (lead.no_contactar_at) return "baja";
  if (lead.etapa !== "cita_solicitada") return "avanzo";
  // Solo un "no aplica" confirmado por una persona apaga el seguimiento.
  if (lead.clasificacion === "no_aplica" && lead.clasificacion_fuente === "humano") return "no_aplica";
  if (respondioANuestroContacto(lead) && Number(lead.seguimiento_paso) > 0) {
    // Ya hubo conversación: lo lleva una persona, no el sistema.
    return "respondio";
  }
  if (Number(lead.seguimiento_paso) >= PASOS.length) return "terminado";
  return null;
}

/** El paso que toca ahora, o null si no toca nada todavía. */
export function pasoPendiente(lead, ahora = new Date()) {
  if (motivoSinSeguimiento(lead)) return null;
  const paso = Number(lead.seguimiento_paso) || 0;
  if (paso > 0 && (!lead.proximo_seguimiento_at || new Date(lead.proximo_seguimiento_at) > ahora)) return null;
  return PASOS[paso];
}

/** Cuándo toca el paso siguiente (en horas hábiles), o null si ya no hay. */
export function proximoSeguimiento(paso, ahora = new Date()) {
  const p = PASOS[paso];
  return p && p.siguienteHoras ? limiteAnticipacion(ahora, p.siguienteHoras) : null;
}

/**
 * Días sin contestar: desde nuestro primer contacto sin respuesta. Si nadie le ha escrito,
 * cuenta los días que lleva esperando que lo atiendan.
 * @returns {{estado: "sin_atender"|"esperando_respuesta"|"al_dia", dias: number}}
 */
export function diasSinContestar(lead, ahora = new Date()) {
  const dias = (desde) => Math.max(0, Math.floor((ahora - new Date(desde)) / 86_400_000));
  if (!lead.consent_at) return { estado: "al_dia", dias: 0 };
  if (!lead.ultimo_contacto_at) return { estado: "sin_atender", dias: dias(lead.consent_at) };
  if (lead.esperando_respuesta_desde) return { estado: "esperando_respuesta", dias: dias(lead.esperando_respuesta_desde) };
  return { estado: "al_dia", dias: 0 };
}

export { HORAS_HABILES_POR_DIA };
