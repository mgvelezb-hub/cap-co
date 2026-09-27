import { requireSesion } from "@/lib/auth";
import { serieDiaria, porFuente, paginas, embudoLeads, dineroPorCampana, finanzasMes, videosTikTok } from "@lib/crm/trafico";
import { ultimaFotografia } from "@lib/precios/repo";
import { Seccion, Vacio, Cifra, CAMPO, BOTON } from "@/components/ui";
import FormAccion from "@/components/FormAccion";
import Enviar from "@/components/Enviar";
import { pesos, hoyCDMX, fecha } from "@/lib/formato";
import { accionGasto } from "../acciones";

export const metadata = { title: "Tráfico" };

// Porcentaje acotado a 100 (el registro de visitas empezó después que el chat).
const pct = (a, b) => (b ? `${Math.min(100, Math.round((a / b) * 100))} %` : "—");

export default async function Trafico({ searchParams }) {
  const s = await requireSesion();
  const pedido = Number((await searchParams).dias);
  const dias = [7, 30, 90].includes(pedido) ? pedido : 30;
  const [serie, fuentes, pags, e, dinero, fin, foto, videos] = await Promise.all([
    serieDiaria({ dias }),
    porFuente({ dias }),
    paginas({ dias }),
    embudoLeads({ dias }),
    dineroPorCampana({ dias }),
    finanzasMes(),
    ultimaFotografia().catch(() => null),
    videosTikTok(),
  ]);
  const usdMxn = foto?.usdMxn || null;
  const max = Math.max(1, ...serie.map((d) => Math.max(d.visitas, d.conversaciones)));
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Tráfico y dinero</h1>
          <p className="text-sm text-esmeralda/75">De la visita a la comisión, últimos {dias} días. Los leads cuentan por la fecha en que llegaron.</p>
        </div>
        <nav className="flex gap-1 text-sm" aria-label="Periodo">
          {[7, 30, 90].map((d) => (
            <a key={d} href={`/trafico?dias=${d}`} aria-current={d === dias ? "page" : undefined} className={`inline-flex min-h-[44px] items-center rounded-full px-4 ${d === dias ? "bg-esmeralda text-sobre-verde" : "border border-esmeralda/40"}`}>
              {d} días
            </a>
          ))}
        </nav>
      </header>

      <Seccion titulo="Dinero del mes">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Cifra etiqueta="Comisión cobrada" valor={pesos(fin.cobrado)} nota={`${fin.cobros} cobros`} />
          <Cifra etiqueta="Por cobrar" valor={fin.por_cobrar} nota="cambios concretados sin cobro" href="/leads?etapa=switcheo_concretado" alerta={fin.por_cobrar > 0} />
          <Cifra etiqueta="Cambios del mes" valor={fin.cambios} />
          <Cifra etiqueta="Ticket promedio" valor={fin.cobros ? pesos(fin.ticket) : "—"} nota="comisión por cobro" />
        </div>
        {fin.porAsesor.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-esmeralda/15 bg-papel-alto">
            <table className="w-full min-w-[36rem] text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
              <thead className="text-left text-xs uppercase tracking-[0.08em] text-esmeralda/75">
                <tr><th>Asesor</th><th>Leads del mes</th><th>Primer contacto</th><th>Citas</th><th>Cambios</th><th>Comisión</th></tr>
              </thead>
              <tbody className="[&_tr]:border-t [&_tr]:border-esmeralda/10">
                {fin.porAsesor.map((a) => (
                  <tr key={a.asesor}>
                    <td>{a.asesor}</td>
                    <td className="tabular-nums">{a.leads}</td>
                    <td className="tabular-nums">{a.horas_primer_contacto !== null ? `${a.horas_primer_contacto} h` : "—"}</td>
                    <td className="tabular-nums">{a.citas}</td>
                    <td className="tabular-nums">{a.cambios}</td>
                    <td className="tabular-nums">{pesos(a.comision)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>

      <Seccion titulo="Embudo">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <Cifra etiqueta="Visitas" valor={e.visitas} nota="sesiones" />
          <Cifra etiqueta="Chats" valor={e.chats} nota={`${pct(e.chats, e.visitas)} de visitas`} />
          <Cifra etiqueta="Cotizaron" valor={e.cotizaron} nota={`${e.con_interaccion} con 2+ mensajes`} />
          <Cifra etiqueta="Leads" valor={e.leads} nota="pidieron asesor" />
          <Cifra etiqueta="Con datos" valor={e.con_datos} nota={pct(e.con_datos, e.leads)} />
          <Cifra etiqueta="Confirmados" valor={e.confirmados} nota={pct(e.confirmados, e.con_datos)} />
          <Cifra etiqueta="Cambios" valor={e.cambios} nota={pct(e.cambios, e.confirmados)} />
          <Cifra etiqueta="Cobrados" valor={e.cobrados} nota={pct(e.cobrados, e.cambios)} />
        </div>
      </Seccion>

      <Seccion titulo="Dinero por campaña">
        <p className="text-sm text-esmeralda/75">
          Cada lead cuenta para la campaña con la que llegó; la comisión, en la fecha en que se cobró. Los videos de TikTok con link corto
          (casa-ap.com/v/&lt;código&gt;) aparecen con su código como campaña.
        </p>
        {dinero.length === 0 ? (
          <Vacio>Sin datos todavía.</Vacio>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-esmeralda/15 bg-papel-alto">
            <table className="w-full min-w-[44rem] text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
              <thead className="text-left text-xs uppercase tracking-[0.08em] text-esmeralda/75">
                <tr><th>Campaña</th><th>Leads</th><th>Cambios</th><th>Por cobrar</th><th>Comisión</th><th>Publicidad</th><th>IA</th><th>Margen</th></tr>
              </thead>
              <tbody className="[&_tr]:border-t [&_tr]:border-esmeralda/10">
                {dinero.map((c) => {
                  const ia = usdMxn ? c.costo_ia_usd * usdMxn : null;
                  const margen = c.comision_mxn - c.gasto_mxn - (ia ?? 0);
                  return (
                    <tr key={c.campana}>
                      <td><a href={`/leads?campana=${encodeURIComponent(c.campana)}`} className="underline-offset-2 hover:underline">{c.campana}</a></td>
                      <td className="tabular-nums">{c.leads}</td>
                      <td className="tabular-nums">{c.cambios}</td>
                      <td className="tabular-nums">{c.por_cobrar}</td>
                      <td className="tabular-nums">{pesos(c.comision_mxn)}</td>
                      <td className="tabular-nums">{pesos(c.gasto_mxn)}</td>
                      <td className="tabular-nums">{ia !== null ? pesos(ia) : `${c.costo_ia_usd.toFixed(2)} USD`}</td>
                      <td className={`tabular-nums ${margen < 0 ? "text-granate" : ""}`}>{pesos(margen)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {s.rol === "dueno" && (
          <FormAccion accion={accionGasto} className="flex flex-wrap items-end gap-2 rounded-xl border border-esmeralda/15 bg-papel-alto p-3 text-sm">
            <label className="flex flex-col text-xs text-esmeralda/75">
              Fecha
              <input type="date" name="fecha" defaultValue={hoyCDMX()} className={CAMPO} />
            </label>
            <label className="flex flex-col text-xs text-esmeralda/75">
              Campaña (igual que en el link)
              <input name="utm_campaign" required className={CAMPO} placeholder="refrendo" />
            </label>
            <label className="flex flex-col text-xs text-esmeralda/75">
              Gasto (pesos)
              <input name="monto" inputMode="decimal" required className={`${CAMPO} w-28`} />
            </label>
            <label className="flex min-w-[10rem] flex-1 flex-col text-xs text-esmeralda/75">
              Nota
              <input name="nota" maxLength={200} className={CAMPO} />
            </label>
            <Enviar className={BOTON}>Registrar gasto</Enviar>
          </FormAccion>
        )}
      </Seccion>

      <Seccion titulo="Videos de TikTok">
        <p className="text-sm text-esmeralda/75">Cada video con su link corto casa-ap.com/v/&lt;código&gt;. «Primera visita» es cuándo llegó la primera persona por ese link (casi siempre, el día que se publicó). Totales de siempre.</p>
        {videos.length === 0 ? (
          <Vacio>Todavía no llega nadie por un link de video.</Vacio>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-esmeralda/15 bg-papel-alto">
            <table className="w-full min-w-[40rem] text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
              <thead className="text-left text-xs uppercase tracking-[0.08em] text-esmeralda/75">
                <tr><th>Video</th><th>Primera visita</th><th>Visitas</th><th>Chats</th><th>Leads</th><th>Con datos</th><th>Cambios</th><th>Comisión</th></tr>
              </thead>
              <tbody className="[&_tr]:border-t [&_tr]:border-esmeralda/10">
                {videos.map((v) => (
                  <tr key={v.video}>
                    <td><a href={`/leads?campana=${encodeURIComponent(v.video)}`} className="font-mono text-xs underline-offset-2 hover:underline">/v/{v.video}</a></td>
                    <td>{v.primera ? fecha(v.primera) : "—"}</td>
                    <td className="tabular-nums">{v.visitas}</td>
                    <td className="tabular-nums">{v.chats}</td>
                    <td className="tabular-nums">{v.leads}</td>
                    <td className="tabular-nums">{v.con_datos}</td>
                    <td className="tabular-nums">{v.cambios}</td>
                    <td className="tabular-nums">{pesos(v.comision_mxn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>

      <Seccion titulo="Por fuente">
        {fuentes.length === 0 ? (
          <Vacio>Sin datos todavía.</Vacio>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-esmeralda/15 bg-papel-alto">
            <table className="w-full min-w-[48rem] text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
              <thead className="text-left text-xs uppercase tracking-[0.08em] text-esmeralda/75">
                <tr><th>Fuente</th><th>Visitas</th><th>Chats</th><th>Cotizaron</th><th>Leads</th><th>Con datos</th><th>Aplican</th><th>Cambios</th></tr>
              </thead>
              <tbody className="[&_tr]:border-t [&_tr]:border-esmeralda/10">
                {fuentes.map((f) => (
                  <tr key={f.fuente}>
                    <td><a href={`/leads?campana=${encodeURIComponent(f.fuente)}`} className="underline-offset-2 hover:underline">{f.fuente}</a></td>
                    <td className="tabular-nums">{f.visitas}</td>
                    <td className="tabular-nums">{f.conversaciones}</td>
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

      <details className="rounded-xl border border-esmeralda/15 bg-papel-alto p-4">
        <summary className="inline-flex min-h-[44px] cursor-pointer items-center font-serif text-lg">Por día y páginas más vistas</summary>
        <div className="mt-3 overflow-x-auto">
          <div className="flex h-40 min-w-[36rem] items-end gap-1" role="img" aria-label="Visitas y conversaciones por día">
            {serie.map((d) => (
              <div key={d.dia} className="flex h-full flex-1 flex-col items-center justify-end gap-0.5" title={`${d.dia}: ${d.visitas} visitas, ${d.conversaciones} chats, ${d.leads} leads`}>
                <div className="w-full rounded-t bg-esmeralda/25" style={{ height: `${(d.visitas / max) * 100}%` }} />
                <div className="w-full rounded-t bg-esmeralda" style={{ height: `${(d.conversaciones / max) * 100}%` }} />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-esmeralda/75">Claro: visitas · oscuro: conversaciones del chat.</p>
        </div>
        {pags.length > 0 && (
          <ul className="mt-4 divide-y divide-esmeralda/10 text-sm">
            {pags.map((p) => (
              <li key={p.path} className="flex justify-between gap-3 py-2"><span className="font-mono text-xs">{p.path}</span><span className="tabular-nums">{p.vistas} vistas · {p.sesiones} sesiones</span></li>
            ))}
          </ul>
        )}
      </details>
    </>
  );
}
