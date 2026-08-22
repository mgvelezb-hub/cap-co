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

/**
 * Cuánto debe hoy una persona que ya lleva meses empeñada.
 * mesesSinPagar = meses cuyos intereses aún no ha cubierto (los refrendos ya pagados cubren los anteriores).
 */
export function calcularDesempenoHoy({ prestamo, tasaMensual, mesesSinPagar, penalizacion = 0 }) {
  const errores = [
    validar("prestamo", prestamo, LIMITES.prestamo),
    validar("tasaMensual", tasaMensual, LIMITES.tasaMensual),
    validar("mesesSinPagar", mesesSinPagar, { min: 0, max: 36 }),
    validar("penalizacion", penalizacion, { min: 0, max: 1_000_000 }),
  ].filter(Boolean);
  if (errores.length > 0) return { ok: false, error: errores.join(" ") };

  const interesMensual = redondear((prestamo * tasaMensual) / 100);
  const interesPendiente = redondear(interesMensual * mesesSinPagar);
  const refrendarHoy = redondear(interesPendiente + penalizacion);
  const desempenarHoy = redondear(prestamo + interesPendiente + penalizacion);
  return {
    ok: true,
    prestamo,
    tasaMensual,
    mesesSinPagar,
    interesMensual,
    interesPendiente,
    penalizacion,
    refrendarHoy,
    desempenarHoy,
    nota: "Refrendar hoy paga solo los intereses pendientes: la deuda de capital sigue igual. Desempeñar hoy liquida todo y recupera la pieza.",
  };
}

/**
 * Compara quedarse en la institución actual vs. mover la boleta a otra con tasa menor.
 * Supone interés simple y que lo que cuesta liquidar hoy se vuelve el nuevo préstamo.
 */
export function compararOpciones({
  prestamo,
  tasaActual,
  tasaNueva,
  mesesRestantes,
  mesesSinPagar = 0,
  penalizacion = 0,
}) {
  const errores = [
    validar("prestamo", prestamo, LIMITES.prestamo),
    validar("tasaActual", tasaActual, LIMITES.tasaMensual),
    validar("tasaNueva", tasaNueva, LIMITES.tasaMensual),
    validar("mesesRestantes", mesesRestantes, LIMITES.meses),
    validar("mesesSinPagar", mesesSinPagar, { min: 0, max: 36 }),
    validar("penalizacion", penalizacion, { min: 0, max: 1_000_000 }),
  ].filter(Boolean);
  if (errores.length > 0) return { ok: false, error: errores.join(" ") };

  const interesPendiente = redondear((prestamo * tasaActual * mesesSinPagar) / 100);
  const liquidarHoy = redondear(prestamo + interesPendiente + penalizacion);

  // Quedarse: paga lo pendiente + los meses que faltan a la tasa actual.
  const interesQuedarse = redondear((prestamo * tasaActual * mesesRestantes) / 100);
  const totalQuedarse = redondear(liquidarHoy + interesQuedarse);

  // Moverse: el nuevo préstamo cubre lo que cuesta liquidar hoy; paga los meses que faltan a la tasa nueva.
  const interesMoverse = redondear((liquidarHoy * tasaNueva * mesesRestantes) / 100);
  const totalMoverse = redondear(liquidarHoy + interesMoverse);

  const ahorro = redondear(totalQuedarse - totalMoverse);
  const ahorroPct = totalQuedarse > 0 ? Number(((ahorro / totalQuedarse) * 100).toFixed(1)) : 0;
  const conviene = ahorro >= 500 || ahorroPct >= 5;

  return {
    ok: true,
    liquidarHoy,
    interesPendiente,
    quedarse: { tasaMensual: tasaActual, interesRestante: interesQuedarse, total: totalQuedarse },
    moverse: { tasaMensual: tasaNueva, nuevoPrestamo: liquidarHoy, interesRestante: interesMoverse, total: totalMoverse },
    ahorro,
    ahorroPct,
    conviene,
    criterio: "Conviene si el ahorro es de al menos $500 o 5 % del costo total de quedarse.",
    nota: "Cálculo con interés simple y sin comisiones, almacenaje ni seguro: esos cargos pueden cambiar el resultado, hay que pedirlos en ambas opciones.",
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
