// GET /api/admin/salud — diagnóstico completo. Protegido por middleware.js (Basic auth).

import { diagnostico } from "@/lib/alertas/salud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await diagnostico(), { headers: { "Cache-Control": "no-store" } });
}
