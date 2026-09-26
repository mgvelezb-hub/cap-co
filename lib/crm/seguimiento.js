// Seguimiento automático: ejecuta el plan de seguimiento-plan.js. Lo corre el cron del CRM en
// días hábiles y, para el paso 0, el sitio en cuanto la persona deja sus datos.

import { randomBytes } from "node:crypto";
import { query } from "../db/client.js";
import { limiteAnticipacion } from "../agenda/horarios.js";
import { pasoPendiente, proximoSeguimiento, PASOS } from "./seguimiento-plan.js";
import { enviarCorreoLead } from "./correo.js";
import { registrarEventoLead } from "./eventos.js";
import { crearTarea } from "./tareas.js";

async function asegurarTokenBaja(lead) {
  if (lead.baja_token) return lead.baja_token;
  const token = randomBytes(16).toString("hex");
  await query(`UPDATE lead SET baja_token = COALESCE(baja_token, $2) WHERE codigo = $1`, [lead.codigo, token]);
  const { rows } = await query(`SELECT baja_token FROM lead WHERE codigo = $1`, [lead.codigo]);
  return rows[0].baja_token;
}

/** Ejecuta el paso pendiente de un lead, si hay. Devuelve qué hizo. */
export async function ejecutarPaso(lead, ahora = new Date(), opciones = {}) {
  const p = pasoPendiente(lead, ahora);
  if (!p) return null;
  // Se reclama el paso antes de mandar nada: si el sitio y el cron (o dos corridas del cron)
  // llegan a la vez, solo uno lo ejecuta.
  const siguiente = proximoSeguimiento(p.paso, ahora);
  const reclamo = await query(
    `UPDATE lead SET seguimiento_paso = $3, proximo_seguimiento_at = $4 WHERE codigo = $1 AND seguimiento_paso = $2 RETURNING codigo`,
    [lead.codigo, p.paso, p.paso + 1, siguiente],
  );
  if (reclamo.rowCount === 0) return null;
  const hecho = { codigo: lead.codigo, paso: p.paso, correo: null, tarea: null };
  // El correo de bienvenida va siempre (pide confirmar el correo); los recordatorios, solo a
  // correos confirmados, para que nadie use el formulario para mandar correos a terceros.
  const puedeCorreo = p.paso === 0 || Boolean(lead.email_confirmado_at);
  if (lead.email && p.correo && puedeCorreo) {
    const conToken = { ...lead, baja_token: await asegurarTokenBaja(lead) };
    const r = await enviarCorreoLead(conToken, p.correo, { ...opciones, idempotencia: `seg-${lead.codigo}-${p.paso}` });
    hecho.correo = r.enviado ? "enviado" : r.motivo;
    await registrarEventoLead(lead.codigo, r.enviado ? "correo_enviado" : "correo_fallido", {
      canal: "correo",
      detalle: { plantilla: p.correo, paso: p.paso, ...(r.enviado ? {} : { motivo: r.motivo }) },
    });
  }
  if (p.tarea && lead.telefono) {
    // Si pidió que le llamemos en una franja, el primer contacto es esa llamada (una sola tarea
    // en la cola, que vence al empezar la franja). Si no, WhatsApp en 2 horas hábiles.
    const llamada = p.paso === 0
      ? (await query(`SELECT inicio, franja FROM cita WHERE lead_codigo = $1 AND tipo = 'llamada' AND estado = 'reservada' ORDER BY creado_at DESC LIMIT 1`, [lead.codigo])).rows[0]
      : null;
    if (llamada) {
      const franja = { manana: "9:00 a 13:00", tarde: "13:00 a 17:00" }[llamada.franja] || "";
      await crearTarea(lead.codigo, { tipo: "llamar", titulo: `Llamar: pidió que le marquemos de ${franja}`, vence: llamada.inicio, detalle: { paso: 0, franja: llamada.franja } });
      hecho.tarea = "llamar";
    } else {
      const vence = p.paso === 0 ? limiteAnticipacion(ahora, 2) : ahora;
      await crearTarea(lead.codigo, { tipo: p.tarea.tipo, titulo: p.tarea.titulo, vence, detalle: { plantilla: p.tarea.plantilla, paso: p.paso } });
      hecho.tarea = p.tarea.tipo;
    }
  }
  await registrarEventoLead(lead.codigo, "seguimiento", {
    canal: "sistema",
    detalle: { paso: p.paso, siguiente: siguiente?.toISOString() ?? null, fin: p.paso === PASOS.length - 1 },
  });
  return hecho;
}

/**
 * Corre los pasos que tocan. Lo llama el cron. El paso 0 lo hace el sitio al momento; el cron
 * solo lo recupera si pasaron 15 minutos sin que ocurriera. `codigos` limita la corrida (pruebas).
 */
export async function correrSeguimiento(ahora = new Date(), opciones = {}) {
  const { rows } = await query(
    `SELECT * FROM lead
      WHERE consent_at IS NOT NULL AND no_contactar_at IS NULL AND etapa = 'cita_solicitada'
        AND seguimiento_paso < $1
        AND ((seguimiento_paso = 0 AND consent_at < $2::timestamptz - interval '15 minutes') OR proximo_seguimiento_at <= $2)
        AND ($3::text[] IS NULL OR codigo = ANY($3))
      ORDER BY consent_at LIMIT 200`,
    [PASOS.length, ahora, opciones.codigos ?? null],
  );
  const hechos = [];
  for (const lead of rows) {
    try {
      const h = await ejecutarPaso(lead, ahora, opciones);
      if (h) hechos.push(h);
    } catch (err) {
      console.error(`[crm] seguimiento de ${lead.codigo} falló:`, err.message);
    }
  }
  return hechos;
}

/** La persona confirmó su correo (link del correo de bienvenida). */
export async function confirmarCorreo(token) {
  if (typeof token !== "string" || !/^[a-f0-9]{32}$/.test(token)) return null;
  const { rows } = await query(
    `UPDATE lead SET email_confirmado_at = COALESCE(email_confirmado_at, now()) WHERE baja_token = $1 AND email IS NOT NULL RETURNING codigo`,
    [token],
  );
  if (!rows[0]) return null;
  await registrarEventoLead(rows[0].codigo, "respondio", { canal: "correo", detalle: { nota: "Confirmó su correo" } });
  return rows[0].codigo;
}

/** La persona pidió no recibir más mensajes (link del correo). */
export async function darDeBaja(token) {
  if (typeof token !== "string" || !/^[a-f0-9]{32}$/.test(token)) return null;
  const { rows } = await query(
    `UPDATE lead SET no_contactar_at = COALESCE(no_contactar_at, now()), proximo_seguimiento_at = NULL
      WHERE baja_token = $1 RETURNING codigo`,
    [token],
  );
  if (!rows[0]) return null;
  await registrarEventoLead(rows[0].codigo, "baja", { canal: "correo" });
  return rows[0].codigo;
}
