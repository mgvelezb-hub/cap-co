// Todo el CRM pide sesión, salvo el login, el servidor MCP (token propio) y el cron (CRON_SECRET).
import { NextResponse } from "next/server";
import { verificarSesion, COOKIE } from "./lib/sesion";

export const config = {
  matcher: ["/((?!_next/|favicon|login|api/mcp|api/cron|\\.well-known).*)"],
};

export async function middleware(request) {
  const s = await verificarSesion(request.cookies.get(COOKIE)?.value);
  if (s) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  const url = new URL("/login", request.url);
  return NextResponse.redirect(url);
}
