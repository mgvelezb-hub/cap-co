// Resumen breve y anónimo de una conversación del chat, para la vista "Conversaciones" del CRM.
// No se guarda el texto de la conversación: solo este resumen, sin datos que identifiquen a la persona.

import { query, dbDisponible } from "../db/client.js";

const MODELO = process.env.RESUMEN_MODEL || "claude-haiku-4-5";
const MAX_CHARS = 280;
// Haiku 4.5, USD por millón de tokens (entrada, salida).
const PRECIO = { input: 1, output: 5 };

const INSTRUCCIONES = `Resumes conversaciones del asesor virtual de CAP & Co. (asesoría de empeños en CDMX) para el equipo interno.
Escribe en español de México, en una o dos oraciones y máximo 240 caracteres: qué necesita la persona, qué datos de su caso dio (institución, monto, prenda, plazo) y en qué quedó (le explicaron, cotizó, conviene o no el cambio, pidió cita, se fue).
Nunca incluyas nombres, teléfonos, correos, domicilios, números de contrato ni nada que identifique a la persona. Tampoco motivos personales sensibles (salud, problemas familiares, deudas con otras personas o situación legal): si los menciona, omítelos. No inventes nada que no esté en la conversación.
Responde solo con el resumen, sin comillas ni encabezados.`;

// Red de seguridad por si el modelo deja pasar un dato de contacto.
export function limpiarResumen(texto) {
  if (typeof texto !== "string") return "";
  let t = texto
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[correo]")
    .replace(/(?:\+?52[\s.-]?)?(?:\d[\s.-]?){8,}\d/g, "[número]")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["“]|["”]$/g, "");
  if (t.length > MAX_CHARS) t = `${t.slice(0, MAX_CHARS - 1).trimEnd()}…`;
  return t;
}

/** Texto plano de la conversación para el resumen (solo cadenas; la foto va como marca). */
export function transcripcion(mensajes, respuesta) {
  const lineas = mensajes.map((m) => `${m.role === "user" ? "Persona" : "Asesor"}: ${m.content}`);
  if (respuesta) lineas.push(`Asesor: ${respuesta}`);
  // Lo más reciente es lo que importa; se recorta desde el inicio.
  return lineas.join("\n").slice(-8000);
}

/** Genera el resumen y lo guarda en la conversación. Nunca lanza. */
export async function resumirConversacion(client, { id, mensajes, respuesta }) {
  if (!dbDisponible() || !id || !Array.isArray(mensajes) || mensajes.length === 0) return;
  try {
    const r = await client.messages.create({
      model: MODELO,
      max_tokens: 200,
      system: INSTRUCCIONES,
      messages: [{ role: "user", content: `<conversacion>\n${transcripcion(mensajes, respuesta)}\n</conversacion>` }],
    });
    const texto = limpiarResumen(r.content.find((b) => b.type === "text")?.text || "");
    if (!texto) return;
    const costo = ((r.usage?.input_tokens || 0) * PRECIO.input + (r.usage?.output_tokens || 0) * PRECIO.output) / 1e6;
    await query(`UPDATE conversacion SET resumen = $2, costo_usd = costo_usd + $3 WHERE id = $1`, [id, texto, costo]);
  } catch (err) {
    console.error("[resumen] no se generó:", err.message);
  }
}
