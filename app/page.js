import Logo from "@/components/Logo";
import AnimatedLogo from "@/components/AnimatedLogo";
import Gem3D from "@/components/Gem3DDiferida";
import RayaRombo from "@/components/RayaRombo";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import Ticker from "@/components/Ticker";
import Boleta from "@/components/Boleta";
import Calculadora from "@/components/Calculadora";
import { WHATSAPP_URL, SOCIAL, BRAND } from "@/lib/constants";
import AbrirChat from "@/components/chat/AbrirChat";
import { PREGUNTAS } from "@/lib/contenido/preguntas";
import Footer from "@/components/Footer";

function Hero() {
  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 py-16 md:px-8 lg:grid-cols-2 lg:gap-10">
        <div className="flex items-center justify-center gap-14 lg:justify-start">
          <div className="relative">
            <AnimatedLogo className="h-60 w-auto sm:h-72 md:h-80 lg:h-[28rem]" />
            <div className="pointer-events-none absolute left-1/2 top-[21%] h-[13%] w-[13%] -translate-x-1/2 -translate-y-1/2">
              <Gem3D className="h-full w-full" />
            </div>
          </div>
          {/* Raya del lockup del PDF: 0.751 del alto del isotipo (28rem → 21rem).
              Solo en lg, donde el hero replica la disposición horizontal
              isotipo · raya · nombre del lockup. */}
          <RayaRombo className="raya-fade hidden w-auto lg:block lg:h-[21rem]" />
        </div>
        <Reveal delay={250} className="text-center lg:text-left">
          <h1 className="font-serif text-[clamp(2.75rem,6vw,4.75rem)] leading-[1.05] tracking-wide">
            {BRAND.nombre}
          </h1>
          <p className="mt-4 font-sans text-sm uppercase tracking-[0.28em] text-esmeralda/55 md:text-[15px]">
            {BRAND.slogan}
          </p>
          <p className="mx-auto mt-9 max-w-[24ch] font-serif text-[clamp(1.5rem,2.6vw,2rem)] leading-snug lg:mx-0">
            ¡No pierdas tu empeño!
          </p>
          <p className="mx-auto mt-3 max-w-[42ch] font-sans text-lg leading-relaxed text-esmeralda/75 lg:mx-0">
            Te ayudamos a recuperar tus joyas pagando menos: revisamos tu boleta, te decimos
            cuánto vas a pagar y si hay una opción que te convenga más.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-6 lg:justify-start">
            <a
              href={WHATSAPP_URL}
              className="rounded-full bg-esmeralda px-8 py-4 font-sans text-sm font-medium tracking-wide text-sobre-verde transition-transform duration-300 ease-expo hover:scale-[1.03]"
            >
              Revisa tu boleta sin costo por WhatsApp
            </a>
            <AbrirChat className="inline-flex min-h-[44px] items-center px-2 font-sans text-sm text-esmeralda/80 underline underline-offset-4 hover:text-esmeralda">
              o analízala aquí con nuestro asistente
            </AbrirChat>
          </div>
          <p className="mt-6 font-sans text-sm tracking-wide text-esmeralda/75">
            Análisis de tu boleta sin costo · Discreción total · Lunes a viernes, 9:00 a 17:00
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
    <section id="decide-bien" className="bg-esmeralda text-sobre-verde">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <Reveal>
          <h2 className="max-w-[24ch] font-serif text-[clamp(1.9rem,3.8vw,3.1rem)] leading-tight">
            Decidir bien vale más que decidir rápido.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-12 md:grid-cols-12">
          <Reveal delay={100} className="md:col-span-5">
            <p className="font-sans text-lg leading-relaxed text-sobre-verde/80 text-justify">
              Antes de empeñar — o si ya empeñaste — conocer tus números te da
              poder: cuánto vas a pagar en total, cuándo terminas, y si existe
              una opción mejor. Eso es lo que ponemos sobre la mesa.
            </p>
          </Reveal>
          <Reveal delay={220} className="md:col-span-7">
            <div className="border-t border-sobre-verde/20 pt-8 md:border-l md:border-t-0 md:pl-12 md:pt-0">
              <p className="font-serif text-2xl leading-snug md:text-3xl">
                Revisamos tu boleta, te explicamos tasas, plazos y costo total,
                y después de analizar tu caso te orientamos sobre lo que más te
                conviene.
              </p>
              <p className="mt-6 font-sans leading-relaxed text-sobre-verde/70 text-justify">
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
        <p className="mt-5 font-sans text-lg leading-relaxed text-esmeralda/75">
          Cuatro datos determinan cuánto vas a pagar. Toca cada uno para
          conocer su significado.
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
          <p className="mt-5 font-sans text-lg leading-relaxed text-sobre-verde/75">
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
    ["Nos mandas tu boleta", "Una foto aquí en el chat o por WhatsApp. Sin filas ni explicaciones incómodas."],
    ["Te explicamos qué firmaste", "Tasa, refrendo, plazos y costo total, en palabras que cualquiera entiende. Sin costo."],
    ["Comparamos tus opciones", "Con datos públicos del mercado y la tasa preferente que gestionamos con nuestro aliado, evaluamos si tu empeño está bien donde está."],
    ["Tú decides, te acompañamos", "Si conviene moverte, te acompañamos paso a paso. Antes de empezar te decimos nuestra comisión y el ahorro que te queda con ella; si ya no conviene, te lo decimos."],
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
      <Reveal>
        <h2 className="max-w-[22ch] font-serif text-[clamp(1.9rem,3.8vw,3.1rem)] leading-tight">
          Cuatro pasos, sin sorpresas.
        </h2>
      </Reveal>
      <div className="relative mt-16">
        <div className="absolute left-0 right-0 top-5 hidden h-px bg-esmeralda/15 lg:block" aria-hidden="true" />
        <div className="grid gap-12 lg:grid-cols-4 lg:gap-8">
          {pasos.map(([titulo, texto], i) => (
            <Reveal key={titulo} delay={i * 130}>
              <div>
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-esmeralda font-serif text-lg text-sobre-verde">
                  {i + 1}
                </div>
                <h3 className="mb-3 font-serif text-xl md:text-2xl">{titulo}</h3>
                <p className="max-w-[36ch] font-sans text-[15px] leading-relaxed text-esmeralda/70 text-justify">{texto}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function PreguntasFrecuentes() {
  // Datos estructurados de las preguntas (ayudan a buscadores y asistentes a entender la página;
  // Google ya no muestra resultados enriquecidos de FAQ para sitios comerciales).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PREGUNTAS.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  return (
    <section id="preguntas" className="scroll-mt-20 border-t border-esmeralda/10 bg-papel-alto">
      <div className="mx-auto max-w-4xl px-5 py-24 md:px-8 md:py-32">
        <Reveal>
          <h2 className="font-serif text-[clamp(1.9rem,3.8vw,3.1rem)] leading-tight">Preguntas frecuentes</h2>
        </Reveal>
        <div className="mt-10 divide-y divide-esmeralda/10 border-y border-esmeralda/10">
          {PREGUNTAS.map(({ q, a, enlace }) => (
            <details key={q} className="group py-3">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-6 py-2 font-serif text-lg md:text-xl [&::-webkit-details-marker]:hidden">
                {q}
                <span className="mt-1 shrink-0 font-sans text-esmeralda/50 transition-transform duration-300 group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mb-2 mt-2 max-w-[65ch] font-sans leading-relaxed text-esmeralda/75">
                {a}
                {enlace && (
                  <>
                    {" "}
                    <a href={enlace.href} className="underline underline-offset-4">
                      {enlace.texto}
                    </a>
                    .
                  </>
                )}
              </p>
            </details>
          ))}
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
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
    ["Claridad radical", "Te explicamos cada término en lenguaje claro, sin tecnicismos."],
    ["Datos, no opiniones", "Cada comparación con números verificables."],
    ["Evaluación clara", "Antes de cualquier trámite te decimos cuánto te ahorras ya con nuestra comisión; si no te conviene, no avanzamos."],
    ["Discreción", "Tu situación y tus piezas son asunto tuyo."],
  ];
  return (
    <section id="quienes-somos" className="border-t border-esmeralda/10 bg-papel-alto">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        {/* Por qué existimos */}
        <Reveal>
          <p className="max-w-[30ch] font-serif text-[clamp(1.9rem,3.8vw,3.1rem)] leading-tight">
            Una decisión prendaria bien informada cambia el resultado.
            Nuestro trabajo es que llegues a ella.
          </p>
        </Reveal>

        {/* Qué hacemos */}
        <Reveal delay={80} className="mt-10 max-w-[62ch]">
          <p className="font-sans text-lg leading-relaxed text-esmeralda/75 text-justify">
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
                  <p className="font-sans leading-relaxed text-esmeralda/80 text-justify">{s}</p>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={220} className="lg:col-span-7">
            <div className="flex h-full flex-col justify-between gap-12">
              <div>
                <div className="flex items-center gap-3">
                  <svg viewBox="0 0 16 20" className="h-4 w-auto shrink-0" aria-hidden="true">
                    <path d="M 8 0 L 16 10 L 8 20 L 0 10 Z" fill="#C8A24B" />
                  </svg>
                  <h3 className="font-serif text-2xl md:text-3xl">Misión</h3>
                </div>
                <p className="mt-4 max-w-[52ch] font-sans leading-relaxed text-esmeralda/70">
                  Que cualquier persona entienda exactamente qué opciones
                  tiene, qué firmó al empeñar y cuánto va a pagar.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <svg viewBox="0 0 16 20" className="h-4 w-auto shrink-0" aria-hidden="true">
                    <path d="M 8 0 L 16 10 L 8 20 L 0 10 Z" fill="#C8A24B" />
                  </svg>
                  <h3 className="font-serif text-2xl md:text-3xl">Visión</h3>
                </div>
                <p className="mt-4 max-w-[52ch] font-sans leading-relaxed text-esmeralda/70">
                  Ser la referencia de confianza en México para decisiones
                  prendarias: la gente llega confundida y sale sabiendo qué
                  le conviene.
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Valores */}
        <Reveal delay={100} className="mt-20 border-t border-esmeralda/10 pt-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {valores.map(([titulo, texto], i) => (
              <div key={titulo} className={i > 0 ? "lg:border-l lg:border-esmeralda/10 lg:pl-8" : ""}>
                <h3 className="text-center font-serif text-xl">{titulo}</h3>
                <p className="mt-2 font-sans text-[15px] leading-relaxed text-esmeralda/70 text-justify">
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
        <PreguntasFrecuentes />
      </main>
      <Footer />
    </>
  );
}
