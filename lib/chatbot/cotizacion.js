// Cotización de traspaso con la tasa preferente del aliado.
// Regla de negocio (propuesta de CAP & Co., parámetros provisionales en instituciones.js):
//   - Si la tasa actual de la persona es MAYOR que la tasa pública del aliado → oferta = tasa pública.
//   - Si es MENOR O IGUAL → oferta = tasa actual menos un descuento relativo, con un piso según
//     el valor de la pieza. Debajo del piso la casa de empeño pierde: el caso no avanza.
//   - Si el ahorro para la persona no es claro (criterio de compararOpciones): no avanza.
// Cuando no avanza, el mensaje es: "por ahora tienes el mejor trato posible; continúa con tus pagos".

import { compararOpciones } from "./calculo.js";
import { ALIADO, pisoTasa, buscarInstitucion } from "./instituciones.js";

export function cotizarTraspaso({
  prestamo,
  tasaActual,
  mesesRestantes,
  mesesSinPagar = 0,
  penalizacion = 0,
  valorPieza = null,
  institucionActual = null,
}) {
  const piso = pisoTasa(valorPieza);
  const publica = ALIADO.tasaPublicaMensual;

  let tasaOferta;
  let tipoOferta;
  if (tasaActual > publica) {
    tasaOferta = publica;
    tipoOferta = "tasa_publica";
  } else {
    tasaOferta = redondear(tasaActual * (1 - ALIADO.descuentoRelativo));
    tipoOferta = "tasa_preferente";
  }

  const bajoPiso = tasaOferta < piso;
  if (bajoPiso) {
    // No se puede bajar más sin que pierda la casa de empeño.
    tasaOferta = piso;
  }
  // Si aun en el piso la oferta no mejora la tasa actual, no hay caso.
  const mejoraTasa = tasaOferta < tasaActual;

  const comparacion = mejoraTasa
    ? compararOpciones({ prestamo, tasaActual, tasaNueva: tasaOferta, mesesRestantes, mesesSinPagar, penalizacion })
    : null;
  if (comparacion && !comparacion.ok) return { ok: false, error: comparacion.error };

  const avanza = Boolean(mejoraTasa && comparacion?.conviene);
  const origen = buscarInstitucion(institucionActual || "");

  let motivoNoAvanza = null;
  if (!mejoraTasa) motivoNoAvanza = "La tasa actual ya está en el piso del mercado: no hay una oferta que la mejore.";
  else if (!comparacion.conviene) motivoNoAvanza = "El ahorro es menor a $500 o a 5 % del costo: el cambio no compensa el trámite.";

  return {
    ok: true,
    aliado: ALIADO.nombre,
    institucionActual: origen ? origen.nombre : institucionActual || null,
    tasaActual,
    tasaPublicaAliado: publica,
    tasaOferta,
    tipoOferta,
    piso,
    tocoPiso: bajoPiso,
    avanza,
    motivoNoAvanza,
    comparacion,
    mensajeSugerido: avanza
      ? `Con tu boleta evaluada, CAP & Co. puede gestionarte en ${ALIADO.nombre} una tasa de ${tasaOferta} % mensual (tu tasa actual: ${tasaActual} %). El ahorro estimado para los meses que te faltan es ${formatear(comparacion.ahorro)} (${comparacion.ahorroPct} %).`
      : `Por ahora tienes el mejor trato posible en el mercado: no hay una opción que te ahorre de verdad. Continúa con tus pagos y, si cambian tus condiciones (más meses, otra tasa), lo volvemos a revisar.`,
  };
}

function redondear(n) {
  return Math.round(n * 100) / 100;
}

function formatear(n) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}
