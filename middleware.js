// Protege /admin/* y /api/admin/* con Basic auth, un usuario por persona.
//
// ADMIN_USUARIOS (Vercel): "usuario:rol:sal:hash;usuario2:rol:sal:hash", con rol "dueno" u
// "operador" y hash = PBKDF2-SHA256(contraseña, sal, 100 000 iteraciones) en hex. Se genera con
// scripts/crear-usuario.mjs. Tras 10 intentos fallidos en 15 min desde una IP, responde 429
// (contador por instancia; el freno fuerte es la regla de Vercel Firewall del RUNBOOK).
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

const ITERACIONES = 100_000;
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function pbkdf2Hex(clave, sal) {
  const llave = await crypto.subtle.importKey("raw", new TextEncoder().encode(clave), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(sal), iterations: ITERACIONES },
    llave,
    256,
  );
  return hex(bits);
}

// Basic auth reenvía la contraseña en cada petición: se recuerda 5 min el resultado de un
// encabezado ya verificado (por su huella SHA-256) para no pagar PBKDF2 en cada clic.
const verificados = new Map();
const fallos = new Map();
const VENTANA_MS = 15 * 60_000;
const MAX_FALLOS = 10;

async function huella(texto) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto)));
}

function bloqueado(ip, ahora) {
  const f = fallos.get(ip);
  return Boolean(f && ahora - f.desde < VENTANA_MS && f.n >= MAX_FALLOS);
}

function anotarFallo(ip, ahora) {
  const f = fallos.get(ip);
  if (!f || ahora - f.desde >= VENTANA_MS) fallos.set(ip, { desde: ahora, n: 1 });
  else f.n += 1;
  if (fallos.size > 5000) fallos.clear();
}

async function verificar(usuario, clave) {
  const lista = (process.env.ADMIN_USUARIOS || "").split(";").map((x) => x.trim()).filter(Boolean);
  if (lista.length > 0) {
    const entrada = lista.map((e) => e.split(":")).find(([u]) => u === usuario);
    // Se calcula el hash aunque el usuario no exista, para no revelar por tiempo cuáles existen.
    const [, rol, sal, hash] = entrada || [null, null, "sin-usuario", ""];
    const calculado = await pbkdf2Hex(clave, sal);
    return entrada && igualesSeguro(calculado, hash || "") ? { usuario, rol } : null;
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
    // Basic auth viaja en UTF-8: atob da bytes, hay que decodificarlos (contraseñas con ñ o acentos).
    decodificado = new TextDecoder().decode(Uint8Array.from(atob(auth.slice(6)), (ch) => ch.charCodeAt(0)));
  } catch {
    return pedirCredenciales();
  }
  const ahora = Date.now();
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "sin-ip";
  if (bloqueado(ip, ahora)) return new NextResponse("Demasiados intentos. Espera 15 minutos.", { status: 429 });
  const clave = await huella(auth);
  let quien = null;
  const recordado = verificados.get(clave);
  if (recordado && ahora - recordado.en < 5 * 60_000) {
    quien = recordado.quien;
  } else {
    const sep = decodificado.indexOf(":");
    quien = sep > 0 ? await verificar(decodificado.slice(0, sep), decodificado.slice(sep + 1)) : null;
    if (quien) {
      if (verificados.size > 100) verificados.clear();
      verificados.set(clave, { quien, en: ahora });
    }
  }
  if (!quien) {
    anotarFallo(ip, ahora);
    return pedirCredenciales();
  }

  const headers = new Headers(request.headers);
  headers.set("x-panel-usuario", quien.usuario);
  headers.set("x-panel-rol", quien.rol === "dueno" ? "dueno" : "operador");
  return NextResponse.next({ request: { headers } });
}
