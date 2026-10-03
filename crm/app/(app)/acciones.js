"use server";

// Acciones del CRM. Cada una revisa la sesión (y el rol cuando toca dinero, datos o tokens),
// llama al mismo servicio que usa el servidor MCP y devuelve {ok, mensaje} en español para que
// la pantalla confirme lo que pasó.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSesion, cerrarSesion } from "@/lib/auth";
import { crearToken, revocarToken } from "@/lib/tokens";
import {
  registrarAccion, actualizarCaso, marcarTraspaso, asignarAsesor, marcarNoContactar, anonimizarLead, registrarCobro, puedeVerLead,
} from "@lib/crm/leads";
import { clasificarLead, aprobarClasificacion } from "@lib/crm/clasificacion";
import { completarTarea } from "@lib/crm/tareas";
import { actualizarCita, acordarCitaNueva } from "@lib/agenda/repo";
import { crearLeadManual } from "@lib/crm/leads";
import { registrarAccion as bitacora } from "@lib/leads/bitacora";
import { query } from "@lib/db/client";

const texto = (f, k) => {
  const v = f.get(k);
  return typeof v === "string" ? v.trim() : "";
};

const MOTIVOS = {
  no_existe: "No encontramos ese caso.",
  accion_invalida: "Esa acción no existe.",
  nota_vacia: "Escribe la nota antes de guardarla.",
  etapa_invalida: "Etapa no válida.",
  comision_invalida: "El monto debe ser un número en pesos, por ejemplo 1500 o 1500.50.",
  ahorro_invalido: "Escribe el ahorro final que se le dio por escrito a la persona, mayor a cero.",
  clasificacion_invalida: "Clasificación no válida.",
  paso_invalido: "Paso no válido.",
  usa_registrar_cobro: "El cierre se registra con el ahorro dado por escrito en la sección «Cobro».",
  ocupado: "Ese horario ya está lleno.",
  lead_con_otra_cita: "Esta persona ya tiene otra cita activa.",
  horario_invalido: "Horario fuera de lunes a viernes, 9:00 a 16:00.",
  estado_invalido: "Estado no válido.",
  lugar_invalido: "El lugar es demasiado largo.",
  asesor_invalido: "Ese asesor no existe o está desactivado.",
  monto_invalido: "El monto debe ser mayor a cero.",
  metodo_invalido: "Elige cómo se cobró la comisión.",
  fecha_invalida: "Revisa la fecha del cobro.",
  solo_dueno: "Solo el dueño puede hacer esto.",
  caso_cerrado: "El caso está cerrado (descartado o cobrado).",
  ya_cobrado: "Este caso ya tiene su cobro registrado.",
  sin_cambio_concretado: "El cobro se registra cuando el cambio está concretado (boleta nueva firmada).",
  monto_del_ahorro: "La comisión sale del ahorro dado por escrito; su monto no se edita a mano.",
  sin_consentimiento: "Confirma que la persona aceptó el aviso de privacidad.",
  canal_invalido: "Elige por dónde llegó.",
};

/** Sesión que puede trabajar el caso: el dueño, todos; un asesor, solo los que tiene a su cargo. */
async function sesionDelCaso(codigo) {
  const s = await requireSesion();
  return (await puedeVerLead(codigo, s)) ? s : null;
}

/** Caso al que pertenece una tarea o una cita, para revisar el acceso antes de tocarla. */
async function casoDe(tabla, id) {
  if (!Number.isSafeInteger(id)) return null;
  const { rows } = await query(`SELECT lead_codigo FROM ${tabla === "cita" ? "cita" : "crm_tarea"} WHERE id = $1`, [id]);
  return rows[0]?.lead_codigo ?? null;
}

function resultado(r, exito) {
  if (r?.ok === false) return { ok: false, mensaje: MOTIVOS[r.motivo] || `No se pudo (${r.motivo}).` };
  return { ok: true, mensaje: exito };
}

function refrescar(codigo) {
  revalidatePath("/");
  revalidatePath("/leads");
  if (codigo) revalidatePath(`/leads/${codigo}`);
}

const NOMBRE_ACCION = {
  whatsapp_enviado: "WhatsApp registrado.",
  llamada_hecha: "Llamada registrada.",
  llamada_sin_respuesta: "Llamada sin respuesta registrada.",
  respondio: "Respuesta registrada.",
  nota: "Nota guardada.",
};

export async function accionContacto(_previo, f) {
  const codigo = texto(f, "codigo");
  const s = await sesionDelCaso(codigo);
  if (!s) return { ok: false, mensaje: MOTIVOS.no_existe };
  const tipo = texto(f, "tipo");
  const tareaId = texto(f, "tareaId");
  const r = await registrarAccion(codigo, {
    tipo,
    nota: texto(f, "nota"),
    plantilla: texto(f, "plantilla") || null,
    tareaId: /^\d+$/.test(tareaId) ? Number(tareaId) : null,
    usuario: s.usuario,
  });
  refrescar(codigo);
  return resultado(r, NOMBRE_ACCION[tipo] || "Guardado.");
}

export async function accionReclasificar(_previo, f) {
  const codigo = texto(f, "codigo");
  const s = await sesionDelCaso(codigo);
  if (!s) return { ok: false, mensaje: MOTIVOS.no_existe };
  const r = await clasificarLead(codigo, { usarIA: true, forzar: true, usuario: s.usuario });
  refrescar(codigo);
  revalidatePath("/revision");
  return resultado(r, r.ia ? "Clasificado de nuevo con reglas e IA." : "Clasificado de nuevo con reglas (la IA no respondió).");
}

export async function accionAprobar(_previo, f) {
  const codigo = texto(f, "codigo");
  const s = await sesionDelCaso(codigo);
  if (!s) return { ok: false, mensaje: MOTIVOS.no_existe };
  const r = await aprobarClasificacion(codigo, { clasificacion: texto(f, "clasificacion"), motivo: texto(f, "motivo"), usuario: s.usuario });
  refrescar(codigo);
  revalidatePath("/revision");
  return resultado(r, `Clasificación de ${codigo} aprobada.`);
}

export async function accionCaso(_previo, f) {
  const codigo = texto(f, "codigo");
  const s = await sesionDelCaso(codigo);
  if (!s) return { ok: false, mensaje: MOTIVOS.no_existe };
  const cambios = {};
  for (const k of ["etapa", "notas", "casa_destino", "motivo_descarte"]) {
    if (f.has(k)) cambios[k] = texto(f, k);
  }
  if (cambios.etapa === "") delete cambios.etapa;
  // La comisión es dinero: solo el dueño. La etapa "comisión cobrada" la cuida el servicio.
  if (f.has("comision_mxn") && texto(f, "comision_mxn") !== "") {
    if (s.rol !== "dueno") return { ok: false, mensaje: MOTIVOS.solo_dueno };
    cambios.comision_mxn = texto(f, "comision_mxn");
  }
  const r = await actualizarCaso(codigo, cambios, s.usuario, { rol: s.rol });
  if (r.ok) await bitacora(s.usuario, "lead_actualizado", codigo, { ...cambios, notas: cambios.notas !== undefined ? "(editadas)" : undefined });
  refrescar(codigo);
  return resultado(r, "Caso guardado.");
}

export async function accionDescartarRapido(_previo, f) {
  const codigo = texto(f, "codigo");
  const s = await sesionDelCaso(codigo);
  if (!s) return { ok: false, mensaje: MOTIVOS.no_existe };
  const motivo = texto(f, "motivo") || "Prueba o duplicado";
  const r = await actualizarCaso(codigo, { etapa: "descartado", motivo_descarte: motivo }, s.usuario, { rol: s.rol });
  if (r.ok) await bitacora(s.usuario, "lead_actualizado", codigo, { etapa: "descartado", motivo_descarte: motivo });
  refrescar(codigo);
  return resultado(r, `${codigo} descartado (${motivo.toLowerCase()}).`);
}

export async function accionAsignar(_previo, f) {
  const codigo = texto(f, "codigo");
  const s = await sesionDelCaso(codigo);
  if (!s) return { ok: false, mensaje: MOTIVOS.no_existe };
  const r = await asignarAsesor(codigo, texto(f, "asesor_usuario") || null, s.usuario);
  refrescar(codigo);
  return resultado(r, "Asesor asignado.");
}

export async function accionTraspaso(_previo, f) {
  const codigo = texto(f, "codigo");
  const s = await sesionDelCaso(codigo);
  if (!s) return { ok: false, mensaje: MOTIVOS.no_existe };
  const hecho = texto(f, "hecho") === "1";
  const r = await marcarTraspaso(codigo, { paso: texto(f, "paso"), hecho, usuario: s.usuario });
  refrescar(codigo);
  revalidatePath("/citas");
  return resultado(r, hecho ? "Paso marcado." : "Paso desmarcado.");
}

export async function accionCobro(_previo, f) {
  const s = await requireSesion();
  if (s.rol !== "dueno") return { ok: false, mensaje: MOTIVOS.solo_dueno };
  const codigo = texto(f, "codigo");
  const r = await registrarCobro(codigo, {
    ahorro: texto(f, "ahorro").replace(/[$,\s]/g, "") || null,
    folio: texto(f, "folio") || null,
    fecha: texto(f, "fecha") || null,
    metodo: texto(f, "metodo") || null,
    usuario: s.usuario,
  });
  if (r.ok) await bitacora(s.usuario, "cobro_registrado", codigo, { monto: r.monto, tasa: r.tasa, promocion: r.promocion, metodo: texto(f, "metodo") || null });
  refrescar(codigo);
  revalidatePath("/trafico");
  const dinero = r.monto?.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  return resultado(r, r.promocion ? "Caso cerrado: comisión de 0 % por promoción." : `Comisión registrada: ${dinero}.`);
}

export async function accionNoContactar(_previo, f) {
  const codigo = texto(f, "codigo");
  const s = await sesionDelCaso(codigo);
  if (!s) return { ok: false, mensaje: MOTIVOS.no_existe };
  const r = await marcarNoContactar(codigo, { usuario: s.usuario, nota: texto(f, "nota") });
  refrescar(codigo);
  return resultado(r, "Anotado: ya no se le contactará.");
}

export async function accionAnonimizar(_previo, f) {
  const s = await requireSesion();
  if (s.rol !== "dueno") return { ok: false, mensaje: MOTIVOS.solo_dueno };
  const codigo = texto(f, "codigo");
  if (texto(f, "confirmar") !== codigo) return { ok: false, mensaje: `Para confirmar, escribe el código ${codigo}.` };
  const r = await anonimizarLead(codigo, { usuario: s.usuario });
  if (r.ok) await bitacora(s.usuario, "lead_anonimizado", codigo, { motivo: "solicitud ARCO" });
  refrescar(codigo);
  return resultado(r, "Datos personales borrados. Queda el registro anónimo.");
}

export async function accionTarea(_previo, f) {
  const id = Number(texto(f, "id"));
  const s = await sesionDelCaso(await casoDe("tarea", id));
  if (!s) return { ok: false, mensaje: "Esa tarea ya estaba cerrada." };
  const t = await completarTarea(id, s.usuario);
  refrescar(t?.lead_codigo);
  return t ? { ok: true, mensaje: "Tarea hecha." } : { ok: false, mensaje: "Esa tarea ya estaba cerrada." };
}

export async function accionCita(_previo, f) {
  const id = Number(texto(f, "id"));
  const s = await sesionDelCaso(await casoDe("cita", id));
  if (!s) return { ok: false, mensaje: MOTIVOS.no_existe };
  const cambios = {};
  if (texto(f, "estado")) cambios.estado = texto(f, "estado");
  if (f.has("lugar")) cambios.lugar = texto(f, "lugar");
  if (texto(f, "nota")) cambios.nota = texto(f, "nota");
  cambios.usuario = s.usuario;
  const dia = texto(f, "dia");
  const hora = texto(f, "hora");
  if (dia || hora) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^(9|1[0-6])$/.test(hora)) return { ok: false, mensaje: "Elige día y hora para mover la cita." };
    const [a, m, d] = dia.split("-").map(Number);
    cambios.inicio = new Date(Date.UTC(a, m - 1, d, Number(hora) + 6)).toISOString(); // CDMX = UTC−6
  }
  const r = await actualizarCita(id, cambios);
  if (r.ok) await bitacora(s.usuario, "cita_actualizada", r.cita.lead_codigo, { ...cambios, nota: cambios.nota ? "(con nota)" : undefined, usuario: undefined });
  refrescar(r.cita?.lead_codigo);
  revalidatePath("/citas");
  return resultado(r, cambios.inicio ? "Cita en su nuevo horario." : "Cita actualizada.");
}

export async function accionAcordarCita(_previo, f) {
  const codigo = texto(f, "codigo");
  const s = await sesionDelCaso(codigo);
  if (!s) return { ok: false, mensaje: MOTIVOS.no_existe };
  const dia = texto(f, "dia");
  const hora = texto(f, "hora");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^(9|1[0-6])$/.test(hora)) return { ok: false, mensaje: "Elige día y hora de la cita." };
  const [a, m, d] = dia.split("-").map(Number);
  const inicio = new Date(Date.UTC(a, m - 1, d, Number(hora) + 6)).toISOString(); // CDMX = UTC−6
  const r = await acordarCitaNueva({ codigo, inicio, lugar: texto(f, "lugar") || null, usuario: s.usuario });
  if (r.ok) await bitacora(s.usuario, "cita_acordada", codigo, { inicio });
  refrescar(codigo);
  revalidatePath("/citas");
  return resultado(r, "Cita acordada y confirmada.");
}

export async function accionNuevoLead(_previo, f) {
  const s = await requireSesion();
  const r = await crearLeadManual({
    nombre: texto(f, "nombre"),
    telefono: texto(f, "telefono"),
    email: texto(f, "email") || null,
    perfil: texto(f, "perfil"),
    resumen: texto(f, "resumen"),
    canal: texto(f, "canal"),
    consentimiento: texto(f, "consentimiento") === "1",
    usuario: s.usuario,
  });
  if (!r.ok) return { ok: false, mensaje: r.error || MOTIVOS[r.motivo] || `No se pudo (${r.motivo}).` };
  await bitacora(s.usuario, "lead_alta_manual", r.codigo, { canal: texto(f, "canal") });
  revalidatePath("/leads");
  redirect(`/leads/${r.codigo}`);
}

export async function accionGasto(_previo, f) {
  const s = await requireSesion();
  if (s.rol !== "dueno") return { ok: false, mensaje: MOTIVOS.solo_dueno };
  const fecha = texto(f, "fecha");
  const campana = texto(f, "utm_campaign").toLowerCase().slice(0, 80);
  const monto = Number(texto(f, "monto").replace(/[$,\s]/g, ""));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !campana || !Number.isFinite(monto) || monto < 0 || monto > 10_000_000) {
    return { ok: false, mensaje: "Revisa fecha, campaña y monto." };
  }
  await query(`INSERT INTO gasto_campana (fecha, utm_campaign, monto_mxn, nota, creado_por) VALUES ($1, $2, $3, $4, $5)`, [
    fecha, campana, monto, texto(f, "nota").slice(0, 200) || null, s.usuario,
  ]);
  await bitacora(s.usuario, "gasto_capturado", campana, { fecha, monto });
  revalidatePath("/trafico");
  return { ok: true, mensaje: "Gasto registrado." };
}

export async function accionCrearToken(_previo, f) {
  const s = await requireSesion();
  if (s.rol !== "dueno") return { ok: false, mensaje: MOTIVOS.solo_dueno };
  const token = await crearToken(s.usuario, texto(f, "nombre") || "Claude");
  await bitacora(s.usuario, "token_creado", null, { nombre: texto(f, "nombre") || "Claude" });
  revalidatePath("/ajustes");
  return { ok: true, token };
}

export async function accionRevocarToken(_previo, f) {
  const s = await requireSesion();
  await revocarToken(Number(texto(f, "id")), s.usuario);
  revalidatePath("/ajustes");
  return { ok: true, mensaje: "Token revocado." };
}

export async function accionUsuarioActivo(_previo, f) {
  const s = await requireSesion({ rol: "dueno" });
  const usuario = texto(f, "usuario");
  const activar = texto(f, "activo") === "1";
  if (usuario === s.usuario) return { ok: false, mensaje: "No puedes desactivarte a ti mismo." };
  if (!activar) {
    const d = await query(`SELECT count(*)::int AS n FROM crm_usuario WHERE rol = 'dueno' AND activo AND usuario <> $1`, [usuario]);
    if (d.rows[0].n === 0) return { ok: false, mensaje: "Debe quedar al menos un dueño activo." };
  }
  // Al desactivar se cierran sus sesiones: si se reactiva, las cookies de antes ya no sirven.
  await query(`UPDATE crm_usuario SET activo = $2, sesion_version = sesion_version + CASE WHEN $2 THEN 0 ELSE 1 END WHERE usuario = $1`, [usuario, activar]);
  await bitacora(s.usuario, "usuario_actualizado", usuario, { activo: activar });
  revalidatePath("/ajustes");
  return { ok: true, mensaje: activar ? "Usuario activado." : "Usuario desactivado." };
}

export async function accionRecibeLeads(_previo, f) {
  const s = await requireSesion({ rol: "dueno" });
  const usuario = texto(f, "usuario");
  await query(`UPDATE crm_usuario SET recibe_leads = $2 WHERE usuario = $1`, [usuario, texto(f, "recibe") === "1"]);
  await bitacora(s.usuario, "usuario_actualizado", usuario, { recibe_leads: texto(f, "recibe") === "1" });
  revalidatePath("/ajustes");
  return { ok: true, mensaje: "Reparto actualizado." };
}

/** El dueño cierra todas las sesiones abiertas de un usuario (teléfono perdido, salida del equipo). */
export async function accionCerrarSesiones(_previo, f) {
  const s = await requireSesion({ rol: "dueno" });
  const usuario = texto(f, "usuario");
  const r = await query(`UPDATE crm_usuario SET sesion_version = sesion_version + 1 WHERE usuario = $1`, [usuario]);
  if (r.rowCount === 0) return { ok: false, mensaje: "Ese usuario no existe." };
  await bitacora(s.usuario, "sesiones_cerradas", usuario, {});
  revalidatePath("/ajustes");
  return { ok: true, mensaje: "Sesiones cerradas: tendrá que volver a entrar." };
}

export async function salir() {
  await cerrarSesion();
  redirect("/login");
}
