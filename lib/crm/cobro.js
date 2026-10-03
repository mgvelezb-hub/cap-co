// Regla del cobro por un cambio concretado (Mau, 3-oct-2026). Función pura: la usan el servicio,
// la ficha del CRM y el servidor MCP. Ninguna casa de empeño paga: la persona paga una comisión
// sobre el ahorro final que se le dio por escrito antes del trámite. La tasa sale de la fecha en
// que se concretó el cambio (comision.js): 0 % por promoción hasta el 30-abr-2027, 7 % después.
// El monto nunca se captura: sale de la cuenta, para que no se cobre distinto de lo que se dijo.

import { comisionVigente, enPromocion } from "../chatbot/comision.js";

export const TIPOS_COBRO = {
  ahorro_usuario: "Comisión sobre el ahorro",
  tarifa_casa: "Tarifa de la casa (antes del 3-oct-2026)",
};

/**
 * Monto de la comisión de un cambio concretado en `fecha`, sobre el ahorro confirmado por escrito.
 * En centavos enteros: la comisión sale del ahorro ya redondeado, igual que en el papel.
 * @returns {{ok: true, tipo, monto, ahorro, tasa, promocion} | {ok: false, motivo}}
 */
export function calcularCobro({ ahorro = null, fecha = new Date() }) {
  const a = Number(ahorro);
  if (ahorro === null || ahorro === "" || !Number.isFinite(a) || a <= 0 || a > 100_000_000) return { ok: false, motivo: "ahorro_invalido" };
  const tasa = comisionVigente(fecha);
  const ahorroCentavos = Math.round(a * 100);
  return {
    ok: true,
    tipo: "ahorro_usuario",
    monto: Math.round(ahorroCentavos * tasa) / 100,
    ahorro: ahorroCentavos / 100,
    tasa,
    promocion: enPromocion(fecha),
  };
}
