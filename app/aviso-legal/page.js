// Aviso legal. Provisional, pendiente de revisión legal. Nunca decir "independiente". Desde el
// 1-oct-2026 se nombran instituciones con sus cifras públicas. Desde el 3-oct-2026 ninguna casa nos
// paga: comisión de 7 % del ahorro, 0 % por promoción hasta el 30-abr-2027 (lib/chatbot/comision.js). Mismo mensaje
// que el chat (lib/chatbot/system.js), las preguntas frecuentes y /reembolsos.
import { PrecioComision, CondicionesComision } from "@/components/Comision";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BRAND, CORREO_CONTACTO } from "@/lib/constants";

export const metadata = {
  title: "Aviso legal — CAP & Co.",
  description: "Qué es CAP & Co., cómo comparamos y cómo nos pagan.",
  robots: { index: false, follow: false },
};

function Seccion({ titulo, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-2xl">{titulo}</h2>
      {children}
    </section>
  );
}

export default function AvisoLegal() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-24">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-esmeralda/75">Aviso legal</p>
        <h1 className="mt-2 font-serif text-[clamp(2rem,4.5vw,3rem)] leading-tight">Quiénes somos y cómo trabajamos.</h1>
        <p className="mt-4 font-sans text-sm text-esmeralda/75">Documento provisional, en revisión legal.</p>
        <div className="mt-10 space-y-8 font-sans text-[1.0625rem] leading-relaxed text-esmeralda/90">
          <Seccion titulo="Qué somos">
            <p>
              {BRAND.nombre} ({BRAND.slogan}) es asesoría prendaria: <strong>no otorgamos préstamos</strong> ni
              recibimos prendas. Comparamos tu caso con las tasas, costos y montos de préstamo que publica cada casa de
              empeño, con su fuente y fecha, y con el precio del oro del día. Si alguna te ahorra de forma clara, te
              decimos cuál y sus condiciones antes de cualquier trámite; si ninguna te conviene, te decimos que te
              quedes donde estás.
            </p>
          </Seccion>
          <Seccion titulo="Cómo nos pagan">
            <p>
              Revisar tu boleta y comparar casas no te cuesta, y ninguna casa de empeño nos paga. Si te acompañamos a
              cambiar tu boleta, nuestra comisión es <PrecioComision /> <CondicionesComision /> La comparación se hace con las cifras
              que publica cada casa y con lo que de verdad te queda, y cuando el cambio no te deja un ahorro claro (al
              menos $500 o 5 % de lo que pagarías), te lo decimos y no avanzamos. También tenemos ingresos por talleres
              de educación financiera para empresas. Detalle en{" "}
              <a href="/reembolsos" className="underline underline-offset-4">pagos y reembolsos</a>.
            </p>
          </Seccion>
          <Seccion titulo="Cifras y cálculos">
            <p>
              Los cálculos del sitio y del asistente virtual son estimaciones con los datos que tú das y con
              información pública de las instituciones (tasas, CAT, fuentes y fechas indicadas en cada caso). No son
              una oferta: las condiciones finales las fija la casa de empeño al valuar tu pieza y se confirman antes
              de que firmes o pagues algo. Los precios de metales son referencias internacionales, no lo que presta
              una casa de empeño.
            </p>
          </Seccion>
          <Seccion titulo="Lo que nunca te pediremos">
            <p>
              Ningún pago por adelantado, ni que nos entregues tu boleta o tu pieza. El único cobro posible es el
              de la sección anterior, después de que el cambio se concreta, por transferencia a nombre del titular. Todo lo que firmes lo firmas tú, en la
              casa de empeño, a tu nombre.
            </p>
          </Seccion>
          <Seccion titulo="Tus derechos">
            <p>
              Las casas de empeño están obligadas a registrarse ante PROFECO y a entregarte un contrato con avalúo,
              préstamo, tasa, CAT y plazos. Si tienes una queja con una casa de empeño, puedes presentarla ante
              PROFECO. Para cualquier duda sobre nosotros, escríbenos a{" "}
              <a href={`mailto:${CORREO_CONTACTO}`} className="underline underline-offset-4">{CORREO_CONTACTO}</a>.
            </p>
            <p>
              El tratamiento de tus datos personales se rige por nuestro{" "}
              <a href="/aviso-de-privacidad" className="underline underline-offset-4">aviso de privacidad</a>.
            </p>
          </Seccion>
        </div>
      </main>
      <Footer />
    </>
  );
}

// La comisión cambia sola el 1-may-2027 (fin de la promoción): la página se regenera cada hora.
export const revalidate = 3600;
