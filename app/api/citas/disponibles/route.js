// GET /api/citas/disponibles — en modo "citas", horarios libres (lun–vie 9–17 h CDMX); en modo
// "llamada", días y franjas para que un asesor llame a acordar la cita.

import { disponibilidad } from "@/lib/agenda/repo";
import { franjasPosibles, modoAgenda, FRANJAS } from "@/lib/agenda/horarios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (modoAgenda() === "llamada") {
    const dias = franjasPosibles().map((d) => ({
      fecha: d.fecha,
      franjas: d.franjas.map((f) => ({ franja: f.franja, inicio: f.inicio.toISOString(), texto: FRANJAS[f.franja].texto })),
    }));
    return Response.json({ modo: "llamada", dias }, { headers });
  }
  const dias = await disponibilidad();
  return Response.json(
    { modo: "citas", dias: dias.map((d) => ({ fecha: d.fecha, horas: d.horas.map((h) => h.toISOString()) })) },
    { headers },
  );
}
