// Lo que pasa solo cuando entra un lead. El sitio lo llama después de responder (after()).
//   · Lead nuevo desde el chat: evento + clasificación por reglas (sin IA: aún no deja datos).
//   · La persona deja sus datos: evento, clasificación con IA y primer paso del seguimiento
//     (correo de bienvenida si dejó correo + tarea de WhatsApp para el asesor).

import { query } from "../db/client.js";
import { registrarEventoLead } from "./eventos.js";
import { clasificarLead } from "./clasificacion.js";
import { ejecutarPaso } from "./seguimiento.js";
import { asignarPorTurno } from "./leads.js";

export async function alCrearLead(codigo, detalle = {}) {
  try {
    await registrarEventoLead(codigo, "lead_creado", { canal: "chat", detalle });
    await clasificarLead(codigo, { usarIA: false });
  } catch (err) {
    console.error(`[crm] alCrearLead ${codigo}:`, err.message);
  }
}

export async function alGuardarContacto(codigo, detalle = {}) {
  try {
    await registrarEventoLead(codigo, "contacto_guardado", { canal: "chat", detalle });
    await asignarPorTurno(codigo);
    await clasificarLead(codigo, { usarIA: true });
    const { rows } = await query(`SELECT * FROM lead WHERE codigo = $1`, [codigo]);
    if (rows[0]) await ejecutarPaso(rows[0]);
  } catch (err) {
    console.error(`[crm] alGuardarContacto ${codigo}:`, err.message);
  }
}
