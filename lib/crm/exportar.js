// Exportación de leads a CSV (se abre en Excel). Trae datos personales: solo el dueño, y queda
// en la bitácora.

import { query } from "../db/client.js";

export const COLUMNAS_CSV = [
  "codigo", "created_at", "perfil", "etapa", "clasificacion", "asesor_usuario", "probabilidad", "institucion_origen",
  "tasa_actual", "tasa_oferta", "ahorro", "resumen", "utm_source", "utm_campaign", "nombre", "telefono", "email",
  "consent_at", "ultimo_contacto_at", "ultima_respuesta_at", "no_contactar_at", "notas", "casa_destino",
  "comision_mxn", "cobrado_at", "cobro_metodo", "motivo_descarte", "cerrado_at",
];

export function celda(v) {
  if (v == null) return "";
  const s = v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v);
  // Evita que Excel ejecute fórmulas escritas en un campo (inyección CSV).
  const seguro = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

export async function leadsCsv() {
  const { rows } = await query(
    `SELECT ${COLUMNAS_CSV.filter((c) => !c.startsWith("utm_")).join(", ")},
            fuente->>'utm_source' AS utm_source, fuente->>'utm_campaign' AS utm_campaign
       FROM lead ORDER BY created_at DESC`,
  );
  const csv = [COLUMNAS_CSV.join(","), ...rows.map((f) => COLUMNAS_CSV.map((c) => celda(f[c])).join(","))].join("\r\n");
  // BOM para que Excel lea bien los acentos.
  return { csv: `﻿${csv}`, filas: rows.length };
}
