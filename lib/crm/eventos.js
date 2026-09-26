// Historial del lead: cada contacto, respuesta y cambio queda en lead_evento. Los tipos de
// contacto y respuesta actualizan los relojes que usan "días sin contestar" y el seguimiento.

import { query } from "../db/client.js";

export const TIPOS_EVENTO = {
  lead_creado: "Llegó desde el chat",
  contacto_guardado: "Dejó sus datos",
  correo_enviado: "Correo enviado",
  correo_fallido: "No se pudo enviar el correo",
  whatsapp_enviado: "WhatsApp enviado",
  llamada_hecha: "Llamada: habló con la persona",
  llamada_sin_respuesta: "Llamada: no contestó",
  respondio: "La persona respondió",
  nota: "Nota",
  etapa: "Cambio de etapa",
  clasificacion: "Clasificación",
  clasificacion_aprobada: "Clasificación aprobada",
  cita: "Cita",
  traspaso: "Checklist del cambio",
  baja: "Pidió no recibir más mensajes",
  seguimiento: "Seguimiento automático",
};

// Nosotros buscamos a la persona.
export const CONTACTO_NUESTRO = new Set(["correo_enviado", "whatsapp_enviado", "llamada_hecha", "llamada_sin_respuesta"]);
// La persona dio señales de vida.
export const RESPUESTA = new Set(["respondio", "llamada_hecha", "contacto_guardado"]);

/**
 * Registra un evento y mueve los relojes del lead. `db` puede ser un cliente de transacción.
 */
export async function registrarEventoLead(codigo, tipo, { canal = null, usuario = null, detalle = {} } = {}, db = { query }) {
  if (!TIPOS_EVENTO[tipo]) throw new Error(`tipo de evento desconocido: ${tipo}`);
  await db.query(
    `INSERT INTO lead_evento (lead_codigo, tipo, canal, usuario, detalle) VALUES ($1, $2, $3, $4, $5)`,
    [codigo, tipo, canal, usuario, JSON.stringify(detalle)],
  );
  // Una llamada contestada es contacto y respuesta a la vez: queda al día.
  if (RESPUESTA.has(tipo)) {
    await db.query(
      `UPDATE lead SET ultima_respuesta_at = now(), esperando_respuesta_desde = NULL, actualizado_at = now()
        ${CONTACTO_NUESTRO.has(tipo) ? ", ultimo_contacto_at = now()" : ""} WHERE codigo = $1`,
      [codigo],
    );
  } else if (CONTACTO_NUESTRO.has(tipo)) {
    await db.query(
      `UPDATE lead SET ultimo_contacto_at = now(), esperando_respuesta_desde = COALESCE(esperando_respuesta_desde, now()),
              actualizado_at = now() WHERE codigo = $1`,
      [codigo],
    );
  }
}

export async function historial(codigo, limite = 100) {
  const { rows } = await query(
    `SELECT id, creado_at, tipo, canal, usuario, detalle FROM lead_evento WHERE lead_codigo = $1 ORDER BY creado_at DESC, id DESC LIMIT $2`,
    [codigo, limite],
  );
  return rows;
}
