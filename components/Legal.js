// Marco común de las páginas legales: encabezado, título, versión y secciones.
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LEGAL } from "@/lib/constants";

export function PaginaLegal({ etiqueta, titulo, version, children }) {
  return (
    <>
      <Header />
      <main id="contenido" tabIndex={-1} className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-24">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-esmeralda/75">{etiqueta}</p>
        <h1 className="mt-2 font-serif text-[clamp(2rem,4.5vw,3rem)] leading-tight">{titulo}</h1>
        <p className="mt-4 font-sans text-sm text-esmeralda/75">
          {version ? `Versión ${version}. ` : ""}Vigente desde el {LEGAL.vigencia}. Documento provisional, en revisión legal.
        </p>
        <div className="mt-10 space-y-8 font-sans text-[1.0625rem] leading-relaxed text-esmeralda/90">{children}</div>
      </main>
      <Footer />
    </>
  );
}

export function Seccion({ titulo, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-2xl">{titulo}</h2>
      {children}
    </section>
  );
}

export function Lista({ children }) {
  return <ul className="list-disc space-y-1 pl-5">{children}</ul>;
}
