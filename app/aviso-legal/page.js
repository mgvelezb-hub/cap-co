// Aviso legal. Provisional, pendiente de revisión del abogado de Ricardo. Nunca decir
// "independiente" (hay tasas preferentes negociadas y CAP & Co. cobra comisión por el cambio) ni
// nombrar a la casa aliada: su nombre es interno (decisión de Mau, 27-sep-2026).
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BRAND, CORREO_CONTACTO } from "@/lib/constants";

export const metadata = {
  title: "Aviso legal — CAP & Co.",
  description: "Qué es CAP & Co., cómo comparamos y cómo cobramos.",
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
              recibimos prendas. Comparamos tu caso con datos públicos de varias instituciones. Con algunas casas de
              empeño aliadas tenemos tasas preferentes negociadas; por eso, con frecuencia, la opción que más te
              ahorra es una de ellas. Te decimos cuál y sus condiciones antes de cualquier trámite; si en tu caso no
              conviene, te lo decimos.
            </p>
          </Seccion>
          <Seccion titulo="Cómo cobramos">
            <p>
              Revisar tu boleta no tiene costo. Si decides hacer el cambio a otra casa de empeño con nuestro apoyo,
              cobramos una comisión. Antes de cualquier trámite te decimos el monto (IVA incluido) y cuánto te
              ahorrarías ya con ella; si con la comisión no te conviene, no avanzamos.
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
              Dinero por adelantado ni que nos entregues tu boleta o tu pieza. Todo lo que firmes lo firmas tú, en la
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
