// Aviso de privacidad PROVISIONAL (estructura LFPDPPP: responsable, datos, finalidades, ARCO,
// transferencias, cambios). Redactado por el equipo; pendiente de revisión legal y de los datos
// del responsable (razón social, domicilio, correo) que entrega Ricardo.

import Header from "@/components/Header";
import { BRAND } from "@/lib/constants";
import { AVISO_VERSION } from "@/lib/leads/validar";
import { CORREO_CONTACTO } from "@/lib/constants";

export const metadata = {
  title: "Aviso de privacidad — CAP & Co.",
  robots: { index: false, follow: false },
};

const CORREO_PRIVACIDAD = CORREO_CONTACTO;
const RESPONSABLE = "[razón social pendiente]";
const DOMICILIO = "[domicilio pendiente], Ciudad de México";

export default function AvisoPrivacidad() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-24">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-esmeralda/60">Aviso de privacidad</p>
        <h1 className="mt-2 font-serif text-[clamp(2rem,4.5vw,3rem)] leading-tight">
          Qué datos tomamos y para qué.
        </h1>
        <p className="mt-4 font-sans text-sm text-esmeralda/60">
          Versión {AVISO_VERSION}. Documento provisional, en revisión legal.
        </p>

        <div className="prose-capco mt-10 space-y-8 font-sans text-[1.0625rem] leading-relaxed text-esmeralda/90">
          <Seccion titulo="Responsable">
            <p>
              {RESPONSABLE}, que opera bajo la marca {BRAND.nombre} ({BRAND.slogan}), con domicilio en{" "}
              {DOMICILIO}, es responsable del tratamiento de tus datos personales conforme a la Ley Federal de
              Protección de Datos Personales en Posesión de los Particulares.
            </p>
          </Seccion>

          <Seccion titulo="Qué datos recabamos">
            <p>
              El asistente virtual de esta página no solicita ni guarda datos personales. Solo registra, de forma
              anónima, el tipo de consulta (por ejemplo, &ldquo;va a empeñar por primera vez&rdquo;), un resumen breve
              sin datos identificables, la fecha y la fuente de la visita, asociados a un código de seguimiento.
            </p>
            <p>
              Si decides dejarnos tu nombre, tu número de WhatsApp y, si quieres, tu correo en el formulario,
              recabamos únicamente esos datos, con tu consentimiento expreso. También registramos, de forma anónima
              (sin IP ni datos personales), qué páginas del sitio se visitan y de qué campaña vienen.
            </p>
            <p>
              Si subes una foto de tu boleta al asistente virtual, la imagen se envía en ese momento a nuestro
              proveedor de inteligencia artificial únicamente para leer los datos del préstamo (institución, montos,
              tasa, fechas y descripción de la prenda). No guardamos la foto en nuestros sistemas ni en tu navegador,
              y el asistente no usa ni repite tu nombre, domicilio o número de contrato. Puedes taparlos antes de
              tomar la foto. Al subirla, se te pide tu consentimiento.
            </p>
            <p>
              Para proteger el servicio contra abusos registramos, por un máximo de 48 horas, un identificador
              cifrado derivado de tu dirección IP (no la IP en sí) y cuántos mensajes has enviado. Además, guardamos
              un registro técnico de errores que se borra a los 90 días.
            </p>
            <p>De cada conversación con el asistente virtual guardamos, sin tu nombre ni tu teléfono:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>que abriste el chat, cuántos mensajes enviaste, si subiste una foto y si se hizo una cotización;</li>
              <li>
                un resumen breve generado automáticamente, sin datos que te identifiquen ni motivos personales
                sensibles;
              </li>
              <li>
                si decides contestarlo, el perfil opcional del chat: tu caso, rango de edad, qué empeñaste, alcaldía o
                estado y cómo nos conociste (cada pregunta admite &ldquo;Prefiero no decir&rdquo;).
              </li>
            </ul>
            <p>
              No guardamos el texto de la conversación. Este registro se borra a los 180 días. Si después nos dejas
              tus datos para una cita, lo vinculamos a tu caso y se conserva con él.
            </p>
            <p>
              Cuando nos escribes por WhatsApp y nos compartes tu boleta de empeño, recabamos los datos que aparezcan
              en ella (nombre, número de contrato, monto, institución) y los que tú nos proporciones para revisar tu caso.
            </p>
          </Seccion>

          <Seccion titulo="Para qué los usamos">
            <p>Finalidades primarias: contactarte por llamada, WhatsApp o correo cuando lo solicitas; revisar tu boleta y orientarte sobre tasas, plazos, costo total y opciones; coordinar el cambio de tu boleta con la casa de empeño a la que decidas cambiarte (cita y datos del préstamo); dar seguimiento a tu consulta: si no coincidimos, hasta tres recordatorios en una semana hábil por WhatsApp o llamada y, si confirmaste tu correo, por correo (cada correo trae un enlace para dejar de recibirlos). Puedes pedir en cualquier momento que no te contactemos. Para priorizar la atención, un sistema clasifica tu caso con los números de la cotización y un resumen sin tus datos personales; si el sistema concluye que el cambio no te conviene, una persona del equipo lo revisa antes de dejar de contactarte. El equipo organiza los casos en un sistema interno y puede usar asistentes de inteligencia artificial de nuestro proveedor para consultarlos, bajo las mismas obligaciones de confidencialidad.</p>
            <p>Finalidades secundarias: estadísticas internas anónimas sobre el tipo de consultas recibidas y el perfil opcional del chat, para mejorar el servicio y decidir dónde y cómo darlo a conocer (por ejemplo, en qué redes o zonas anunciarnos). Puedes oponerte a esta finalidad escribiendo al correo indicado abajo.</p>
            <p>No usamos tus datos para publicidad de terceros ni los vendemos.</p>
          </Seccion>

          <Seccion titulo="Con quién los compartimos">
            <p>
              No transferimos tus datos a terceros, salvo cuando aceptas la cita para hacer el cambio de tu boleta:
              en ese momento compartimos tu nombre, tu teléfono y los datos de tu boleta con la casa de empeño a la
              que decides cambiarte, para coordinar el trámite. Si esa casa nos paga una tarifa por el cambio, a ti no
              te cuesta nada. También cuando lo exija la ley. Nuestros proveedores
              tecnológicos (alojamiento web, base de datos, mensajería e inteligencia artificial, algunos con servidores
              fuera de México) tratan los datos únicamente por cuenta nuestra y bajo obligaciones de confidencialidad.
            </p>
          </Seccion>

          <Seccion titulo="Cuánto tiempo los conservamos">
            <p>
              Los datos de contacto y de tu consulta se conservan mientras dure la atención de tu caso y hasta 12 meses
              después, salvo que solicites antes su eliminación. Si el cambio se concretó, conservamos hasta 5 años
              solo lo necesario para la factura a la casa de empeño, como lo exige la ley fiscal. Los registros anónimos de estadística se conservan sin
              límite, pues no te identifican.
            </p>
          </Seccion>

          <Seccion titulo="Tus derechos (ARCO)">
            <p>
              Puedes acceder, rectificar, cancelar u oponerte al tratamiento de tus datos, así como revocar tu
              consentimiento, escribiendo a {CORREO_PRIVACIDAD} con tu nombre, el código de seguimiento si lo tienes y
              la solicitud concreta. Respondemos en un máximo de 20 días hábiles.
            </p>
          </Seccion>

          <Seccion titulo="Cambios a este aviso">
            <p>
              Si este aviso cambia, publicaremos la nueva versión en esta misma página con su fecha. La versión que
              aceptaste al dejar tus datos queda registrada.
            </p>
          </Seccion>
        </div>

        <p className="mt-14 font-sans text-sm text-esmeralda/60">
          <a href="/" className="underline underline-offset-4">Volver a la página principal</a>
        </p>
      </main>
    </>
  );
}

function Seccion({ titulo, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-2xl">{titulo}</h2>
      {children}
    </section>
  );
}
