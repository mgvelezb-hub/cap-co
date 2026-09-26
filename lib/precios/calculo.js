// Precios de metales: conversión de onza troy en dólares a gramo en pesos, pureza por
// kilataje o ley, y valor de referencia de una pieza. Funciones puras, con pruebas.

export const GRAMOS_POR_ONZA_TROY = 31.1034768;

// Pureza (fracción de metal puro) por marca o kilataje.
export const PUREZAS = {
  oro: { "10k": 0.417, "14k": 0.585, "18k": 0.75, "22k": 0.917, "24k": 0.999 },
  plata: { "925": 0.925, "950": 0.95, "999": 0.999 },
  platino: { "900": 0.9, "950": 0.95, "999": 0.999 },
  paladio: { "500": 0.5, "950": 0.95, "999": 0.999 },
};

const MILESIMAS_ORO = { "417": "10k", "585": "14k", "750": "18k", "916": "22k", "917": "22k", "999": "24k" };

/** "14k", "14 kilates", "585", ".925", "ley 925", "PT950" → clave de PUREZAS, o null. */
export function normalizarPureza(metal, texto) {
  if (!PUREZAS[metal] || texto == null) return null;
  const t = String(texto).toLowerCase().replace(/\s+/g, "");
  const kil = t.match(/^(\d{1,2})(k|kt|kilates?|quilates?)?$/);
  if (metal === "oro") {
    if (kil && PUREZAS.oro[`${kil[1]}k`]) return `${kil[1]}k`;
    const mil = t.match(/(\d{3})/);
    if (mil && MILESIMAS_ORO[mil[1]]) return MILESIMAS_ORO[mil[1]];
    return null;
  }
  const mil = t.match(/(\d{3})/);
  if (mil && PUREZAS[metal][mil[1]]) return mil[1];
  return null;
}

export function precioGramoPuroMXN(usdPorOnza, usdMxn) {
  return (usdPorOnza / GRAMOS_POR_ONZA_TROY) * usdMxn;
}

const CAMPO_METAL = { oro: "oroUsdOz", plata: "plataUsdOz", platino: "platinoUsdOz", paladio: "paladioUsdOz" };

/** Tabla de precios por gramo (MXN) de una fotografía, redondeados a centavos. */
export function tablaPorGramo(foto) {
  const tabla = {};
  for (const [metal, purezas] of Object.entries(PUREZAS)) {
    const puro = precioGramoPuroMXN(foto[CAMPO_METAL[metal]], foto.usdMxn);
    tabla[metal] = { puro: redondear(puro) };
    for (const [clave, fraccion] of Object.entries(purezas)) tabla[metal][clave] = redondear(puro * fraccion);
  }
  return tabla;
}

/**
 * Valor de referencia del metal de una pieza (sin piedras, sin mano de obra) y rango típico
 * de préstamo (40 %–60 % de ese valor).
 */
export function estimarValorMetal({ metal, pureza, gramos, foto }) {
  if (!PUREZAS[metal]) return { ok: false, error: `Metal no reconocido: ${metal}. Usa oro, plata, platino o paladio.` };
  const clave = normalizarPureza(metal, pureza);
  if (!clave) {
    return { ok: false, error: `Pureza no reconocida para ${metal}: "${pureza}". Opciones: ${Object.keys(PUREZAS[metal]).join(", ")}.` };
  }
  if (typeof gramos !== "number" || !(gramos > 0) || gramos > 5000) {
    return { ok: false, error: "gramos: se necesita un peso entre 0 y 5,000 g." };
  }
  const porGramo = precioGramoPuroMXN(foto[CAMPO_METAL[metal]], foto.usdMxn) * PUREZAS[metal][clave];
  const valor = porGramo * gramos;
  return {
    ok: true,
    metal,
    pureza: clave,
    gramos,
    precioGramo: redondear(porGramo),
    valorMetal: redondear(valor),
    prestamoBajo: redondear(valor * 0.4),
    prestamoAlto: redondear(valor * 0.6),
  };
}

/** Una fotografía vieja no se usa: más de 4 días cubre fin de semana largo + un día de falla. */
export const EDAD_MAXIMA_HORAS = 96;

export function fotografiaVigente(foto, ahora = new Date()) {
  if (!foto) return false;
  return (ahora - new Date(foto.capturadoAt)) / 36e5 <= EDAD_MAXIMA_HORAS;
}

function redondear(n) {
  return Math.round(n * 100) / 100;
}
