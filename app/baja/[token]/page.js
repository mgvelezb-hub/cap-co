import Header from "@/components/Header";
import { confirmarBaja } from "./acciones";

// Pide confirmar con un botón: los escáneres de enlaces del correo abren el link sin que la
// persona haga clic, y no deben darla de baja.
export const metadata = { title: "Dejar de recibir mensajes — CAP & Co.", robots: { index: false, follow: false } };

export default async function Baja({ params, searchParams }) {
  const { token } = await params;
  const { hecho } = await searchParams;
  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-5 py-24 font-sans">
        {hecho === "1" ? (
          <>
            <h1 className="font-serif text-3xl">Listo, ya no te escribiremos.</h1>
            <p className="mt-4 text-esmeralda/75">Tu caso ya no recibirá correos ni recordatorios. Si algún día quieres retomarlo, escríbenos por WhatsApp con tu código.</p>
          </>
        ) : hecho === "0" ? (
          <>
            <h1 className="font-serif text-3xl">No encontramos ese enlace.</h1>
            <p className="mt-4 text-esmeralda/75">Puede que ya lo hayas usado. Si sigues recibiendo mensajes, escríbenos por WhatsApp y lo resolvemos.</p>
          </>
        ) : (
          <>
            <h1 className="font-serif text-3xl">¿Dejar de recibir mensajes?</h1>
            <p className="mt-4 text-esmeralda/75">Ya no te mandaremos correos ni recordatorios sobre tu caso.</p>
            <form action={confirmarBaja} className="mt-8">
              <input type="hidden" name="token" value={token} />
              <button className="min-h-[44px] rounded-full bg-esmeralda px-6 font-medium text-sobre-verde">Sí, ya no quiero mensajes</button>
            </form>
          </>
        )}
      </main>
    </>
  );
}
