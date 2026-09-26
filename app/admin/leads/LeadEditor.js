"use client";

import { useState } from "react";

const ETAPAS = [
  ["cita_solicitada", "Cita solicitada"],
  ["cita_confirmada", "Cita confirmada"],
  ["atendido", "Atendido"],
  ["descartado", "Descartado"],
];

export default function LeadEditor({ codigo, etapa: etapaInicial, notas: notasIniciales }) {
  const [etapa, setEtapa] = useState(etapaInicial || "cita_solicitada");
  const [notas, setNotas] = useState(notasIniciales || "");
  const [estado, setEstado] = useState("");

  async function guardar(cambios) {
    setEstado("Guardando…");
    try {
      const res = await fetch(`/api/admin/leads/${codigo}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      setEstado(res.ok ? "Guardado" : "No se guardó");
    } catch {
      setEstado("Sin conexión");
    }
    setTimeout(() => setEstado(""), 2500);
  }

  return (
    <div className="flex min-w-[16rem] flex-col gap-1.5">
      <select
        value={etapa}
        onChange={(e) => {
          setEtapa(e.target.value);
          guardar({ etapa: e.target.value });
        }}
        aria-label={`Etapa de ${codigo}`}
        className="rounded-md border border-esmeralda/20 bg-papel px-2 py-1 text-sm"
      >
        {ETAPAS.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        onBlur={() => notas !== (notasIniciales || "") && guardar({ notas })}
        rows={2}
        maxLength={2000}
        placeholder="Notas del asesor"
        aria-label={`Notas de ${codigo}`}
        className="rounded-md border border-esmeralda/20 bg-papel px-2 py-1 text-xs"
      />
      {estado && <span className="text-xs text-esmeralda/60">{estado}</span>}
    </div>
  );
}
