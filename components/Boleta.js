"use client";

import { useState } from "react";

// Contenido verificado contra guías públicas de CONDUSEF (Comisión Nacional para
// la Protección y Defensa de los Usuarios de Servicios Financieros) y PROFECO.
const ZONAS = [
  {
    id: "monto",
    titulo: "El préstamo",
    texto:
      "Lo que te dieron en la mano por tu pieza. No es lo que debes: es el punto de partida de tu deuda, calculado sobre el avalúo.",
    alerta: "El avalúo típico va del 25% al 45% del valor de la pieza, según CONDUSEF.",
  },
  {
    id: "cat",
    titulo: "La tasa y el CAT",
    texto:
      "La tasa es el interés mensual. El CAT (Costo Anual Total) suma esa tasa más comisiones, almacenaje y seguro: es el número real que deberías comparar entre instituciones.",
    alerta: "CONDUSEF recomienda siempre pedir el CAT, no solo la tasa de interés.",
  },
  {
    id: "vence",
    titulo: "El vencimiento",
    texto:
      "La fecha límite para pagar o refrendar. Pasado ese plazo, tu pieza puede pasar a venta pública.",
    alerta: "El plazo corre desde que firmas, no desde que te avisan.",
  },
  {
    id: "refrendo",
    titulo: "El refrendo",
    texto:
      "Pagar para que tu pieza siga guardada un mes más. Cubre solo intereses: tu deuda original no baja un peso.",
    alerta: "Pregunta a cuántos refrendos tienes derecho y cuánto extiende cada uno, antes de firmar.",
  },
  {
    id: "demasia",
    titulo: "El derecho de demasía",
    texto:
      "Si no logras recuperar tu pieza y termina vendiéndose en más de lo que debías, esa diferencia es legalmente tuya.",
    alerta: "Casi ninguna casa de empeño lo menciona. Pregúntalo antes de empeñar, no después.",
  },
];

function PapelBoleta({ activa }) {
  const zona = (id, y, h) => (
    <rect
      x="24"
      y={y}
      width="272"
      height={h}
      rx="8"
      fill={activa === id ? "rgba(163,38,56,0.09)" : "transparent"}
      stroke={activa === id ? "#A32638" : "rgba(20,64,47,0.12)"}
      strokeWidth={activa === id ? "2" : "1"}
      style={{ transition: "all .4s cubic-bezier(0.16,1,0.3,1)" }}
    />
  );
  const num = (id, y, n) => (
    <g style={{ transition: "opacity .4s", opacity: activa === id ? 1 : 0.35 }}>
      <circle cx="308" cy={y} r="13" fill={activa === id ? "#A32638" : "#14402F"} />
      <text x="308" y={y + 4.5} textAnchor="middle" fontSize="13" fill="#F4F6F1" fontFamily="var(--font-inter)">
        {n}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 340 512" className="w-full max-w-md" aria-label="Boleta de empeño explicada">
      {/* papel */}
      <rect x="8" y="8" width="304" height="496" rx="14" fill="#FDFDFB" stroke="rgba(20,64,47,0.18)" />
      {/* encabezado genérico */}
      <text x="36" y="52" fontSize="15" fill="#14402F" fontFamily="var(--font-marcellus)" letterSpacing="2">
        BOLETA DE EMPEÑO
      </text>
      <rect x="36" y="64" width="120" height="6" rx="3" fill="rgba(20,64,47,0.14)" />
      <rect x="36" y="78" width="88" height="6" rx="3" fill="rgba(20,64,47,0.10)" />

      {/* zona 1: monto */}
      {zona("monto", 100, 58)}
      <text x="40" y="124" fontSize="11" fill="rgba(20,64,47,0.55)" fontFamily="var(--font-inter)" letterSpacing="1.5">
        PRÉSTAMO
      </text>
      <text x="40" y="147" fontSize="22" fill="#14402F" fontFamily="var(--font-marcellus)">
        $2,000.00
      </text>
      {num("monto", 129, "1")}

      {/* zona 2: tasa / CAT */}
      {zona("cat", 166, 58)}
      <text x="40" y="190" fontSize="11" fill="rgba(20,64,47,0.55)" fontFamily="var(--font-inter)" letterSpacing="1.5">
        TASA MENSUAL · CAT
      </text>
      <text x="40" y="213" fontSize="22" fill="#14402F" fontFamily="var(--font-marcellus)">
        8.0% · CAT 187%
      </text>
      {num("cat", 195, "2")}

      {/* zona 3: vencimiento */}
      {zona("vence", 232, 58)}
      <text x="40" y="256" fontSize="11" fill="rgba(20,64,47,0.55)" fontFamily="var(--font-inter)" letterSpacing="1.5">
        VENCE
      </text>
      <text x="40" y="279" fontSize="22" fill="#14402F" fontFamily="var(--font-marcellus)">
        15 · AGO · 2026
      </text>
      {num("vence", 261, "3")}

      {/* zona 4: refrendo */}
      {zona("refrendo", 298, 58)}
      <text x="40" y="322" fontSize="11" fill="rgba(20,64,47,0.55)" fontFamily="var(--font-inter)" letterSpacing="1.5">
        REFRENDO MENSUAL
      </text>
      <text x="40" y="345" fontSize="22" fill="#14402F" fontFamily="var(--font-marcellus)">
        $160.00
      </text>
      {num("refrendo", 327, "4")}

      {/* zona 5: demasía */}
      {zona("demasia", 364, 58)}
      <text x="40" y="388" fontSize="11" fill="rgba(20,64,47,0.55)" fontFamily="var(--font-inter)" letterSpacing="1.5">
        SI NO RECUPERAS TU PIEZA
      </text>
      <text x="40" y="411" fontSize="22" fill="#14402F" fontFamily="var(--font-marcellus)">
        Derecho de demasía
      </text>
      {num("demasia", 393, "5")}

      {/* pie: la letra chiquita */}
      <rect x="36" y="450" width="200" height="4" rx="2" fill="rgba(20,64,47,0.10)" />
      <rect x="36" y="460" width="150" height="4" rx="2" fill="rgba(20,64,47,0.08)" />
      <rect x="36" y="470" width="180" height="4" rx="2" fill="rgba(20,64,47,0.08)" />
    </svg>
  );
}

export default function Boleta() {
  const [activa, setActiva] = useState("monto");

  return (
    <div>
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="lg:sticky lg:top-28">
          <PapelBoleta activa={activa} />
        </div>
        <ol className="space-y-2">
          {ZONAS.map((z, i) => {
            const abierta = activa === z.id;
            return (
              <li key={z.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActiva(z.id)}
                  onClick={() => setActiva(z.id)}
                  className={`w-full rounded-2xl px-6 py-5 text-left transition-colors duration-300 ${
                    abierta ? "bg-papel-alto shadow-[0_2px_24px_rgba(20,64,47,0.07)]" : "hover:bg-papel-alto/60"
                  }`}
                >
                  <div className="flex items-baseline gap-4">
                    <span className={`font-serif text-2xl ${abierta ? "text-granate" : "text-esmeralda/30"}`}>
                      {i + 1}
                    </span>
                    <h3 className="font-serif text-2xl">{z.titulo}</h3>
                  </div>
                  <div
                    className="grid transition-[grid-template-rows] duration-500 ease-expo"
                    style={{ gridTemplateRows: abierta ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p className="pt-3 font-sans leading-relaxed text-esmeralda/80 text-justify">{z.texto}</p>
                      <p className="mt-3 inline-block rounded-lg bg-granate/[0.07] px-3 py-2 text-left font-sans text-sm font-medium text-granate">
                        {z.alerta}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="mt-10 font-sans text-xs text-esmeralda/70">
        Con base en criterios públicos de CONDUSEF y PROFECO.
      </p>
    </div>
  );
}
