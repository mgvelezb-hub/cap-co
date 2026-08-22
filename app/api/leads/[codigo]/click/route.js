// POST /api/leads/CAP-XXXX/click — la persona tocó "Continuar por WhatsApp".
// Sin datos personales; solo marca el momento. Siempre responde 204 (no bloquea la navegación).

import { PATRON_CODIGO } from "@/lib/chatbot/codigo";
import { registrarClickWhatsApp } from "@/lib/leads/repo";

export const runtime = "nodejs";

export async function POST(_request, { params }) {
  const { codigo } = await params;
  if (PATRON_CODIGO.test(codigo)) {
    await registrarClickWhatsApp(codigo);
  }
  return new Response(null, { status: 204 });
}
