import Logo from "@/components/Logo";
import AnimatedLogo from "@/components/AnimatedLogo";
import Gem3D from "@/components/Gem3D";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import Ticker from "@/components/Ticker";
import Boleta from "@/components/Boleta";
import Calculadora from "@/components/Calculadora";
import { WHATSAPP_URL, SOCIAL, BRAND } from "@/lib/constants";

function Hero() {
  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 py-16 md:px-8 lg:grid-cols-2 lg:gap-10">
        <div className="flex justify-center lg:justify-start">
          <div className="relative">
            <AnimatedLogo className="h-60 w-auto sm:h-72 md:h-80 lg:h-[28rem]" />
            <div className="pointer-events-none absolute left-1/2 top-[21%] h-[13%] w-[13%] -translate-x-1/2 -translate-y-1/2">
              <Gem3D className="h-full w-full" />
            </div>
          </div>
        </div>
        <Reveal delay={250} className="text-center lg:text-left">
          <h1 className="font-serif text-[clamp(2.75rem,6vw,4.75rem)] leading-[1.05] tracking-wide">
            {BRAND.nombre}
          </h1>
          <p className="mt-4 font-sans text-sm uppercase tracking-[0.28em] text-esmeralda/55 md:text-[15px]">
            {BRAND.slogan}
          </p>
          <p className="mx-auto mt-9 max-w-[42ch] font-sans text-lg leading-relaxed text-esmeralda/75 text-justify hyphens-auto lg:mx-0">
            Te explicamos exactamente qué firmaste, cuánto vas a pagar y qué
            opciones tienes. Con datos reales, no promesas.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-6 lg:justify-start">
            <a
              href={WHATSAPP_URL}
              className="rounded-full bg-esmeralda px-8 py-4 font-sans text-sm font-medium tracking-wide text-sobre-verde transition-transform duration-300 ease-expo hover:scale-[1.03]"
            >
              Cotiza tu boleta por WhatsApp
            </a>
          </div>
          <p className="mt-6 font-sans text-xs tracking-wide text-esmeralda/50">
            Asesoría gratuita · Sin registros · Discreción total
          </p>
        </Reveal>
      </div>
      <a
        href="#quienes-somos"
        aria-label="Conócenos"
        className="absolute bottom-8 hidden flex-col items-center gap-2 text-esmeralda/45 transition-colors duration-300 hover:text-esmeralda md:flex"
      >
        <span className="font-sans text-[11px] uppercase tracking-[0.2em]">Conócenos</span>
        <span className="h-8 w-px bg-current" />
      </a>
    </section>
  );
}

function Problema() {
  return (
    <section id="problema" className="bg-esmeralda text-sobre-verde">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <Reveal>
          <h2 className="max-w-[24ch] font-serif text-[clamp(1.9rem,3.8vw,3.1rem)] leading-tight">
            La industria del empeño vive de que no la entiendas.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-12 md:grid-cols-12">
          <Reveal delay={100} className="md:col-span-5">
            <p className="font-sans text-lg leading-relaxed text-sobre-verde/80 text-justify hyphens-auto">
              Millones de personas empeñan sin entender tasas, refrendos ni
              costos totales. Firmas hoy por una urgencia, y meses después
              sigues pagando sin saber exactamente por qué, ni cuánto falta, ni
              si había una opción mejor.
            </p>
          </Reveal>
          <Reveal delay={220} className="md:col-span-7">
            <div className="border-t border-sobre-verde/20 pt-8 md:border-l md:border-t-0 md:pl-12 md:pt-0">
              <p className="font-serif text-2xl leading-snug md:text-3xl">
                Nosotros traducimos tu boleta a lenguaje humano, comparamos
                opciones reales del mercado y te acompañamos si decides moverte
                a una mejor.
              </p>
              <p className="mt-6 font-sans leading-relaxed text-sobre-verde/70 text-justify hyphens-auto">
                Y si no te conviene moverte, también te lo decimos. Esa es la
                diferencia.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function SeccionBoleta() {
  return (
    <section id="boleta" className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
      <Reveal>
        <h2 className="max-w-[22ch] font-serif text-[clamp(1.9rem,3.8vw,3.1rem)] leading-tight">
          Así se lee una boleta de empeño.
        </h2>
        <p className="mt-5 max-w-[52ch] font-sans text-lg leading-relaxed text-esmeralda/75 text-justify hyphens-auto">
          Cuatro datos deciden cuánto vas a pagar. Tócalos para ver qué
          significan de verdad.
        </p>
      </Reveal>
      <Reveal delay={150} className="mt-14">
        <Boleta />
      </Reveal>
    </section>
  );
}

function SeccionCalculadora() {
  return (
    <section id="calculadora" className="bg-esmeralda text-sobre-verde">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <Reveal>
          <h2 className="max-w-[24ch] font-serif text-[clamp(1.9rem,3.8vw,3.1rem)] leading-tight">
            ¿Cuánto vas a pagar realmente?
          </h2>
          <p className="mt-5 max-w-[52ch] font-sans text-lg leading-relaxed text-sobre-verde/75 text-justify hyphens-auto">
            Mueve los números de tu caso y mira el costo completo, el que no
            aparece en el mostrador.
          </p>
        </Reveal>
        <Reveal delay={150} className="mt-14">
          <Calculadora />
        </Reveal>
      </div>
    </section>
  );
}

function ComoFunciona() {
  const pasos = [
    ["Nos escribes por WhatsApp", "Mandas foto de tu boleta. Sin registros, sin filas, sin explicaciones incómodas."],
    ["Te explicamos qué firmaste", "Tasa, refrendo, plazos y costo total, en palabras que cualquiera entiende."],
    ["Comparamos tus opciones", "Con datos reales del mercado evaluamos si tu empeño está bien donde está."],
    ["Tú decides, te acompañamos", "Si conviene moverte, te ayudamos con el traspaso paso a paso. Si no, te quedas con la información."],
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
      <Reveal>
        <h2 className="max-w-[22ch] font-serif text-[clamp(1.9rem,3.8vw,3.1rem)] leading-tight">
          Cuatro pasos. Ninguno cuesta.
        </h2>
      </Reveal>
      <div className="relative mt-16">
        <div className="absolute left-0 right-0 top-5 hidden h-px bg-esmeralda/15 lg:block" aria-hidden="true" />
        <div className="grid gap-12 lg:grid-cols-4 lg:gap-8">
          {pasos.map(([titulo, texto], i) => (
            <Reveal key={titulo} delay={i * 130} className={i % 2 === 1 ? "lg:mt-12" : ""}>
              <div>
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-esmeralda font-serif text-lg text-sobre-verde">
                  {i + 1}
                </div>
                <h3 className="mb-3 font-serif text-xl md:text-2xl">{titulo}</h3>
                <p className="max-w-[36ch] font-sans text-[15px] leading-relaxed text-esmeralda/70 text-justify hyphens-auto">{texto}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuienesSomos() {
  const situaciones = [
    "Empeñaste una pieza y no sabes cuánto debes en realidad",
    "Te ofrecieron “liquidar tu deuda” y no sabes si te conviene",
    "Quieres saber si hay una opción mejor que donde estás",
    "Vas a empeñar por primera vez y quieres entender antes de firmar",
  ];
  const valores = [
    ["Claridad radical", "si no lo entiende un niño de 10 años, se reescribe."],
    ["Datos, no opiniones", "cada comparación con números verificables."],
    ["Evaluación justa", "solo recomendamos un movimiento si te beneficia."],
    ["Discreción", "tu situación y tus piezas son asunto tuyo."],
  ];
  return (
    <section id="quienes-somos" className="border-t border-esmeralda/10 bg-papel-alto">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        {/* Por qué existimos */}
        <Reveal>
          <p className="max-w-[30ch] font-serif text-[clamp(1.9rem,3.8vw,3.1rem)] leading-tight">
            La industria del empeño vive de que no entiendas tu contrato.
            Nosotros elegimos lo contrario.
          </p>
        </Reveal>

        {/* Qué hacemos */}
        <Reveal delay={80} className="mt-10 max-w-[62ch]">
          <p className="font-sans text-lg leading-relaxed text-esmeralda/75 text-justify hyphens-auto">
            Revisamos tu boleta cláusula por cláusula, la comparamos contra
            otras opciones reales del mercado y te acompañamos si conviene
            moverte a una mejor. CONDUSEF recomienda comparar como mínimo tres
            instituciones antes de decidir: esa comparación es exactamente lo
            que hacemos por ti, sin costo.
          </p>
        </Reveal>

        {/* A quién ayudamos / Misión y visión */}
        <div className="mt-16 grid gap-16 lg:grid-cols-12">
          <Reveal delay={100} className="lg:col-span-5">
            <p className="font-sans text-sm uppercase tracking-[0.18em] text-esmeralda/50">
              Escríbenos si...
            </p>
            <ul className="mt-6 space-y-5">
              {situaciones.map((s) => (
                <li key={s} className="flex gap-4">
                  <svg viewBox="0 0 16 20" className="mt-1.5 h-4 w-auto shrink-0" aria-hidden="true">
                    <path d="M 8 0 L 16 10 L 8 20 L 0 10 Z" fill="#A32638" />
                  </svg>
                  <p className="font-sans leading-relaxed text-esmeralda/80 text-justify hyphens-auto">{s}</p>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={220} className="lg:col-span-7">
            <p className="font-sans leading-relaxed text-esmeralda/70 text-justify hyphens-auto">
              Que cualquier persona entienda exactamente qué firmó al empeñar,
              cuánto va a pagar y qué opciones tiene: esa es nuestra misión
              completa.
            </p>
            <p className="mt-5 max-w-[50ch] font-sans leading-relaxed text-esmeralda/70 text-justify hyphens-auto">
              Nuestra visión es ser la referencia de confianza en México para
              decisiones prendarias, donde la gente llega confundida y sale
              sabiendo qué le conviene.
            </p>
          </Reveal>
        </div>

        {/* Valores */}
        <Reveal delay={100} className="mt-20 border-t border-esmeralda/10 pt-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {valores.map(([titulo, texto], i) => (
              <div key={titulo} className={i > 0 ? "lg:border-l lg:border-esmeralda/10 lg:pl-8" : ""}>
                <h3 className="font-serif text-xl">{titulo}</h3>
                <p className="mt-2 font-sans text-[15px] leading-relaxed text-esmeralda/70 text-justify hyphens-auto">
                  {texto}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function IconFacebook(props) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <circle cx="16" cy="16" r="12.5" />
      <path d="M18.5 12h-2a1.8 1.8 0 0 0-1.8 1.8V15h3.6l-.5 3h-3.1v7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconInstagram(props) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <rect x="4.5" y="4.5" width="23" height="23" rx="6.5" />
      <circle cx="16" cy="16" r="5.8" />
      <circle cx="22.6" cy="9.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Footer() {
  return (
    <footer className="bg-esmeralda text-sobre-verde">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-12">
          <Reveal className="lg:col-span-8">
            <h2 className="max-w-[18ch] font-serif text-[clamp(2rem,4.5vw,3.6rem)] leading-tight">
              ¿Tienes una boleta que no entiendes?
            </h2>
            <a
              href={WHATSAPP_URL}
              className="mt-10 inline-block rounded-full bg-sobre-verde px-8 py-4 font-sans text-sm font-medium tracking-wide text-esmeralda transition-transform duration-300 ease-expo hover:scale-[1.03]"
            >
              Escríbenos por WhatsApp — es gratis
            </a>
            <div className="mt-10 flex items-center gap-4">
              <span className="font-sans text-xs uppercase tracking-[0.2em] text-sobre-verde/50">
                Síguenos
              </span>
              <a
                href={SOCIAL.facebook}
                aria-label="Facebook de CAP & Co."
                className="text-sobre-verde/70 transition-colors hover:text-sobre-verde"
              >
                <IconFacebook className="h-6 w-6" />
              </a>
              <a
                href={SOCIAL.instagram}
                aria-label="Instagram de CAP & Co."
                className="text-sobre-verde/70 transition-colors hover:text-sobre-verde"
              >
                <IconInstagram className="h-6 w-6" />
              </a>
            </div>
          </Reveal>
          <Reveal delay={200} className="hidden justify-end lg:col-span-4 lg:flex">
            <Logo className="h-40 w-auto" color="#F4F6F1" />
          </Reveal>
        </div>
        <div className="mt-20 flex flex-col items-start justify-between gap-4 border-t border-sobre-verde/15 pt-8 font-sans text-xs text-sobre-verde/60 md:flex-row md:items-center">
          <span>
            © {new Date().getFullYear()} {BRAND.nombre} · {BRAND.slogan}
          </span>
          <a href="#" className="underline-offset-4 hover:underline">
            Aviso de privacidad
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <QuienesSomos />
        <Ticker />
        <Problema />
        <SeccionBoleta />
        <SeccionCalculadora />
        <ComoFunciona />
      </main>
      <Footer />
    </>
  );
}
