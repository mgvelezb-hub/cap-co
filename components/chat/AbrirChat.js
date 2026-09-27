"use client";

// Botón que abre el chat desde cualquier parte de la página (evento que escucha ChatWidget).
// `mensaje` (opcional) se envía solo al abrir, como si la persona lo hubiera escrito.
export default function AbrirChat({ className, children, mensaje = null }) {
  return (
    <button type="button" aria-haspopup="dialog" className={className} onClick={() => window.dispatchEvent(new CustomEvent("capco:abrir-chat", { detail: { mensaje } }))}>
      {children}
    </button>
  );
}
