// Términos y condiciones. PROVISIONAL, en revisión legal. Mismo modelo de cobro que el chat
// (lib/chatbot/cotizacion.js → COMISION_USUARIO) y la página de pagos y reembolsos.
import { PaginaLegal, Seccion, Lista } from "@/components/Legal";
import { BRAND, CORREO_CONTACTO, LEGAL } from "@/lib/constants";

export const metadata = {
  title: "Términos y condiciones — CAP & Co.",
  description: "Las reglas para usar el sitio, el asistente virtual y nuestra asesoría.",
  robots: { index: false, follow: false },
};

export default function Terminos() {
  return (
    <PaginaLegal etiqueta="Términos y condiciones" titulo="Cómo funciona nuestro servicio.">
      <Seccion titulo="Quiénes somos">
        <p>
          {BRAND.nombre} ({BRAND.slogan}) es una marca de {LEGAL.responsable}, RFC {LEGAL.rfc}, con domicilio en{" "}
          {LEGAL.domicilio}. Teléfono {LEGAL.telefono}; correo {CORREO_CONTACTO}. Al usar este sitio o nuestro asistente
          aceptas estos términos.
        </p>
      </Seccion>

      <Seccion titulo="Qué hacemos y qué no">
        <p>Te explicamos tu boleta de empeño, calculamos cuánto vas a pagar, comparamos lo que publican las casas de empeño y, si te conviene y lo pides, te acompañamos a cambiar tu boleta.</p>
        <Lista>
          <li>No prestamos dinero, no recibimos prendas, no compramos joyas ni boletas y no somos casa de empeño.</li>
          <li>No recibimos ni manejamos tu dinero: los pagos del préstamo los haces tú directamente a la casa de empeño.</li>
          <li>Nuestra orientación no es asesoría legal ni fiscal, y la decisión final siempre es tuya.</li>
        </Lista>
      </Seccion>

      <Seccion titulo="El asistente virtual usa inteligencia artificial">
        <p>El chat es un asistente automático. Sus cálculos usan los datos que tú das, el precio de referencia del oro y la plata del momento y las cifras que cada casa publica, con su fuente y fecha. Son estimaciones, no ofertas: las condiciones finales las fija la casa de empeño al valuar tu pieza y te las confirma antes de que firmes. El asistente puede equivocarse; si algo no te cuadra, pide hablar con una persona.</p>
      </Seccion>

      <Seccion titulo="Cuánto cuesta">
        <Lista>
          <li>Revisar tu boleta, usar el asistente y comparar casas no tiene costo.</li>
          <li>Si te ayudamos a cambiar tu boleta a una casa que le paga una tarifa a {BRAND.nombre} (hoy, Montepío Luz Saviñón), para ti es gratis.</li>
          <li>Si te ayudamos a cambiarla a otra casa, nos pagas el 10 % de tu ahorro, solo si el cambio se concreta. Te decimos el monto por escrito antes de cualquier trámite. Estamos en pláticas con las casas para que ellas paguen la tarifa y sea gratis para ti.</li>
          <li>Nunca te pedimos pagos por adelantado.</li>
        </Lista>
        <p>Detalle en <a href="/reembolsos" className="underline underline-offset-4">pagos y reembolsos</a>.</p>
      </Seccion>

      <Seccion titulo="Comparaciones y marcas de terceros">
        <p>Los nombres de casas de empeño e instituciones que aparecen en el sitio y en el chat son marcas de sus titulares. Los usamos solo para informarte y comparar con sus cifras publicadas; no implican relación, patrocinio ni respaldo, salvo la tarifa que te indicamos expresamente. La marca {BRAND.nombre} está en trámite ante el IMPI.</p>
      </Seccion>

      <Seccion titulo="Lo que te pedimos">
        <Lista>
          <li>Ser mayor de edad y darnos datos verdaderos.</li>
          <li>No subir identificaciones oficiales ni datos de otras personas, y tapar tu nombre y número de contrato en la foto de la boleta.</li>
          <li>No usar el sitio o el asistente para fines ajenos a tu consulta ni intentar alterarlos.</li>
        </Lista>
      </Seccion>

      <Seccion titulo="Responsabilidad">
        <p>Respondemos por la calidad de nuestra orientación y por cumplir lo que te ofrecemos. No respondemos por las decisiones, condiciones o servicios de las casas de empeño. Nada de lo anterior limita los derechos que te da la Ley Federal de Protección al Consumidor.</p>
      </Seccion>

      <Seccion titulo="Contenido del sitio">
        <p>Los textos, el diseño, los cálculos y el código del sitio pertenecen a su titular. Puedes compartirlos con fines personales citando la fuente; no los copies para fines comerciales sin permiso.</p>
      </Seccion>

      <Seccion titulo="Quejas y ley aplicable">
        <p>Si algo no salió bien, escríbenos a {CORREO_CONTACTO} o llámanos al {LEGAL.telefono}; te respondemos en un máximo de 5 días hábiles. También puedes acudir a la Procuraduría Federal del Consumidor (PROFECO): Teléfono del Consumidor 55 5568 8722 y 800 468 8722, o Concilianet. Estos términos se rigen por las leyes federales de México.</p>
      </Seccion>

      <Seccion titulo="Cambios">
        <p>Si cambiamos estos términos, publicaremos la nueva versión en esta página con su fecha. Los cambios no afectan un cambio de boleta que ya acordamos contigo por escrito.</p>
      </Seccion>
    </PaginaLegal>
  );
}
