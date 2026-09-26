import { citasProximas } from "@lib/agenda/repo";
import { CHECKLIST_TRASPASO } from "@lib/crm/leads";
import { query } from "@lib/db/client";
import { Seccion, Vacio } from "@/components/ui";
import { fechaHora, fecha, pesos } from "@/lib/formato";

export const metadata = { title: "Citas" };
const FRANJA = { manana: "9:00 a 13:00", tarde: "13:00 a 17:00" };

export default async function Citas() {
  const [citas, enCambio] = await Promise.all([
    citasProximas({ dias: 14 }),
    query(
      `SELECT codigo, nombre, etapa, traspaso, ahorro, casa_destino FROM lead
        WHERE etapa IN ('cita_confirmada', 'atendido', 'switcheo_concretado') ORDER BY actualizado_at DESC NULLS LAST LIMIT 50`,
    ),
  ]);
  const llamadas = citas.filter((c) => c.tipo === "llamada");
  const presenciales = citas.filter((c) => c.tipo !== "llamada");
  const fila = (c) => (
    <li key={c.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3 text-sm">
      <strong className="min-w-[11rem]">{c.tipo === "llamada" ? `${fecha(c.inicio)}, ${FRANJA[c.franja]}` : fechaHora(c.inicio)}</strong>
      <a href={`/leads/${c.lead_codigo}`} className="font-mono text-xs underline">{c.lead_codigo}</a>
      <span>{c.nombre}</span>
      {c.telefono && <a href={`tel:+52${c.telefono}`} className="underline">{c.telefono}</a>}
      <span className={c.estado === "confirmada" ? "text-esmeralda" : "text-ambar"}>{c.estado}</span>
      {c.tipo !== "llamada" && <span className="text-esmeralda/60">{c.lugar}</span>}
      {c.ahorro !== null && <span className="text-esmeralda/60">ahorro {pesos(c.ahorro)}</span>}
    </li>
  );
  return (
    <>
      <header>
        <h1 className="font-serif text-3xl">Citas</h1>
        <p className="text-sm text-esmeralda/70">Próximos 14 días. Para mover o confirmar una cita, entra a la ficha del lead.</p>
      </header>
      <Seccion titulo={`Llamadas por hacer (${llamadas.length})`}>
        {llamadas.length === 0 ? <Vacio>Sin llamadas pendientes.</Vacio> : <ul className="divide-y divide-esmeralda/10 rounded-xl border border-esmeralda/10 bg-papel-alto">{llamadas.map(fila)}</ul>}
      </Seccion>
      <Seccion titulo={`Citas presenciales (${presenciales.length})`}>
        {presenciales.length === 0 ? <Vacio>Sin citas presenciales.</Vacio> : <ul className="divide-y divide-esmeralda/10 rounded-xl border border-esmeralda/10 bg-papel-alto">{presenciales.map(fila)}</ul>}
      </Seccion>
      <Seccion titulo="Cambios en curso">
        {enCambio.rows.length === 0 ? (
          <Vacio>No hay cambios en curso.</Vacio>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-esmeralda/10 bg-papel-alto">
            <table className="w-full min-w-[40rem] text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
              <thead className="text-left text-xs uppercase tracking-[0.08em] text-esmeralda/60">
                <tr><th>Caso</th><th>Avance</th><th>Falta</th></tr>
              </thead>
              <tbody className="[&_tr]:border-t [&_tr]:border-esmeralda/5">
                {enCambio.rows.map((l) => {
                  const hechos = CHECKLIST_TRASPASO.filter(([k]) => l.traspaso?.[k]);
                  const falta = CHECKLIST_TRASPASO.find(([k]) => !l.traspaso?.[k]);
                  return (
                    <tr key={l.codigo}>
                      <td><a href={`/leads/${l.codigo}`} className="font-mono text-xs underline">{l.codigo}</a> {l.nombre}</td>
                      <td className="tabular-nums">{hechos.length}/{CHECKLIST_TRASPASO.length}</td>
                      <td>{falta ? falta[1] : "Completo"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>
    </>
  );
}
