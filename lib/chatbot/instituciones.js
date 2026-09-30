// Datos del mercado prendario y red de casas de empeño con convenio.
//
// Regla de identidad (30-sep-2026): el sitio y el chat NO nombran ninguna institución, ni la casa
// donde está la boleta de la persona ni las casas de la red. Lo público son rangos por tipo de
// institución, con fuente y fecha. Los nombres viven solo aquí, para uso interno del CRM y del
// asesor que acompaña el cambio.
//
// Fuente base: doc 04 "El Mundo del Empeño" (julio 2026): CONDUSEF, sitios oficiales, Cotizator.
// CAT anual sin IVA salvo que se indique. Lo marcado "PROVISIONAL" se reemplaza con cifras reales.

export const FECHA_DATOS = "julio de 2026";
export const FUENTE_DATOS = "CONDUSEF, PROFECO y sitios oficiales de las instituciones";

// Solo para calcular rangos por tipo. Nunca se exponen nombres.
const MUESTRA_MERCADO = [
  { tipo: "iap", catAnual: 69 },
  { tipo: "comercial", catAnual: 69 },
  { tipo: "comercial", catAnual: 144 },
  { tipo: "comercial", catAnual: 172.8 },
  { tipo: "comercial", catAnual: 278.4 },
];

const NOMBRE_TIPO = {
  iap: "instituciones de asistencia privada (sin fines de lucro)",
  comercial: "casas de empeño comerciales",
};

/**
 * Casas de empeño con convenio. Todas pagan a CAP & Co. la misma tarifa por cambio concretado,
 * así que la recomendación se hace solo por lo que le conviene a la persona. Para sumar una casa,
 * se agrega aquí con su tasa y sus pisos; cotizarTraspaso elige la que más ahorra.
 */
export const CONVENIOS = [
  {
    id: "convenio_1",
    nombreInterno: "Montepío Luz Saviñón", // solo CRM y asesor; nunca en sitio ni chat
    tasaPublicaMensual: 3.5, // PROVISIONAL
    // Descuento relativo sobre la tasa actual cuando ya es igual o menor a la pública.
    descuentoRelativo: 0.05,
    // Piso de la tasa según el valor de la pieza: debajo ya no es negocio para la casa.
    pisos: [
      { desdeValorPieza: 20000, tasaMinima: 2.5 },
      { desdeValorPieza: 5000, tasaMinima: 3.0 },
      { desdeValorPieza: 0, tasaMinima: 3.25 },
    ],
  },
];

export const RED_PUBLICA = "una casa de empeño con la que tenemos convenio";

export function pisoTasa(valorPieza, convenio = CONVENIOS[0]) {
  const v = Number.isFinite(valorPieza) ? valorPieza : 0;
  const corte = convenio.pisos.find((p) => v >= p.desdeValorPieza) || convenio.pisos[convenio.pisos.length - 1];
  return corte.tasaMinima;
}

/** Rangos de CAT por tipo de institución, sin nombres. */
export function rangosPublicos() {
  const rangos = {};
  for (const { tipo, catAnual } of MUESTRA_MERCADO) {
    const r = (rangos[tipo] ??= { tipo: NOMBRE_TIPO[tipo], min: catAnual, max: catAnual });
    r.min = Math.min(r.min, catAnual);
    r.max = Math.max(r.max, catAnual);
  }
  return { fecha: FECHA_DATOS, fuente: FUENTE_DATOS, rangos: Object.values(rangos) };
}
