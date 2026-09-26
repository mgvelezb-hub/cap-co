// POST /api/admin/leads/CAP-XXXX — cambia etapa y/o notas. Protegido por middleware.js (Basic auth).

import { PATRON_CODIGO } from "@/lib/chatbot/codigo";
import { actualizarLead } from "@/lib/leads/repo";
import { usuarioPanel, rechazarSiOtroOrigen } from "@/lib/panel/auth";
import { registrarAccion } from "@/lib/leads/bitacora";

export const runtime = "nodejs";

const CAMPOS = ["etapa", "notas", "casa_destino", "comision_mxn", "motivo_descarte", "asesor"];

export async function POST(request, { params }) {
  const rechazo = rechazarSiOtroOrigen(request);
  if (rechazo) return rechazo;
  const { codigo } = await params;
  if (!PATRON_CODIGO.test(codigo)) return Response.json({ error: "Código inválido." }, { status: 400 });
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const cambios = Object.fromEntries(CAMPOS.filter((c) => body && c in body).map((c) => [c, body[c]]));
  const r = await actualizarLead(codigo, cambios);
  if (!r.ok) {
    const status = r.motivo === "no_existe" ? 404 : r.motivo === "sin_db" ? 503 : 400;
    return Response.json({ error: r.motivo }, { status });
  }
  // La bitácora guarda qué campos cambiaron y la etapa; no copia el texto de las notas.
  const detalle = { campos: Object.keys(cambios), etapa: cambios.etapa, comision_mxn: cambios.comision_mxn };
  await registrarAccion(usuarioPanel(request).usuario, "lead_actualizado", codigo, detalle);
  return Response.json(r);
}
