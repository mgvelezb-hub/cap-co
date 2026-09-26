"use client";

import { useEffect, useRef, useState } from "react";
import { ETAPAS_PANEL as ETAPAS } from "@/lib/leads/etapas";

// Edición de un lead con guardado automático (0.8 s después de dejar de escribir) y al
// salir de la página. Compara contra lo último guardado, no contra el valor inicial.


const CAMPO = "w-full rounded-md border border-esmeralda/20 bg-papel px-2 py-1.5 text-base sm:text-sm";

export default function LeadEditor({ lead }) {
  const inicial = {
    etapa: lead.etapa || "cita_solicitada",
    asesor: lead.asesor || "",
    casa_destino: lead.casa_destino || "",
    comision_mxn: lead.comision_mxn != null ? String(Number(lead.comision_mxn)) : "",
    motivo_descarte: lead.motivo_descarte || "",
    notas: lead.notas || "",
  };
  const [valores, setValores] = useState(inicial);
  const [estado, setEstado] = useState("");
  const guardado = useRef(inicial);
  const temporizador = useRef(null);

  function pendientes(v) {
    return Object.fromEntries(Object.entries(v).filter(([k, x]) => x !== guardado.current[k]));
  }

  async function guardar(v = valores) {
    const cambios = pendientes(v);
    if (Object.keys(cambios).length === 0) return;
    setEstado("Guardando…");
    try {
      const res = await fetch(`/api/admin/leads/${lead.codigo}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      if (res.ok) {
        guardado.current = { ...guardado.current, ...cambios };
        setEstado("Guardado");
      } else {
        const data = await res.json().catch(() => ({}));
        setEstado(`No se guardó${data.error ? `: ${data.error}` : ""}`);
      }
    } catch {
      setEstado("Sin conexión: no se guardó");
    }
  }

  function cambiar(campo, valor, inmediato = false) {
    const v = { ...valores, [campo]: valor };
    setValores(v);
    clearTimeout(temporizador.current);
    if (inmediato) guardar(v);
    else temporizador.current = setTimeout(() => guardar(v), 800);
  }

  useEffect(() => {
    function alSalir() {
      const cambios = pendientes(valoresRef.current);
      if (Object.keys(cambios).length > 0) {
        fetch(`/api/admin/leads/${lead.codigo}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cambios),
          keepalive: true,
        });
      }
    }
    window.addEventListener("pagehide", alSalir);
    return () => window.removeEventListener("pagehide", alSalir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.codigo]);
  const valoresRef = useRef(valores);
  valoresRef.current = valores;

  const cerrado = valores.etapa === "switcheo_concretado" || valores.etapa === "comision_cobrada";
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs text-esmeralda/60">
          Etapa
          <select value={valores.etapa} onChange={(e) => cambiar("etapa", e.target.value, true)} className={CAMPO}>
            {ETAPAS.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-esmeralda/60">
          Asesor
          <input value={valores.asesor} onChange={(e) => cambiar("asesor", e.target.value)} maxLength={80} className={CAMPO} />
        </label>
        {(cerrado || valores.casa_destino) && (
          <label className="block text-xs text-esmeralda/60">
            Casa de destino
            <input value={valores.casa_destino} onChange={(e) => cambiar("casa_destino", e.target.value)} maxLength={120} className={CAMPO} />
          </label>
        )}
        {(cerrado || valores.comision_mxn) && (
          <label className="block text-xs text-esmeralda/60">
            Comisión (pesos)
            <input
              value={valores.comision_mxn}
              onChange={(e) => cambiar("comision_mxn", e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"))}
              inputMode="decimal"
              className={CAMPO}
            />
          </label>
        )}
        {valores.etapa === "descartado" && (
          <label className="block text-xs text-esmeralda/60 sm:col-span-2">
            Motivo de descarte
            <input value={valores.motivo_descarte} onChange={(e) => cambiar("motivo_descarte", e.target.value)} maxLength={300} className={CAMPO} />
          </label>
        )}
      </div>
      <label className="block text-xs text-esmeralda/60">
        Notas (sin datos de la deuda ni de terceros que no hagan falta)
        <textarea value={valores.notas} onChange={(e) => cambiar("notas", e.target.value)} rows={2} maxLength={2000} className={CAMPO} />
      </label>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => guardar()} className="rounded-full border border-esmeralda/25 px-3 py-1 text-sm">
          Guardar
        </button>
        {estado && <span className="text-xs text-esmeralda/60">{estado}</span>}
      </div>
    </div>
  );
}
