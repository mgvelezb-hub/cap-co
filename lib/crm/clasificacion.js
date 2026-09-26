// Clasificación de un lead: reglas primero, IA como segunda opinión, humano como última palabra.
//   · Regla con confianza alta y la IA de acuerdo (o sin IA): se aplica sola.
//   · Regla con confianza alta y la IA en desacuerdo: se aplica la regla y el caso va a revisión.
//   · Regla con confianza media o baja: queda "revision" y la sugerencia espera aprobación.
//   · Lo que decide un humano no lo pisa el sistema; solo "reclasificar" a mano lo reabre.

import { query, conTransaccion } from "../db/client.js";
import { clasificarPorReglas, CLASES } from "./reglas.js";
import { sugerirConIA } from "./ia.js";
import { comisionCambio } from "../chatbot/comision.js";
import { registrarEventoLead } from "./eventos.js";
import { crearTarea, cerrarTareasDeLead } from "./tareas.js";

/** Decide qué se aplica a partir de reglas e IA (pura, con pruebas). */
export function decidir(regla, ia) {
  const sugerencia = ia
    ? { clasificacion: ia.clasificacion, motivo: ia.motivo, confianza: ia.confianza, fuente: "ia" }
    : { clasificacion: regla.clasificacion, motivo: regla.motivo, confianza: regla.confianza === "alta" ? 90 : regla.confianza === "media" ? 60 : 30, fuente: "regla" };
  if (regla.confianza === "alta") {
    const deAcuerdo = !ia || ia.clasificacion === regla.clasificacion;
    return {
      clasificacion: regla.clasificacion,
      fuente: "regla",
      motivo: regla.motivo,
      revisionPendiente: !deAcuerdo,
      sugerencia: deAcuerdo ? null : sugerencia,
    };
  }
  return { clasificacion: "revision", fuente: "regla", motivo: regla.motivo, revisionPendiente: true, sugerencia };
}

async function leerLead(codigo, db = { query }) {
  const { rows } = await db.query(`SELECT * FROM lead WHERE codigo = $1`, [codigo]);
  return rows[0] || null;
}

/**
 * Clasifica (o reclasifica) un lead y deja las tareas que siguen.
 * @param {{usarIA?: boolean, forzar?: boolean, usuario?: string, iaCliente?: object}} opciones
 */
export async function clasificarLead(codigo, { usarIA = true, forzar = false, usuario = null, iaCliente = null } = {}) {
  const lead = await leerLead(codigo);
  if (!lead) return { ok: false, motivo: "no_existe" };
  if (lead.clasificacion_fuente === "humano" && !forzar) return { ok: true, sinCambio: true, clasificacion: lead.clasificacion };
  const comision = lead.ahorro !== null ? comisionCambio(Number(lead.ahorro)) : null;
  const regla = clasificarPorReglas(lead, { comision });
  const ia = usarIA ? await sugerirConIA(lead, { comision, cliente: iaCliente }) : null;
  const d = decidir(regla, ia);
  const propension = ia ? Math.round((ia.propensionTaller + regla.propensionTaller) / 2) : regla.propensionTaller;

  await conTransaccion(async (c) => {
    await c.query(
      `UPDATE lead SET clasificacion = $2, clasificacion_fuente = $3, clasificacion_motivo = $4, clasificacion_at = now(),
              revision_pendiente = $5, sugerencia = $6, propension_taller = $7,
              perfil_ia = COALESCE($8, perfil_ia), actualizado_at = now()
        WHERE codigo = $1`,
      [codigo, d.clasificacion, d.fuente, d.motivo, d.revisionPendiente, d.sugerencia ? JSON.stringify(d.sugerencia) : null, propension, ia ? JSON.stringify(ia.perfil) : null],
    );
    await registrarEventoLead(codigo, "clasificacion", {
      canal: "sistema",
      usuario,
      detalle: { clasificacion: d.clasificacion, motivo: d.motivo, revision: d.revisionPendiente, ia: ia?.clasificacion ?? null },
    }, c);
    await tareasPorClasificacion({ ...lead, clasificacion: d.clasificacion, revision_pendiente: d.revisionPendiente, propension_taller: propension }, c);
  });
  return { ok: true, clasificacion: d.clasificacion, revisionPendiente: d.revisionPendiente, sugerencia: d.sugerencia, ia: Boolean(ia) };
}

/** Tareas que deja cada clasificación (solo si la persona dejó datos o hay que revisar). */
async function tareasPorClasificacion(lead, db) {
  if (lead.revision_pendiente) {
    await crearTarea(lead.codigo, { tipo: "revisar", titulo: "Aprobar o cambiar la clasificación" }, db);
  }
  if (!lead.consent_at || lead.etapa !== "cita_solicitada") return;
  if (lead.clasificacion === "aplica_auto") {
    await crearTarea(lead.codigo, { tipo: "confirmar_cita", titulo: "Aplica: acordar y confirmar la cita del cambio" }, db);
  } else if (lead.clasificacion === "taller" || Number(lead.propension_taller) >= 70) {
    await crearTarea(lead.codigo, { tipo: "whatsapp", titulo: "Ofrecer el taller de restauración", detalle: { plantilla: "taller" } }, db);
  }
}

/** Un asesor aprueba la sugerencia o pone otra clase. Esa decisión ya no la cambia el sistema. */
export async function aprobarClasificacion(codigo, { clasificacion, motivo = "", usuario }) {
  if (!CLASES.includes(clasificacion)) return { ok: false, motivo: "clasificacion_invalida" };
  const lead = await leerLead(codigo);
  if (!lead) return { ok: false, motivo: "no_existe" };
  await conTransaccion(async (c) => {
    await c.query(
      `UPDATE lead SET clasificacion = $2, clasificacion_fuente = 'humano', clasificacion_motivo = $3, clasificacion_at = now(),
              revision_pendiente = false, sugerencia = NULL, actualizado_at = now()
        WHERE codigo = $1`,
      [codigo, clasificacion, (motivo || lead.sugerencia?.motivo || lead.clasificacion_motivo || "Aprobada por el equipo").slice(0, 300)],
    );
    await registrarEventoLead(codigo, "clasificacion_aprobada", { canal: "sistema", usuario, detalle: { clasificacion, antes: lead.clasificacion } }, c);
    await cerrarTareasDeLead(codigo, usuario, ["revisar"], c);
    await tareasPorClasificacion({ ...lead, clasificacion, revision_pendiente: false }, c);
  });
  return { ok: true, clasificacion };
}

/** Cola de revisión: casos grises y desacuerdos regla–IA, los más viejos primero. */
export async function colaRevision(limite = 100) {
  const { rows } = await query(
    `SELECT codigo, perfil, resumen, probabilidad, institucion_origen, tasa_actual, tasa_oferta, ahorro, etapa, nombre,
            clasificacion, clasificacion_motivo, sugerencia, propension_taller, perfil_ia, created_at, consent_at
       FROM lead WHERE revision_pendiente ORDER BY created_at LIMIT $1`,
    [limite],
  );
  return rows;
}
