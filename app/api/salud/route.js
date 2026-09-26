// GET /api/salud — estado público y mínimo para un monitor externo (UptimeRobot u otro):
// 200 con "ok" o "degradado"; 503 con "caido" solo si el chat no puede atender
// (sin saldo, llave inválida o errores repetidos). El detalle está en /api/admin/salud.

import { diagnostico } from "@/lib/alertas/salud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const d = await diagnostico();
  return Response.json(
    { estado: d.estado, revisado_at: d.revisado_at },
    { status: d.estado === "caido" ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
