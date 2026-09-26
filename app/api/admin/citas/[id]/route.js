// POST /api/admin/citas/[id] — cambia estado, lugar u horario (inicio) de una cita. Protegido por middleware.js.

import { actualizarCita } from "@/lib/agenda/repo";
import { usuarioPanel, rechazarSiOtroOrigen } from "@/lib/panel/auth";
import { registrarAccion } from "@/lib/leads/bitacora";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  const rechazo = rechazarSiOtroOrigen(request);
  if (rechazo) return rechazo;
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) return Response.json({ error: "Id inválido." }, { status: 400 });
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const r = await actualizarCita(Number(id), { estado: body?.estado, lugar: body?.lugar, inicio: body?.inicio });
  if (!r.ok) {
    const status = r.motivo === "no_existe" ? 404 : ["ocupado", "lead_con_otra_cita"].includes(r.motivo) ? 409 : 400;
    const error = { ocupado: "ese horario ya está lleno", lead_con_otra_cita: "esta persona ya tiene otra cita activa", horario_invalido: "horario fuera de lunes a viernes 9:00 a 17:00" }[r.motivo] || r.motivo;
    return Response.json({ error }, { status });
  }
  await registrarAccion(usuarioPanel(request).usuario, "cita_actualizada", r.cita.lead_codigo, {
    estado: body?.estado,
    lugar: body?.lugar,
    inicio: body?.inicio,
  });
  return Response.json(r);
}
