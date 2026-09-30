// Ingreso de CAP & Co. por cambio concretado. Lo paga la casa de empeño de la red que recibe al
// cliente, la misma tarifa para todas; el usuario no paga nada. Es un dato interno del CRM
// (dinero por campaña, cobro), nunca se usa en el chat ni resta del ahorro de la persona.
//   TARIFA_CAMBIO_MXN   tarifa por cambio sin IVA (p. ej. 2000). Sin configurar: "por definir".

export function tarifaCambio() {
  const t = Number(process.env.TARIFA_CAMBIO_MXN);
  return Number.isFinite(t) && t > 0 ? Math.round(t * 100) / 100 : null;
}
