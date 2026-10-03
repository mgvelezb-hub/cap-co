import { requireSesion } from "@/lib/auth";
import { listarLeads, alcanceDe } from "@lib/crm/leads";
import { registrarConsulta } from "@lib/leads/bitacora";
import { Clase, SinContestar, Vacio, CAMPO, BOTON } from "@/components/ui";
import { pesos, fecha, etapaNombre, ETAPAS_PANEL, NOMBRE_CLASE, PERFILES } from "@/lib/formato";

export const metadata = { title: "Leads" };

export default async function Leads({ searchParams }) {
  const sesion = await requireSesion();
  const p = await searchParams;
  const filtros = {
    etapa: p.etapa || null,
    clasificacion: p.clase || null,
    texto: p.q || "",
    campana: p.campana || null,
    sinContestarMin: /^\d{1,3}$/.test(p.contestar || "") ? Number(p.contestar) : null,
    soloSinAtender: p.pendiente === "sin_atender",
    conDatos: p.datos === "1" ? true : null,
    revision: p.revision === "1" ? true : null,
    asesor: p.mios === "1" ? sesion.usuario : null,
    alcance: alcanceDe(sesion),
    sinAsesor: p.asesor === "ninguno",
  };
  const leads = await listarLeads(filtros);
  // Buscar por nombre o teléfono es una consulta de datos personales: queda en la bitácora sin el
  // texto buscado (sobreviviría a un borrado ARCO), solo qué se buscó y cuántos salieron.
  if (filtros.texto) {
    const por = /^\d[\d\s-]*$/.test(filtros.texto) ? "telefono" : /^CAP-/i.test(filtros.texto) ? "codigo" : "nombre";
    await registrarConsulta(sesion.usuario, `busqueda:${por}`, { resultados: leads.length }, "leads_buscados");
  }
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Leads</h1>
          <p className="text-sm text-esmeralda/75">{leads.length} {leads.length === 1 ? "caso" : "casos"} con estos filtros.</p>
        </div>
        <a href="/leads/nuevo" className="inline-flex min-h-[44px] items-center rounded-full bg-esmeralda px-4 text-sm font-medium text-sobre-verde">+ Nuevo lead</a>
      </header>
      <form className="grid grid-cols-2 items-end gap-2 rounded-xl sm:flex sm:flex-wrap border border-esmeralda/10 bg-papel-alto p-3 text-sm" role="search">
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
        <label className="flex min-h-[44px] items-center gap-2 text-xs text-esmeralda/75">
          <input type="checkbox" name="datos" value="1" defaultChecked={p.datos === "1"} className="h-5 w-5" /> Con datos de contacto
        </label>
        <label className="flex min-h-[44px] items-center gap-2 text-xs text-esmeralda/75">
          <input type="checkbox" name="mios" value="1" defaultChecked={p.mios === "1"} className="h-5 w-5" /> Solo míos
        </label>
        {p.campana && <input type="hidden" name="campana" value={p.campana} />}
        {p.pendiente && <input type="hidden" name="pendiente" value={p.pendiente} />}
        <button className={BOTON}>Filtrar</button>
        <a href="/leads" className="inline-flex min-h-[44px] items-center text-sm underline">Limpiar</a>
      </form>

      {leads.length === 0 ? (
        <Vacio>No hay leads con estos filtros.</Vacio>
      ) : (
        <>
        <ul className="space-y-2 md:hidden">
          {leads.map((l) => (
            <li key={l.codigo}>
              <a href={`/leads/${l.codigo}`} className="block rounded-xl border border-esmeralda/15 bg-papel-alto p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{l.nombre || "sin datos"}</span>
                  <span className="font-mono text-xs">{l.codigo}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  <Clase clase={l.clasificacion} pendiente={l.revision_pendiente} />
                  <span className="text-esmeralda/75">{etapaNombre(l.etapa)}</span>
                  <SinContestar info={l.sinContestar} />
                  {l.ahorro !== null && <span className="text-esmeralda/75">ahorro {pesos(l.ahorro)}</span>}
                </div>
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto rounded-xl border border-esmeralda/10 bg-papel-alto md:block">
          <table className="w-full min-w-[56rem] text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2">
            <thead className="border-b border-esmeralda/10 text-left text-xs uppercase tracking-[0.08em] text-esmeralda/75">
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
                    <div className="text-sm">{l.nombre || <span className="text-esmeralda/70">sin datos</span>}</div>
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
        </>
      )}
    </>
  );
}
