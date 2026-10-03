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
    "CRM de CAP & Co. (asesoría prendaria en CDMX; no presta dinero; revisar y comparar es gratis; ninguna casa de empeño le paga; si la persona se cambia, la comisión es 7 % del ahorro dado por escrito, solo si el cambio se concreta, y 0 % por promoción en cambios concretados hasta el 30-abr-2027). " +
    "Leads del sitio casa-ap.com con clasificación (aplica_auto, revision, no_aplica, taller), días sin contestar, tareas, citas y checklist del cambio. " +
    "Por defecto las herramientas no devuelven nombre ni teléfono; pide incluir_contacto solo si el usuario los necesita. Cada consulta queda en la bitácora. " +
    "Antes de aprobar clasificaciones, descartar leads o mover citas, confirma con el usuario si no lo pidió explícitamente.",
});

const autenticado = withMcpAuth(
  handler,
  async (req) => {
    const u = await usuarioDeToken(req.headers.get("authorization"));
    // El acceso de Claude a los leads es solo del dueño (tokens de asesores ya no sirven).
    return u && u.rol === "dueno" ? { token: "pat", clientId: u.usuario, scopes: [], extra: { usuario: u.usuario, nombre: u.nombre, rol: u.rol } } : undefined;
  },
  { required: true },
);

export { autenticado as GET, autenticado as POST, autenticado as DELETE };
