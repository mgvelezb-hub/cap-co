// Verificación del JWT de sesión. Sin dependencias de Node: la usa también el middleware.
import { jwtVerify } from "jose";

export const COOKIE = "crm_sesion";

// En desarrollo hay un secreto fijo: el middleware (Edge) y las páginas (Node) corren en
// procesos distintos y deben firmar con el mismo. En producción es obligatorio configurarlo.
const SECRETO_DESARROLLO = "solo-desarrollo-local-capco-crm-no-usar-en-produccion";

export function secretoSesion() {
  const s = process.env.CRM_SESSION_SECRET;
  if (s && s.length >= 32) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV === "production") throw new Error("Falta CRM_SESSION_SECRET (mínimo 32 caracteres)");
  return new TextEncoder().encode(SECRETO_DESARROLLO);
}

export async function verificarSesion(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretoSesion(), { algorithms: ["HS256"] });
    return { usuario: payload.sub, nombre: payload.nombre, rol: payload.rol };
  } catch {
    return null;
  }
}
