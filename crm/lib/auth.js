// Sesión del CRM: usuarios en crm_usuario (PBKDF2), sesión en una cookie HttpOnly con un JWT
// firmado (CRM_SESSION_SECRET). Se revisa en middleware.js (firma) y en requireSesion (usuario activo).

import "server-only";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT } from "jose";
import { query } from "@lib/db/client";
import { verificarSesion, COOKIE, secretoSesion } from "./sesion";

export const ITERACIONES = 210_000;

export function hashClave(clave, sal) {
  return pbkdf2Sync(clave, sal, ITERACIONES, 32, "sha256").toString("hex");
}

export function nuevaSal() {
  return randomBytes(16).toString("hex");
}

/** @returns {Promise<{usuario, nombre, rol} | null>} */
export async function verificarUsuario(usuario, clave) {
  const { rows } = await query(`SELECT usuario, nombre, rol, sal, hash, activo FROM crm_usuario WHERE usuario = $1`, [
    String(usuario || "").trim().toLowerCase(),
  ]);
  const u = rows[0];
  // Se calcula el hash aunque el usuario no exista: el tiempo no revela quién existe.
  const calculado = Buffer.from(hashClave(String(clave || ""), u?.sal || "sin-usuario"), "hex");
  const guardado = Buffer.from(u?.hash || "0".repeat(64), "hex");
  const igual = calculado.length === guardado.length && timingSafeEqual(calculado, guardado);
  if (!u || !u.activo || !igual) return null;
  await query(`UPDATE crm_usuario SET acceso_at = now() WHERE usuario = $1`, [u.usuario]);
  return { usuario: u.usuario, nombre: u.nombre, rol: u.rol };
}

export async function iniciarSesion(u) {
  const jwt = await new SignJWT({ nombre: u.nombre, rol: u.rol })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(u.usuario)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretoSesion());
  (await cookies()).set(COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 3600,
  });
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE);
}

/** Sesión vigente de un usuario activo, o redirige al login. */
export async function requireSesion({ rol = null } = {}) {
  const token = (await cookies()).get(COOKIE)?.value;
  const s = await verificarSesion(token);
  if (!s) redirect("/login");
  const { rows } = await query(`SELECT usuario, nombre, rol FROM crm_usuario WHERE usuario = $1 AND activo`, [s.usuario]);
  if (!rows[0]) redirect("/login");
  if (rol && rows[0].rol !== rol) redirect("/");
  return rows[0];
}
