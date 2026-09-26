// Piezas visuales del CRM (componentes de servidor).
import { claseNombre } from "@/lib/formato";

const COLOR_CLASE = {
  aplica_auto: "bg-esmeralda text-sobre-verde",
  revision: "bg-amber-100 text-ambar",
  no_aplica: "bg-esmeralda/10 text-esmeralda/70",
  taller: "bg-granate/10 text-granate",
};

export function Clase({ clase, pendiente = false }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_CLASE[clase] || "bg-esmeralda/5 text-esmeralda/60"}`}>
      {claseNombre(clase)}
      {pendiente && <span title="Pendiente de aprobar" aria-label="pendiente de aprobar">●</span>}
    </span>
  );
}

export function SinContestar({ info }) {
  if (!info || info.estado === "al_dia") return <span className="text-xs text-esmeralda/50">al día</span>;
  const urgente = info.dias >= 3;
  const texto = info.estado === "sin_atender" ? "sin atender" : "sin respuesta";
  return (
    <span className={`whitespace-nowrap text-xs font-medium ${urgente ? "text-granate" : "text-ambar"}`}>
      {info.dias} {info.dias === 1 ? "día" : "días"} {texto}
    </span>
  );
}

export function Cifra({ etiqueta, valor, nota, href, alerta = false }) {
  const cuerpo = (
    <>
      <p className="text-xs uppercase tracking-[0.12em] text-esmeralda/60">{etiqueta}</p>
      <p className={`mt-1 font-serif text-3xl tabular-nums ${alerta ? "text-granate" : ""}`}>{valor}</p>
      {nota && <p className="mt-0.5 text-xs text-esmeralda/60">{nota}</p>}
    </>
  );
  const clase = "block rounded-xl border border-esmeralda/10 bg-papel-alto p-4";
  return href ? (
    <a href={href} className={`${clase} transition-colors hover:border-esmeralda/30`}>
      {cuerpo}
    </a>
  ) : (
    <div className={clase}>{cuerpo}</div>
  );
}

export function Seccion({ titulo, accion, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

export function Vacio({ children }) {
  return <p className="rounded-xl border border-dashed border-esmeralda/15 p-4 text-sm text-esmeralda/60">{children}</p>;
}

export const BOTON = "inline-flex min-h-[40px] items-center justify-center rounded-full bg-esmeralda px-4 text-sm font-medium text-sobre-verde disabled:opacity-40";
export const BOTON_SUAVE = "inline-flex min-h-[40px] items-center justify-center rounded-full border border-esmeralda/25 px-4 text-sm hover:border-esmeralda";
export const CAMPO = "rounded-lg border border-esmeralda/20 bg-papel px-3 py-2 text-base sm:text-sm";
