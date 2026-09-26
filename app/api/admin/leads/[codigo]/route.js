// POST /api/admin/leads/CAP-XXXX — cambia etapa y/o notas. Protegido por middleware.js (Basic auth).

import { PATRON_CODIGO } from "@/lib/chatbot/codigo";
import { actualizarLead } from "@/lib/leads/repo";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  const { codigo } = await params;
  if (!PATRON_CODIGO.test(codigo)) return Response.json({ error: "Código inválido." }, { status: 400 });
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const r = await actualizarLead(codigo, { etapa: body?.etapa, notas: body?.notas });
  if (!r.ok) {
    const status = r.motivo === "no_existe" ? 404 : r.motivo === "sin_db" ? 503 : 400;
    return Response.json({ error: r.motivo }, { status });
  }
  return Response.json(r);
}
