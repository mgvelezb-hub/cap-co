// Comisión de CAP & Co. (Mau, 3-oct-2026). Ninguna casa de empeño le paga a CAP & Co.: la persona
// paga un porcentaje de su ahorro, solo si el cambio se concreta y siempre dicho por escrito antes
// del trámite. Precio de lista 7 %; promoción de lanzamiento 0 % en cambios concretados hasta el
// 30 de abril de 2027 (hora CDMX). Desde el 1 de mayo aplica el 7 % sin tocar código.
// Abierto: si el 7 % lleva IVA y la estrategia fiscal (por eso la promoción).
// Sitio, chat, avisos, guiones y CRM leen de aquí: un solo lugar para la regla y su texto.

export const COMISION_LISTA = 0.07;
export const PROMO_FIN = "2027-04-30"; // último día con 0 %, inclusive
export const PROMO_FIN_TEXTO = "30 de abril de 2027";
export const LISTA_TEXTO = "7 %";

const DIA_CDMX = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" });

/** Día AAAA-MM-DD en la Ciudad de México. */
export function diaCDMX(fecha = new Date()) {
  return DIA_CDMX.format(fecha instanceof Date ? fecha : new Date(fecha));
}

export function enPromocion(fecha = new Date()) {
  return diaCDMX(fecha) <= PROMO_FIN;
}

/** Tasa que se aplica a un cambio concretado en esa fecha: 0 en promoción, 7 % después. */
export function comisionVigente(fecha = new Date()) {
  return enPromocion(fecha) ? 0 : COMISION_LISTA;
}

/**
 * Cómo se dice la comisión. `tachado` marca el precio de lista para las páginas (<s>) y el chat
 * (~~). Sin marca, texto plano (correos, WhatsApp).
 */
export function textoComision({ fecha = new Date(), tachado = "plano" } = {}) {
  if (!enPromocion(fecha)) {
    return `Nuestra comisión es ${LISTA_TEXTO} de tu ahorro, solo si el cambio se concreta, y te la decimos por escrito antes de cualquier trámite.`;
  }
  const lista = tachado === "markdown" ? `~~${LISTA_TEXTO}~~` : LISTA_TEXTO;
  const precio = tachado === "plano" ? `0 % (precio regular ${LISTA_TEXTO})` : `${lista} 0 %`;
  return `Nuestra comisión: ${precio} de tu ahorro. Por promoción de lanzamiento, en cambios concretados hasta el ${PROMO_FIN_TEXTO} no te cobramos nada; después, ${LISTA_TEXTO} de tu ahorro, solo si el cambio se concreta y siempre dicho por escrito antes del trámite.`;
}
