"use server";

import { redirect } from "next/navigation";
import { darDeBaja, confirmarCorreo } from "@/lib/crm/seguimiento";

export async function confirmarBaja(formData) {
  const token = String(formData.get("token") || "");
  const codigo = await darDeBaja(token).catch(() => null);
  redirect(`/baja/${encodeURIComponent(token)}?hecho=${codigo ? "1" : "0"}`);
}

export async function confirmarMiCorreo(formData) {
  const token = String(formData.get("token") || "");
  const codigo = await confirmarCorreo(token).catch(() => null);
  redirect(`/confirmar/${encodeURIComponent(token)}?hecho=${codigo ? "1" : "0"}`);
}
