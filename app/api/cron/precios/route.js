// GET /api/cron/precios — toma una fotografía de precios de metales y la guarda.
// Lo llama Vercel Cron dos veces al día entre semana (vercel.json; una ruta por horario,
// porque Vercel no registra dos crons con la misma ruta). Protegido con
// Authorization: Bearer <CRON_SECRET>, que Vercel agrega solo en las llamadas del cron.

import { obtenerPreciosUSD, obtenerTipoDeCambio, FUENTE } from "@/lib/precios/fuentes";
import { guardarFotografia } from "@/lib/precios/repo";
import { dbDisponible } from "@/lib/db/client";
import { registrarEvento } from "@/lib/alertas/eventos";
import { limpiarLimites } from "@/lib/chatbot/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sesionActual(ahora = new Date()) {
  const hora = Number(
    new Intl.DateTimeFormat("es-MX", { hour: "numeric", hour12: false, timeZone: "America/Mexico_City" }).format(ahora),
  );
  return hora < 12 ? "manana" : "tarde";
}

export async function GET(request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!dbDisponible()) {
    return Response.json({ error: "Base de datos no configurada." }, { status: 503 });
  }
  try {
    const [usd, fx] = await Promise.all([obtenerPreciosUSD(), obtenerTipoDeCambio()]);
    const pedida = new URL(request.url).searchParams.get("sesion");
    const sesion = ["manana", "tarde"].includes(pedida) ? pedida : sesionActual();
    const guardada = await guardarFotografia({ sesion, usd, fx, fuente: FUENTE });
    // Mantenimiento de una vez al día, aprovechando el cron de la mañana.
    if (sesion === "manana") await limpiarLimites();
    return Response.json({ ok: true, id: Number(guardada.id), capturado_at: guardada.capturado_at, usd, fx });
  } catch (err) {
    console.error("[precios] no se tomó la fotografía:", err.message);
    await registrarEvento("precios_fallo", "critico", err.message);
    return Response.json({ error: err.message }, { status: 502 });
  }
}
