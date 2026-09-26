import { entrar } from "./accion";

export const metadata = { title: "Entrar" };

export default async function Login({ searchParams }) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form action={entrar} className="w-full max-w-sm space-y-4 rounded-2xl border border-esmeralda/10 bg-papel-alto p-6 shadow-sm">
        <div>
          <p className="font-serif text-2xl">CAP & Co.</p>
          <p className="text-sm text-esmeralda/70">CRM de leads</p>
        </div>
        <label className="block text-sm">
          Usuario
          <input name="usuario" autoComplete="username" required className="mt-1 block w-full rounded-lg border border-esmeralda/20 bg-papel px-3 py-2.5 text-base" />
        </label>
        <label className="block text-sm">
          Contraseña
          <input name="clave" type="password" autoComplete="current-password" required className="mt-1 block w-full rounded-lg border border-esmeralda/20 bg-papel px-3 py-2.5 text-base" />
        </label>
        {error && (
          <p role="alert" className="text-sm text-granate">
            {error === "limite" ? "Demasiados intentos. Espera unos minutos." : "Usuario o contraseña incorrectos."}
          </p>
        )}
        <button className="min-h-[44px] w-full rounded-full bg-esmeralda font-medium text-sobre-verde">Entrar</button>
      </form>
    </main>
  );
}
