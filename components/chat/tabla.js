// Reconocimiento de tablas markdown en las burbujas del chat (sin JSX, para poder probarlo).

export const SEPARADOR_TABLA = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

/** Una fila empieza con "|" y tiene al menos otra "|"; el pipe final es opcional. */
export function esFilaTabla(linea) {
  return /^\s*\|.+\|/.test(linea);
}

export function celdas(linea) {
  return linea.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}
