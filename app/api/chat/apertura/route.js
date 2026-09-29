// POST /api/chat/apertura — se abrió el chat y, si ya contestó, el perfil de bienvenida. Anónima.
// Entrada: { conversacionId, fuente?, perfil? }. Sirve para medir si el formulario espanta gente.

import { registrarApertura, idValido } from "@/lib/metricas/conversaciones";
import { limpiarPerfil } from "@/lib/chatbot/perfil-visita";
import { limpiarFuente } from "@/lib/leads/validar";
import { permitir, ipDeRequest, hashIp } from "@/lib/chatbot/ratelimit";
import { dbDisponible } from "@/lib/db/client";

export const runtime = "nodejs";

export async function POST(request) {
  if (!dbDisponible()) return new Response(null, { status: 204 });
  if (!(await permitir("visita", hashIp(ipDeRequest(request))))) return new Response(null, { status: 204 });
  try {
    const body = await request.json();
    if (idValido(body?.conversacionId)) {
      await registrarApertura({ id: body.conversacionId, fuente: limpiarFuente(body?.fuente), perfil: limpiarPerfil(body?.perfil) });
    }
  } catch {
    // una apertura perdida no importa
  }
  return new Response(null, { status: 204 });
}
