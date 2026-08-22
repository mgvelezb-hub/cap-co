"use client";

import { useEffect, useRef, useState } from "react";

const MAX_CHARS = 1500;

export default function ChatInput({ onEnviar, deshabilitado, autoFocus }) {
  const [texto, setTexto] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus();
  }, [autoFocus]);

  // Autoajuste de altura. Se mide en el siguiente frame para leer el DOM ya actualizado.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (texto === "") {
      el.style.height = "auto";
      return;
    }
    const id = requestAnimationFrame(() => {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    });
    return () => cancelAnimationFrame(id);
  }, [texto]);

  function enviar() {
    const limpio = texto.trim();
    if (!limpio || deshabilitado) return;
    onEnviar(limpio);
    setTexto("");
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  return (
    <form
      className="flex items-end gap-2 border-t border-esmeralda/10 bg-papel px-3 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
    >
      <textarea
        ref={ref}
        rows={1}
        value={texto}
        maxLength={MAX_CHARS}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Escribe tu duda…"
        aria-label="Escribe tu mensaje"
        className="max-h-[120px] flex-1 resize-none rounded-xl border border-esmeralda/15 bg-papel-alto px-3.5 py-2.5 font-sans text-[15px] leading-snug text-esmeralda outline-none placeholder:text-esmeralda/40 focus:border-esmeralda/40"
      />
      <button
        type="submit"
        disabled={deshabilitado || texto.trim() === ""}
        aria-label="Enviar"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-esmeralda text-sobre-verde transition-opacity disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>
  );
}
