// POST /api/admin/gastos — captura gasto de publicidad por campaña. Protegido por middleware.js.

import { query, dbDisponible } from "@/lib/db/client";
import { usuarioPanel, rechazarSiOtroOrigen } from "@/lib/panel/auth";
import { registrarAccion } from "@/lib/leads/bitacora";

export const runtime = "nodejs";

export async function POST(request) {
  const rechazo = rechazarSiOtroOrigen(request);
  if (rechazo) return rechazo;
  if (!dbDisponible()) return Response.json({ error: "sin_db" }, { status: 503 });
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const fecha = String(body?.fecha || "");
  const campana = String(body?.utm_campaign || "").trim().slice(0, 80);
  const monto = Number(body?.monto_mxn);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !campana || !Number.isFinite(monto) || monto < 0 || monto > 10_000_000) {
    return Response.json({ error: "Datos inválidos: fecha, campaña y monto son obligatorios." }, { status: 400 });
  }
  const { usuario } = usuarioPanel(request);
  await query(`INSERT INTO gasto_campana (fecha, utm_campaign, monto_mxn, nota, creado_por) VALUES ($1, $2, $3, $4, $5)`, [
    fecha,
    campana,
    monto,
    String(body?.nota || "").slice(0, 200) || null,
    usuario,
  ]);
  await registrarAccion(usuario, "gasto_capturado", campana, { fecha, monto });
  return Response.json({ ok: true });
}
