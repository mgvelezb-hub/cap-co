// Aviso de privacidad integral (LFPDPPP, DOF 20-mar-2025, art. 15; Reglamento 2011 donde no la
// contradice). PROVISIONAL: faltan los datos del responsable (lib/constants.js → LEGAL) y la
// revisión del abogado. Cada plazo de conservación coincide con el código; si cambia uno, cambia aquí.
//   chat: lib/metricas/conversaciones.js (180 días) · visitas: lib/crm/trafico.js (13 meses)
//   leads: lib/leads/repo.js (12 meses) · errores: lib/alertas/eventos.js (90 días)
//   límites de uso: lib/chatbot/ratelimit.js (se borran después de 2 días, en el cron de días hábiles)

import { PaginaLegal, Seccion, Lista } from "@/components/Legal";
import { BRAND, CORREO_CONTACTO, LEGAL } from "@/lib/constants";
import { AVISO_VERSION } from "@/lib/leads/validar";

export const metadata = {
  title: "Aviso de privacidad — CAP & Co.",
  description: "Qué datos personales tomamos, para qué, con quién los compartimos y cómo ejercer tus derechos.",
  robots: { index: false, follow: false },
};

export default function AvisoPrivacidad() {
  return (
    <PaginaLegal etiqueta="Aviso de privacidad" titulo="Qué datos tomamos y para qué." version={AVISO_VERSION}>
      <Seccion titulo="Quién es responsable de tus datos">
        <p>
          {LEGAL.responsable}, que opera bajo la marca {BRAND.nombre} ({BRAND.slogan}), con domicilio en{" "}
          {LEGAL.domicilio}, es responsable de tus datos personales conforme a la Ley Federal de Protección de Datos
          Personales en Posesión de los Particulares. Contacto para privacidad: {CORREO_CONTACTO}.
        </p>
      </Seccion>

      <Seccion titulo="Qué datos tomamos">
        <p><strong>Al navegar.</strong> No usamos cookies en este sitio. Usamos el almacenamiento temporal de tu navegador (se borra al cerrar la pestaña) para un identificador aleatorio de la visita, la página que ves, la campaña con la que llegaste (utm) y el dominio del sitio de donde vienes. Detalle en la <a href="/cookies" className="underline underline-offset-4">política de cookies</a>.</p>
        <p><strong>En el chat.</strong> Lo que escribes se envía a nuestro proveedor de inteligencia artificial para que el asistente te conteste. No guardamos el texto de la conversación en nuestros sistemas (solo queda en tu navegador mientras la pestaña esté abierta). Sí guardamos, sin tu nombre ni tu teléfono: que abriste el chat, cuántos mensajes enviaste, si subiste una foto, si se hizo una cotización, un resumen breve generado automáticamente sin datos que te identifiquen y, solo si decides contestarlo, el perfil opcional (tu caso, rango de edad, qué empeñaste, alcaldía o estado y cómo nos conociste; cada pregunta admite &ldquo;Prefiero no decir&rdquo;).</p>
        <p><strong>Foto de tu boleta.</strong> Una boleta trae datos patrimoniales (montos, tasa, institución y la prenda). Por eso solo la analizamos si marcas tu consentimiento expreso antes de subirla. La imagen se envía en ese momento a nuestro proveedor de inteligencia artificial para leer los datos del préstamo y no la guardamos. Tapa tu nombre, domicilio y número de contrato antes de tomarla; el asistente no los usa ni los repite.</p>
        <p><strong>Si pides que te llamemos o agendas una cita.</strong> Tu nombre, tu WhatsApp y, si quieres, tu correo, además del día y la franja que elijas y los números de tu caso (préstamo, tasa, ahorro estimado). Los tomamos con tu consentimiento expreso en el formulario.</p>
        <p><strong>Si nos escribes por WhatsApp o correo.</strong> Lo que tú nos envíes, incluida tu boleta si la compartes.</p>
        <p><strong>Para seguridad.</strong> Un identificador cifrado derivado de tu dirección IP (no la IP) y cuántos mensajes envías, para evitar abusos; se borra en pocos días. Nuestro proveedor de alojamiento registra direcciones IP en sus bitácoras técnicas.</p>
        <p>No te pedimos datos sensibles (salud, religión, origen, opiniones políticas, etc.) ni identificaciones oficiales en el sitio. Por favor no los compartas en el chat.</p>
      </Seccion>

      <Seccion titulo="Para qué los usamos">
        <p><strong>Finalidades necesarias para darte el servicio:</strong></p>
        <Lista>
          <li>contestar tus dudas, revisar tu boleta y compararla con lo que publican las casas de empeño;</li>
          <li>llamarte o escribirte en la franja que elegiste para acordar tu cita, y hasta tres recordatorios en una semana hábil si no coincidimos (puedes pedir que no te contactemos en cualquier momento);</li>
          <li>coordinar el cambio de tu boleta con la casa de empeño que tú elijas, si decides hacerlo;</li>
          <li>calcular y, cuando aplica, cobrar nuestra tarifa (ver <a href="/reembolsos" className="underline underline-offset-4">pagos y reembolsos</a>) y emitir la factura;</li>
          <li>ordenar los casos: un sistema clasifica tu caso con los números de la cotización y un resumen sin tus datos personales; si concluye que el cambio no te conviene, una persona del equipo lo revisa antes de dejar de contactarte.</li>
        </Lista>
        <p><strong>Finalidades adicionales (puedes negarte):</strong> estadísticas internas sobre el tipo de consultas, el perfil opcional y de qué campaña llegan las visitas, para mejorar el servicio y decidir dónde anunciarnos. Si no quieres que usemos tus datos para esto, escríbenos a {CORREO_CONTACTO} con el asunto &ldquo;No estadísticas&rdquo;; negarte no afecta el servicio.</p>
        <p>No vendemos tus datos ni los usamos para publicidad de terceros.</p>
      </Seccion>

      <Seccion titulo="Con quién los compartimos">
        <p><strong>Con la casa de empeño que tú elijas, solo si decides hacer el cambio.</strong> Le compartimos tu nombre, tu teléfono y los datos de tu boleta para coordinar el trámite. Lo hacemos únicamente con tu consentimiento expreso, que das al marcar la casilla del formulario. Esa casa se vuelve responsable de esos datos conforme a su propio aviso de privacidad.</p>
        <p>También cuando lo exija una autoridad competente o la ley.</p>
        <p><strong>Proveedores que tratan datos por cuenta nuestra</strong> (no son transferencias: solo pueden usarlos para darnos su servicio, bajo obligaciones de confidencialidad):</p>
        <Lista>
          <li>Anthropic, PBC (Estados Unidos): inteligencia artificial del asistente, de la lectura de boletas, del resumen anónimo y de la clasificación de casos;</li>
          <li>Vercel Inc. (Estados Unidos): alojamiento del sitio y del sistema interno;</li>
          <li>Neon, Inc. (Estados Unidos): base de datos;</li>
          <li>Resend (Estados Unidos): envío de correos;</li>
          <li>WhatsApp (Meta): solo si tú nos escribes por WhatsApp o aceptas que te contactemos por ahí.</li>
        </Lista>
      </Seccion>

      <Seccion titulo="Cuánto tiempo los conservamos">
        <Lista>
          <li>Nombre, teléfono, correo y notas de tu caso: hasta 12 meses después de la última actividad, o antes si pides que los borremos.</li>
          <li>Si se concretó un cambio, los datos del cobro (monto, fecha y método) se conservan 5 años por obligación fiscal, sin tus datos de contacto.</li>
          <li>Registro anónimo de conversaciones del chat: 180 días.</li>
          <li>Registro anónimo de visitas: 13 meses.</li>
          <li>Identificador cifrado para evitar abusos: unos días. Registro técnico de errores: 90 días.</li>
        </Lista>
      </Seccion>

      <Seccion titulo="Tus derechos y cómo ejercerlos">
        <p>Puedes acceder a tus datos, rectificarlos, cancelarlos u oponerte a su uso (derechos ARCO), revocar tu consentimiento o limitar su uso, sin costo. Escribe a {CORREO_CONTACTO} con:</p>
        <Lista>
          <li>tu nombre y un medio para responderte;</li>
          <li>una forma de acreditar tu identidad (o la de tu representante);</li>
          <li>qué derecho quieres ejercer y sobre qué datos, y tu código de seguimiento si lo tienes.</li>
        </Lista>
        <p>Te respondemos en un máximo de 20 días hábiles. Para dejar de recibir correos, usa el enlace que viene en cada uno; para dejar de recibir llamadas o mensajes, pídelo por cualquier medio. También puedes inscribir tu teléfono en el Registro Público para Evitar Publicidad (REPEP) de PROFECO.</p>
        <p>Si consideras que no atendimos tu solicitud, puedes acudir a la autoridad en protección de datos personales, la Secretaría Anticorrupción y Buen Gobierno.</p>
      </Seccion>

      <Seccion titulo="Seguridad">
        <p>Protegemos tus datos con conexiones cifradas, accesos con contraseña solo para el equipo, registro de sus acciones sobre los casos y borrado programado. Si ocurriera una vulneración que afecte de forma significativa tus derechos, te avisaremos de inmediato.</p>
      </Seccion>

      <Seccion titulo="Cambios a este aviso">
        <p>Si este aviso cambia, publicaremos la nueva versión en esta página con su número y fecha. La versión que aceptaste al dejar tus datos queda registrada con tu caso.</p>
      </Seccion>
    </PaginaLegal>
  );
}
