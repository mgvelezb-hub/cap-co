// Perfil opcional y anónimo que la persona elige al abrir el chat (formulario de bienvenida).
// Lo usan el widget (preguntas), /api/chat (validación y nota para el modelo) y el CRM (etiquetas).
// Nunca lleva nombre, teléfono ni nada que identifique a la persona.

export const NO_DICE = "no_dice";

export const ALCALDIAS = [
  "Álvaro Obregón",
  "Azcapotzalco",
  "Benito Juárez",
  "Coyoacán",
  "Cuajimalpa",
  "Cuauhtémoc",
  "Gustavo A. Madero",
  "Iztacalco",
  "Iztapalapa",
  "Magdalena Contreras",
  "Miguel Hidalgo",
  "Milpa Alta",
  "Tláhuac",
  "Tlalpan",
  "Venustiano Carranza",
  "Xochimilco",
];

// id del campo → { pregunta, opciones: [[valor, etiqueta]], lista?: true (se muestra como selector) }
export const PREGUNTAS_PERFIL = {
  caso: {
    pregunta: "¿Cuál es tu caso?",
    opciones: [
      ["vigente", "Tengo una boleta vigente"],
      ["por_vencer", "Mi boleta está por vencer o ya venció"],
      ["empenar", "Quiero empeñar algo"],
      ["aprender", "Solo quiero informarme"],
    ],
  },
  edad: {
    pregunta: "¿En qué rango de edad estás?",
    opciones: [
      ["18_24", "18 a 24"],
      ["25_34", "25 a 34"],
      ["35_44", "35 a 44"],
      ["45_54", "45 a 54"],
      ["55_64", "55 a 64"],
      ["65_mas", "65 o más"],
    ],
  },
  prenda: {
    pregunta: "¿Qué empeñaste o quieres empeñar?",
    opciones: [
      ["oro", "Oro o joyería"],
      ["reloj", "Reloj"],
      ["electronico", "Electrónico"],
      ["otro", "Otra cosa"],
    ],
  },
  zona: {
    pregunta: "¿Desde qué alcaldía o estado nos escribes?",
    lista: true,
    opciones: [
      ...ALCALDIAS.map((a) => [`cdmx:${a}`, a]),
      ["edomex", "Estado de México"],
      ["otro_estado", "Otro estado"],
    ],
  },
  origen: {
    pregunta: "¿Cómo nos conociste?",
    opciones: [
      ["tiktok", "TikTok"],
      ["facebook", "Facebook o Instagram"],
      ["recomendacion", "Me lo recomendaron"],
      ["youtube", "YouTube"],
      ["google", "Google"],
      ["otro", "Otro"],
    ],
  },
};

export const CAMPOS_PERFIL = Object.keys(PREGUNTAS_PERFIL);
// Después de la primera respuesta se ofrecen, opcionales, las preguntas que no son el caso.
export const CAMPOS_DETALLE = CAMPOS_PERFIL.filter((c) => c !== "caso");

// Primer mensaje que el widget envía por la persona según su caso (el resto de casos no escribe nada).
export const MENSAJE_POR_CASO = {
  vigente: "Tengo una boleta vigente. ¿Estoy pagando de más?",
  por_vencer: "Mi boleta está por vencer o ya venció. ¿Qué puedo hacer?",
  empenar: "Quiero empeñar algo. ¿Cuánto me prestan y cuánto voy a pagar?",
  aprender: "Quiero informarme sobre cómo funciona un empeño.",
};

/** Etiqueta legible de un valor del perfil ("Prefiero no decir" incluido). */
export function etiquetaPerfil(campo, valor) {
  if (valor === NO_DICE) return "Prefiero no decir";
  const par = PREGUNTAS_PERFIL[campo]?.opciones.find(([v]) => v === valor);
  return par ? par[1] : null;
}

/**
 * Deja solo campos y valores conocidos. Devuelve null si no queda nada.
 * `omitido: true` marca que la persona saltó el formulario.
 */
export function limpiarPerfil(entrada) {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) return null;
  if (entrada.omitido === true) return { omitido: true };
  const limpio = {};
  for (const campo of CAMPOS_PERFIL) {
    const v = entrada[campo];
    if (typeof v === "string" && etiquetaPerfil(campo, v)) limpio[campo] = v;
  }
  return Object.keys(limpio).length > 0 ? limpio : null;
}

/**
 * Nota del sistema con el perfil para el modelo. Va pegada al primer mensaje de la persona
 * (siempre el mismo texto, así no cambia el historial entre turnos). null si no hay nada útil.
 */
export function notaDePerfil(perfil) {
  if (!perfil || perfil.omitido) return null;
  const partes = [];
  for (const campo of CAMPOS_PERFIL) {
    const v = perfil[campo];
    if (!v || v === NO_DICE) continue;
    partes.push(`${PREGUNTAS_PERFIL[campo].pregunta.replace(/[¿?]/g, "")}: ${etiquetaPerfil(campo, v)}`);
  }
  if (partes.length === 0) return null;
  return `\n\n[Nota del sistema, no del usuario: perfil anónimo que la persona eligió al abrir el chat — ${partes.join("; ")}. Úsalo solo para orientar tu respuesta; no lo repitas en voz alta ni pidas datos personales.]`;
}
