// Tokens personales para el servidor MCP: se muestran una sola vez, se guarda su sha256,
// vencen a los 90 días y se revocan desde Ajustes.
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { query } from "@lib/db/client";

export const DIAS_VIGENCIA = 90;
export const hashToken = (t) => createHash("sha256").update(t).digest("hex");

export async function crearToken(usuario, nombre) {
  const token = `capco_${randomBytes(32).toString("base64url")}`;
  await query(
    `INSERT INTO crm_token (usuario, nombre, hash, vence_at) VALUES ($1, $2, $3, now() + ($4 || ' days')::interval)`,
    [usuario, String(nombre || "MCP").slice(0, 60), hashToken(token), String(DIAS_VIGENCIA)],
  );
  return token;
}

export async function tokensDe(usuario) {
  const { rows } = await query(
    `SELECT id, nombre, creado_at, vence_at, usado_at, revocado_at FROM crm_token WHERE usuario = $1 ORDER BY creado_at DESC`,
    [usuario],
  );
  return rows;
}

export async function revocarToken(id, usuario) {
  await query(`UPDATE crm_token SET revocado_at = now() WHERE id = $1 AND usuario = $2 AND revocado_at IS NULL`, [id, usuario]);
}

/** Bearer → usuario activo, o null. Marca el uso como mucho una vez cada 10 minutos. */
export async function usuarioDeToken(authorization) {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  if (!token.startsWith("capco_")) return null;
  const { rows } = await query(
    `SELECT t.id, t.usado_at, u.usuario, u.nombre, u.rol FROM crm_token t JOIN crm_usuario u ON u.usuario = t.usuario
      WHERE t.hash = $1 AND t.revocado_at IS NULL AND t.vence_at > now() AND u.activo`,
    [hashToken(token)],
  );
  const r = rows[0];
  if (!r) return null;
  if (!r.usado_at || Date.now() - new Date(r.usado_at).getTime() > 10 * 60_000) {
    await query(`UPDATE crm_token SET usado_at = now() WHERE id = $1`, [r.id]);
  }
  return { usuario: r.usuario, nombre: r.nombre, rol: r.rol };
}
