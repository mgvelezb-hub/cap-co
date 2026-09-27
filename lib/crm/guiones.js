// Guiones cortos de llamada para el asesor, por situación del caso. Borrador para que Ricardo
// los valide. Reglas: nada de superlativos ni garantías, la comisión se dice antes de cualquier
// trámite y nunca se pide que la persona entregue su boleta o su pieza a CAP & Co.

export const DOCUMENTOS = [
  "Boleta de empeño original",
  "Identificación oficial vigente (la misma persona que aparece en la boleta)",
  "Si la boleta está a nombre de otra persona, esa persona tiene que venir",
];

export const OBJECIONES = [
  ["¿Cuánto me cobran?", "Revisar la boleta no tiene costo. Si hacemos el cambio, cobramos una comisión que te digo antes de cualquier trámite, junto con cuánto te ahorras ya con ella. Si con la comisión no te conviene, te lo digo y no avanzamos."],
  ["¿Cómo sé que no es un fraude?", "Nunca te pedimos dinero por adelantado ni que nos entregues tu boleta o tu pieza. Todo lo firmas tú, en la casa de empeño, a tu nombre."],
  ["Ya voy a pagar, no necesito cambiarme.", "Perfecto; si quieres, te digo cuánto vas a pagar en total para que no haya sorpresas. Y si cambian tus condiciones, aquí estamos."],
  ["¿Por qué me conviene la otra casa?", "Por la tasa: con los meses que te faltan, pagarías menos. Te doy la cifra exacta antes de cualquier trámite y la otra casa vuelve a valuar tu pieza, así que la confirmamos ese día."],
  ["Mi boleta ya venció.", "Muchas casas dan un periodo de gracia mientras la pieza no se haya vendido. Revisemos hoy la fecha y el recargo; si ya se vendió en más de lo que debías, la diferencia es tuya."],
];

const GUIONES = {
  primer_contacto: {
    titulo: "Primer contacto",
    pasos: [
      "Saluda y di tu nombre: \"Te llamo de CAP & Co. porque dejaste tus datos para revisar tu boleta.\"",
      "Confirma el código del caso y pregunta si es buen momento.",
      "Pide los datos de la boleta que falten: casa de empeño, préstamo, tasa mensual, meses que le faltan, si ya venció.",
      "Explica en una frase qué haces: revisar cuánto va a pagar y si hay una opción que le convenga más.",
      "Si conviene: di la tasa, el ahorro y la comisión antes de proponer cita. Si no conviene: díselo y ofrece resolver dudas.",
      "Si acepta: acuerda día, hora y lugar de la cita y registra \"Acordar cita\" en la ficha.",
    ],
  },
  confirmar_cita: {
    titulo: "Confirmar la cita",
    pasos: [
      "Confirma día, hora y lugar.",
      "Recuerda los documentos (abajo) y que no lleve su pieza ni pague nada antes de confirmar condiciones.",
      "Repite la comisión y el ahorro estimado; aclara que la casa nueva vuelve a valuar la pieza.",
      "Marca la cita como Confirmada con el lugar.",
    ],
  },
  despues_cita: {
    titulo: "Después de la cita",
    pasos: [
      "Pregunta cómo le fue y si le falta algún paso del cambio.",
      "Actualiza el checklist del cambio y la etapa.",
      "Si el cambio se concretó, registra el cobro de la comisión (dueño).",
    ],
  },
  taller: {
    titulo: "Ofrecer el taller",
    pasos: [
      "Explica que restaurar la pieza puede subir su avalúo y mejorar las condiciones del cambio.",
      "Pide fotos de la pieza por WhatsApp para una cotización del taller.",
      "No prometas un avalúo: el valor lo pone la casa de empeño.",
    ],
  },
};

/** Guion que toca según la situación del lead. */
export function guionPara(lead) {
  if (["atendido", "switcheo_concretado"].includes(lead.etapa)) return GUIONES.despues_cita;
  if (lead.etapa === "cita_confirmada") return GUIONES.confirmar_cita;
  if (lead.clasificacion === "taller") return GUIONES.taller;
  return GUIONES.primer_contacto;
}
