// POST /api/leads/CAP-XXXX/contacto — la persona deja nombre y WhatsApp para que la contactemos.
// Entrada: { nombre, telefono, acepta: true }. Solo se guarda con consentimiento explícito
// (acepta === true) y queda registrado consent_at + versión del aviso.

import { PATRON_CODIGO } from "@/lib/chatbot/codigo";
import { registrarContacto } from "@/lib/leads/repo";
import { validarContacto } from "@/lib/leads/validar";
import { permitir, ipDeRequest, hashIp } from "@/lib/chatbot/ratelimit";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  if (!(await permitir("contacto", hashIp(ipDeRequest(request))))) {
    return Response.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }
  const { codigo } = await params;
  if (!PATRON_CODIGO.test(codigo)) {
    return Response.json({ error: "Código inválido." }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const v = validarContacto(body || {});
  if (!v.ok) {
    return Response.json({ error: v.error }, { status: 400 });
  }

  const r = await registrarContacto({ codigo, nombre: v.nombre, telefono: v.telefono });
  if (!r.ok) {
    const status = r.motivo === "no_existe" ? 404 : 503;
    return Response.json(
      { error: "No pudimos guardar tus datos. Escríbenos directo por WhatsApp." },
      { status },
    );
  }
  return Response.json({ ok: true });
}
