// Descarga los precios spot (USD por onza troy) y el tipo de cambio USD/MXN.
// Metales: gold-api.com (sin llave). Tipo de cambio: referencia del Banco Central Europeo vía
// Frankfurter (sin llave). Si algún día se usa el FIX de Banxico, solo cambia obtenerTipoDeCambio.

const METALES = { oro: "XAU", plata: "XAG", platino: "XPT", paladio: "XPD" };

// Rangos de cordura: si la fuente devuelve algo fuera de aquí, no se guarda la fotografía.
const RANGOS_USD_OZ = { oro: [500, 20000], plata: [5, 500], platino: [200, 10000], paladio: [200, 10000] };
const RANGO_USD_MXN = [10, 40];

async function traerJSON(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (!res.ok) throw new Error(`${url} respondió ${res.status}`);
  return res.json();
}

export async function obtenerPreciosUSD() {
  const pares = await Promise.all(
    Object.entries(METALES).map(async ([metal, simbolo]) => {
      const data = await traerJSON(`https://api.gold-api.com/price/${simbolo}`);
      const precio = Number(data?.price);
      const [min, max] = RANGOS_USD_OZ[metal];
      if (!(precio >= min && precio <= max)) throw new Error(`Precio fuera de rango para ${metal}: ${data?.price}`);
      return [metal, precio];
    }),
  );
  return Object.fromEntries(pares);
}

export async function obtenerTipoDeCambio() {
  const data = await traerJSON("https://api.frankfurter.dev/v1/latest?base=USD&symbols=MXN");
  const usdMxn = Number(data?.rates?.MXN);
  if (!(usdMxn >= RANGO_USD_MXN[0] && usdMxn <= RANGO_USD_MXN[1])) throw new Error(`Tipo de cambio fuera de rango: ${data?.rates?.MXN}`);
  return { usdMxn, fecha: data.date };
}

export const FUENTE = "gold-api.com (spot) + BCE vía Frankfurter (tipo de cambio)";
