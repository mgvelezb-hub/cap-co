import Nav from "@/components/Nav";
import { requireSesion } from "@/lib/auth";
import { query } from "@lib/db/client";
import { salir } from "./acciones";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }) {
  const s = await requireSesion();
  const { rows } = await query(
    `SELECT (SELECT count(*)::int FROM lead WHERE revision_pendiente) AS revision,
            (SELECT count(*)::int FROM crm_tarea WHERE hecha_at IS NULL AND vence_at <= now()) AS vencidas`,
  );
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:gap-8 md:px-6 md:py-8">
      <aside className="md:sticky md:top-8 md:h-fit md:w-48 md:shrink-0">
        <div className="mb-3 flex items-center justify-between md:mb-6 md:block">
          <div>
            <p className="font-serif text-xl">CAP & Co.</p>
            <p className="text-xs text-esmeralda/60">CRM · {s.nombre}</p>
          </div>
          <form action={salir} className="md:mt-2">
            <button className="text-xs text-esmeralda/60 underline underline-offset-2">Salir</button>
          </form>
        </div>
        <Nav contadores={{ "/": rows[0].vencidas, "/revision": rows[0].revision }} />
      </aside>
      <main className="min-w-0 flex-1 space-y-8">{children}</main>
    </div>
  );
}
