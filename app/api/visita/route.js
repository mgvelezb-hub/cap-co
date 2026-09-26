// POST /api/visita — página vista, anónima (sin IP ni datos personales). Alimenta "Tráfico" del CRM.

import { registrarVisita } from "@/lib/crm/trafico";
import { limpiarFuente } from "@/lib/leads/validar";
import { permitir, ipDeRequest, hashIp } from "@/lib/chatbot/ratelimit";
import { dbDisponible } from "@/lib/db/client";

export const runtime = "nodejs";

export async function POST(request) {
  if (!dbDisponible()) return new Response(null, { status: 204 });
  if (!(await permitir("visita", hashIp(ipDeRequest(request))))) return new Response(null, { status: 204 });
  try {
    const body = await request.json();
    await registrarVisita({ sesion: body?.sesion, path: String(body?.path || "").split("?")[0], fuente: limpiarFuente(body?.fuente) });
  } catch {
    // una visita perdida no importa
  }
  return new Response(null, { status: 204 });
}
