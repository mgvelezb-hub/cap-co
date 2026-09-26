// GET /api/salud — estado del sistema, público y sin secretos. Sirve para un monitor externo
// (por ejemplo, UptimeRobot) y para el panel. 200 si todo bien, 503 si algo crítico está mal.

import { dbDisponible } from "@/lib/db/client";
import { ultimaFotografia } from "@/lib/precios/repo";
import { fotografiaVigente } from "@/lib/precios/calculo";
import { eventosRecientes } from "@/lib/alertas/eventos";
import { correoConfigurado } from "@/lib/alertas/notificar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const problemas = [];
  let precio = null;
  let eventos = [];
  if (!process.env.ANTHROPIC_API_KEY) problemas.push("sin_llave_anthropic");
  if (!dbDisponible()) {
    problemas.push("sin_base_de_datos");
  } else {
    try {
      const foto = await ultimaFotografia();
      precio = foto
        ? { capturado_at: foto.capturadoAt, edad_horas: Math.round((Date.now() - new Date(foto.capturadoAt)) / 36e5) }
        : null;
      if (!fotografiaVigente(foto)) problemas.push("precios_viejos");
      eventos = await eventosRecientes({ horas: 1, limite: 50 });
    } catch {
      problemas.push("base_de_datos_no_responde");
    }
  }
  const criticos = eventos.filter((e) => e.nivel === "critico").map((e) => e.tipo);
  for (const t of new Set(criticos)) problemas.push(t);
  const estado = problemas.length === 0 ? "ok" : "degradado";
  return Response.json(
    {
      estado,
      problemas,
      precio,
      errores_ultima_hora: eventos.length,
      alertas_por_correo: correoConfigurado(),
      revisado_at: new Date().toISOString(),
    },
    { status: estado === "ok" ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
