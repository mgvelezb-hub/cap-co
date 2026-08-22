// Herramientas que el modelo puede llamar. Definiciones fijas (cacheables) y
// ejecutores puros. El orden del array no debe cambiar entre requests.

import { calcularCosto, calcularDesempenoHoy, compararOpciones, formatearMXN } from "./calculo.js";
import { construirLinkWhatsApp } from "./codigo.js";
import { crearLead } from "../leads/repo.js";
import { PERFIL_IDS, esPerfilValido } from "./perfiles.js";
import { WHATSAPP_NUMBER } from "../constants.js";

export const TOOLS = [
  {
    name: "calcular_costo",
    description:
      "Calcula cuánto terminará pagando una persona por su empeño con interés simple mensual. Úsala siempre que tengas préstamo, tasa mensual y meses; nunca calcules a mano. Devuelve interés mensual, interés total, total a pagar y cuántas veces el préstamo representa.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["prestamo", "tasa_mensual", "meses"],
      properties: {
        prestamo: {
          type: "number",
          description: "Dinero que le prestaron a la persona, en pesos mexicanos.",
        },
        tasa_mensual: {
          type: "number",
          description: "Tasa de interés MENSUAL en porcentaje, tal como aparece en la boleta (ej. 8 para 8 %). No usar tasa anual ni CAT.",
        },
        meses: {
          type: "integer",
          description: "Meses que pasarán hasta que recupere su pieza (incluyendo refrendos).",
        },
      },
    },
  },
  {
    name: "calcular_desempeno_hoy",
    description:
      "Calcula cuánto debe hoy una persona que ya lleva tiempo empeñada: cuánto pagaría por refrendar hoy (solo intereses pendientes) y cuánto por desempeñar hoy (recuperar la pieza). Úsala cuando ya empeñó y pregunta cuánto debe, cuánto cuesta refrendar o cuánto le cuesta liquidar.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["prestamo", "tasa_mensual", "meses_sin_pagar", "penalizacion"],
      properties: {
        prestamo: { type: "number", description: "Dinero que le prestaron, en pesos." },
        tasa_mensual: { type: "number", description: "Tasa de interés MENSUAL en porcentaje (ej. 8 para 8 %)." },
        meses_sin_pagar: {
          type: "integer",
          description: "Meses cuyos intereses todavía no ha pagado (los refrendos ya pagados cubren meses anteriores). Si acaba de refrendar, 0 o 1.",
        },
        penalizacion: {
          type: "number",
          description: "Recargo en pesos si ya venció y aplica desempeño extemporáneo. 0 si no aplica o no se sabe.",
        },
      },
    },
  },
  {
    name: "comparar_opciones",
    description:
      "Compara quedarse en la institución actual vs. mover la boleta (traspaso) a otra con tasa menor, para los meses que le faltan. Devuelve costo de liquidar hoy, total si se queda, total si se mueve, ahorro en pesos y porcentaje, y si conviene según el criterio de CAP & Co. Úsala siempre que la persona pregunte si le conviene cambiarse, o cuando su tasa esté arriba del rango bajo del mercado. Para tasa_nueva usa una referencia del rango bajo del mercado (3 a 4 % mensual en IAP) y dilo como orientativo.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["prestamo", "tasa_actual", "tasa_nueva", "meses_restantes", "meses_sin_pagar", "penalizacion"],
      properties: {
        prestamo: { type: "number", description: "Préstamo original en pesos." },
        tasa_actual: { type: "number", description: "Tasa MENSUAL actual en porcentaje." },
        tasa_nueva: { type: "number", description: "Tasa MENSUAL de la opción a comparar, en porcentaje." },
        meses_restantes: { type: "integer", description: "Meses que la persona calcula que seguirá necesitando el préstamo." },
        meses_sin_pagar: { type: "integer", description: "Meses de intereses pendientes hoy en la institución actual. 0 si está al corriente." },
        penalizacion: { type: "number", description: "Recargo en pesos por liquidar hoy, si lo hay. 0 si no." },
      },
    },
  },
  {
    name: "agendar_cita",
    description:
      "Registra al prospecto y genera el botón de WhatsApp para confirmar horario de una cita presencial con un asesor. Llámala SOLO cuando (a) ya evaluaste con comparar_opciones que el cambio de boleta le conviene y la persona quiere hacerlo (probabilidad 70 % o más), o (b) la persona pide explícitamente hablar con un asesor o agendar. Una sola vez por conversación.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["perfil", "resumen", "probabilidad"],
      properties: {
        perfil: {
          type: "string",
          enum: PERFIL_IDS,
          description: "Perfil que mejor describe la situación de la persona.",
        },
        resumen: {
          type: "string",
          description: "Resumen del caso para el asesor, máximo 400 caracteres, SIN datos personales: números de la boleta (préstamo, tasa, meses), resultado de la evaluación (ahorro), qué quiere la persona.",
        },
        probabilidad: {
          type: "integer",
          description: "Tu estimación, de 0 a 100, de que el cambio de boleta se concrete. Si la persona solo pidió hablar con alguien sin evaluación, pon tu mejor estimación con las señales que tengas.",
        },
      },
    },
  },
];

/**
 * Ejecuta una tool. Devuelve {resultado: string, cta?: {codigo,url,perfil}}.
 * El resultado es lo que ve el modelo; cta es lo que se manda al cliente.
 */
export async function ejecutarTool(nombre, entrada, contexto = {}) {
  if (nombre === "calcular_costo") {
    const r = calcularCosto({
      prestamo: entrada.prestamo,
      tasaMensual: entrada.tasa_mensual,
      meses: entrada.meses,
    });
    if (!r.ok) {
      return { resultado: JSON.stringify({ error: r.error }), esError: true };
    }
    return {
      resultado: JSON.stringify({
        prestamo: formatearMXN(r.prestamo),
        tasa_mensual: `${r.tasaMensual}%`,
        meses: r.meses,
        interes_mensual: formatearMXN(r.interesMensual),
        interes_total: formatearMXN(r.interesTotal),
        total_a_pagar: formatearMXN(r.total),
        veces_el_prestamo: r.veces,
        nota: r.nota,
      }),
    };
  }

  if (nombre === "calcular_desempeno_hoy") {
    const r = calcularDesempenoHoy({
      prestamo: entrada.prestamo,
      tasaMensual: entrada.tasa_mensual,
      mesesSinPagar: entrada.meses_sin_pagar,
      penalizacion: entrada.penalizacion,
    });
    if (!r.ok) return { resultado: JSON.stringify({ error: r.error }), esError: true };
    return {
      resultado: JSON.stringify({
        interes_mensual: formatearMXN(r.interesMensual),
        interes_pendiente: formatearMXN(r.interesPendiente),
        penalizacion: formatearMXN(r.penalizacion),
        refrendar_hoy: formatearMXN(r.refrendarHoy),
        desempenar_hoy: formatearMXN(r.desempenarHoy),
        nota: r.nota,
      }),
    };
  }

  if (nombre === "comparar_opciones") {
    const r = compararOpciones({
      prestamo: entrada.prestamo,
      tasaActual: entrada.tasa_actual,
      tasaNueva: entrada.tasa_nueva,
      mesesRestantes: entrada.meses_restantes,
      mesesSinPagar: entrada.meses_sin_pagar,
      penalizacion: entrada.penalizacion,
    });
    if (!r.ok) return { resultado: JSON.stringify({ error: r.error }), esError: true };
    return {
      resultado: JSON.stringify({
        liquidar_hoy: formatearMXN(r.liquidarHoy),
        quedarse: { tasa_mensual: `${r.quedarse.tasaMensual}%`, interes_restante: formatearMXN(r.quedarse.interesRestante), total: formatearMXN(r.quedarse.total) },
        moverse: { tasa_mensual: `${r.moverse.tasaMensual}%`, nuevo_prestamo: formatearMXN(r.moverse.nuevoPrestamo), interes_restante: formatearMXN(r.moverse.interesRestante), total: formatearMXN(r.moverse.total) },
        ahorro: formatearMXN(r.ahorro),
        ahorro_pct: `${r.ahorroPct}%`,
        conviene: r.conviene,
        criterio: r.criterio,
        nota: r.nota,
      }),
    };
  }

  if (nombre === "agendar_cita") {
    if (contexto.yaHayCta) {
      return {
        resultado: JSON.stringify({
          ok: true,
          nota: "El botón de WhatsApp ya estaba en pantalla desde antes; no se generó otro. Solo recuérdale a la persona que lo use, en una línea.",
        }),
      };
    }
    const perfil = esPerfilValido(entrada.perfil) ? entrada.perfil : "curioso";
    const { codigo, persistido } = await crearLead({
      perfil,
      resumen: entrada.resumen,
      fuente: contexto.fuente,
      probabilidad: entrada.probabilidad,
    });
    const url = construirLinkWhatsApp({ numero: WHATSAPP_NUMBER, codigo, perfil });
    return {
      resultado: JSON.stringify({
        ok: true,
        codigo,
        instruccion: "El botón para confirmar horario por WhatsApp ya aparece en pantalla. Dile a la persona en una o dos frases que lo use, que la cita es presencial y que el asesor ya recibe su caso evaluado. No repitas el link ni el código.",
      }),
      // persistido=false (sin DB): el widget no ofrece el formulario de contacto.
      cta: { codigo, url, perfil, persistido },
    };
  }

  return { resultado: JSON.stringify({ error: `Herramienta desconocida: ${nombre}` }), esError: true };
}
