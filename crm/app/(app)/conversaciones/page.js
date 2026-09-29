import { requireSesion } from "@/lib/auth";
import { listarConversaciones, distribucionPerfil } from "@lib/crm/conversaciones";
import { PREGUNTAS_PERFIL, CAMPOS_PERFIL, etiquetaPerfil, NO_DICE } from "@lib/chatbot/perfil-visita";
import { Seccion, Vacio, Cifra } from "@/components/ui";
import { fechaHora, hace } from "@/lib/formato";

export const metadata = { title: "Conversaciones" };

const CORTO = { caso: "Caso", edad: "Edad", prenda: "Prenda", zona: "Zona", origen: "Nos conoció por" };

function etiqueta(campo, valor) {
  if (valor === "sin_dato") return "Sin dato";
  return etiquetaPerfil(campo, valor) || valor;
}
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : undefined);

function fuenteDe(f = {}) {
  if (f.utm_source) return [f.utm_source, f.utm_campaign].filter(Boolean).join(" · ");
  if (f.referrer) {
    try {
      return new URL(f.referrer).hostname.replace(/^www\./, "");
    } catch {
      return "otro sitio";
    }
  }
  return "directo";
}

function Perfil({ perfil }) {
  if (!perfil) return <span className="text-esmeralda/55">Sin perfil (conversación anterior al formulario)</span>;
  if (perfil.omitido) return <span className="text-esmeralda/55">Saltó el formulario</span>;
  const partes = CAMPOS_PERFIL.filter((c) => perfil[c] && perfil[c] !== NO_DICE).map((c) => (
    <span key={c} className="rounded-full bg-esmeralda/5 px-2 py-0.5">
      {CORTO[c]}: {etiqueta(c, perfil[c])}
    </span>
  ));
  return partes.length ? <span className="flex flex-wrap gap-1">{partes}</span> : <span className="text-esmeralda/55">Prefirió no decir</span>;
}

export default async function Conversaciones({ searchParams }) {
  await requireSesion();
  const sp = await searchParams;
  const pedido = Number(sp.dias);
  const dias = [7, 30, 90].includes(pedido) ? pedido : 30;
  const caso = PREGUNTAS_PERFIL.caso.opciones.some(([v]) => v === sp.caso) || sp.caso === NO_DICE ? sp.caso : null;
  const [lista, dist] = await Promise.all([listarConversaciones({ dias, caso }), distribucionPerfil({ dias })]);
  const url = (cambios) => {
    const q = new URLSearchParams({ dias: String(dias), ...(caso ? { caso } : {}), ...cambios });
    for (const [k, v] of [...q]) if (!v) q.delete(k);
    return `/conversaciones?${q}`;
  };

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Conversaciones</h1>
          <p className="text-sm text-esmeralda/75">
            Cada chat del sitio, aunque no deje datos: perfil anónimo, qué hizo y un resumen sin datos personales. No se guarda el texto.
          </p>
        </div>
        <nav className="flex gap-1 text-sm" aria-label="Periodo">
          {[7, 30, 90].map((d) => (
            <a key={d} href={url({ dias: String(d) })} aria-current={d === dias ? "page" : undefined} className={`inline-flex min-h-[44px] items-center rounded-full px-4 ${d === dias ? "bg-esmeralda text-sobre-verde" : "border border-esmeralda/40"}`}>
              {d} días
            </a>
          ))}
        </nav>
      </header>

      {dist && (
        <Seccion titulo="Quién escribe">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cifra etiqueta="Abrieron el chat" valor={dist.abrieron} />
            <Cifra etiqueta="Escribieron" valor={dist.escribieron} nota={pct(dist.escribieron, dist.abrieron)} />
            <Cifra etiqueta="Se fueron sin escribir" valor={dist.se_fueron} nota={pct(dist.se_fueron, dist.abrieron)} alerta={dist.abrieron >= 10 && dist.se_fueron / dist.abrieron > 0.5} />
            <Cifra etiqueta="Contestaron el perfil" valor={dist.contestaron} nota={pct(dist.contestaron, dist.abrieron) ? `${pct(dist.contestaron, dist.abrieron)} de quienes abrieron` : undefined} />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {CAMPOS_PERFIL.map((campo) => {
              const valores = Object.entries(dist.campos[campo]).sort((a, b) => b[1] - a[1]);
              const suma = valores.reduce((t, [, n]) => t + n, 0);
              return (
                <div key={campo} className="rounded-xl border border-esmeralda/15 bg-papel-alto p-3">
                  <h3 className="mb-2 text-xs uppercase tracking-[0.08em] text-esmeralda/75">{CORTO[campo]}</h3>
                  {valores.length === 0 ? (
                    <p className="text-sm text-esmeralda/55">Sin respuestas.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {valores.map(([v, n]) => (
                        <li key={v} className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate">
                            {campo === "caso" ? <a href={url({ caso: v })} className="underline underline-offset-2">{etiqueta(campo, v)}</a> : etiqueta(campo, v)}
                          </span>
                          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-esmeralda/10" aria-hidden="true">
                            <span className="block h-full bg-esmeralda" style={{ width: `${(n / suma) * 100}%` }} />
                          </span>
                          <span className="w-8 text-right tabular-nums">{n}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
          {dist.por_origen.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-esmeralda/15 bg-papel-alto">
              <table className="w-full min-w-[34rem] text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                <caption className="px-3 pt-3 text-left text-xs uppercase tracking-[0.08em] text-esmeralda/75">Por cómo nos conoció</caption>
                <thead className="text-left text-xs uppercase tracking-[0.08em] text-esmeralda/75">
                  <tr><th>Origen</th><th>Abrieron</th><th>Escribieron</th><th>Cotizaron</th><th>Les conviene</th><th>Leads</th></tr>
                </thead>
                <tbody className="[&_tr]:border-t [&_tr]:border-esmeralda/10 [&_td]:tabular-nums">
                  {dist.por_origen.map((o) => (
                    <tr key={o.origen}>
                      <td>{etiqueta("origen", o.origen)}</td>
                      <td>{o.abrieron}</td>
                      <td>{o.escribieron}</td>
                      <td>{o.cotizaron}</td>
                      <td>{o.conviene}</td>
                      <td>{o.leads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Seccion>
      )}

      <Seccion
        titulo={caso ? `Conversaciones: ${etiqueta("caso", caso)} (${lista.length})` : `Conversaciones (${lista.length})`}
        accion={caso ? <a href={url({ caso: "" })} className="text-sm underline">Quitar filtro</a> : null}
      >
        {lista.length === 0 ? (
          <Vacio>No hay conversaciones en este periodo.</Vacio>
        ) : (
          <ul className="divide-y divide-esmeralda/10 rounded-xl border border-esmeralda/10 bg-papel-alto">
            {lista.map((c) => (
              <li key={c.id} className="space-y-2 p-3 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <strong title={fechaHora(c.creado_at)}>{hace(c.actualizado_at)}</strong>
                  <span className="text-esmeralda/75">{fuenteDe(c.fuente)}</span>
                  <span className="tabular-nums">{c.turnos} {c.turnos === 1 ? "mensaje" : "mensajes"}</span>
                  {c.fotos > 0 && <span>foto de boleta</span>}
                  {c.cotizo && <span className={c.avanzo ? "text-esmeralda" : "text-ambar"}>{c.avanzo ? "cotizó: conviene" : "cotizó: no conviene"}</span>}
                  {c.fuera_de_tema > 0 && <span className="text-esmeralda/60">{c.fuera_de_tema} fuera de tema</span>}
                  {c.lead_codigo && <a href={`/leads/${c.lead_codigo}`} className="font-mono text-xs underline">{c.lead_codigo}</a>}
                </div>
                <div className="text-xs"><Perfil perfil={c.perfil} /></div>
                <p className="text-esmeralda/85">{c.resumen || <span className="text-esmeralda/55">Sin resumen todavía.</span>}</p>
              </li>
            ))}
          </ul>
        )}
      </Seccion>
    </>
  );
}
