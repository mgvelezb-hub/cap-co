"use server";

// Acciones del CRM. Cada una revisa la sesión y llama al mismo servicio que usa el servidor MCP.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSesion, cerrarSesion } from "@/lib/auth";
import { crearToken, revocarToken } from "@/lib/tokens";
import { registrarAccion, actualizarCaso, marcarTraspaso } from "@lib/crm/leads";
import { clasificarLead, aprobarClasificacion } from "@lib/crm/clasificacion";
import { completarTarea } from "@lib/crm/tareas";
import { actualizarCita } from "@lib/agenda/repo";
import { registrarAccion as bitacora } from "@lib/leads/bitacora";
import { query } from "@lib/db/client";

const texto = (f, k) => {
  const v = f.get(k);
  return typeof v === "string" ? v : "";
};

function refrescar(codigo) {
  revalidatePath("/");
  revalidatePath("/leads");
  if (codigo) revalidatePath(`/leads/${codigo}`);
}

export async function accionContacto(f) {
  const s = await requireSesion();
  const codigo = texto(f, "codigo");
  const tareaId = texto(f, "tareaId");
  const r = await registrarAccion(codigo, {
    tipo: texto(f, "tipo"),
    nota: texto(f, "nota"),
    plantilla: texto(f, "plantilla") || null,
    tareaId: /^\d+$/.test(tareaId) ? Number(tareaId) : null,
    usuario: s.usuario,
  });
  refrescar(codigo);
  return r;
}

export async function accionReclasificar(f) {
  const s = await requireSesion();
  const codigo = texto(f, "codigo");
  await clasificarLead(codigo, { usarIA: true, forzar: true, usuario: s.usuario });
  refrescar(codigo);
  revalidatePath("/revision");
}

export async function accionAprobar(f) {
  const s = await requireSesion();
  const codigo = texto(f, "codigo");
  await aprobarClasificacion(codigo, { clasificacion: texto(f, "clasificacion"), motivo: texto(f, "motivo"), usuario: s.usuario });
  refrescar(codigo);
  revalidatePath("/revision");
}

export async function accionCaso(f) {
  const s = await requireSesion();
  const codigo = texto(f, "codigo");
  const cambios = {};
  for (const k of ["etapa", "notas", "casa_destino", "motivo_descarte", "asesor", "comision_mxn"]) {
    if (f.has(k)) cambios[k] = texto(f, k);
  }
  if (cambios.etapa === "") delete cambios.etapa;
  const r = await actualizarCaso(codigo, cambios, s.usuario);
  if (r.ok) await bitacora(s.usuario, "lead_actualizado", codigo, { ...cambios, notas: cambios.notas !== undefined ? "(editadas)" : undefined });
  refrescar(codigo);
  return r;
}

export async function accionTraspaso(f) {
  const s = await requireSesion();
  const codigo = texto(f, "codigo");
  await marcarTraspaso(codigo, { paso: texto(f, "paso"), hecho: texto(f, "hecho") === "1", usuario: s.usuario });
  refrescar(codigo);
  revalidatePath("/citas");
}

export async function accionTarea(f) {
  const s = await requireSesion();
  const t = await completarTarea(Number(texto(f, "id")), s.usuario);
  refrescar(t?.lead_codigo);
}

export async function accionCita(f) {
  const s = await requireSesion();
  const id = Number(texto(f, "id"));
  const cambios = {};
  if (texto(f, "estado")) cambios.estado = texto(f, "estado");
  if (f.has("lugar")) cambios.lugar = texto(f, "lugar");
  const dia = texto(f, "dia");
  const hora = texto(f, "hora");
  if (dia && hora) {
    const [a, m, d] = dia.split("-").map(Number);
    cambios.inicio = new Date(Date.UTC(a, m - 1, d, Number(hora) + 6)).toISOString(); // CDMX = UTC−6
  }
  const r = await actualizarCita(id, cambios);
  if (r.ok) await bitacora(s.usuario, "cita_actualizada", r.cita.lead_codigo, cambios);
  refrescar(r.cita?.lead_codigo);
  revalidatePath("/citas");
  return r;
}

export async function accionCrearToken(_previo, f) {
  const s = await requireSesion();
  const token = await crearToken(s.usuario, texto(f, "nombre") || "Claude");
  revalidatePath("/ajustes");
  return { token };
}

export async function accionRevocarToken(f) {
  const s = await requireSesion();
  await revocarToken(Number(texto(f, "id")), s.usuario);
  revalidatePath("/ajustes");
}

export async function accionUsuarioActivo(f) {
  await requireSesion({ rol: "dueno" });
  await query(`UPDATE crm_usuario SET activo = $2 WHERE usuario = $1`, [texto(f, "usuario"), texto(f, "activo") === "1"]);
  revalidatePath("/ajustes");
}

export async function salir() {
  await cerrarSesion();
  redirect("/login");
}
