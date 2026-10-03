// Pagos y reembolsos. PROVISIONAL: la regla de cobro la fijó Mau el 3-oct-2026 (7 % del ahorro,
// 0 % por promoción en cambios concretados hasta el 30-abr-2027; ninguna casa paga). Plazos, forma
// de pago e IVA por confirmar con el abogado y el contador. La regla vive en lib/chatbot/comision.js.
import { PaginaLegal, Seccion, Lista } from "@/components/Legal";
import { BRAND, CORREO_CONTACTO } from "@/lib/constants";
import { PrecioComision, CondicionesComision } from "@/components/Comision";

export const metadata = {
  title: "Pagos y reembolsos — CAP & Co.",
  description: "Cuándo cobramos, cuánto y cómo te devolvemos si algo no salió como te dijimos.",
  robots: { index: false, follow: false },
};

export default function Reembolsos() {
  return (
    <PaginaLegal etiqueta="Pagos y reembolsos" titulo="Cuándo pagas, cuánto y cómo te devolvemos.">
      <Seccion titulo="Lo que no te cuesta">
        <p>Revisar tu boleta, usar el asistente, comparar casas y recibir nuestra recomendación no tiene costo. Ninguna casa de empeño nos paga.</p>
      </Seccion>

      <Seccion titulo="Cuándo cobramos">
        <p>Solo si te ayudamos a cambiar tu boleta y el cambio se concreta. Nuestra comisión es <PrecioComision /> <CondicionesComision /></p>
        <Lista>
          <li><strong>Cómo se calcula el ahorro:</strong> lo que pagarías quedándote donde estás, menos lo que pagarías en la casa nueva, en los meses que nos dijiste que necesitas.</li>
          <li><strong>Antes de cualquier trámite</strong> te damos por escrito el ahorro estimado, el monto exacto de nuestra comisión (hoy $0 por la promoción) y lo que te queda. Si no estás de acuerdo, no avanzamos y no pagas nada.</li>
          <li><strong>Cuándo pagas:</strong> después de que la casa nueva compró tu boleta y tienes tu nuevo contrato. Nunca por adelantado.</li>
          <li><strong>Cómo pagas:</strong> por transferencia a la cuenta a nombre del titular de {BRAND.nombre}; nunca en efectivo a un asesor ni a cuentas de terceros. Te damos factura si la pides.</li>
          <li>No hay otros cargos, membresías ni pagos recurrentes.</li>
        </Lista>
      </Seccion>

      <Seccion titulo="Cuándo te devolvemos">
        <Lista>
          <li>Si la casa nueva no respetó la tasa o el préstamo que te confirmamos y tu ahorro real fue menor, te devolvemos la diferencia de nuestra comisión.</li>
          <li>Si el cambio no se concretó o se revirtió por una causa que no es tuya, te devolvemos todo lo que nos hayas pagado.</li>
          <li>Si te cobramos de más por error, te devolvemos la diferencia.</li>
        </Lista>
        <p>Pídelo a {CORREO_CONTACTO} dentro de los 30 días naturales siguientes al pago, con tu código de seguimiento y, si aplica, tu nuevo contrato. Te respondemos en un máximo de 5 días hábiles y, si procede, te devolvemos por el mismo medio en un máximo de 10 días hábiles.</p>
      </Seccion>

      <Seccion titulo="Si no estás conforme">
        <p>Escríbenos primero para resolverlo. También puedes acudir a la Procuraduría Federal del Consumidor (PROFECO): Teléfono del Consumidor 55 5568 8722 y 800 468 8722, o Concilianet.</p>
      </Seccion>
    </PaginaLegal>
  );
}

// La comisión cambia sola el 1-may-2027 (fin de la promoción): la página se regenera cada hora.
export const revalidate = 3600;
