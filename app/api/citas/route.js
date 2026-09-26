// POST /api/citas — reserva una cita para un lead del chat.
// Entrada: { codigo, inicio (ISO), nombre, telefono, acepta: true }. Guarda el contacto con
// consentimiento (como /api/leads/[codigo]/contacto) y aparta el horario.

import { PATRON_CODIGO } from "@/lib/chatbot/codigo";
import { registrarContacto } from "@/lib/leads/repo";
import { validarContacto } from "@/lib/leads/validar";
import { reservar } from "@/lib/agenda/repo";
import { textoCita } from "@/lib/agenda/horarios";
import { permitir, ipDeRequest, hashIp } from "@/lib/chatbot/ratelimit";
import { WHATSAPP_NUMBER } from "@/lib/constants";

export const runtime = "nodejs";

const MOTIVOS = {
  horario_invalido: "Ese horario ya no está disponible. Elige otro.",
  ocupado: "Alguien acaba de apartar ese horario. Elige otro, por favor.",
  no_existe: "No encontramos tu caso. Vuelve a pedir la cita desde el chat.",
  sin_db: "No pudimos apartar la cita. Escríbenos por WhatsApp.",
};

export async function POST(request) {
  if (!(await permitir("cita", hashIp(ipDeRequest(request))))) {
    return Response.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const codigo = body?.codigo;
  if (!PATRON_CODIGO.test(codigo || "")) return Response.json({ error: "Código inválido." }, { status: 400 });
  const inicio = new Date(body?.inicio);
  const v = validarContacto(body || {});
  if (!v.ok) return Response.json({ error: v.error }, { status: 400 });

  const r = await reservar(codigo, inicio);
  if (!r.ok) {
    const status = r.motivo === "ocupado" ? 409 : r.motivo === "no_existe" ? 404 : r.motivo === "sin_db" ? 503 : 400;
    return Response.json({ error: MOTIVOS[r.motivo] }, { status });
  }
  const c = await registrarContacto({ codigo, nombre: v.nombre, telefono: v.telefono });
  if (!c.ok) return Response.json({ error: MOTIVOS.sin_db }, { status: 503 });

  const cuando = textoCita(new Date(r.cita.inicio));
  const texto = `Hola, vengo de la página. Código ${codigo}. Aparté cita para el ${cuando} y quiero confirmar el lugar.`;
  return Response.json({
    ok: true,
    cuando,
    lugar: r.cita.lugar,
    whatsapp: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`,
  });
}
