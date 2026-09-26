"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { verificarUsuario, iniciarSesion } from "@/lib/auth";
import { permitir, hashIp } from "@lib/chatbot/ratelimit";

export async function entrar(formData) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || "sin-ip";
  if (!(await permitir("login", hashIp(ip)))) redirect("/login?error=limite");
  const u = await verificarUsuario(formData.get("usuario"), formData.get("clave"));
  if (!u) redirect("/login?error=1");
  await iniciarSesion(u);
  redirect("/");
}
