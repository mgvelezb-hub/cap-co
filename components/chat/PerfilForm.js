"use client";

import { useState } from "react";
import { PREGUNTAS_PERFIL, CAMPOS_DETALLE, NO_DICE } from "@/lib/chatbot/perfil-visita";

// Preguntas opcionales y anónimas del perfil que se ofrecen después de la primera respuesta.
// Cada pregunta trae "Prefiero no decir" y la tarjeta entera se puede descartar.
export default function PerfilForm({ onListo, onOmitir }) {
  const [respuestas, setRespuestas] = useState({});

  function elegir(campo, valor) {
    setRespuestas((r) => ({ ...r, [campo]: r[campo] === valor ? undefined : valor }));
  }

  function listo() {
    const limpio = Object.fromEntries(Object.entries(respuestas).filter(([, v]) => v));
    if (Object.keys(limpio).length > 0) onListo(limpio);
    else onOmitir();
  }

  return (
    <form
      className="space-y-4 rounded-2xl border border-esmeralda/15 bg-papel-alto p-4"
      onSubmit={(e) => {
        e.preventDefault();
        listo();
      }}
    >
      <p className="font-sans text-sm leading-snug text-esmeralda/80">
        Para mejorar el servicio, ¿nos ayudas con 4 preguntas? Son opcionales y anónimas.
      </p>
      {CAMPOS_DETALLE.map((campo) => {
        const { pregunta, opciones, lista } = PREGUNTAS_PERFIL[campo];
        const elegido = respuestas[campo];
        return (
          <fieldset key={campo} className="space-y-2">
            <legend className="mb-2 font-sans text-sm font-medium text-esmeralda">{pregunta}</legend>
            {lista ? (
              <select
                value={elegido || ""}
                onChange={(e) => setRespuestas((r) => ({ ...r, [campo]: e.target.value || undefined }))}
                className="w-full rounded-xl border border-esmeralda/20 bg-papel px-3 py-2.5 font-sans text-base text-esmeralda md:text-sm outline-none focus:border-esmeralda focus:ring-2 focus:ring-esmeralda/15"
              >
                <option value="">Elige una opción</option>
                <optgroup label="Ciudad de México">
                  {opciones.filter(([v]) => v.startsWith("cdmx:")).map(([v, t]) => (
                    <option key={v} value={v}>{t}</option>
                  ))}
                </optgroup>
                {opciones.filter(([v]) => !v.startsWith("cdmx:")).map(([v, t]) => (
                  <option key={v} value={v}>{t}</option>
                ))}
                <option value={NO_DICE}>Prefiero no decir</option>
              </select>
            ) : (
              <div className="flex flex-wrap gap-2">
                {[...opciones, [NO_DICE, "Prefiero no decir"]].map(([v, t]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={elegido === v}
                    onClick={() => elegir(campo, v)}
                    className={`min-h-[44px] rounded-full border px-3.5 py-2 font-sans text-sm transition-colors ${
                      elegido === v
                        ? "border-esmeralda bg-esmeralda text-sobre-verde"
                        : v === NO_DICE
                          ? "border-esmeralda/15 text-esmeralda/70 hover:border-esmeralda/40"
                          : "border-esmeralda/25 text-esmeralda hover:border-esmeralda"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </fieldset>
        );
      })}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onOmitir}
          className="min-h-[44px] px-1 font-sans text-sm text-esmeralda/75 underline underline-offset-4 hover:text-esmeralda"
        >
          No, gracias
        </button>
        <button
          type="submit"
          className="rounded-full bg-esmeralda px-5 py-2.5 font-sans text-sm font-medium text-sobre-verde transition-transform duration-300 ease-expo hover:scale-[1.03]"
        >
          Enviar respuestas
        </button>
      </div>
    </form>
  );
}
