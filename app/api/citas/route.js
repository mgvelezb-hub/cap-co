// POST /api/citas — aparta una cita o pide una llamada para un lead del chat.
// Entrada: { codigo, nombre, telefono, acepta: true } más { inicio (ISO) } en modo "citas" o
// { fecha, franja } en modo "llamada". El contacto y la reserva se guardan en una transacción.

import { PATRON_CODIGO } from "@/lib/chatbot/codigo";
import { validarContacto } from "@/lib/leads/validar";
import { reservar, HORAS_PARA_CONFIRMAR } from "@/lib/agenda/repo";
import { textoCita, textoFranja, modoAgenda } from "@/lib/agenda/horarios";
import { revisarLimites, ipDeRequest, hashIp } from "@/lib/chatbot/ratelimit";
import { registrarEvento } from "@/lib/alertas/eventos";
import { WHATSAPP_NUMBER } from "@/lib/constants";

export const runtime = "nodejs";

const MOTIVOS = {
  horario_invalido: "Ese horario ya no está disponible. Elige otro.",
  ocupado: "Alguien acaba de apartar ese horario. Elige otro, por favor.",
  no_existe: "No encontramos tu caso. Vuelve a pedir la cita desde el chat.",
  otro_telefono: "Usa el mismo WhatsApp que registraste para este caso, o escríbenos por WhatsApp.",
  ya_tiene_cita: "Ese WhatsApp ya tiene una cita apartada. Si quieres cambiarla, escríbenos por WhatsApp.",
  sin_db: "No pudimos apartar la cita. Escríbenos por WhatsApp.",
};
const STATUS = { ocupado: 409, ya_tiene_cita: 409, otro_telefono: 409, no_existe: 404, sin_db: 503 };

export async function POST(request) {
  const excedido = await revisarLimites([
    ["cita", hashIp(ipDeRequest(request))],
    ["citaGlobal", "sitio"],
  ]);
  if (excedido === "citaGlobal") {
    await registrarEvento("tope_citas", "critico", "Se alcanzó el tope de reservas por hora de todo el sitio.").catch(() => {});
  }
  if (excedido) {
    return Response.json({ error: "Demasiados intentos. Espera unos minutos o escríbenos por WhatsApp." }, { status: 429 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const codigo = body?.codigo;
  if (!PATRON_CODIGO.test(codigo || "")) return Response.json({ error: "Código inválido." }, { status: 400 });
  const v = validarContacto(body || {});
  if (!v.ok) return Response.json({ error: v.error }, { status: 400 });

  const modo = modoAgenda();
  const r =
    modo === "llamada"
      ? await reservar({ codigo, nombre: v.nombre, telefono: v.telefono, tipo: "llamada", fecha: body?.fecha, franja: body?.franja })
      : await reservar({ codigo, nombre: v.nombre, telefono: v.telefono, inicio: new Date(body?.inicio) });
  if (!r.ok) return Response.json({ error: MOTIVOS[r.motivo] }, { status: STATUS[r.motivo] || 400 });

  const cuando = modo === "llamada" ? textoFranja(body.fecha, body.franja) : textoCita(new Date(r.cita.inicio));
  const texto =
    modo === "llamada"
      ? `Hola, vengo de la página. Código ${codigo}. Pedí que me llamen el ${cuando}.`
      : `Hola, vengo de la página. Código ${codigo}. Aparté cita para el ${cuando} y quiero confirmar el lugar.`;
  return Response.json({
    ok: true,
    modo,
    cuando,
    lugar: r.cita.lugar,
    horasParaConfirmar: HORAS_PARA_CONFIRMAR,
    whatsapp: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`,
  });
}
