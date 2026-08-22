// Matemática del costo de un empeño. Misma fórmula que components/Calculadora.js:
// interés simple mensual sobre el préstamo, sin capitalización.
// Función pura: sin red, sin estado. Se prueba en tests/calculo.test.js.

const LIMITES = {
  prestamo: { min: 100, max: 5_000_000 },
  tasaMensual: { min: 0.5, max: 30 },
  meses: { min: 1, max: 36 },
};

function validar(nombre, valor, { min, max }) {
  if (typeof valor !== "number" || Number.isNaN(valor)) {
    return `${nombre}: se necesita un número.`;
  }
  if (valor < min || valor > max) {
    return `${nombre}: fuera de rango (${min}–${max}).`;
  }
  return null;
}

/**
 * Calcula cuánto termina pagando una persona por su empeño.
 * @param {{prestamo:number, tasaMensual:number, meses:number}} entrada
 * @returns {{ok:true, ...resultado} | {ok:false, error:string}}
 */
export function calcularCosto({ prestamo, tasaMensual, meses }) {
  const errores = [
    validar("prestamo", prestamo, LIMITES.prestamo),
    validar("tasaMensual", tasaMensual, LIMITES.tasaMensual),
    validar("meses", meses, LIMITES.meses),
  ].filter(Boolean);

  if (errores.length > 0) {
    return { ok: false, error: errores.join(" ") };
  }

  const interesMensual = redondear((prestamo * tasaMensual) / 100);
  const interesTotal = redondear(interesMensual * meses);
  const total = redondear(prestamo + interesTotal);
  const veces = Number((total / prestamo).toFixed(2));

  return {
    ok: true,
    prestamo,
    tasaMensual,
    meses,
    interesMensual,
    interesTotal,
    total,
    veces,
    nota: "El refrendo paga solo el interés del mes: no baja la deuda original. Esta cifra no incluye comisiones, almacenaje ni seguro, que sí entran en el CAT.",
  };
}

function redondear(n) {
  return Math.round(n * 100) / 100;
}

export function formatearMXN(n) {
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
}
