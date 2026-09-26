// Cron del CRM (días hábiles, 9:30 y 13:30 CDMX): pasos de seguimiento que tocan, y
// clasificación con IA de los leads con datos que aún no la tienen.
import { correrSeguimiento } from "@lib/crm/seguimiento";
import { clasificarLead } from "@lib/crm/clasificacion";
import { query } from "@lib/db/client";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const hechos = await correrSeguimiento();
  const { rows } = await query(
    `SELECT codigo FROM lead
      WHERE consent_at IS NOT NULL AND perfil_ia IS NULL AND coalesce(clasificacion_fuente, '') <> 'humano'
        AND etapa NOT IN ('descartado') ORDER BY consent_at DESC LIMIT 20`,
  );
  let clasificados = 0;
  for (const { codigo } of rows) {
    const r = await clasificarLead(codigo, { usarIA: true }).catch(() => null);
    if (r?.ok) clasificados += 1;
  }
  // Leads que llegaron antes del CRM o sin clasificar: solo reglas (sin costo).
  const sinClase = await query(`SELECT codigo FROM lead WHERE clasificacion IS NULL ORDER BY created_at DESC LIMIT 200`);
  for (const { codigo } of sinClase.rows) {
    const r = await clasificarLead(codigo, { usarIA: false }).catch(() => null);
    if (r?.ok) clasificados += 1;
  }
  return Response.json({ ok: true, seguimiento: hechos.length, clasificados });
}
