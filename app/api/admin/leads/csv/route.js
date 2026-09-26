// GET /api/admin/leads/csv — todos los leads en CSV (se abre en Excel). Protegido por middleware.js.

import { leadsParaExportar } from "@/lib/leads/repo";
import { usuarioPanel } from "@/lib/panel/auth";
import { registrarAccion } from "@/lib/leads/bitacora";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNAS = [
  "codigo", "created_at", "perfil", "etapa", "probabilidad", "institucion_origen", "tasa_actual", "tasa_oferta",
  "ahorro", "resumen", "utm_source", "utm_campaign", "whatsapp_click_at", "nombre", "telefono", "consent_at",
  "contactado_at", "notas", "casa_destino", "comision_mxn", "motivo_descarte", "asesor", "cerrado_at",
];

function celda(v) {
  if (v == null) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  // Evita que Excel ejecute fórmulas escritas en un campo (inyección CSV).
  const seguro = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

export async function GET(request) {
  // Trae nombres y teléfonos de todos los leads: solo el dueño puede descargarlo, y queda en bitácora.
  const { usuario, rol } = usuarioPanel(request);
  if (rol !== "dueno") return Response.json({ error: "Solo el dueño puede descargar los leads." }, { status: 403 });
  const filas = await leadsParaExportar();
  await registrarAccion(usuario, "csv_descargado", null, { filas: filas.length });
  const csv = [COLUMNAS.join(","), ...filas.map((f) => COLUMNAS.map((c) => celda(f[c])).join(","))].join("\r\n");
  const fecha = new Date().toISOString().slice(0, 10);
  // BOM para que Excel lea bien los acentos.
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-capco-${fecha}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
