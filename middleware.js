// Protege la vista interna /admin/* con Basic auth (ADMIN_USER / ADMIN_PASSWORD).
// El navegador muestra su propio diálogo de usuario y contraseña.

import { NextResponse } from "next/server";

export const config = {
  matcher: ["/admin/:path*"],
};

function pedirCredenciales() {
  return new NextResponse("Acceso restringido.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="CAP & Co. interno", charset="UTF-8"' },
  });
}

export function middleware(request) {
  const usuario = process.env.ADMIN_USER;
  const clave = process.env.ADMIN_PASSWORD;
  if (!usuario || !clave) {
    return new NextResponse("Vista interna no configurada (ADMIN_USER / ADMIN_PASSWORD).", { status: 503 });
  }

  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Basic ")) return pedirCredenciales();

  let decodificado = "";
  try {
    decodificado = atob(auth.slice(6));
  } catch {
    return pedirCredenciales();
  }
  const sep = decodificado.indexOf(":");
  const u = decodificado.slice(0, sep);
  const p = decodificado.slice(sep + 1);
  if (u !== usuario || p !== clave) return pedirCredenciales();

  return NextResponse.next();
}
