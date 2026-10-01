"use client";

import { useState } from "react";

const FRASES = [
  "El refrendo solo paga intereses",
  "Tu boleta es un contrato: entiéndelo antes de firmar",
  "3 puntos más de tasa: $1,800 más en 6 meses por cada $10,000",
  "Analizar tu boleta no tiene costo",
  "El costo real está en el CAT, no en el anuncio",
  "Preguntar no cuesta nada; no preguntar, sí",
];

export default function Ticker() {
  const [pausado, setPausado] = useState(false);
  const fila = [...FRASES, ...FRASES];
  return (
    <div className="relative border-y border-esmeralda/10 bg-esmeralda">
      {/* El lector de pantalla lee las frases una vez, como lista; la marquesina (duplicada para el
          giro continuo) es solo visual. */}
      <ul className="sr-only" aria-label="Lo que conviene saber de tu empeño">
        {FRASES.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <div className="overflow-hidden py-4" aria-hidden="true">
        <div className="ticker-track" style={pausado ? { animationPlayState: "paused" } : undefined}>
          {fila.map((f, i) => (
            <span key={i} className="flex items-center whitespace-nowrap font-serif text-lg text-sobre-verde/90">
              <span className="px-6">{f}</span>
              <svg viewBox="0 0 16 20" className="h-3 w-auto shrink-0 opacity-70">
                <path d="M 8 0 L 16 10 L 8 20 L 0 10 Z" fill="#A32638" />
              </svg>
            </span>
          ))}
        </div>
      </div>
      {/* Pausa para quien no puede leer en movimiento. Con movimiento reducido no hay nada que pausar. */}
      <button
        type="button"
        aria-pressed={pausado}
        aria-label="Pausar las frases"
        onClick={() => setPausado((p) => !p)}
        className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-esmeralda text-sobre-verde ring-1 ring-sobre-verde/40 transition-shadow hover:ring-sobre-verde motion-reduce:hidden md:right-5"
      >
        {pausado ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13l10.5-6.5z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <rect x="6.5" y="5" width="3.5" height="14" rx="1" />
            <rect x="14" y="5" width="3.5" height="14" rx="1" />
          </svg>
        )}
      </button>
    </div>
  );
}
