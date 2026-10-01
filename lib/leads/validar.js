// Validación de datos de contacto. Funciones puras, sin DB.

export const AVISO_VERSION = "2026-10-provisional-4";

export function normalizarTelefono(entrada) {
  if (typeof entrada !== "string") return null;
  let digitos = entrada.replace(/\D/g, "");
  // Quitar prefijo de país de México si lo traen: +52 / 52 / 521 / 5521...
  if (digitos.length === 12 && digitos.startsWith("52")) digitos = digitos.slice(2);
  if (digitos.length === 13 && digitos.startsWith("521")) digitos = digitos.slice(3);
  if (digitos.length !== 10) return null;
  return digitos;
}

export function normalizarNombre(entrada) {
  if (typeof entrada !== "string") return null;
  const limpio = entrada.replace(/\s+/g, " ").trim();
  if (limpio.length < 2 || limpio.length > 80) return null;
  return limpio;
}

/** Correo opcional: vacío es válido (null); si viene, debe parecer un correo. */
export function normalizarEmail(entrada) {
  if (entrada === undefined || entrada === null || entrada === "") return { ok: true, email: null };
  if (typeof entrada !== "string") return { ok: false };
  const limpio = entrada.trim().toLowerCase();
  if (limpio.length > 120 || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(limpio)) return { ok: false };
  return { ok: true, email: limpio };
}

/**
 * Valida el formulario de contacto. Devuelve {ok:true, nombre, telefono, email} o {ok:false, error}.
 */
export function validarContacto({ nombre, telefono, email, acepta }) {
  if (acepta !== true) {
    return { ok: false, error: "Necesitas aceptar el aviso de privacidad para que te contactemos." };
  }
  const n = normalizarNombre(nombre);
  if (!n) return { ok: false, error: "Escribe tu nombre (2 a 80 letras)." };
  const t = normalizarTelefono(telefono);
  if (!t) return { ok: false, error: "Escribe un WhatsApp de 10 dígitos." };
  const e = normalizarEmail(email);
  if (!e.ok) return { ok: false, error: "Revisa tu correo, o déjalo vacío." };
  return { ok: true, nombre: n, telefono: t, email: e.email };
}

/** Fuente de tráfico que manda el widget. Solo se guardan llaves conocidas, recortadas. */
export function limpiarFuente(fuente) {
  if (!fuente || typeof fuente !== "object") return {};
  const llaves = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "referrer", "path"];
  const limpia = {};
  for (const k of llaves) {
    const v = fuente[k];
    if (typeof v === "string" && v.trim()) limpia[k] = v.trim().slice(0, 200);
  }
  return limpia;
}
