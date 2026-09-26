"use client";

import { useActionState } from "react";
import { accionCrearToken } from "@/app/(app)/acciones";

// Crea un token para el servidor MCP y lo muestra UNA sola vez, con el comando para Claude Code.
export default function NuevoToken({ urlMcp }) {
  const [estado, accion, pendiente] = useActionState(accionCrearToken, null);
  return (
    <div className="space-y-3">
      <form action={accion} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-xs text-esmeralda/70">
          Nombre del token
          <input name="nombre" defaultValue="Claude" maxLength={60} className="rounded-lg border border-esmeralda/20 bg-papel px-3 py-2 text-base sm:text-sm" />
        </label>
        <button disabled={pendiente} className="inline-flex min-h-[40px] items-center rounded-full bg-esmeralda px-4 text-sm font-medium text-sobre-verde disabled:opacity-40">
          {pendiente ? "Creando…" : "Crear token"}
        </button>
      </form>
      {estado?.token && (
        <div role="status" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-medium text-ambar">Cópialo ahora: no se vuelve a mostrar. Vence en 90 días.</p>
          <code className="block break-all rounded bg-papel p-2 text-xs">{estado.token}</code>
          <p>Para conectarlo a Claude Code:</p>
          <code className="block break-all rounded bg-papel p-2 text-xs">
            claude mcp add --transport http capco-crm {urlMcp} --header &quot;Authorization: Bearer {estado.token}&quot;
          </code>
        </div>
      )}
    </div>
  );
}
