// Guiones cortos de llamada para el asesor, por situación del caso. BORRADOR para que Ricardo
// los valide (en especial la mecánica del cambio: quién liquida la deuda y con qué dinero). Reglas: nada de superlativos ni garantías, la comisión se dice antes de cualquier
// trámite y nunca se pide que la persona entregue su boleta o su pieza a CAP & Co.

export const DOCUMENTOS = [
  "Boleta de empeño original",
  "Identificación oficial vigente (la misma persona que aparece en la boleta)",
  "Si la boleta está a nombre de otra persona, esa persona tiene que venir",
];

export const OBJECIONES = [
  ["¿Cuánto me cobran?", "Revisar la boleta no tiene costo. Si hacemos el cambio, cobramos una comisión (IVA incluido) que te digo antes de cualquier trámite, junto con cuánto te ahorrarías ya con ella. Si con la comisión no te conviene, te lo digo y no avanzamos."],
  ["¿Tengo que pagar algo antes?", "No. No nos pagas nada por adelantado. [Mecánica por confirmar con Ricardo: cómo se liquida la deuda en tu casa actual el día del cambio.] Antes de firmar sabrás exactamente si tendrías que poner algo de tu bolsa."],
  ["¿Y si en la casa nueva me prestan menos?", "La casa nueva vuelve a valuar tu pieza. Si lo que te prestan no alcanza para liquidar lo que debes, te lo decimos antes de cualquier trámite y tú decides; no avanzamos sin que sepas cuánto pondrías."],
  ["¿Cómo sé que no es un fraude?", "Nunca te pedimos dinero por adelantado ni que nos entregues tu boleta o tu pieza. Todo lo firmas tú, en la casa de empeño, a tu nombre."],
  ["Ya voy a pagar, no necesito cambiarme.", "Perfecto; si quieres, te digo cuánto vas a pagar en total para que no haya sorpresas. Y si cambian tus condiciones, aquí estamos."],
  ["¿Por qué me conviene la otra casa?", "Por la tasa: con los meses que te faltan podrías pagar menos. La tasa la gestionamos con nuestro aliado, Montepío Luz Saviñón. Te doy la cifra y el costo total (CAT) antes de cualquier trámite; como la casa nueva vuelve a valuar tu pieza, se confirma ese día."],
  ["Mi boleta ya venció.", "Muchas casas dan un periodo de gracia mientras la pieza no se haya vendido. Revisemos la fecha y el recargo. Si ya se vendió en más de lo que debías, la diferencia es tuya y se reclama en el plazo que marque tu contrato."],
  ["Mi boleta vence en días.", "Lo primero es no perder la pieza: revisemos si te conviene refrendar ahora (pagar los intereses para ganar otro plazo) y después vemos si cambiarte te ahorra."],
];

const GUIONES = {
  primer_contacto: {
    titulo: "Primer contacto",
    pasos: [
      "Saluda y di tu nombre: \"Te llamo de CAP & Co. porque dejaste tus datos para revisar tu boleta.\"",
      "Confirma el código del caso y pregunta si es buen momento.",
      "Pide los datos de la boleta que falten: casa de empeño, préstamo, tasa mensual, meses que le faltan, si ya venció.",
      "Explica en una frase qué haces: revisar cuánto va a pagar y si hay una opción que le convenga más.",
      "Si vence en días: primero que no pierda la pieza (refrendo o pago); el cambio se revisa después.",
      "Si conviene: di la tasa, el ahorro estimado, la comisión (IVA incluido) y que la casa nueva vuelve a valuar la pieza, antes de proponer cita. Si no conviene: díselo y ofrece resolver dudas.",
      "Explica el día del cambio: [mecánica por confirmar con Ricardo: quién liquida la deuda actual y con qué dinero]. Si el nuevo préstamo no alcanza, se dice antes y la persona decide.",
      "Si acepta: acuerda día, hora y lugar de la cita y registra \"Acordar cita\" en la ficha.",
    ],
  },
  confirmar_cita: {
    titulo: "Confirmar la cita",
    pasos: [
      "Confirma día, hora y lugar.",
      "Recuerda los documentos (abajo) y que no pague ni firme nada antes de confirmar condiciones.",
      "Repite la comisión (IVA incluido) y el ahorro estimado; aclara que la casa nueva vuelve a valuar la pieza y que, si lo que le prestan no alcanza, se lo decimos antes.",
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
      "Explica que en algunas piezas (con piedras sueltas o daños) una reparación puede ayudar a que la valúen mejor; en oro el valor depende sobre todo del peso y el kilataje.",
      "Una pieza empeñada solo se puede restaurar después de recuperarla: aclara el orden de los pasos.",
      "Pide fotos de la pieza por WhatsApp para una cotización del taller. No prometas un avalúo: el valor lo pone la casa de empeño.",
    ],
  },
};

/** Guion que toca según la situación del lead. */
export function guionPara(lead) {
  if (["comision_cobrada", "descartado"].includes(lead.etapa)) return null;
  if (["atendido", "switcheo_concretado"].includes(lead.etapa)) return GUIONES.despues_cita;
  if (lead.etapa === "cita_confirmada") return GUIONES.confirmar_cita;
  if (lead.clasificacion === "taller") return GUIONES.taller;
  return GUIONES.primer_contacto;
}
