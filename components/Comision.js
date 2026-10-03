// Precio de la comisión en las páginas: el 7 % tachado y 0 % durante la promoción de lanzamiento;
// desde el 1 de mayo de 2027, solo el 7 %. La regla vive en lib/chatbot/comision.js.
import { LISTA_TEXTO, enPromocion } from "@/lib/chatbot/comision";

export function PrecioComision() {
  if (!enPromocion()) return <strong>{LISTA_TEXTO}</strong>;
  return (
    <>
      <s className="opacity-70">
        <span className="sr-only">precio regular </span>
        {LISTA_TEXTO}
      </s>{" "}
      <strong>0 %</strong>
    </>
  );
}

/** Condiciones de la comisión en una frase, tras el precio. */
export function CondicionesComision() {
  return enPromocion() ? (
    <>
      de tu ahorro por promoción de lanzamiento: en cambios concretados hasta el 30 de abril de 2027 no te cobramos
      nada. Después, 7 % de tu ahorro, solo si el cambio se concreta y siempre dicho por escrito antes del trámite.
    </>
  ) : (
    <>de tu ahorro, solo si el cambio se concreta y siempre dicho por escrito antes del trámite.</>
  );
}
