// Correos a la persona (no a nosotros): Resend con el remitente de CAP & Co.
// Requiere RESEND_API_KEY y CORREO_REMITENTE con un dominio verificado en Resend
// (p. ej. "CAP & Co. <hola@casa-ap.com>"). Sin eso no se envía y queda el evento.

import { CORREOS } from "./plantillas.js";

export function correoPersonasConfigurado() {
  return Boolean(process.env.RESEND_API_KEY && process.env.CORREO_REMITENTE);
}

/** @returns {Promise<{enviado: boolean, motivo?: string, id?: string}>} */
export async function enviarCorreoLead(lead, plantilla, { fetchImpl = fetch } = {}) {
  if (!lead.email) return { enviado: false, motivo: "sin_correo" };
  if (lead.no_contactar_at) return { enviado: false, motivo: "baja" };
  if (!CORREOS[plantilla]) return { enviado: false, motivo: "plantilla_desconocida" };
  if (!correoPersonasConfigurado()) return { enviado: false, motivo: "sin_configurar" };
  const { asunto, texto } = CORREOS[plantilla](lead);
  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CORREO_REMITENTE,
        to: [lead.email],
        subject: asunto,
        text: texto,
        headers: lead.baja_token
          ? { "List-Unsubscribe": `<${process.env.SITIO_URL || "https://casa-ap.com"}/baja/${lead.baja_token}>` }
          : undefined,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return { enviado: false, motivo: `resend_${res.status}` };
    const data = await res.json().catch(() => ({}));
    return { enviado: true, id: data.id };
  } catch (err) {
    return { enviado: false, motivo: err.message };
  }
}
