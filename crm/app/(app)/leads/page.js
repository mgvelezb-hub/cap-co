import { listarLeads } from "@lib/crm/leads";
import { Clase, SinContestar, Vacio, CAMPO, BOTON } from "@/components/ui";
import { pesos, fecha, etapaNombre, ETAPAS_PANEL, NOMBRE_CLASE, PERFILES } from "@/lib/formato";

export const metadata = { title: "Leads" };

export default async function Leads({ searchParams }) {
  const p = await searchParams;
  const filtros = {
    etapa: p.etapa || null,
    clasificacion: p.clase || null,
    texto: p.q || "",
    campana: p.campana || null,
    sinContestarMin: p.contestar !== undefined && p.contestar !== "" ? Number(p.contestar) : null,
    conDatos: p.datos === "1" ? true : null,
    revision: p.revision === "1" ? true : null,
  };
  const leads = await listarLeads(filtros);
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Leads</h1>
          <p className="text-sm text-esmeralda/70">{leads.length} {leads.length === 1 ? "caso" : "casos"} con estos filtros.</p>
        </div>
      </header>
      <form className="flex flex-wrap items-end gap-2 rounded-xl border border-esmeralda/10 bg-papel-alto p-3 text-sm" role="search">
        <label className="flex flex-col text-xs text-esmeralda/70">
          Buscar
          <input name="q" defaultValue={p.q || ""} placeholder="código, nombre o teléfono" className={CAMPO} />
        </label>
        <label className="flex flex-col text-xs text-esmeralda/70">
          Etapa
          <select name="etapa" defaultValue={p.etapa || ""} className={CAMPO}>
            <option value="">Todas</option>
            {ETAPAS_PANEL.map(([v, t]) => (
              <option key={v} value={v}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs text-esmeralda/70">
          Clasificación
          <select name="clase" defaultValue={p.clase || ""} className={CAMPO}>
            <option value="">Todas</option>
            {Object.entries(NOMBRE_CLASE).map(([v, t]) => (
              <option key={v} value={v}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs text-esmeralda/70">
          Sin contestar
          <select name="contestar" defaultValue={p.contestar ?? ""} className={CAMPO}>
            <option value="">Cualquiera</option>
            <option value="0">Pendientes (0+ días)</option>
            <option value="1">1 día o más</option>
            <option value="3">3 días o más</option>
            <option value="7">7 días o más</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-xs text-esmeralda/70">
          <input type="checkbox" name="datos" value="1" defaultChecked={p.datos === "1"} className="h-4 w-4" /> Con datos de contacto
        </label>
        {p.campana && <input type="hidden" name="campana" value={p.campana} />}
        <button className={BOTON}>Filtrar</button>
        <a href="/leads" className="pb-2 text-xs underline">Limpiar</a>
      </form>

      {leads.length === 0 ? (
        <Vacio>No hay leads con estos filtros.</Vacio>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-esmeralda/10 bg-papel-alto">
          <table className="w-full min-w-[56rem] text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2">
            <thead className="border-b border-esmeralda/10 text-left text-xs uppercase tracking-[0.08em] text-esmeralda/60">
              <tr>
                <th>Caso</th>
                <th>Clasificación</th>
                <th>Etapa</th>
                <th>Sin contestar</th>
                <th>Ahorro</th>
                <th>Perfil</th>
                <th>Campaña</th>
                <th>Llegó</th>
              </tr>
            </thead>
            <tbody className="[&_tr+tr]:border-t [&_tr+tr]:border-esmeralda/5">
              {leads.map((l) => (
                <tr key={l.codigo} className="hover:bg-esmeralda/[0.03]">
                  <td>
                    <a href={`/leads/${l.codigo}`} className="font-mono text-xs underline-offset-2 hover:underline">{l.codigo}</a>
                    <div className="text-sm">{l.nombre || <span className="text-esmeralda/50">sin datos</span>}</div>
                  </td>
                  <td>
                    <Clase clase={l.clasificacion} pendiente={l.revision_pendiente} />
                    {l.propension_taller >= 70 && l.clasificacion !== "taller" && <div className="mt-1 text-xs text-granate">taller {l.propension_taller} %</div>}
                  </td>
                  <td>{etapaNombre(l.etapa)}</td>
                  <td><SinContestar info={l.sinContestar} /></td>
                  <td className="tabular-nums">{pesos(l.ahorro)}</td>
                  <td>{PERFILES[l.perfil] || l.perfil}</td>
                  <td className="text-xs">{l.utm_campaign || l.utm_source || "directo"}</td>
                  <td className="whitespace-nowrap text-xs">{fecha(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
