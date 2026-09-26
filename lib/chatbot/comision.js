// Comisión de CAP & Co. por el cambio de boleta. El monto lo decide el cliente; mientras tanto se
// configura en Vercel sin tocar código:
//   COMISION_FIJA_MXN     monto fijo por cambio (p. ej. 500)
//   COMISION_PCT_AHORRO   porcentaje del ahorro estimado (p. ej. 20)
// Si están las dos, se suman. Si no hay ninguna, la comisión es "por definir": el chat avisa que
// existe y que se dice antes de cualquier trámite, sin inventar un número.

export function comisionCambio(ahorro) {
  const fija = Number(process.env.COMISION_FIJA_MXN);
  const pct = Number(process.env.COMISION_PCT_AHORRO);
  const hayFija = Number.isFinite(fija) && fija > 0;
  const hayPct = Number.isFinite(pct) && pct > 0 && pct < 100;
  if (!hayFija && !hayPct) return null;
  const monto = (hayFija ? fija : 0) + (hayPct ? (Math.max(ahorro, 0) * pct) / 100 : 0);
  return Math.round(monto * 100) / 100;
}
