// GET /api/citas/disponibles — horarios libres de los próximos días hábiles (lun–vie 9–17 h CDMX).

import { disponibilidad } from "@/lib/agenda/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const dias = await disponibilidad();
  return Response.json(
    { dias: dias.map((d) => ({ fecha: d.fecha, horas: d.horas.map((h) => h.toISOString()) })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
