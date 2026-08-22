// Herramientas que el modelo puede llamar. Definiciones fijas (cacheables) y
// ejecutores puros. El orden del array no debe cambiar entre requests.

import { calcularCosto, formatearMXN } from "./calculo.js";
import { generarCodigo, construirLinkWhatsApp } from "./codigo.js";
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
    name: "cerrar_a_whatsapp",
    description:
      "Genera el código de seguimiento y el link de WhatsApp para que la persona continúe con un asesor. Llámala una sola vez por conversación, cuando la duda principal esté resuelta o cuando el siguiente paso requiera ver la boleta.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["perfil", "resumen"],
      properties: {
        perfil: {
          type: "string",
          enum: PERFIL_IDS,
          description: "Perfil que mejor describe la situación de la persona.",
        },
        resumen: {
          type: "string",
          description: "Resumen de la situación en máximo 200 caracteres, sin datos personales (sin nombres, teléfonos, números de boleta ni direcciones).",
        },
      },
    },
  },
];

/**
 * Ejecuta una tool. Devuelve {resultado: string, cta?: {codigo,url,perfil}}.
 * El resultado es lo que ve el modelo; cta es lo que se manda al cliente.
 */
export function ejecutarTool(nombre, entrada, contexto = {}) {
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

  if (nombre === "cerrar_a_whatsapp") {
    if (contexto.yaHayCta) {
      return {
        resultado: JSON.stringify({
          ok: true,
          nota: "El botón de WhatsApp ya estaba en pantalla desde antes; no se generó otro. Solo recuérdale a la persona que lo use, en una línea.",
        }),
      };
    }
    const perfil = esPerfilValido(entrada.perfil) ? entrada.perfil : "curioso";
    const codigo = generarCodigo();
    const url = construirLinkWhatsApp({ numero: WHATSAPP_NUMBER, codigo, perfil });
    return {
      resultado: JSON.stringify({
        ok: true,
        codigo,
        instruccion: "El botón de WhatsApp ya aparece en pantalla. Dile a la persona en una línea que lo use; no repitas el link ni el código.",
      }),
      cta: { codigo, url, perfil },
    };
  }

  return { resultado: JSON.stringify({ error: `Herramienta desconocida: ${nombre}` }), esError: true };
}
