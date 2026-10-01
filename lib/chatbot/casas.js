// Comparador público de casas de empeño, con nombre, tasa publicada y cuánto prestan sobre el
// valor de referencia del metal. Funciones puras, con pruebas.
//
// Regla vigente (1-oct-2026, Mau): el chat SÍ nombra instituciones con sus datos públicos, con
// fuente y fecha. Por ahora NO menciona convenios: la casa con convenio aparece como una más, con
// sus cifras públicas. Las cifras salen de DATOS_CASAS (casas-datos.js), nunca se escriben a mano.

import { estimarValorMetal } from "../precios/calculo.js";
import { CASAS, FECHA_CASAS, FUENTE_CASAS } from "./casas-datos.js";

export { CASAS, FECHA_CASAS, FUENTE_CASAS };

export const PRIORIDADES = ["menor_costo", "mas_dinero"];

/**
 * Para una pieza de metal, cuánto prestaría cada casa (porcentaje publicado o calculado sobre el
 * valor de referencia del metal) y cuánto costaría en intereses en los meses indicados.
 * prioridad "menor_costo" ordena por lo que cuesta cada $1,000 prestados; "mas_dinero", por préstamo.
 */
export function estaCerrada(casa, hoy = new Date()) {
  return Boolean(casa.cerradaHasta) && hoy < new Date(`${casa.cerradaHasta}T00:00:00-06:00`);
}

/** Costo mensual comparable: con IVA en las casas que lo cobran sobre intereses. */
export function tasaConIva(casa, metal = "oro") {
  const tasa = casa.tasaMensual?.[metal] ?? casa.tasaMensual?.general;
  if (tasa == null) return null;
  return redondear(tasa * (casa.ivaSobreIntereses ? 1.16 : 1));
}

export function compararCasas({ metal, pureza, gramos, meses = 1, prioridad = "menor_costo", foto, casas = CASAS, hoy = new Date() }) {
  const valor = estimarValorMetal({ metal, pureza, gramos, foto });
  if (!valor.ok) return valor;
  if (!Number.isInteger(meses) || meses < 1 || meses > 24) return { ok: false, error: "meses: entero entre 1 y 24." };
  if (!PRIORIDADES.includes(prioridad)) prioridad = "menor_costo";

  const filas = [];
  const sinDato = [];
  for (const casa of casas) {
    const pct = casa.prestamoPct?.[metal];
    const tasa = casa.tasaMensual?.[metal] ?? casa.tasaMensual?.general;
    if (pct == null || tasa == null) {
      sinDato.push(casa.nombre);
      continue;
    }
    const prestamo = redondear(valor.valorMetal * pct);
    const factorIva = casa.ivaSobreIntereses ? 1.16 : 1;
    const interesMensual = redondear(prestamo * (tasa / 100) * factorIva + prestamo * ((casa.almacenajeMensualPct ?? 0) / 100) * factorIva);
    const costo = redondear(interesMensual * meses);
    filas.push({
      id: casa.id,
      nombre: casa.nombre,
      corto: casa.corto ?? casa.nombre,
      fechaDatos: casa.fechaDatos ?? null,
      cerrada: estaCerrada(casa, hoy),
      tipo: casa.tipo,
      porcentaje: pct,
      prestamo,
      tasaMensual: tasa,
      tasaTexto: casa.tasaTexto ?? `${tasa} %`,
      ivaSobreIntereses: Boolean(casa.ivaSobreIntereses),
      prestamoEstimado: Boolean(casa.prestamoEstimado),
      nota: estaCerrada(casa, hoy) || !casa.cerradaHasta ? casa.nota ?? null : null,
      interesMensual,
      costo,
      totalAPagar: redondear(prestamo + costo),
      costoPorMil: prestamo > 0 ? redondear((costo / prestamo) * 1000) : null,
      fuente: casa.fuente,
    });
  }
  if (filas.length === 0) return { ok: false, error: `No hay datos públicos de préstamo para ${metal}.` };

  const orden =
    prioridad === "mas_dinero"
      ? (a, b) => b.prestamo - a.prestamo || a.costoPorMil - b.costoPorMil
      : (a, b) => a.costoPorMil - b.costoPorMil || b.prestamo - a.prestamo;
  filas.sort(orden);

  // Una casa cerrada aparece en la tabla, pero no se recomienda.
  const abiertas = filas.filter((f) => !f.cerrada);
  const candidatas = abiertas.length > 0 ? abiertas : filas;
  const menorCosto = [...candidatas].sort((a, b) => a.costoPorMil - b.costoPorMil)[0];
  const masDinero = [...candidatas].sort((a, b) => b.prestamo - a.prestamo)[0];
  return {
    ok: true,
    valor,
    meses,
    prioridad,
    filas,
    sinDato,
    menorCosto: menorCosto.nombre,
    masDinero: masDinero.nombre,
    mismaCasa: menorCosto.id === masDinero.id,
    fecha: FECHA_CASAS,
    fuente: FUENTE_CASAS,
  };
}

/** Tabla pública de todas las casas con datos: tasa, CAT y cuánto prestan, sin una pieza concreta. */
export function tablaCasas(casas = CASAS) {
  return {
    fecha: FECHA_CASAS,
    fuente: FUENTE_CASAS,
    casas: casas.map((c) => ({
      nombre: c.nombre,
      tipo: c.tipo,
      tasaTexto: c.tasaTexto ?? null,
      fechaDatos: c.fechaDatos ?? null,
      cerrada: estaCerrada(c),
      ivaSobreIntereses: Boolean(c.ivaSobreIntereses),
      catTexto: c.catTexto ?? null,
      prestamoTexto: c.prestamoTexto ?? null,
      nota: !c.cerradaHasta || estaCerrada(c) ? c.nota ?? null : null,
      fuente: c.fuente,
    })),
  };
}

/** La casa abierta con la tasa publicada más baja (para cotizar el cambio sin convenio). */
export function casaMasBarata(metal = "oro", casas = CASAS, hoy = new Date()) {
  return (
    casas
      .filter((c) => !estaCerrada(c, hoy))
      .map((c) => ({ casa: c, tasa: tasaConIva(c, metal) }))
      .filter((x) => x.tasa != null)
      .sort((a, b) => a.tasa - b.tasa)[0] || null
  );
}

export function buscarCasa(texto, casas = CASAS) {
  if (typeof texto !== "string") return null;
  const t = sinAcentos(texto.toLowerCase());
  return casas.find((c) => [c.nombre, ...(c.alias ?? [])].some((n) => t.includes(sinAcentos(n.toLowerCase())))) || null;
}

function sinAcentos(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function redondear(n) {
  return Math.round(n * 100) / 100;
}
