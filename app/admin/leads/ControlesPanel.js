"use client";

import { useState } from "react";

const CAMPO = "rounded-md border border-esmeralda/20 bg-papel px-2 py-1.5 text-base sm:text-sm";

async function enviar(url, cuerpo) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const data = await res.json().catch(() => ({}));
  return res.ok ? "Guardado" : `No se guardó${data.error ? `: ${data.error}` : ""}`;
}

export function CitaEditor({ cita }) {
  const [estadoCita, setEstadoCita] = useState(cita.estado);
  const [lugar, setLugar] = useState(cita.lugar);
  const [aviso, setAviso] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={estadoCita}
        onChange={async (e) => {
          setEstadoCita(e.target.value);
          setAviso(await enviar(`/api/admin/citas/${cita.id}`, { estado: e.target.value }));
        }}
        className={CAMPO}
        aria-label="Estado de la cita"
      >
        {[
          ["reservada", "Reservada"],
          ["confirmada", "Confirmada"],
          ["atendida", "Atendida"],
          ["no_asistio", "No asistió"],
          ["cancelada", "Cancelada"],
        ].map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
      <input
        value={lugar}
        onChange={(e) => setLugar(e.target.value)}
        onBlur={async () => lugar !== cita.lugar && setAviso(await enviar(`/api/admin/citas/${cita.id}`, { lugar }))}
        maxLength={200}
        className={`${CAMPO} min-w-[12rem] flex-1`}
        aria-label="Lugar de la cita"
      />
      {aviso && <span className="text-xs text-esmeralda/60">{aviso}</span>}
    </div>
  );
}

export function GastoForm() {
  const hoy = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ fecha: hoy, utm_campaign: "", monto_mxn: "", nota: "" });
  const [aviso, setAviso] = useState("");
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await enviar("/api/admin/gastos", { ...f, monto_mxn: Number(f.monto_mxn) });
        setAviso(r);
        if (r === "Guardado") setF({ ...f, monto_mxn: "", nota: "" });
      }}
    >
      <label className="text-xs text-esmeralda/60">
        Fecha
        <input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} className={`${CAMPO} block`} />
      </label>
      <label className="text-xs text-esmeralda/60">
        Campaña (utm_campaign)
        <input value={f.utm_campaign} onChange={(e) => setF({ ...f, utm_campaign: e.target.value })} required className={`${CAMPO} block`} />
      </label>
      <label className="text-xs text-esmeralda/60">
        Gasto (pesos)
        <input value={f.monto_mxn} onChange={(e) => setF({ ...f, monto_mxn: e.target.value.replace(/[^\d.]/g, "") })} inputMode="decimal" required className={`${CAMPO} block w-28`} />
      </label>
      <button type="submit" className="rounded-full bg-esmeralda px-4 py-1.5 text-sm text-sobre-verde">
        Registrar gasto
      </button>
      {aviso && <span className="text-xs text-esmeralda/60">{aviso}</span>}
    </form>
  );
}
