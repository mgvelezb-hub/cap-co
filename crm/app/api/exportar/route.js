// GET /api/exportar — todos los leads en CSV. Solo el dueño; queda en la bitácora.
import { cookies } from "next/headers";
import { verificarSesion, COOKIE } from "@/lib/sesion";
import { usuarioDeSesion } from "@/lib/auth";
import { leadsCsv } from "@lib/crm/exportar";
import { registrarAccion } from "@lib/leads/bitacora";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await verificarSesion((await cookies()).get(COOKIE)?.value);
  const u = await usuarioDeSesion(s);
  if (!u) return Response.json({ error: "Sin sesión" }, { status: 401 });
  if (u.rol !== "dueno") return Response.json({ error: "Solo el dueño puede descargar los leads." }, { status: 403 });
  const { csv, filas } = await leadsCsv();
  await registrarAccion(u.usuario, "csv_descargado", null, { filas });
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-capco-${fecha}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
