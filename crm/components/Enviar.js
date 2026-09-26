"use client";

import { useFormStatus } from "react-dom";

/** Botón de envío que se deshabilita mientras la acción corre. */
export default function Enviar({ children, className, pendiente = "Guardando…", ...props }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} {...props}>
      {pending ? pendiente : children}
    </button>
  );
}
