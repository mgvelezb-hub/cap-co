import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AbrirChat from "@/components/chat/AbrirChat";
import { GLOSARIO, GLOSARIO_CAP } from "@/lib/contenido/glosario";

export const metadata = {
  title: "Glosario del empeño — CAP & Co.",
  description: "Qué significa cada término de tu boleta de empeño: avalúo, CAT, refrendo, demasía, desempeño y más, en palabras claras.",
};

function Lista({ terminos }) {
  return (
    <dl className="divide-y divide-esmeralda/10 border-y border-esmeralda/10">
      {terminos.map(([termino, definicion, ancla]) => (
        <div key={ancla} id={ancla} className="scroll-mt-24 py-5">
          <dt className="font-serif text-xl">{termino}</dt>
          <dd className="mt-2 font-sans leading-relaxed text-esmeralda/75">{definicion}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function Glosario() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-24">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-esmeralda/75">Glosario</p>
        <h1 className="mt-2 font-serif text-[clamp(2rem,4.5vw,3rem)] leading-tight">Las palabras de tu boleta, en claro.</h1>
        <p className="mt-4 font-sans text-esmeralda/75">
          Basado en la NOM-179-SCFI-2016 y en información de PROFECO y CONDUSEF, explicado en palabras sencillas. No
          sustituye lo que dice tu contrato. Si tienes una duda sobre tu caso,{" "}
          <AbrirChat className="inline-flex min-h-[44px] items-center underline underline-offset-4">pregúntale a nuestro asistente</AbrirChat>.
        </p>
        <div className="mt-10">
          <Lista terminos={GLOSARIO} />
        </div>
        <h2 className="mt-14 font-serif text-2xl">Cómo le decimos en CAP & Co.</h2>
        <div className="mt-4">
          <Lista terminos={GLOSARIO_CAP} />
        </div>
      </main>
      <Footer />
    </>
  );
}
