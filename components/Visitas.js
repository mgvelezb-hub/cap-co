"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Cuenta páginas vistas de forma anónima: un id aleatorio por pestaña, la ruta y la campaña
// (utm) con la que llegó. Sin cookies, sin IP, sin datos personales.
const LLAVE = "capco-visita";

function sesion() {
  try {
    let id = sessionStorage.getItem(LLAVE);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(LLAVE, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function fuente() {
  const p = new URLSearchParams(window.location.search);
  const f = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) if (p.get(k)) f[k] = p.get(k);
  if (document.referrer && !document.referrer.startsWith(window.location.origin)) f.referrer = document.referrer.slice(0, 200);
  try {
    // La campaña se queda con la sesión aunque la persona navegue a otra página.
    if (Object.keys(f).length) sessionStorage.setItem(`${LLAVE}-fuente`, JSON.stringify(f));
    return Object.keys(f).length ? f : JSON.parse(sessionStorage.getItem(`${LLAVE}-fuente`) || "{}");
  } catch {
    return f;
  }
}

export default function Visitas() {
  const path = usePathname();
  useEffect(() => {
    if (!path || path.startsWith("/admin") || path.startsWith("/baja")) return;
    const cuerpo = JSON.stringify({ sesion: sesion(), path, fuente: fuente() });
    try {
      fetch("/api/visita", { method: "POST", headers: { "Content-Type": "application/json" }, body: cuerpo, keepalive: true }).catch(() => {});
    } catch {}
  }, [path]);
  return null;
}
