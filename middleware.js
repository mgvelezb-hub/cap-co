// Protege /admin/* y /api/admin/* con Basic auth, un usuario por persona.
//
// ADMIN_USUARIOS (Vercel): "usuario:rol:sal:hash;usuario2:rol:sal:hash", con rol "dueno" u
// "operador" y hash = sha256(sal + contraseña) en hex. Se genera con scripts/crear-usuario.mjs.
// Respaldo: ADMIN_USER / ADMIN_PASSWORD (rol dueno) mientras no exista ADMIN_USUARIOS.
// Pasa el usuario y el rol a las rutas en los headers x-panel-usuario y x-panel-rol.

import { NextResponse } from "next/server";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

function pedirCredenciales() {
  return new NextResponse("Acceso restringido.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="CAP & Co. interno", charset="UTF-8"' },
  });
}

function igualesSeguro(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i += 1) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

async function sha256Hex(texto) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verificar(usuario, clave) {
  const lista = (process.env.ADMIN_USUARIOS || "").split(";").map((x) => x.trim()).filter(Boolean);
  if (lista.length > 0) {
    for (const entrada of lista) {
      const [u, rol, sal, hash] = entrada.split(":");
      if (u === usuario && igualesSeguro(await sha256Hex(`${sal}${clave}`), hash || "")) return { usuario, rol };
    }
    return null;
  }
  const u = process.env.ADMIN_USER;
  const p = process.env.ADMIN_PASSWORD;
  if (u && p && igualesSeguro(usuario, u) && igualesSeguro(clave, p)) return { usuario, rol: "dueno" };
  return null;
}

export async function middleware(request) {
  if (!process.env.ADMIN_USUARIOS && !(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD)) {
    return new NextResponse("Vista interna no configurada (ADMIN_USUARIOS).", { status: 503 });
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
  const quien = await verificar(decodificado.slice(0, sep), decodificado.slice(sep + 1));
  if (!quien) return pedirCredenciales();

  const headers = new Headers(request.headers);
  headers.set("x-panel-usuario", quien.usuario);
  headers.set("x-panel-rol", quien.rol === "dueno" ? "dueno" : "operador");
  return NextResponse.next({ request: { headers } });
}
