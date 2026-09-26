// Sugerencia de clasificación y perfil con IA. Recibe solo números y el resumen anónimo del
// caso (nunca nombre, teléfono ni correo). La sugerencia nunca se aplica sola si contradice a
// las reglas: pasa a la cola de revisión.

import Anthropic from "@anthropic-ai/sdk";
import { CLASES } from "./reglas.js";

const MODELO = process.env.CRM_MODELO || process.env.CHAT_MODEL || "claude-sonnet-5";

const HERRAMIENTA = {
  name: "clasificar_lead",
  description: "Clasifica un caso de boleta de empeño para el equipo de CAP & Co.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["clasificacion", "motivo", "confianza", "propension_taller", "urgencia", "tipo_pieza", "sensibilidad_precio", "siguiente_paso"],
    properties: {
      clasificacion: { type: "string", enum: CLASES, description: "aplica_auto: el cambio conviene con claridad; revision: caso gris; no_aplica: no conviene; taller: restaurar la pieza primero mejora su avalúo o es lo que busca." },
      motivo: { type: "string", description: "Una frase, máximo 160 caracteres, en español de México, para el asesor." },
      confianza: { type: "integer", description: "0 a 100." },
      propension_taller: { type: "integer", description: "0 a 100: qué tan probable es que la pieza necesite o se beneficie del taller." },
      urgencia: { type: "string", enum: ["alta", "media", "baja"], description: "Alta si la boleta vence pronto o ya venció." },
      tipo_pieza: { type: "string", description: "oro, plata, reloj, electrónico, otro o desconocido." },
      sensibilidad_precio: { type: "string", enum: ["alta", "media", "baja"] },
      siguiente_paso: { type: "string", description: "Qué debe hacer el asesor, máximo 120 caracteres." },
    },
  },
};

const INSTRUCCIONES = `Eres analista de CAP & Co., asesoría prendaria en CDMX que ayuda a personas a cambiar su boleta de empeño a una casa con mejor tasa (aliado: Montepío Luz Saviñón) y cobra comisión por el cambio. No presta dinero.
Clasifica el caso con los datos dados. Reglas: si el ahorro neto (después de la comisión, si se da) es claro (1,500 pesos o más) y la persona quiere hacerlo, aplica_auto; si el ahorro es chico o faltan datos, revision; si no hay ahorro, no_aplica; si la pieza está dañada o quiere restaurarla, taller. Sé conservador: ante la duda, revision.`;

/**
 * @returns {Promise<object|null>} sugerencia o null si no hay llave o falla
 */
export async function sugerirConIA(lead, { comision = null, cliente = null } = {}) {
  if (!cliente && !process.env.ANTHROPIC_API_KEY) return null;
  const c = cliente || new Anthropic();
  const datos = {
    perfil: lead.perfil,
    resumen: lead.resumen,
    probabilidad: lead.probabilidad,
    institucion_origen: lead.institucion_origen,
    tasa_actual_mensual: lead.tasa_actual,
    tasa_ofrecida_mensual: lead.tasa_oferta,
    ahorro_estimado_mxn: lead.ahorro,
    comision_cap_mxn: comision,
    etapa: lead.etapa,
    dias_desde_que_llego: Math.floor((Date.now() - new Date(lead.created_at)) / 86_400_000),
  };
  try {
    const r = await c.messages.create({
      model: MODELO,
      max_tokens: 600,
      system: INSTRUCCIONES,
      tools: [HERRAMIENTA],
      tool_choice: { type: "tool", name: "clasificar_lead" },
      messages: [{ role: "user", content: `Caso:\n${JSON.stringify(datos, null, 1)}` }],
    });
    const uso = r.content.find((b) => b.type === "tool_use");
    if (!uso) return null;
    const s = uso.input;
    if (!CLASES.includes(s.clasificacion)) return null;
    return {
      clasificacion: s.clasificacion,
      motivo: String(s.motivo || "").slice(0, 200),
      confianza: Math.max(0, Math.min(100, Math.round(s.confianza))),
      propensionTaller: Math.max(0, Math.min(100, Math.round(s.propension_taller))),
      perfil: {
        urgencia: s.urgencia,
        tipo_pieza: String(s.tipo_pieza || "").slice(0, 40),
        sensibilidad_precio: s.sensibilidad_precio,
        siguiente_paso: String(s.siguiente_paso || "").slice(0, 160),
      },
    };
  } catch (err) {
    console.error("[crm] la IA no clasificó:", err.message);
    return null;
  }
}
