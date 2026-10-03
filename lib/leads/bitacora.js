// Bitácora del panel: quién cambió qué. Nunca lanza.
import { query, dbDisponible } from "../db/client.js";

export async function registrarAccion(usuario, accion, objetivo = null, detalle = {}) {
  if (!dbDisponible()) return;
  try {
    await query(`INSERT INTO bitacora_panel (usuario, accion, objetivo, detalle) VALUES ($1, $2, $3, $4)`, [
      String(usuario || "desconocido").slice(0, 80),
      accion,
      objetivo,
      JSON.stringify(detalle),
    ]);
  } catch (err) {
    console.error("[bitacora] no se registró:", err.message);
  }
}

/**
 * Consulta de un caso con sus datos de contacto. Una por persona y caso cada 10 minutos: la ficha se
 * vuelve a pintar tras cada acción y no debe llenar la bitácora.
 */
export async function registrarConsulta(usuario, codigo, detalle = {}, accion = "lead_consultado") {
  if (!dbDisponible()) return;
  try {
    await query(
      `INSERT INTO bitacora_panel (usuario, accion, objetivo, detalle)
       SELECT $1, $4, $2, $3
        WHERE NOT EXISTS (SELECT 1 FROM bitacora_panel WHERE usuario = $1 AND accion = $4 AND objetivo = $2
                            AND creado_at > now() - interval '10 minutes')`,
      [String(usuario || "desconocido").slice(0, 80), codigo, JSON.stringify(detalle), accion],
    );
  } catch (err) {
    console.error("[bitacora] no se registró la consulta:", err.message);
  }
}

export async function bitacoraReciente(limite = 30) {
  if (!dbDisponible()) return [];
  const { rows } = await query(
    `SELECT creado_at, usuario, accion, objetivo, detalle FROM bitacora_panel ORDER BY creado_at DESC LIMIT $1`,
    [limite],
  );
  return rows;
}
