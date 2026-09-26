import Header from "@/components/Header";
import AbrirChat from "@/components/chat/AbrirChat";
import { GLOSARIO } from "@/lib/contenido/glosario";

export const metadata = {
  title: "Glosario del empeño — CAP & Co.",
  description: "Qué significa cada término de tu boleta de empeño: avalúo, CAT, refrendo, demasía, desempeño y más, en palabras claras.",
};

export default function Glosario() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-24">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-esmeralda/60">Glosario</p>
        <h1 className="mt-2 font-serif text-[clamp(2rem,4.5vw,3rem)] leading-tight">Las palabras de tu boleta, en claro.</h1>
        <p className="mt-4 font-sans text-esmeralda/70">
          Términos del empeño según la norma oficial (NOM-179-SCFI-2016), PROFECO y CONDUSEF. Si tienes una duda sobre tu
          caso,{" "}
          <AbrirChat className="underline underline-offset-4">pregúntale a nuestro asistente</AbrirChat>.
        </p>
        <dl className="mt-10 divide-y divide-esmeralda/10 border-y border-esmeralda/10">
          {GLOSARIO.map(([termino, definicion]) => (
            <div key={termino} className="py-5" id={termino.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-")}>
              <dt className="font-serif text-xl">{termino}</dt>
              <dd className="mt-2 font-sans leading-relaxed text-esmeralda/75">{definicion}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-10 font-sans text-sm text-esmeralda/60">
          <a href="/" className="underline underline-offset-4">Volver a la página principal</a>
        </p>
      </main>
    </>
  );
}
