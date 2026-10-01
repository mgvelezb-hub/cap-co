import Logo from "@/components/Logo";
import AnimatedLogo from "@/components/AnimatedLogo";
import Gem3D from "@/components/Gem3DDiferida";
import Empeno3D from "@/components/Empeno3DDiferido";
import RayaRombo from "@/components/RayaRombo";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import Ticker from "@/components/Ticker";
import Boleta from "@/components/Boleta";
import Calculadora from "@/components/Calculadora";
import { WHATSAPP_URL, WHATSAPP_ACTIVO, BRAND } from "@/lib/constants";
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
          {/* La marca se ve como título, pero el <h1> es la promesa: es lo que busca la gente. */}
          <p className="font-serif text-[clamp(2.75rem,6vw,4.75rem)] leading-[1.05] tracking-wide">{BRAND.nombre}</p>
          <p className="mt-4 font-sans text-sm uppercase tracking-[0.28em] text-esmeralda/75 md:text-[15px]">
            {BRAND.slogan}
          </p>
          <h1 className="mx-auto mt-9 max-w-[26ch] font-serif leading-snug lg:mx-0">
            <span className="block text-[clamp(1.5rem,2.6vw,2rem)]">¡No pierdas tu empeño!</span>
            <span className="mt-1 block text-[clamp(1.1rem,1.8vw,1.35rem)] text-esmeralda/80">Revisa tu boleta de empeño sin costo.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-[42ch] font-sans text-lg leading-relaxed text-esmeralda/75 lg:mx-0">
            Te decimos cuánto vas a pagar, si hay una opción que te convenga más y, si está por vencer, qué
            puedes hacer para recuperar tu pieza.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-6 lg:justify-start">
            {WHATSAPP_ACTIVO ? (
              <>
                <a
                  href={WHATSAPP_URL}
                  className="rounded-full bg-esmeralda px-8 py-4 font-sans text-sm font-medium tracking-wide text-sobre-verde transition-transform duration-300 ease-expo hover:scale-[1.03]"
                >
                  Revisa tu boleta sin costo por WhatsApp
                </a>
                <AbrirChat className="inline-flex min-h-[44px] items-center px-2 font-sans text-sm text-esmeralda/80 underline underline-offset-4 hover:text-esmeralda">
                  o analízala aquí con nuestro asistente
                </AbrirChat>
              </>
            ) : (
              <AbrirChat className="rounded-full bg-esmeralda px-8 py-4 font-sans text-sm font-medium tracking-wide text-sobre-verde transition-transform duration-300 ease-expo hover:scale-[1.03]">
                Revisa tu boleta aquí, sin costo
              </AbrirChat>
            )}
          </div>
          <AbrirChat
            mensaje="Mi boleta de empeño vence en unos días, ¿qué puedo hacer?"
            className="mx-auto mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-granate/40 bg-granate/5 px-4 font-sans text-sm text-granate lg:mx-0"
          >
            ¿Tu boleta vence en días? Revísala ahora →
          </AbrirChat>
          <p className="mt-6 font-sans text-sm tracking-wide text-esmeralda/75">
            Revisar y comparar no te cuesta. Si te acompañamos a cambiarte, te decimos antes si tiene costo:{" "}
            <a href="/reembolsos" className="underline underline-offset-4">así cobramos</a> · Lunes a viernes, 9:00 a 17:00
          </p>
        </Reveal>
      </div>
      <a
        href="#decide-bien"
        aria-label="Empieza aquí"
        className="absolute bottom-8 hidden flex-col items-center gap-2 text-esmeralda/70 transition-colors duration-300 hover:text-esmeralda md:flex"
      >
        <span className="font-sans text-[11px] uppercase tracking-[0.2em]">Empieza aquí</span>
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
              Antes de empeñar, o si ya empeñaste, conocer tus números te da
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
          Cinco datos de tu boleta deciden cuánto vas a pagar y qué derechos tienes.
          <span className="hidden lg:inline"> Toca cada uno para conocer su significado.</span>
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
    ["Comparamos tus opciones", "Con las tasas que publica cada casa de empeño y el precio del oro del día, te mostramos lo que cada una publica y si tu empeño está bien donde está."],
    ["Tú decides, te acompañamos", "Si conviene moverte, te acompañamos paso a paso a la que más te ahorra de las que comparamos. Antes de cualquier trámite te decimos lo que te queda: gratis con Montepío Luz Saviñón, que nos paga una tarifa; con otra casa, 10 % de tu ahorro. Si no te conviene, te lo decimos."],
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
                <span className="mt-1 shrink-0 font-sans text-esmeralda/70 transition-transform duration-300 group-open:rotate-45" aria-hidden="true">
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
    ["Datos, no opiniones", "Cada comparación con la fuente y la fecha de sus números."],
    ["Te decimos si no conviene", "Nuestro ingreso depende de que te cambies, y aun así, si el cambio no te deja un ahorro claro, te lo decimos y no avanzamos."],
    ["Discreción", "Tu situación y tus piezas son asunto tuyo."],
  ];
  return (
    <section id="quienes-somos" className="border-t border-esmeralda/10 bg-papel-alto">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <h2 className="sr-only">¿Quiénes somos?</h2>
        {/* Por qué existimos */}
        <Reveal>
          <p className="max-w-[30ch] font-serif text-[clamp(1.9rem,3.8vw,3.1rem)] leading-tight">
            Una decisión prendaria bien informada cambia el resultado.
            Nuestro trabajo es que llegues a ella.
          </p>
        </Reveal>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="max-w-[62ch] lg:col-span-7 lg:max-w-none">
            {/* Cómo empezamos. PROPUESTA pendiente de aprobación de Ricardo (cuestionario 22-sep: "me
                gustaría agregarla a tu consideración"). Solo usa lo que sabemos: el negocio nació al ver
                las dudas de personas afectadas por sus empeños; sin fechas, nombres ni cifras inventadas. */}
            <Reveal delay={40}>
              <h3 className="font-serif text-2xl">Cómo empezamos</h3>
              <p className="mt-3 font-sans text-[17px] leading-relaxed text-esmeralda/75">
                CAP &amp; Co. nació al ver, en grupos de personas afectadas por sus empeños, las mismas preguntas
                una y otra vez: ¿cuánto debo en realidad?, ¿qué pasa si se vence mi boleta?, ¿hay una opción mejor?
                Muchas de esas personas estaban por perder su pieza o no sabían cuánto iban a terminar pagando,
                porque nadie les había explicado su boleta. Decidimos dedicarnos a eso: revisar cada caso con
                números claros y, cuando conviene, acompañar el cambio a una casa de empeño con mejores condiciones.
              </p>
            </Reveal>
            {/* Qué hacemos */}
            <Reveal delay={80} className="mt-10">
              <p className="font-sans text-lg leading-relaxed text-esmeralda/75 text-justify">
                Hoy revisamos tu boleta cláusula por cláusula y la comparamos con datos
                públicos de otras instituciones. Comparar antes de decidir es la recomendación
                básica de las autoridades de consumo: esa revisión la hacemos contigo, sin costo.
              </p>
            </Reveal>
          </div>
          {/* Una operación prendaria en 3D: la pieza se pesa, se presta y la boleta se revisa. */}
          <Empeno3D className="mx-auto h-72 w-full max-w-md bg-[radial-gradient(circle_at_50%_48%,rgba(200,162,75,0.16),transparent_62%)] sm:h-96 lg:col-span-5 lg:h-[30rem] lg:max-w-none" />
        </div>

        {/* A quién ayudamos / Misión y visión */}
        <div className="mt-16 grid gap-16 lg:grid-cols-12">
          <Reveal delay={100} className="lg:col-span-5">
            <p className="font-sans text-sm uppercase tracking-[0.18em] text-esmeralda/70">
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
      <main id="contenido" tabIndex={-1} className="focus:outline-none">
        {/* Primero se ayuda (problema, boleta, calculadora, cómo funciona) y después se cuenta quiénes
            somos, justo antes de las preguntas y del contacto. */}
        <Hero />
        <Ticker />
        <Problema />
        <SeccionBoleta />
        <SeccionCalculadora />
        <ComoFunciona />
        <QuienesSomos />
        <PreguntasFrecuentes />
      </main>
      <Footer />
    </>
  );
}
