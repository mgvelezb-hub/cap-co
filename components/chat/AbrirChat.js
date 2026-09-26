"use client";

// Botón que abre el chat desde cualquier parte de la página (evento que escucha ChatWidget).
export default function AbrirChat({ className, children }) {
  return (
    <button type="button" aria-haspopup="dialog" className={className} onClick={() => window.dispatchEvent(new Event("capco:abrir-chat"))}>
      {children}
    </button>
  );
}
