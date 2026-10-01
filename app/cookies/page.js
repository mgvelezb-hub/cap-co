// Política de cookies. Debe coincidir con el inventario real: el sitio público no pone cookies ni
// rastreadores de terceros; solo usa sessionStorage (components/Visitas.js, components/chat/*).
import { PaginaLegal, Seccion } from "@/components/Legal";

export const metadata = {
  title: "Política de cookies — CAP & Co.",
  description: "Qué guarda este sitio en tu navegador y cómo borrarlo.",
  robots: { index: false, follow: false },
};

const ALMACENADO = [
  ["Identificador de la visita", "Un número aleatorio por pestaña para contar visitas sin saber quién eres."],
  ["Campaña y dominio de origen", "De qué anuncio o sitio llegaste (utm y dominio), para saber qué publicidad funciona."],
  ["Conversación del chat", "Tus mensajes y respuestas en esta pestaña, para que no se pierdan al moverte por la página."],
  ["Código de la conversación", "Une los mensajes de una misma conversación en nuestro registro anónimo."],
  ["Consentimiento de la foto", "Recuerda que ya aceptaste el análisis de tu boleta, para no preguntarte cada vez."],
];

export default function Cookies() {
  return (
    <PaginaLegal etiqueta="Política de cookies" titulo="Qué guarda este sitio en tu navegador.">
      <Seccion titulo="No usamos cookies">
        <p>Este sitio no pone cookies ni usa herramientas de rastreo o publicidad de terceros (como píxeles de redes sociales o Google Analytics). Las fuentes tipográficas y el código se sirven desde nuestro propio dominio. Por eso no te mostramos un aviso para aceptar cookies.</p>
      </Seccion>

      <Seccion titulo="Lo que sí guardamos, y solo mientras la pestaña esté abierta">
        <p>Usamos el almacenamiento de sesión de tu navegador, que se borra solo al cerrar la pestaña:</p>
        <div className="overflow-x-auto" role="region" aria-label="Datos guardados en tu navegador" tabIndex={0}>
          <table className="w-full border-collapse text-[0.95rem]">
            <thead>
              <tr>
                <th className="border-b border-esmeralda/30 py-2 pr-4 text-left font-semibold">Qué</th>
                <th className="border-b border-esmeralda/30 py-2 text-left font-semibold">Para qué</th>
              </tr>
            </thead>
            <tbody>
              {ALMACENADO.map(([que, para]) => (
                <tr key={que} className="border-b border-esmeralda/10 align-top">
                  <td className="py-2 pr-4">{que}</td>
                  <td className="py-2">{para}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>El identificador de la visita, la campaña y el dominio de origen se envían a nuestro servidor para estadísticas, sin tu nombre ni tu IP. Puedes oponerte a esa finalidad como lo indica el <a href="/aviso-de-privacidad" className="underline underline-offset-4">aviso de privacidad</a>.</p>
      </Seccion>

      <Seccion titulo="Cómo borrarlo o bloquearlo">
        <p>Cierra la pestaña y todo se borra. También puedes bloquear el almacenamiento de sitios en la configuración de privacidad de tu navegador o usar una ventana privada; el sitio y el chat siguen funcionando, aunque el chat no recordará la conversación si recargas la página.</p>
      </Seccion>

      <Seccion titulo="Enlaces a WhatsApp">
        <p>Si tocas un botón de WhatsApp, sales de este sitio y se aplican las políticas de WhatsApp (Meta).</p>
      </Seccion>
    </PaginaLegal>
  );
}
