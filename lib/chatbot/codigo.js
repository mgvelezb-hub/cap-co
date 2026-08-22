// Código corto de sesión (CAP-XXXX) y construcción del link de WhatsApp.
// El código identifica la conversación web cuando la persona llega a WhatsApp.
// En fase 1 no se persiste; en fase 2 será la llave del lead en la DB.

import { PERFILES, esPerfilValido } from "./perfiles.js";

// Sin 0/O/1/I para que se dicte y se teclee sin confusión.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LARGO = 4;
export const PATRON_CODIGO = /^CAP-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;

export function generarCodigo(aleatorio = aleatorioSeguro) {
  const bytes = aleatorio(LARGO);
  let cuerpo = "";
  for (let i = 0; i < LARGO; i += 1) {
    cuerpo += ALFABETO[bytes[i] % ALFABETO.length];
  }
  return `CAP-${cuerpo}`;
}

function aleatorioSeguro(n) {
  const arr = new Uint8Array(n);
  globalThis.crypto.getRandomValues(arr);
  return arr;
}

/**
 * Link wa.me con texto prellenado. Nunca incluye datos personales ni el resumen
 * libre de la conversación: solo código y la frase fija del perfil.
 */
export function construirLinkWhatsApp({ numero, codigo, perfil }) {
  if (!PATRON_CODIGO.test(codigo)) {
    throw new Error(`Código inválido: ${codigo}`);
  }
  const perfilId = esPerfilValido(perfil) ? perfil : "curioso";
  const texto = `Hola, vengo de la página. Código ${codigo}. ${PERFILES[perfilId].frase}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
