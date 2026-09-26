import Header from "@/components/Header";
import { confirmarMiCorreo } from "../../baja/[token]/acciones";

export const metadata = { title: "Confirmar correo — CAP & Co.", robots: { index: false, follow: false } };

export default async function Confirmar({ params, searchParams }) {
  const { token } = await params;
  const { hecho } = await searchParams;
  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-5 py-24 font-sans">
        {hecho === "1" ? (
          <>
            <h1 className="font-serif text-3xl">Correo confirmado.</h1>
            <p className="mt-4 text-esmeralda/75">Te avisaremos por aquí sobre tu caso. Cada correo trae un enlace para dejar de recibirlos.</p>
          </>
        ) : hecho === "0" ? (
          <h1 className="font-serif text-3xl">No encontramos ese enlace.</h1>
        ) : (
          <>
            <h1 className="font-serif text-3xl">¿Este correo es tuyo?</h1>
            <p className="mt-4 text-esmeralda/75">Confírmalo para recibir por correo los avisos de tu caso con CAP & Co.</p>
            <form action={confirmarMiCorreo} className="mt-8">
              <input type="hidden" name="token" value={token} />
              <button className="min-h-[44px] rounded-full bg-esmeralda px-6 font-medium text-sobre-verde">Sí, es mi correo</button>
            </form>
          </>
        )}
      </main>
    </>
  );
}
