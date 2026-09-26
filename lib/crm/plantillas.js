// Textos de los mensajes a la persona: correos automáticos y WhatsApp que manda el asesor.
// Sin superlativos ni promesas de ahorro: el monto final se confirma antes de cualquier trámite.

import { WHATSAPP_NUMBER } from "../constants.js";

const SITIO = process.env.SITIO_URL || "https://casa-ap.com";

export function primerNombre(nombre) {
  return (nombre || "").trim().split(/\s+/)[0] || "";
}

function saludo(lead) {
  const n = primerNombre(lead.nombre);
  return n ? `Hola, ${n}` : "Hola";
}

const PIE = (lead) =>
  [
    "",
    "CAP & Co. · Casa de Asesoramiento Prendario",
    `WhatsApp: https://wa.me/${WHATSAPP_NUMBER} · Lunes a viernes, 9:00 a 17:00`,
    lead.baja_token ? `Si ya no quieres recibir estos correos: ${SITIO}/baja/${lead.baja_token}` : "",
  ].join("\n");

export const CORREOS = {
  bienvenida: (lead) => ({
    asunto: `Recibimos tu caso ${lead.codigo}`,
    texto: [
      `${saludo(lead)}:`,
      "",
      `Recibimos tu solicitud. Tu código es ${lead.codigo}; tenlo a la mano cuando hablemos.`,
      "Un asesor te contacta en el horario que elegiste para revisar tu boleta contigo.",
      "",
      "Ten a la mano tu boleta y una identificación oficial.",
      "No lleves tu pieza ni pagues nada hasta que te confirmemos día, hora y lugar.",
      "El análisis de tu boleta no tiene costo. Si decides hacer el cambio con nosotros, antes de cualquier trámite te decimos nuestra comisión y cuánto te ahorras ya con ella.",
      PIE(lead),
    ].join("\n"),
  }),
  recordatorio: (lead) => ({
    asunto: `Tu caso ${lead.codigo} sigue abierto`,
    texto: [
      `${saludo(lead)}:`,
      "",
      "Intentamos contactarte para revisar tu boleta y no coincidimos.",
      `Escríbenos por WhatsApp con tu código ${lead.codigo} y te atendemos: https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola, mi código es ${lead.codigo}`)}`,
      "",
      "Si tu boleta está por vencer, no esperes: en muchos casos todavía hay opciones.",
      PIE(lead),
    ].join("\n"),
  }),
  segundo_recordatorio: (lead) => ({
    asunto: `¿Seguimos con tu boleta? (${lead.codigo})`,
    texto: [
      `${saludo(lead)}:`,
      "",
      "Seguimos pendientes de tu caso. Si ya lo resolviste, no tienes que hacer nada.",
      `Si quieres que revisemos tu boleta, respóndenos por WhatsApp con tu código ${lead.codigo}: https://wa.me/${WHATSAPP_NUMBER}`,
      PIE(lead),
    ].join("\n"),
  }),
  cierre: (lead) => ({
    asunto: `Cerramos tu caso por ahora (${lead.codigo})`,
    texto: [
      `${saludo(lead)}:`,
      "",
      "Como no coincidimos, dejamos tu caso en pausa. Cuando quieras retomarlo, escríbenos con tu código y seguimos donde nos quedamos.",
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola, quiero retomar mi caso ${lead.codigo}`)}`,
      PIE(lead),
    ].join("\n"),
  }),
};

// Mensajes de WhatsApp que el asesor manda desde su teléfono (link con el texto listo).
export const WHATSAPP = {
  primer_contacto: (lead, asesor) =>
    `${saludo(lead)}, soy ${asesor || "tu asesor"} de CAP & Co. Recibimos tu caso ${lead.codigo}. ¿Te puedo marcar para revisar tu boleta? Si prefieres, mándame una foto de la boleta por aquí.`,
  recordatorio: (lead, asesor) =>
    `${saludo(lead)}, soy ${asesor || "tu asesor"} de CAP & Co. Te escribo por tu caso ${lead.codigo}. ¿Sigues interesado en revisar tu boleta? Estoy para ayudarte.`,
  confirmar_cita: (lead, asesor, extra = {}) =>
    `${saludo(lead)}, soy ${asesor || "tu asesor"} de CAP & Co. Te confirmo tu cita ${extra.cuando ? `el ${extra.cuando}` : ""}${extra.lugar ? ` en ${extra.lugar}` : ""}. Lleva tu boleta original e identificación. Tu código es ${lead.codigo}.`,
  taller: (lead, asesor) =>
    `${saludo(lead)}, soy ${asesor || "tu asesor"} de CAP & Co. Revisando tu caso ${lead.codigo}, restaurar tu pieza con nuestro taller podría mejorar su avalúo. ¿Te platico cómo funciona?`,
  seguimiento_cita: (lead, asesor) =>
    `${saludo(lead)}, soy ${asesor || "tu asesor"} de CAP & Co. ¿Cómo te fue con el trámite de tu caso ${lead.codigo}? Si te falta algo, aquí estoy.`,
};

export const NOMBRE_WHATSAPP = {
  primer_contacto: "Primer contacto",
  recordatorio: "Recordatorio",
  confirmar_cita: "Confirmar cita",
  taller: "Ofrecer taller",
  seguimiento_cita: "Después de la cita",
};

/** Link wa.me al teléfono de la persona con el mensaje listo. */
export function linkWhatsApp(lead, plantilla, asesor, extra) {
  if (!lead.telefono || !WHATSAPP[plantilla]) return null;
  const texto = WHATSAPP[plantilla](lead, asesor, extra);
  return { texto, url: `https://wa.me/52${lead.telefono}?text=${encodeURIComponent(texto)}` };
}
