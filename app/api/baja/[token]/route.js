// POST /api/baja/<token> — baja de un clic desde el cliente de correo (List-Unsubscribe-Post,
// RFC 8058). Solo POST: un GET (escáner de enlaces) no da de baja a nadie.
import { darDeBaja } from "@/lib/crm/seguimiento";

export const runtime = "nodejs";

export async function POST(_request, { params }) {
  const { token } = await params;
  await darDeBaja(token).catch(() => null);
  return new Response(null, { status: 200 });
}
