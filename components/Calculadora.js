"use client";

import { useState } from "react";
import { WHATSAPP_URL } from "@/lib/constants";

const fmt = (n) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

export default function Calculadora() {
  const [monto, setMonto] = useState(2000);
  const [tasa, setTasa] = useState(8);
  const [meses, setMeses] = useState(6);

  const interesMensual = (monto * tasa) / 100;
  const interesTotal = interesMensual * meses;
  const total = monto + interesTotal;
  const veces = total / monto;

  return (
    <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
      <div className="space-y-10">
        <label className="block">
          <div className="mb-3 flex items-baseline justify-between font-sans">
            <span className="text-sobre-verde/70">Te prestaron</span>
            <span className="font-serif text-2xl">{fmt(monto)}</span>
          </div>
          <input
            type="range"
            min="500"
            max="20000"
            step="500"
            value={monto}
            onChange={(e) => setMonto(+e.target.value)}
          />
        </label>
        <label className="block">
          <div className="mb-3 flex items-baseline justify-between font-sans">
            <span className="text-sobre-verde/70">Tasa mensual</span>
            <span className="font-serif text-2xl">{tasa.toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min="4"
            max="20"
            step="0.5"
            value={tasa}
            onChange={(e) => setTasa(+e.target.value)}
          />
          <p className="mt-2 font-sans text-xs text-sobre-verde/75">
            Las casas publican de 3 % a 20 % al mes. La tasa sola no basta: pide siempre el CAT.
          </p>
        </label>
        <label className="block">
          <div className="mb-3 flex items-baseline justify-between font-sans">
            <span className="text-sobre-verde/70">Meses hasta recuperar tu pieza</span>
            <span className="font-serif text-2xl">{meses}</span>
          </div>
          <input
            type="range"
            min="1"
            max="24"
            step="1"
            value={meses}
            onChange={(e) => setMeses(+e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-col justify-center">
        <div className="font-sans text-sm uppercase tracking-[0.2em] text-sobre-verde/60">
          Pagarías aprox. en total
        </div>
        <div className="mt-2 font-serif text-[clamp(3rem,7vw,5.5rem)] leading-none tabular-nums">
          {fmt(total)}
        </div>
        <p className="mt-5 max-w-md font-sans leading-relaxed text-sobre-verde/80 text-justify">
          {fmt(monto)} de préstamo + {fmt(interesTotal)} de puros intereses
          ({fmt(interesMensual)} por mes). Recuperar tu pieza te costará{" "}
          <strong className="text-sobre-verde">{veces.toFixed(1)} veces</strong> lo que te
          prestaron. Estimado con interés simple, sin IVA, comisiones ni almacenaje.
        </p>
        <p className="mt-4 w-fit max-w-full rounded-lg bg-white/[0.08] px-4 py-3 text-left font-sans text-sm text-sobre-verde/90">
          Y si solo refrendas, nada de esto baja tu deuda:
          <br className="hidden sm:block" /> el refrendo paga únicamente el
          interés del mes.
        </p>
        <a
          href={WHATSAPP_URL}
          className="mt-8 inline-block w-fit rounded-full bg-sobre-verde px-7 py-3.5 font-sans text-sm font-medium text-esmeralda transition-transform duration-300 ease-expo hover:scale-[1.03]"
        >
          Revisa tu caso real por WhatsApp
        </a>
      </div>
    </div>
  );
}
