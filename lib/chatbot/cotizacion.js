// Cotización del cambio de boleta hacia la red de casas con convenio.
// Regla de negocio (parámetros provisionales en instituciones.js), por cada casa de la red:
//   - Si la tasa actual de la persona es MAYOR que la tasa pública de la casa → oferta = tasa pública.
//   - Si es MENOR O IGUAL → oferta = tasa actual menos un descuento relativo, con un piso según
//     el valor de la pieza. Debajo del piso la casa de empeño pierde.
// Se elige la casa que más le ahorra a la persona. El usuario no paga nada: todo el ahorro es suyo.
// Si el ahorro no es claro (criterio de compararOpciones), el caso no avanza y se le dice que le
// conviene quedarse donde está. Nunca se devuelve el nombre de ninguna institución.

import { compararOpciones } from "./calculo.js";
import { CONVENIOS, RED_PUBLICA, pisoTasa } from "./instituciones.js";

function ofertaDe(convenio, tasaActual, valorPieza) {
  const piso = pisoTasa(valorPieza, convenio);
  const publica = convenio.tasaPublicaMensual;
  let tasaOferta = tasaActual > publica ? publica : redondear(tasaActual * (1 - convenio.descuentoRelativo));
  const tipoOferta = tasaActual > publica ? "tasa_publica" : "tasa_preferente";
  const tocoPiso = tasaOferta < piso;
  if (tocoPiso) tasaOferta = piso;
  return { convenio, piso, publica, tasaOferta, tipoOferta, tocoPiso };
}

export function cotizarTraspaso({ prestamo, tasaActual, mesesRestantes, mesesSinPagar = 0, penalizacion = 0, valorPieza = null }) {
  const opciones = [];
  for (const convenio of CONVENIOS) {
    const o = ofertaDe(convenio, tasaActual, valorPieza);
    if (o.tasaOferta >= tasaActual) continue;
    const comparacion = compararOpciones({ prestamo, tasaActual, tasaNueva: o.tasaOferta, mesesRestantes, mesesSinPagar, penalizacion });
    if (!comparacion.ok) return { ok: false, error: comparacion.error };
    opciones.push({ ...o, comparacion });
  }
  // La que más le ahorra a la persona.
  const mejor = opciones.sort((a, b) => b.comparacion.ahorro - a.comparacion.ahorro)[0] || null;
  const avanza = Boolean(mejor?.comparacion.conviene);

  let motivoNoAvanza = null;
  if (!mejor) motivoNoAvanza = "La tasa actual ya está en el piso de la red: no hay una oferta que la mejore.";
  else if (!avanza) motivoNoAvanza = "El ahorro es menor a $500 o a 5 % del costo: el cambio no compensa el trámite.";

  const referencia = mejor || ofertaDe(CONVENIOS[0], tasaActual, valorPieza);
  return {
    ok: true,
    red: RED_PUBLICA,
    convenioId: mejor ? mejor.convenio.id : null, // interno; aún no se guarda en el lead (hace falta con 2+ casas)
    tasaActual,
    tasaOferta: referencia.tasaOferta,
    tipoOferta: referencia.tipoOferta,
    piso: referencia.piso,
    tocoPiso: referencia.tocoPiso,
    avanza,
    motivoNoAvanza,
    comparacion: mejor ? mejor.comparacion : null,
    mensajeSugerido: avanza
      ? `Con tu boleta evaluada, en ${RED_PUBLICA} tendrías una tasa ${referencia.tipoOferta === "tasa_preferente" ? "preferente " : ""}de ${referencia.tasaOferta} % mensual (tu tasa actual: ${tasaActual} %). ` +
        `En los meses que te faltan te ahorras ${formatear(mejor.comparacion.ahorro)}, y nuestro servicio no te cuesta nada.`
      : `Por ahora no encontramos una opción que te ahorre de verdad: te conviene quedarte donde estás y seguir con tus pagos. Si cambian tus condiciones (más meses, otra tasa), lo volvemos a revisar.`,
  };
}

function redondear(n) {
  return Math.round(n * 100) / 100;
}

function formatear(n) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}
