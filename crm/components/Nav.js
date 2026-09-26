"use client";

import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "Hoy"],
  ["/leads", "Leads"],
  ["/revision", "Revisión"],
  ["/citas", "Citas"],
  ["/trafico", "Tráfico"],
  ["/ajustes", "Ajustes"],
];

export default function Nav({ contadores = {} }) {
  const path = usePathname();
  return (
    <nav aria-label="Secciones" className="flex flex-wrap gap-1 md:flex-col">
      {LINKS.map(([href, texto]) => {
        const activo = href === "/" ? path === "/" : path.startsWith(href);
        const n = contadores[href];
        return (
          <a
            key={href}
            href={href}
            aria-current={activo ? "page" : undefined}
            className={`flex min-h-[44px] items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 text-sm ${
              activo ? "bg-esmeralda text-sobre-verde" : "text-esmeralda/80 hover:bg-esmeralda/5"
            }`}
          >
            {texto}
            {n > 0 && <span className={`rounded-full px-1.5 text-xs ${activo ? "bg-sobre-verde/20" : "bg-granate text-white"}`}>{n}</span>}
          </a>
        );
      })}
    </nav>
  );
}
