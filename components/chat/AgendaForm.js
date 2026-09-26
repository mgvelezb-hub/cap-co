"use client";

import { useEffect, useState } from "react";

// Agenda de cita dentro del chat: día → hora → nombre y WhatsApp con consentimiento.
// Horarios: lunes a viernes, 9:00 a 17:00 (CDMX). El lugar se confirma por WhatsApp.

const DIA = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Mexico_City" });
const HORA = new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", timeZone: "America/Mexico_City" });

const CLASE_CAMPO =
  "w-full rounded-lg border border-esmeralda/15 bg-papel px-3 py-2 font-sans text-base text-esmeralda outline-none placeholder:text-esmeralda/40 focus:border-esmeralda/40";

function Chip({ activo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 font-sans text-sm transition-colors ${
        activo ? "border-esmeralda bg-esmeralda text-sobre-verde" : "border-esmeralda/25 text-esmeralda hover:border-esmeralda"
      }`}
    >
      {children}
    </button>
  );
}

export default function AgendaForm({ codigo, onReservada }) {
  const [dias, setDias] = useState(null);
  const [dia, setDia] = useState(null);
  const [hora, setHora] = useState(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [estado, setEstado] = useState({ tipo: "idle" });

  async function cargar() {
    try {
      const res = await fetch("/api/citas/disponibles", { cache: "no-store" });
      const data = await res.json();
      setDias(data.dias || []);
      setDia((data.dias || [])[0]?.fecha || null);
    } catch {
      setDias([]);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function reservar(e) {
    e.preventDefault();
    if (!hora || estado.tipo === "enviando") return;
    setEstado({ tipo: "enviando" });
    try {
      const res = await fetch("/api/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, inicio: hora, nombre, telefono, acepta }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEstado({ tipo: "error", mensaje: data.error || "No pudimos apartar la cita." });
        if (res.status === 409) {
          setHora(null);
          cargar();
        }
        return;
      }
      setEstado({ tipo: "ok", ...data });
      onReservada?.(data);
    } catch {
      setEstado({ tipo: "error", mensaje: "Sin conexión. Inténtalo de nuevo." });
    }
  }

  if (estado.tipo === "ok") {
    return (
      <div className="space-y-3 rounded-xl border border-esmeralda/15 bg-papel-alto p-4 font-sans text-sm text-esmeralda">
        <p>
          <strong>Tu cita quedó apartada:</strong> {estado.cuando}
        </p>
        <p className="text-esmeralda/75">
          Lugar: {estado.lugar === "Por confirmar" ? "te lo confirmamos por WhatsApp" : estado.lugar}. Tu código es{" "}
          <span className="font-mono">{codigo}</span>.
        </p>
        <a
          href={estado.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-full bg-esmeralda px-4 py-2 font-medium text-sobre-verde"
        >
          Confirmar por WhatsApp
        </a>
      </div>
    );
  }

  if (dias === null) {
    return <p className="font-sans text-sm text-esmeralda/60">Cargando horarios…</p>;
  }
  if (dias.length === 0) {
    return (
      <p className="font-sans text-sm text-esmeralda/70">
        No hay horarios disponibles en los próximos días. Escríbenos por WhatsApp y te buscamos lugar.
      </p>
    );
  }

  const horas = dias.find((d) => d.fecha === dia)?.horas || [];
  const puede = hora && nombre.trim().length >= 2 && telefono.trim() && acepta && estado.tipo !== "enviando";

  return (
    <form onSubmit={reservar} className="space-y-3 rounded-xl border border-esmeralda/15 bg-papel-alto p-4">
      <p className="font-sans text-sm font-medium text-esmeralda">Elige día y hora para tu cita presencial</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Día">
        {dias.map((d) => (
          <Chip
            key={d.fecha}
            activo={d.fecha === dia}
            onClick={() => {
              setDia(d.fecha);
              setHora(null);
            }}
          >
            {DIA.format(new Date(d.horas[0]))}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Hora">
        {horas.map((h) => (
          <Chip key={h} activo={h === hora} onClick={() => setHora(h)}>
            {HORA.format(new Date(h))}
          </Chip>
        ))}
      </div>
      {hora && (
        <>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" autoComplete="name" maxLength={80} aria-label="Tu nombre" className={CLASE_CAMPO} />
          <input type="tel" inputMode="numeric" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="WhatsApp (10 dígitos)" autoComplete="tel" maxLength={20} aria-label="Tu número de WhatsApp" className={CLASE_CAMPO} />
          <label className="flex items-start gap-2 font-sans text-xs leading-snug text-esmeralda/75">
            <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-esmeralda" />
            <span>
              Acepto el{" "}
              <a href="/aviso-de-privacidad" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                aviso de privacidad
              </a>{" "}
              y que me contacten por WhatsApp para confirmar mi cita.
            </span>
          </label>
        </>
      )}
      {estado.tipo === "error" && <p className="font-sans text-xs text-granate">{estado.mensaje}</p>}
      <button type="submit" disabled={!puede} className="rounded-full bg-esmeralda px-5 py-2.5 font-sans text-sm font-medium text-sobre-verde disabled:opacity-40">
        {estado.tipo === "enviando" ? "Apartando…" : "Apartar cita"}
      </button>
      <p className="font-sans text-xs text-esmeralda/55">Lunes a viernes, de 9:00 a 17:00. El lugar se confirma por WhatsApp.</p>
    </form>
  );
}
