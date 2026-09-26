// Un turno del chatbot: llama al modelo, ejecuta herramientas y emite eventos.
// Lo usan el endpoint /api/chat y scripts/eval-chat.mjs, para que las pruebas
// corran exactamente el mismo código que producción.

import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM } from "./system.js";
import { KNOWLEDGE } from "./knowledge.js";
import { TOOLS, ejecutarTool } from "./tools.js";

export const MODEL = process.env.CHAT_MODEL || "claude-sonnet-5";
const MAX_ITERACIONES = 3;
const MAX_TOKENS = 2048;

const RESPUESTA_REFUSAL =
  "Sobre eso no puedo orientarte aquí. Si tiene que ver con tu empeño, escríbenos por WhatsApp.";

/**
 * @param {Anthropic} client
 * @param {Array} historial mensajes {role, content} ya normalizados; termina en usuario
 * @param {(evento: object) => void} emitir recibe {type:"text"|"cta"|"done", ...}
 * @param {{yaHayCta?: boolean, fuente?: object}} opciones
 */
export async function correrTurno(client, historial, emitir, { yaHayCta = false, fuente = {}, conversacionId = null } = {}) {
  const messages = [...historial];
  const usoAcumulado = { input: 0, cache_read: 0, cache_write: 0, output: 0 };
  const herramientas = [];
  let avanzo = false;
  let ctaEmitido = yaHayCta;
  let huboTexto = false;

  for (let i = 0; i < MAX_ITERACIONES; i += 1) {
    const s = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: [
        { type: "text", text: SYSTEM },
        { type: "text", text: KNOWLEDGE, cache_control: { type: "ephemeral" } },
      ],
      tools: TOOLS,
      messages,
    });

    // Entre iteraciones (antes y después de una tool) el modelo no pone salto de línea.
    let primerDelta = true;
    s.on("text", (delta) => {
      if (primerDelta && huboTexto) emitir({ type: "text", text: "\n\n" });
      primerDelta = false;
      huboTexto = true;
      emitir({ type: "text", text: delta });
    });

    const respuesta = await s.finalMessage();
    acumularUso(usoAcumulado, respuesta.usage);

    if (respuesta.stop_reason === "refusal") {
      emitir({ type: "text", text: RESPUESTA_REFUSAL });
      break;
    }

    if (respuesta.stop_reason !== "tool_use") {
      break;
    }

    const llamadas = respuesta.content.filter((b) => b.type === "tool_use");
    messages.push({ role: "assistant", content: respuesta.content });

    const resultados = [];
    for (const llamada of llamadas) {
      herramientas.push(llamada.name);
      const { resultado, cta, esError, meta } = await ejecutarTool(llamada.name, llamada.input, {
        yaHayCta: ctaEmitido,
        fuente,
        conversacionId,
      });
      if (meta?.avanza) avanzo = true;
      if (cta) {
        ctaEmitido = true;
        emitir({ type: "cta", codigo: cta.codigo, url: cta.url, persistido: cta.persistido === true });
      }
      resultados.push({
        type: "tool_result",
        tool_use_id: llamada.id,
        content: resultado,
        ...(esError ? { is_error: true } : {}),
      });
    }
    messages.push({ role: "user", content: resultados });
  }

  console.log(
    `[chat] model=${MODEL} in=${usoAcumulado.input} cache_read=${usoAcumulado.cache_read} cache_write=${usoAcumulado.cache_write} out=${usoAcumulado.output}`,
  );
  emitir({ type: "done", usage: usoAcumulado, herramientas, avanzo });
}

function acumularUso(acc, usage) {
  if (!usage) return;
  acc.input += usage.input_tokens || 0;
  acc.cache_read += usage.cache_read_input_tokens || 0;
  acc.cache_write += usage.cache_creation_input_tokens || 0;
  acc.output += usage.output_tokens || 0;
}
