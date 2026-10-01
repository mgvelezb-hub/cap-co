// POST /api/chat — un turno del chatbot.
// Entrada: { messages: [{role:"user"|"assistant", content:string}, ...], hasCta?: boolean, fuente?: object,
//           imagen?: {media_type, data} }  ← foto de boleta del último mensaje (base64, no se guarda)
//   hasCta = el widget ya muestra el botón de WhatsApp de un turno anterior.
//   fuente = utm_source/medium/campaign/referrer/path de la visita (para el lead).
//   perfil = respuestas opcionales y anónimas del formulario de bienvenida (lib/chatbot/perfil-visita.js).
// Salida: stream de líneas JSON (NDJSON):
//   {type:"text", text}          fragmento de respuesta
//   {type:"cta", codigo, url}    botón de WhatsApp (cuando el modelo cierra)
//   {type:"done", usage}         fin del turno
//   {type:"error", message}      error recuperable (el cliente lo muestra como burbuja)

import Anthropic from "@anthropic-ai/sdk";
import { after } from "next/server";

// Trabajo que no debe retrasar la respuesta (métricas, eventos). after() lo corre al terminar;
// si no hay contexto de request disponible, se lanza sin esperar.
function enDiferido(fn) {
  try {
    after(fn);
  } catch {
    Promise.resolve().then(fn).catch(() => {});
  }
}
import { correrTurno } from "@/lib/chatbot/motor";
import { revisarLimites, ipDeRequest, hashIp } from "@/lib/chatbot/ratelimit";
import { registrarEvento, tipoDeErrorAnthropic } from "@/lib/alertas/eventos";
import { limpiarFuente } from "@/lib/leads/validar";
import { CANAL_RESPALDO, WHATSAPP_ACTIVO } from "@/lib/constants";
import { validarImagen, mensajeConImagen } from "@/lib/chatbot/imagen";
import { registrarTurno, idValido } from "@/lib/metricas/conversaciones";
import { resumirConversacion } from "@/lib/metricas/resumen";
import { limpiarPerfil, notaDePerfil } from "@/lib/chatbot/perfil-visita";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_MENSAJES = 20;
const MAX_CHARS = 1500;

const NOTA_CTA_PREVIO =
  "\n\n[Nota del sistema, no del usuario: el botón para agendar por WhatsApp ya está en pantalla desde un turno anterior. No llames agendar_cita otra vez; sigue resolviendo dudas y, si viene al caso, recuérdale que lo use.]";

const MENSAJE_CAIDA = `Ahora mismo no puedo responder. Si quieres, ${CANAL_RESPALDO} y seguimos con tu caso; respondemos de lunes a viernes de 9:00 a 17:00.`;

const client = new Anthropic();

// Los bloqueos llevan whatsapp: true para que el widget muestre el botón y el prospecto no se pierda.
const RESPALDO = CANAL_RESPALDO[0].toUpperCase() + CANAL_RESPALDO.slice(1);
const MENSAJES_LIMITE = {
  chat: `Vamos muy rápido: dame unos minutos para seguir. Si prefieres, ${CANAL_RESPALDO}; respondemos de lunes a viernes de 9:00 a 17:00.`,
  chatDia: `Por hoy llegamos al máximo de mensajes en este chat. ${RESPALDO} y seguimos con tu caso; respondemos de lunes a viernes de 9:00 a 17:00.`,
  foto: `Por hoy ya analizamos varias fotos tuyas. Puedes escribirme los datos de tu boleta y seguimos, o ${WHATSAPP_ACTIVO ? "mandarla por WhatsApp" : "mandarla por correo"}.`,
  chatGlobal: `El asistente está saturado en este momento. ${RESPALDO}; respondemos de lunes a viernes de 9:00 a 17:00.`,
  fotoGlobal: `Por hoy no podemos analizar más fotos. Escríbeme los datos de tu boleta y seguimos, o ${WHATSAPP_ACTIVO ? "mándala por WhatsApp" : "mándala por correo"}.`,
};

let ultimoAvisoTope = 0;

export async function POST(request) {
  const visitante = hashIp(ipDeRequest(request));

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
  // Primero los límites del visitante; el global solo cuenta a quien pasó, para que una sola
  // IP no pueda agotar el tope del día para todos.
  const delVisitante = [
    ["chat", visitante],
    ["chatDia", visitante],
  ];
  if (img.imagen) delVisitante.push(["foto", visitante]);
  let excedido = await revisarLimites(delVisitante);
  if (!excedido) excedido = await revisarLimites(img.imagen ? [["chatGlobal", "global"], ["fotoGlobal", "global"]] : [["chatGlobal", "global"]]);
  if (excedido) {
    if ((excedido === "chatGlobal" || excedido === "fotoGlobal") && Date.now() - ultimoAvisoTope > 10 * 60_000) {
      ultimoAvisoTope = Date.now();
      enDiferido(() => registrarEvento("tope_diario", "critico", `Se alcanzó el tope diario del sitio (${excedido}).`));
    }
    return Response.json({ error: MENSAJES_LIMITE[excedido], whatsapp: true }, { status: 429 });
  }
  const yaHayCta = body?.hasCta === true;
  const fuente = limpiarFuente(body?.fuente);
  const conversacionId = idValido(body?.conversacionId) ? body.conversacionId : null;
  const perfil = limpiarPerfil(body?.perfil);
  // Copia en texto plano para el resumen, antes de agregar notas del sistema o la foto.
  const paraResumen = mensajes.map((m, i) => ({
    role: m.role,
    content: i === mensajes.length - 1 && img.imagen ? `${m.content} [envió una foto de su boleta]` : m.content,
  }));
  const nota = notaDePerfil(perfil);
  if (nota) mensajes[0].content = `${mensajes[0].content}${nota}`;
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
      let texto = "";
      let fin = null;
      let cerrado = false;
      const emitir = (obj) => {
        if (obj.type === "text") texto += obj.text;
        if (obj.type === "done") fin = obj;
        if (cerrado) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
        } catch {
          cerrado = true; // la persona cerró la pestaña: no es una falla del chat
        }
      };
      try {
        await correrTurno(client, mensajes, emitir, { yaHayCta, fuente, conversacionId, signal: request.signal });
        enDiferido(async () => {
          const registrado = await registrarTurno({
            id: conversacionId,
            fuente,
            perfil,
            foto: Boolean(img.imagen),
            herramientas: fin?.herramientas || [],
            avanzo: Boolean(fin?.avanzo),
            fueraDeTema: /no lo puedo contestar/i.test(texto),
            costoUsd: fin?.costoUsd || 0,
          });
          // El resumen va después: necesita que la conversación ya exista en la base.
          if (registrado) await resumirConversacion(client, { id: conversacionId, mensajes: paraResumen, respuesta: texto });
        });
      } catch (err) {
        const abandono = cerrado || request.signal?.aborted || err?.name === "AbortError";
        if (!abandono) {
          registrarError(err);
          emitir({ type: "error", message: MENSAJE_CAIDA, whatsapp: true });
          const { tipo, nivel } = tipoDeErrorAnthropic(err);
          enDiferido(() => registrarEvento(tipo, nivel, `${err?.status || ""} ${String(err?.message || err).slice(0, 300)}`.trim()));
        }
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
