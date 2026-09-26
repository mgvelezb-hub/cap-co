// Envío de alertas por correo con Resend (API HTTP, sin dependencia).
// Variables: RESEND_API_KEY y ALERTA_EMAIL. Sin ellas no se envía nada; el evento queda
// registrado y visible en el panel. Sin dominio verificado, Resend solo permite enviar
// desde onboarding@resend.dev al correo de la propia cuenta: suficiente para alertas internas.

export function correoConfigurado() {
  return Boolean(process.env.RESEND_API_KEY && process.env.ALERTA_EMAIL);
}

export async function enviarCorreo(asunto, texto) {
  if (!correoConfigurado()) return { enviado: false, motivo: "sin_configurar" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.ALERTA_REMITENTE || "CAP & Co. Alertas <onboarding@resend.dev>",
        to: process.env.ALERTA_EMAIL.split(",").map((c) => c.trim()),
        subject: asunto,
        text: texto,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return { enviado: false, motivo: `resend_${res.status}` };
    return { enviado: true };
  } catch (err) {
    return { enviado: false, motivo: err.message };
  }
}
