"use client";

import { useActionState } from "react";

// Formulario que llama una server action y muestra lo que pasó (éxito o error) en español.
export default function FormAccion({ accion, children, className = "", mensajeClase = "" }) {
  const [estado, formAction] = useActionState(accion, null);
  return (
    <form action={formAction} className={className}>
      {children}
      {estado?.mensaje && (
        <p role={estado.ok ? "status" : "alert"} className={`basis-full text-sm ${estado.ok ? "text-esmeralda" : "text-granate"} ${mensajeClase}`}>
          {estado.ok ? "✓ " : ""}
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}
