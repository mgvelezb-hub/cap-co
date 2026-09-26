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

export async function bitacoraReciente(limite = 30) {
  if (!dbDisponible()) return [];
  const { rows } = await query(
    `SELECT creado_at, usuario, accion, objetivo, detalle FROM bitacora_panel ORDER BY creado_at DESC LIMIT $1`,
    [limite],
  );
  return rows;
}
