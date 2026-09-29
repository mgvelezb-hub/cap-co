"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// La escena 3D (three.js) se descarga hasta que "¿Quiénes somos?" se acerca a la pantalla, para no
// competir con el hero. Mientras, el hueco conserva su tamaño y no brinca el contenido.
const Empeno3D = dynamic(() => import("./Empeno3D"), { ssr: false });

export default function Empeno3DDiferido({ className = "" }) {
  const ref = useRef(null);
  const [cerca, setCerca] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setCerca(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}>
      {cerca && <Empeno3D className="h-full w-full" />}
    </div>
  );
}
