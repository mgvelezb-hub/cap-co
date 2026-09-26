import { serieDiaria, porFuente, paginas } from "@lib/crm/trafico";
import { embudo, porCampana } from "@lib/metricas/conversaciones";
import { ultimaFotografia } from "@lib/precios/repo";
import { Seccion, Vacio, Cifra } from "@/components/ui";
import { pesos } from "@/lib/formato";

export const metadata = { title: "Tráfico" };

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : "—");

export default async function Trafico({ searchParams }) {
  const dias = [7, 30, 90].includes(Number((await searchParams).dias)) ? Number((await searchParams).dias) : 30;
  const [serie, fuentes, pags, e, campanas, foto] = await Promise.all([
    serieDiaria({ dias }),
    porFuente({ dias }),
    paginas({ dias }),
    embudo({ dias }),
    porCampana({ dias }),
    ultimaFotografia().catch(() => null),
  ]);
  const usdMxn = foto ? Number(foto.usdMxn ?? foto.usd_mxn) || 18.5 : 18.5;
  const visitas = serie.reduce((a, d) => a + d.visitas, 0);
  const max = Math.max(1, ...serie.map((d) => Math.max(d.visitas, d.conversaciones)));
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Tráfico e interacción</h1>
          <p className="text-sm text-esmeralda/70">De la visita a la comisión, últimos {dias} días.</p>
        </div>
        <nav className="flex gap-1 text-sm" aria-label="Periodo">
          {[7, 30, 90].map((d) => (
            <a key={d} href={`/trafico?dias=${d}`} aria-current={d === dias ? "page" : undefined} className={`rounded-full px-3 py-1.5 ${d === dias ? "bg-esmeralda text-sobre-verde" : "border border-esmeralda/20"}`}>
              {d} días
            </a>
          ))}
        </nav>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Cifra etiqueta="Visitas" valor={visitas} nota="sesiones" />
        <Cifra etiqueta="Chats" valor={e.conversaciones} nota={`${pct(e.conversaciones, visitas)} de visitas`} />
        <Cifra etiqueta="Interactuaron" valor={e.con_interaccion} nota="2 mensajes o más" />
        <Cifra etiqueta="Cotizaron" valor={e.cotizaron} nota={`${e.avanzaron} con ahorro`} />
        <Cifra etiqueta="Pidieron cita" valor={e.citas} nota={`${e.contacto} dejaron datos`} />
        <Cifra etiqueta="Atendidos" valor={e.atendidos} nota={`${e.confirmadas} confirmados`} />
        <Cifra etiqueta="Cambios" valor={e.switcheos} nota={`${e.cobrados} cobrados`} />
      </div>

      <Seccion titulo="Por día">
        <div className="overflow-x-auto rounded-xl border border-esmeralda/10 bg-papel-alto p-4">
          <div className="flex h-40 min-w-[36rem] items-end gap-1" role="img" aria-label="Visitas y conversaciones por día">
            {serie.map((d) => (
              <div key={d.dia} className="flex h-full flex-1 flex-col items-center justify-end gap-0.5" title={`${d.dia}: ${d.visitas} visitas, ${d.conversaciones} chats, ${d.leads} leads`}>
                <div className="w-full rounded-t bg-esmeralda/25" style={{ height: `${(d.visitas / max) * 100}%` }} />
                <div className="w-full rounded-t bg-esmeralda" style={{ height: `${(d.conversaciones / max) * 100}%` }} />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-esmeralda/60">Claro: visitas · oscuro: conversaciones del chat.</p>
        </div>
      </Seccion>

      <Seccion titulo="Por fuente">
        {fuentes.length === 0 ? (
          <Vacio>Sin datos todavía.</Vacio>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-esmeralda/10 bg-papel-alto">
            <table className="w-full min-w-[48rem] text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
              <thead className="text-left text-xs uppercase tracking-[0.08em] text-esmeralda/60">
                <tr><th>Fuente</th><th>Visitas</th><th>Chats</th><th>Interacción</th><th>Cotizaron</th><th>Leads</th><th>Con datos</th><th>Aplican</th><th>Cambios</th></tr>
              </thead>
              <tbody className="[&_tr]:border-t [&_tr]:border-esmeralda/5">
                {fuentes.map((f) => (
                  <tr key={f.fuente}>
                    <td><a href={`/leads?campana=${encodeURIComponent(f.fuente)}`} className="underline-offset-2 hover:underline">{f.fuente}</a></td>
                    <td className="tabular-nums">{f.visitas}</td>
                    <td className="tabular-nums">{f.conversaciones} <span className="text-xs text-esmeralda/50">{pct(f.conversaciones, f.visitas)}</span></td>
                    <td className="tabular-nums">{f.con_interaccion}</td>
                    <td className="tabular-nums">{f.cotizaron}</td>
                    <td className="tabular-nums">{f.leads}</td>
                    <td className="tabular-nums">{f.contactos}</td>
                    <td className="tabular-nums">{f.aplica_auto}</td>
                    <td className="tabular-nums">{f.cambios}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>

      <Seccion titulo="Dinero por campaña">
        {campanas.length === 0 ? (
          <Vacio>Sin datos todavía. El gasto de publicidad se captura en el panel del sitio.</Vacio>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-esmeralda/10 bg-papel-alto">
            <table className="w-full min-w-[40rem] text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
              <thead className="text-left text-xs uppercase tracking-[0.08em] text-esmeralda/60">
                <tr><th>Campaña</th><th>Comisión</th><th>Publicidad</th><th>IA</th><th>Margen</th></tr>
              </thead>
              <tbody className="[&_tr]:border-t [&_tr]:border-esmeralda/5">
                {campanas.map((c) => {
                  const costo = c.gasto_mxn + c.costo_ia_usd * usdMxn;
                  return (
                    <tr key={c.campana}>
                      <td>{c.campana}</td>
                      <td className="tabular-nums">{pesos(c.comision_mxn)}</td>
                      <td className="tabular-nums">{pesos(c.gasto_mxn)}</td>
                      <td className="tabular-nums">{pesos(c.costo_ia_usd * usdMxn)}</td>
                      <td className={`tabular-nums ${c.comision_mxn - costo < 0 ? "text-granate" : ""}`}>{pesos(c.comision_mxn - costo)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>

      <Seccion titulo="Páginas más vistas">
        {pags.length === 0 ? (
          <Vacio>Sin visitas registradas todavía.</Vacio>
        ) : (
          <ul className="divide-y divide-esmeralda/10 rounded-xl border border-esmeralda/10 bg-papel-alto text-sm">
            {pags.map((p) => (
              <li key={p.path} className="flex justify-between gap-3 p-3"><span className="font-mono text-xs">{p.path}</span><span className="tabular-nums">{p.vistas} vistas · {p.sesiones} sesiones</span></li>
            ))}
          </ul>
        )}
      </Seccion>
    </>
  );
}
