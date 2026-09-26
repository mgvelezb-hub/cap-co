import Header from "@/components/Header";
import { darDeBaja } from "@/lib/crm/seguimiento";

export const metadata = { title: "Dejar de recibir mensajes — CAP & Co.", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Baja({ params }) {
  const { token } = await params;
  let codigo = null;
  try {
    codigo = await darDeBaja(token);
  } catch {
    codigo = null;
  }
  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-5 py-24 font-sans">
        <h1 className="font-serif text-3xl">{codigo ? "Listo, ya no te escribiremos." : "No encontramos ese enlace."}</h1>
        <p className="mt-4 text-esmeralda/75">
          {codigo
            ? `Tu caso ${codigo} ya no recibirá correos ni recordatorios. Si algún día quieres retomarlo, escríbenos por WhatsApp con ese código.`
            : "Puede que ya lo hayas usado. Si sigues recibiendo mensajes, escríbenos por WhatsApp y lo resolvemos."}
        </p>
      </main>
    </>
  );
}
