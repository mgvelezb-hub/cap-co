"use client";

import { useState } from "react";

// Formulario opcional debajo del botón de WhatsApp: nombre + WhatsApp + consentimiento.
// Es la ÚNICA vía por la que el chat recibe datos personales (nunca en la conversación).

export default function ContactoForm({ codigo, onEnviado }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [estado, setEstado] = useState({ tipo: "idle" });

  async function enviar(e) {
    e.preventDefault();
    if (estado.tipo === "enviando") return;
    setEstado({ tipo: "enviando" });
    try {
      const res = await fetch(`/api/leads/${codigo}/contacto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, telefono, acepta }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEstado({ tipo: "error", mensaje: data.error || "No pudimos guardar tus datos." });
        return;
      }
      setEstado({ tipo: "ok" });
      onEnviado?.();
    } catch {
      setEstado({ tipo: "error", mensaje: "Sin conexión. Inténtalo de nuevo o escríbenos directo por WhatsApp." });
    }
  }

  if (estado.tipo === "ok") {
    return (
      <p className="rounded-xl border border-esmeralda/10 bg-papel-alto px-4 py-3 font-sans text-sm text-esmeralda/80">
        Listo. Te escribimos por WhatsApp. Tu código es <span className="font-mono">{codigo}</span>.
      </p>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="font-sans text-sm text-esmeralda/70 underline underline-offset-4 hover:text-esmeralda"
      >
        ¿Prefieres que te escribamos nosotros?
      </button>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-3 rounded-xl border border-esmeralda/10 bg-papel-alto p-4">
      <p className="font-sans text-sm text-esmeralda/80">
        Déjanos tu nombre y WhatsApp y un asesor te escribe. Sin compromiso.
      </p>
      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Tu nombre"
        autoComplete="name"
        maxLength={80}
        required
        aria-label="Tu nombre"
        className="w-full rounded-lg border border-esmeralda/15 bg-papel px-3 py-2 font-sans text-[15px] text-esmeralda outline-none placeholder:text-esmeralda/40 focus:border-esmeralda/40"
      />
      <input
        type="tel"
        inputMode="numeric"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        placeholder="WhatsApp (10 dígitos)"
        autoComplete="tel"
        maxLength={20}
        required
        aria-label="Tu número de WhatsApp"
        className="w-full rounded-lg border border-esmeralda/15 bg-papel px-3 py-2 font-sans text-[15px] text-esmeralda outline-none placeholder:text-esmeralda/40 focus:border-esmeralda/40"
      />
      <label className="flex items-start gap-2 font-sans text-xs leading-snug text-esmeralda/75">
        <input
          type="checkbox"
          checked={acepta}
          onChange={(e) => setAcepta(e.target.checked)}
          required
          className="mt-0.5 h-4 w-4 shrink-0 accent-esmeralda"
        />
        <span>
          Acepto el{" "}
          <a href="/aviso-de-privacidad" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            aviso de privacidad
          </a>{" "}
          y que me contacten por WhatsApp sobre mi consulta.
        </span>
      </label>
      {estado.tipo === "error" && (
        <p className="font-sans text-xs text-granate">{estado.mensaje}</p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={estado.tipo === "enviando" || !acepta}
          className="rounded-full bg-esmeralda px-5 py-2.5 font-sans text-sm font-medium text-sobre-verde transition-opacity disabled:opacity-40"
        >
          {estado.tipo === "enviando" ? "Enviando…" : "Que me escriban"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="font-sans text-sm text-esmeralda/60 underline-offset-4 hover:underline"
        >
          Mejor no
        </button>
      </div>
    </form>
  );
}
