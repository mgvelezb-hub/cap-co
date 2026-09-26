// Perfiles que el chatbot identifica durante la conversación. El perfil viaja en el
// texto prellenado del link de WhatsApp para que el bot de WhatsApp (fase 3) lo lea.
// No se guarda nada del lado de la web en fase 1.

export const PERFILES = {
  primera_vez: {
    etiqueta: "Va a empeñar por primera vez",
    frase: "Voy a empeñar por primera vez y quiero agendar una cita con un asesor.",
  },
  ya_empeno_confundido: {
    etiqueta: "Ya empeñó y no entiende su boleta",
    frase: "Ya empeñé y quiero agendar una cita para revisar mi boleta con un asesor.",
  },
  quiere_traspaso: {
    etiqueta: "Quiere saber si le conviene moverse",
    frase: "Quiero agendar una cita para cambiar mi boleta a una mejor opción.",
  },
  boleta_vencida: {
    etiqueta: "Boleta vencida o por vencer",
    frase: "Mi boleta venció o está por vencer y quiero agendar una cita con un asesor.",
  },
  restauracion: {
    etiqueta: "Quiere restaurar una pieza",
    frase: "Quiero cotizar la restauración de una pieza con el taller.",
  },
  curioso: {
    etiqueta: "Explora sin caso concreto",
    frase: "Quiero agendar una cita con un asesor.",
  },
};

export const PERFIL_IDS = Object.keys(PERFILES);

export function esPerfilValido(id) {
  return Object.prototype.hasOwnProperty.call(PERFILES, id);
}
