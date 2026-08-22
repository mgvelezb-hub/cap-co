// Datos públicos de instituciones prendarias (para comparar con nombre y fuente) y
// parámetros de la tasa preferente del aliado. TODO LO MARCADO "PROVISIONAL" se
// reemplaza con las cifras reales que entregue el cliente; el ranking y la oferta
// los calcula el código a partir de estos números, nunca están escritos a mano.
//
// Fuente base: doc 04 "El Mundo del Empeño" (julio 2026): CONDUSEF, sitios oficiales,
// Yahoo Finanzas, Cotizator. CAT anual sin IVA salvo que se indique.

export const FECHA_DATOS = "julio de 2026";

export const INSTITUCIONES = [
  {
    id: "nacional_monte_de_piedad",
    nombre: "Nacional Monte de Piedad",
    tipo: "IAP",
    catAnual: 69,
    tasaMensualRef: 4.5, // PROVISIONAL: aproximación; confirmar con la tabla oficial
    fuente: "CONDUSEF / sitio oficial",
    nota: "En huelga desde octubre de 2025, con sucursales cerradas (dato público de prensa).",
  },
  {
    id: "montepio_luz_savinon",
    nombre: "Montepío Luz Saviñón",
    tipo: "IAP",
    catAnual: null, // PROVISIONAL: el cliente entrega el CAT publicado
    tasaMensualRef: 3.5, // PROVISIONAL: tasa pública mensual; reemplazar
    fuente: "montepio.org.mx (pendiente de confirmar cifra)",
    nota: "Reconocido por tener de las tasas más bajas del sector (doc 04).",
  },
  {
    id: "fundacion_donde",
    nombre: "Fundación Rafael Dondé",
    tipo: "IAP",
    catAnual: null,
    tasaMensualRef: null,
    fuente: "fundaciondonde.org.mx",
    nota: "Conocida por prestar un porcentaje alto del avalúo.",
  },
  {
    id: "first_cash",
    nombre: "First Cash",
    tipo: "comercial",
    catAnual: 69,
    tasaMensualRef: null,
    fuente: "First Cash (tradicional), citado en doc 04",
  },
  {
    id: "el_cerrito",
    nombre: "El Cerrito",
    tipo: "comercial",
    catAnual: 144,
    tasaMensualRef: null,
    fuente: "Cotizator / CONDUSEF (IVA incluido)",
  },
  {
    id: "prendamex",
    nombre: "Prendamex",
    tipo: "comercial",
    catAnual: 172.8,
    tasaMensualRef: null,
    fuente: "Prendamex joyas/relojes, + IVA",
  },
  {
    id: "presto_cash",
    nombre: "Presto Cash",
    tipo: "comercial",
    catAnual: 278.4,
    tasaMensualRef: null,
    fuente: "Yahoo Finanzas / Cotizator (rango 216 %–278.4 %)",
  },
];

/** Aliado con tasa preferente para boletas que llegan evaluadas por CAP & Co. */
export const ALIADO = {
  id: "montepio_luz_savinon",
  nombre: "Montepío Luz Saviñón",
  tasaPublicaMensual: 3.5, // PROVISIONAL
  // Descuento relativo sobre la tasa actual de la persona cuando ya es igual o menor a la pública.
  descuentoRelativo: 0.05, // 5 %
  // Piso de la tasa preferente según valor de la pieza (avalúo): debajo de esto ya no es negocio
  // para la casa de empeño. PROVISIONAL: el cliente define los cortes reales.
  pisos: [
    { desdeValorPieza: 20000, tasaMinima: 2.5 },
    { desdeValorPieza: 5000, tasaMinima: 3.0 },
    { desdeValorPieza: 0, tasaMinima: 3.25 },
  ],
};

export function pisoTasa(valorPieza) {
  const v = Number.isFinite(valorPieza) ? valorPieza : 0;
  const corte = ALIADO.pisos.find((p) => v >= p.desdeValorPieza) || ALIADO.pisos[ALIADO.pisos.length - 1];
  return corte.tasaMinima;
}

/** Ranking público por CAT (menor primero). Las que no tienen CAT van al final, sin posición. */
export function rankingPublico() {
  const conDato = INSTITUCIONES.filter((i) => i.catAnual != null).sort((a, b) => a.catAnual - b.catAnual);
  const sinDato = INSTITUCIONES.filter((i) => i.catAnual == null);
  return { fecha: FECHA_DATOS, conDato, sinDato };
}

export function buscarInstitucion(texto) {
  if (typeof texto !== "string") return null;
  const t = texto.toLowerCase();
  return (
    INSTITUCIONES.find((i) => t.includes(i.nombre.toLowerCase())) ||
    INSTITUCIONES.find((i) => i.id.split("_").some((p) => p.length > 4 && t.includes(p))) ||
    null
  );
}
