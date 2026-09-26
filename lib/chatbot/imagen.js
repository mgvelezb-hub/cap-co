// Foto de boleta: validación y armado del mensaje para el modelo.
// La imagen solo viaja en el turno en que se sube: no se guarda en la base, ni en el
// historial del navegador, ni en los logs. Lo que el modelo lee queda en su respuesta.

export const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp"];
// El widget comprime a JPEG de 1600 px (~300–800 KB). Tope holgado, debajo del límite de 4.5 MB de Vercel.
export const MAX_BASE64 = 4_000_000;

export function validarImagen(imagen) {
  if (imagen == null) return { ok: true, imagen: null };
  if (typeof imagen !== "object") return { ok: false, error: "Imagen inválida." };
  const { media_type: tipo, data } = imagen;
  if (!TIPOS_IMAGEN.includes(tipo)) return { ok: false, error: "La foto debe ser JPG, PNG o WebP." };
  if (typeof data !== "string" || data.length < 100) return { ok: false, error: "Imagen inválida." };
  if (data.length > MAX_BASE64) return { ok: false, error: "La foto pesa demasiado. Intenta con otra más ligera." };
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return { ok: false, error: "Imagen inválida." };
  return { ok: true, imagen: { media_type: tipo, data } };
}

export function fechaHoyMX(ahora = new Date()) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "America/Mexico_City" }).format(ahora);
}

/**
 * Convierte el último mensaje del usuario en [imagen, texto]. La nota con la fecha de hoy va
 * aquí (fuera del prompt cacheado) porque el análisis necesita contar meses desde el empeño.
 */
export function mensajeConImagen(texto, imagen, ahora = new Date()) {
  return [
    { type: "image", source: { type: "base64", media_type: imagen.media_type, data: imagen.data } },
    {
      type: "text",
      text: `${texto}\n\n[Nota del sistema, no del usuario: la persona adjuntó una foto de su boleta. Fecha de hoy en la Ciudad de México: ${fechaHoyMX(ahora)}.]`,
    },
  ];
}
