// GET /api/leads/CAP-XXXX — consulta interna (bot de WhatsApp, fase 3).
// Requiere Authorization: Bearer <LEADS_API_SECRET>. Devuelve el lead completo.

import { PATRON_CODIGO } from "@/lib/chatbot/codigo";
import { obtenerLead } from "@/lib/leads/repo";
import { dbDisponible } from "@/lib/db/client";

export const runtime = "nodejs";

function autorizado(request) {
  const secreto = process.env.LEADS_API_SECRET;
  if (!secreto) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secreto}`;
}

export async function GET(request, { params }) {
  if (!autorizado(request)) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }
  const { codigo } = await params;
  if (!PATRON_CODIGO.test(codigo)) {
    return Response.json({ error: "Código inválido." }, { status: 400 });
  }
  if (!dbDisponible()) {
    return Response.json({ error: "Base de datos no configurada." }, { status: 503 });
  }
  const lead = await obtenerLead(codigo);
  if (!lead) {
    return Response.json({ error: "No existe." }, { status: 404 });
  }
  return Response.json({ lead });
}
