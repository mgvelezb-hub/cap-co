// Sesión del CRM: usuarios en crm_usuario (PBKDF2), sesión en una cookie HttpOnly con un JWT
// firmado (CRM_SESSION_SECRET). Se revisa en middleware.js (firma) y en requireSesion (usuario activo y
// versión de sesión vigente: cerrar sesión sube la versión y deja sin valor todas las cookies anteriores).

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
  const { rows } = await query(`SELECT usuario, nombre, rol, sal, hash, activo, sesion_version FROM crm_usuario WHERE usuario = $1`, [
    String(usuario || "").trim().toLowerCase(),
  ]);
  const u = rows[0];
  // Se calcula el hash aunque el usuario no exista: el tiempo no revela quién existe.
  const calculado = Buffer.from(hashClave(String(clave || ""), u?.sal || "sin-usuario"), "hex");
  const guardado = Buffer.from(u?.hash || "0".repeat(64), "hex");
  const igual = calculado.length === guardado.length && timingSafeEqual(calculado, guardado);
  if (!u || !u.activo || !igual) return null;
  await query(`UPDATE crm_usuario SET acceso_at = now() WHERE usuario = $1`, [u.usuario]);
  return { usuario: u.usuario, nombre: u.nombre, rol: u.rol, ver: u.sesion_version };
}

export async function iniciarSesion(u) {
  const jwt = await new SignJWT({ nombre: u.nombre, rol: u.rol, ver: u.ver ?? 0 })
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

/** Cierra la sesión en este y en todos los dispositivos del usuario. */
export async function cerrarSesion() {
  const jar = await cookies();
  const s = await verificarSesion(jar.get(COOKIE)?.value);
  if (s) await query(`UPDATE crm_usuario SET sesion_version = sesion_version + 1 WHERE usuario = $1`, [s.usuario]);
  jar.delete(COOKIE);
}

/** Usuario activo de una sesión cuya versión sigue vigente, o null. */
export async function usuarioDeSesion(s) {
  if (!s) return null;
  const { rows } = await query(`SELECT usuario, nombre, rol, sesion_version FROM crm_usuario WHERE usuario = $1 AND activo`, [s.usuario]);
  const u = rows[0];
  if (!u || u.sesion_version !== s.ver) return null;
  return { usuario: u.usuario, nombre: u.nombre, rol: u.rol };
}

/** Sesión vigente de un usuario activo, o redirige al login. */
export async function requireSesion({ rol = null } = {}) {
  const token = (await cookies()).get(COOKIE)?.value;
  const u = await usuarioDeSesion(await verificarSesion(token));
  if (!u) redirect("/login");
  if (rol && u.rol !== rol) redirect("/");
  return u;
}
