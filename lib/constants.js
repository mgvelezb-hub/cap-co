// ÚNICO lugar donde se configura el contacto.
// Línea aún no activada (chip nuevo) — el link ya apunta al número definitivo.
export const WHATSAPP_NUMBER = "525568809606";
export const WHATSAPP_URL =
  `https://wa.me/${WHATSAPP_NUMBER}?text=Hola,%20quiero%20cotizar%20mi%20boleta`;
// Mientras la línea no esté activa (NEXT_PUBLIC_WHATSAPP_ACTIVO=si en Vercel), los botones públicos
// llevan al asistente y los avisos de error al correo: un botón a una línea muerta es engañoso.
export const WHATSAPP_ACTIVO = process.env.NEXT_PUBLIC_WHATSAPP_ACTIVO === "si";
// Canal de respaldo cuando el chat falla: WhatsApp si está activo; si no, el correo.
export const CANAL_RESPALDO = WHATSAPP_ACTIVO ? "escríbenos por WhatsApp" : "escríbenos a contacto@casa-ap.com";

// Cuentas aún no abiertas — placeholders. La estrategia es: publicidad en
// redes capta al visitante, la web educa, y el canal final de conversión
// siempre es WhatsApp (WHATSAPP_URL arriba). Reemplazar cada "#" cuando
// existan las cuentas reales.
// Correo de contacto del dominio (también para el aviso de privacidad y como remitente).
export const CORREO_CONTACTO = "contacto@casa-ap.com";

export const SOCIAL = {
  facebook: "#",
  instagram: "#",
};

export const BRAND = {
  nombre: "CAP & Co.",
  slogan: "Casa de Asesoramiento Prendario",
};

// Datos del responsable para avisos y términos (LFPDPPP art. 15-I, LFPC art. 76 Bis-III).
// PENDIENTES: los entrega Ricardo / el abogado. Mientras digan "[pendiente…]", se muestran tal cual
// para que nadie los confunda con datos reales.
export const LEGAL = {
  responsable: "[nombre del titular pendiente]",
  rfc: "[RFC pendiente]",
  domicilio: "[domicilio pendiente], Ciudad de México",
  telefono: "[teléfono pendiente]",
  vigencia: "1 de octubre de 2026",
};
