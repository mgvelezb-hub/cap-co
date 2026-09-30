// Clasificación de leads por reglas fijas (funciones puras, con pruebas).
//
// Cuatro clases, en el lenguaje del equipo:
//   aplica_auto  el cambio conviene con claridad: se agenda sin más revisión.
//   revision     caso gris: un asesor lo aprueba o lo cambia.
//   no_aplica    no hay cambio que convenga (o se descartó).
//   taller       conviene pasar primero por el taller de restauración (mejora el avalúo).
// La confianza dice si la regla basta ("alta") o si el caso va a la cola de revisión.

export const CLASES = ["aplica_auto", "revision", "no_aplica", "taller"];
export const NOMBRE_CLASE = {
  aplica_auto: "Aplica",
  revision: "Requiere revisión",
  no_aplica: "No aplica",
  taller: "Candidato a taller",
};

export const AHORRO_AUTO_MXN = 1500; // ahorro neto mínimo para aprobar sin revisión
export const AHORRO_MINIMO_MXN = 500; // debajo de esto el cambio no compensa
export const PROBABILIDAD_AUTO = 70;

const SEÑALES_TALLER = /\b(rot[ao]s?|roto|dañad[ao]s?|repar\w*|soldad\w*|restaur\w*|pulid\w*|desgastad[ao]s?|piedra (suelta|faltante)|le falta una piedra|abollad[ao]s?|broche)\b/i;

const pesos = (n) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

/** Propensión a taller por reglas (0-100). La IA la afina. */
export function propensionTallerPorReglas(lead) {
  if (lead.perfil === "restauracion") return 90;
  if (SEÑALES_TALLER.test(lead.resumen || "")) return 60;
  return 10;
}

/**
 * @param {object} lead fila de la tabla lead
 * El usuario no paga nada a CAP & Co.: todo el ahorro de la cotización es suyo.
 * @returns {{clasificacion: string, motivo: string, confianza: "alta"|"media"|"baja", propensionTaller: number}}
 */
export function clasificarPorReglas(lead) {
  const propensionTaller = propensionTallerPorReglas(lead);
  const r = (clasificacion, motivo, confianza) => ({ clasificacion, motivo, confianza, propensionTaller });
  const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
  const ahorro = num(lead.ahorro);
  const tasaOferta = num(lead.tasa_oferta);
  const prob = num(lead.probabilidad);

  if (lead.etapa === "descartado") return r("no_aplica", "Descartado por el equipo.", "alta");
  if (lead.perfil === "restauracion") return r("taller", "Quiere restaurar su pieza con el taller.", "alta");

  if (ahorro !== null && tasaOferta !== null) {
    const neto = ahorro;
    const etiqueta = "Ahorro";
    if (ahorro <= 0) return r("no_aplica", "La cotización no da ahorro.", "alta");
    if (propensionTaller >= 60 && neto < AHORRO_AUTO_MXN) {
      return r("taller", `${etiqueta} de ${pesos(neto)} y la pieza tiene daño: restaurarla puede subir el avalúo.`, "media");
    }
    const completo = Number(lead.tasa_actual) > 0 && Boolean(lead.institucion_origen);
    if (neto >= AHORRO_AUTO_MXN && prob !== null && prob >= PROBABILIDAD_AUTO && completo) {
      return r("aplica_auto", `Ahorro de ${pesos(neto)}, probabilidad ${prob} % y datos completos.`, "alta");
    }
    if (neto >= AHORRO_MINIMO_MXN) {
      const falta = !completo ? "faltan tasa o institución" : prob === null || prob < PROBABILIDAD_AUTO ? `probabilidad ${prob ?? "sin dato"} %` : `${etiqueta.toLowerCase()} de ${pesos(neto)}`;
      return r("revision", `Conviene, pero ${falta}: confirmar condiciones.`, "media");
    }
    return r("no_aplica", `${etiqueta} de ${pesos(neto)}: menos de ${pesos(AHORRO_MINIMO_MXN)}, no compensa el trámite.`, "media");
  }

  if (lead.perfil === "boleta_vencida") return r("revision", "Boleta vencida: revisar si sigue en periodo de gracia. Urgente.", "media");
  if (propensionTaller >= 60) return r("taller", "Menciona daño en la pieza: ofrecer el taller.", "media");
  if (lead.consent_at) return r("revision", "Pidió hablar con un asesor sin cotizar: falta la boleta.", "baja");
  if (lead.perfil === "curioso" && (prob ?? 0) < 30) return r("no_aplica", "Solo pidió información, sin datos de boleta.", "baja");
  return r("revision", "Faltan datos para cotizar.", "baja");
}
