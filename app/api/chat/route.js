// POST /api/chat — un turno del chatbot.
// Entrada: { messages: [{role:"user"|"assistant", content:string}, ...], hasCta?: boolean, fuente?: object,
//           imagen?: {media_type, data} }  ← foto de boleta del último mensaje (base64, no se guarda)
//   hasCta = el widget ya muestra el botón de WhatsApp de un turno anterior.
//   fuente = utm_source/medium/campaign/referrer/path de la visita (para el lead).
// Salida: stream de líneas JSON (NDJSON):
//   {type:"text", text}          fragmento de respuesta
//   {type:"cta", codigo, url}    botón de WhatsApp (cuando el modelo cierra)
//   {type:"done", usage}         fin del turno
//   {type:"error", message}      error recuperable (el cliente lo muestra como burbuja)

import Anthropic from "@anthropic-ai/sdk";
import { correrTurno } from "@/lib/chatbot/motor";
import { permitir, ipDeRequest } from "@/lib/chatbot/ratelimit";
import { limpiarFuente } from "@/lib/leads/validar";
import { validarImagen, mensajeConImagen } from "@/lib/chatbot/imagen";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_MENSAJES = 20;
const MAX_CHARS = 1500;

const NOTA_CTA_PREVIO =
  "\n\n[Nota del sistema, no del usuario: el botón para agendar por WhatsApp ya está en pantalla desde un turno anterior. No llames agendar_cita otra vez; sigue resolviendo dudas y, si viene al caso, recuérdale que lo use.]";

const MENSAJE_CAIDA =
  "Ahora mismo no puedo responder. Escríbenos por WhatsApp y un asesor te atiende.";

const client = new Anthropic();

export async function POST(request) {
  if (!permitir(ipDeRequest(request))) {
    return Response.json(
      { error: "Demasiados mensajes en poco tiempo. Espera unos minutos o escríbenos por WhatsApp." },
      { status: 429 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const mensajes = normalizar(body?.messages);
  if (!mensajes) {
    return Response.json({ error: "Formato de mensajes inválido." }, { status: 400 });
  }
  const img = validarImagen(body?.imagen);
  if (!img.ok) {
    return Response.json({ error: img.error }, { status: 400 });
  }
  const yaHayCta = body?.hasCta === true;
  const fuente = limpiarFuente(body?.fuente);
  if (yaHayCta) {
    // Va al final del último mensaje (fuera del prefijo cacheado). Es del servidor, no del usuario.
    const ultimo = mensajes[mensajes.length - 1];
    ultimo.content = `${ultimo.content}${NOTA_CTA_PREVIO}`;
  }
  if (img.imagen) {
    const ultimo = mensajes[mensajes.length - 1];
    ultimo.content = mensajeConImagen(ultimo.content, img.imagen);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emitir = (obj) => controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      try {
        await correrTurno(client, mensajes, emitir, { yaHayCta, fuente });
      } catch (err) {
        registrarError(err);
        emitir({ type: "error", message: MENSAJE_CAIDA });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function normalizar(entrada) {
  if (!Array.isArray(entrada) || entrada.length === 0 || entrada.length > MAX_MENSAJES * 2) {
    return null;
  }
  const limpios = [];
  for (const m of entrada) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return null;
    if (typeof m.content !== "string") return null;
    const texto = m.content.trim().slice(0, MAX_CHARS);
    if (texto.length === 0) return null;
    limpios.push({ role: m.role, content: texto });
  }
  const recortados = limpios.slice(-MAX_MENSAJES);
  // El historial debe empezar y terminar con el usuario.
  while (recortados.length > 0 && recortados[0].role !== "user") recortados.shift();
  if (recortados.length === 0 || recortados[recortados.length - 1].role !== "user") return null;
  return recortados;
}

function registrarError(err) {
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("[chat] ANTHROPIC_API_KEY inválida o ausente");
  } else if (err instanceof Anthropic.RateLimitError) {
    console.error("[chat] rate limit de la API");
  } else if (err instanceof Anthropic.APIError) {
    console.error(`[chat] API error ${err.status}: ${err.message}`);
  } else {
    console.error("[chat] error inesperado:", err);
  }
}
