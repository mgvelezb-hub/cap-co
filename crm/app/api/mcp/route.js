// Servidor MCP del CRM (Streamable HTTP, sin estado). Se autentica con un token personal que
// se crea en Ajustes (vence a los 90 días, se revoca ahí mismo).
//
// Claude Code:
//   claude mcp add --transport http capco-crm https://<dominio-del-crm>/api/mcp \
//     --header "Authorization: Bearer capco_…"
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registrarHerramientas } from "@/lib/mcp";
import { usuarioDeToken } from "@/lib/tokens";

export const runtime = "nodejs";

const handler = createMcpHandler(registrarHerramientas, {
  serverInfo: { name: "capco-crm", version: "1.0.0" },
  instructions:
    "CRM de CAP & Co. (asesoría prendaria en CDMX; no presta dinero, cobra comisión por el cambio de boleta). " +
    "Leads del sitio casa-ap.com con clasificación (aplica_auto, revision, no_aplica, taller), días sin contestar, tareas, citas y checklist del cambio. " +
    "Los datos de contacto son personales: úsalos solo para el trabajo que pide el usuario. " +
    "Antes de aprobar clasificaciones, descartar leads o mover citas, confirma con el usuario si no lo pidió explícitamente.",
});

const autenticado = withMcpAuth(
  handler,
  async (req) => {
    const u = await usuarioDeToken(req.headers.get("authorization"));
    return u ? { token: "pat", clientId: u.usuario, scopes: [], extra: { usuario: u.usuario, nombre: u.nombre, rol: u.rol } } : undefined;
  },
  { required: true },
);

export { autenticado as GET, autenticado as POST, autenticado as DELETE };
