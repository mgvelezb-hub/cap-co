// GET /v/<codigo> — link corto por video (TikTok solo permite un link en la biografía: cada video
// dice su código en pantalla, p. ej. casa-ap.com/v/refrendo). Redirige a la home con la campaña,
// para que el panel sepa de qué video vino la gente.

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const { codigo } = await params;
  const destino = new URL("/", request.url);
  if (/^[a-z0-9-]{1,40}$/i.test(codigo)) {
    destino.searchParams.set("utm_source", "tiktok");
    destino.searchParams.set("utm_medium", "video");
    destino.searchParams.set("utm_campaign", codigo.toLowerCase());
  }
  return Response.redirect(destino, 307);
}
