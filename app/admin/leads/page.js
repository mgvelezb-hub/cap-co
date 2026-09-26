// Panel interno de CAP & Co. Protegido por middleware.js (un usuario por persona).
// Orden: lo que hay que atender hoy y el dinero del mes → agenda → embudo → campañas → leads.

import { headers } from "next/headers";
import { buscarLeads, resumenOperacion } from "@/lib/leads/repo";
import { PERFILES } from "@/lib/chatbot/perfiles";
import { dbDisponible } from "@/lib/db/client";
import { embudo, porCampana } from "@/lib/metricas/conversaciones";
import { eventosRecientes } from "@/lib/alertas/eventos";
import { citasProximas, confirmarAntesDe } from "@/lib/agenda/repo";
import { bitacoraReciente } from "@/lib/leads/bitacora";
import { ultimaFotografia } from "@/lib/precios/repo";
import LeadEditor from "./LeadEditor";
import { ETAPAS_PANEL as ETAPAS } from "@/lib/leads/etapas";
import { CitaEditor, GastoForm } from "./ControlesPanel";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Panel — CAP & Co. (interno)",
  robots: { index: false, follow: false },
};

const NOMBRE_EVENTO = {
  saldo_anthropic: "Sin saldo de Anthropic: el chat no responde",
  llave_anthropic: "La llave de Anthropic falló",
  limite_anthropic: "Anthropic está limitando peticiones",
  tope_diario: "Se alcanzó el tope diario de uso del chat",
  tope_citas: "Demasiadas reservas en una hora",
  chat_caido: "El chat está fallando",
  error_chat: "Error del chat",
  precios_fallo: "Falló la toma de precios",
  precios_viejos: "Precio de metales desactualizado",
};

const fechaMX = new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short", timeZone: "America/Mexico_City" });
const diaMX = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Mexico_City" });
const FRANJA_TEXTO = { manana: "9:00 a 13:00", tarde: "13:00 a 17:00" };
const citaMX = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Mexico_City" });
const pesos = (n) => Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const fmt = (f) => (f ? fechaMX.format(new Date(f)) : "—");
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : "—");

export default async function Panel({ searchParams }) {
  const rol = (await headers()).get("x-panel-rol") === "dueno" ? "dueno" : "operador";
  if (!dbDisponible()) {
    return (
      <Marco rol={rol}>
        <p className="font-sans text-esmeralda/80">Falta configurar la base de datos (DATABASE_URL).</p>
      </Marco>
    );
  }
  const sp = (await searchParams) || {};
  const etapa = ETAPAS.some(([v]) => v === sp.etapa) ? sp.etapa : null;
  const q = typeof sp.q === "string" ? sp.q : "";

  const [resumen, e, campanas, citas, leads, eventos, bitacora, foto] = await Promise.all([
    resumenOperacion(),
    embudo({ dias: 30 }),
    porCampana({ dias: 30 }),
    citasProximas({ dias: 14 }),
    buscarLeads({ etapa, texto: q }),
    eventosRecientes({ horas: 24, limite: 10 }),
    rol === "dueno" ? bitacoraReciente(20) : Promise.resolve([]),
    ultimaFotografia(),
  ]);
  const usdMxn = foto?.usdMxn || 18;
  const criticos = eventos.filter((ev) => ev.nivel === "critico");
  const embudoChat = [
    ["Conversaciones", e.conversaciones],
    ["Con interacción (2+ mensajes)", e.con_interaccion],
    ["Cotizaron un cambio", e.cotizaron],
    ["La cotización conviene", e.avanzaron],
  ];
  const resultados = [
    ["Pidieron cita", e.citas],
    ["Tocaron WhatsApp", e.whatsapp],
    ["Dejaron contacto", e.contacto],
    ["Cita confirmada o más", e.confirmadas],
    ["Atendidos", e.atendidos],
    ["Cambio concretado", e.switcheos],
    ["Comisión cobrada", e.cobrados],
  ];
  const base = Math.max(e.conversaciones, 1);

  return (
    <Marco rol={rol}>
      {criticos.length > 0 && (
        <section className="rounded-xl border border-granate/30 bg-granate/5 p-4 font-sans text-sm">
          <p className="font-medium">Alertas en las últimas 24 horas</p>
          <ul className="mt-2 space-y-1">
            {criticos.map((ev) => (
              <li key={ev.id}>
                {fmt(ev.creado_at)} · {NOMBRE_EVENTO[ev.tipo] || ev.tipo}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Cifra etiqueta="Por contactar" valor={resumen.por_contactar} nota={resumen.por_contactar ? `el más antiguo: ${resumen.horas_mas_antiguo} h` : "al día"} alerta={resumen.horas_mas_antiguo > 24} />
        <Cifra etiqueta="Citas próximas" valor={citas.filter((c) => new Date(c.inicio) > new Date()).length} nota="14 días" />
        <Cifra etiqueta="Cambios del mes" valor={resumen.switcheos_mes} nota="concretados" />
        <Cifra etiqueta="Comisión del mes" valor={pesos(resumen.comision_mes)} nota="cobrada" />
        <Cifra etiqueta="Primer contacto" valor={`${resumen.horas_primer_contacto} h`} nota="promedio, 30 días" />
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl">Agenda</h2>
        {citas.length === 0 ? (
          <p className="font-sans text-sm text-esmeralda/60">No hay citas en los próximos 14 días.</p>
        ) : (
          <ul className="space-y-2">
            {citas.map((c) => (
              <li key={c.id} className="rounded-xl border border-esmeralda/10 bg-papel-alto p-3 font-sans text-sm">
                <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
                  <strong>
                    {c.tipo === "llamada" ? `Llamar: ${diaMX.format(new Date(c.inicio))}, ${FRANJA_TEXTO[c.franja] || ""}` : citaMX.format(new Date(c.inicio))}
                  </strong>
                  <span className="font-mono text-xs">{c.lead_codigo}</span>
                  <span>{c.nombre || "sin nombre"}</span>
                  {c.telefono && (
                    <a className="underline" href={`https://wa.me/52${c.telefono}`} target="_blank" rel="noopener noreferrer">
                      {c.telefono}
                    </a>
                  )}
                  {c.ahorro != null && <span className="text-esmeralda/60">ahorro estimado {pesos(c.ahorro)}</span>}
                </div>
                {c.estado === "reservada" && c.tipo === "cita" && (
                  <p className="mb-2 text-xs text-granate">Sin confirmar: se libera {citaMX.format(confirmarAntesDe(c.apartada_at))} si no se confirma.</p>
                )}
                <CitaEditor cita={{ id: c.id, estado: c.estado, lugar: c.lugar, tipo: c.tipo }} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl">Del chat al dinero · últimos 30 días</h2>
        <div className="space-y-4 rounded-xl border border-esmeralda/10 bg-papel-alto p-4">
          <Barras titulo="Embudo del chat" filas={embudoChat} base={base} />
          <Barras titulo="Resultados (sobre las conversaciones)" filas={resultados} base={base} />
          <p className="font-sans text-xs text-esmeralda/60">
            Los leads cuentan si vienen de una conversación del periodo; una persona puede pedir cita sin cotizar. {e.con_foto} conversaciones con foto de boleta · {e.fuera_de_tema} con preguntas fuera de tema · {e.turnos_promedio} mensajes en promedio.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl">Por campaña · últimos 30 días</h2>
        <div className="overflow-x-auto rounded-xl border border-esmeralda/10 bg-papel-alto">
          <table className="w-full min-w-[40rem] font-sans text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
            <thead className="border-b border-esmeralda/10 text-left text-xs uppercase tracking-[0.1em] text-esmeralda/60">
              <tr>
                <th>Campaña</th>
                <th>Conv.</th>
                <th>Citas</th>
                <th>Cambios</th>
                <th>Comisión</th>
                <th>Publicidad</th>
                <th>IA</th>
                <th>Costo por cita</th>
                <th>Costo por cambio</th>
                <th title="Comisión cobrada menos publicidad e IA">Margen</th>
              </tr>
            </thead>
            <tbody className="[&_tr+tr]:border-t [&_tr+tr]:border-esmeralda/5">
              {campanas.map((c) => {
                const costo = c.gasto_mxn + c.costo_ia_usd * usdMxn;
                return (
                  <tr key={c.campana}>
                    <td>{c.campana}</td>
                    <td className="tabular-nums">{c.conversaciones}</td>
                    <td className="tabular-nums">{c.citas}</td>
                    <td className="tabular-nums">{c.switcheos}</td>
                    <td className="tabular-nums">{pesos(c.comision_mxn)}</td>
                    <td className="tabular-nums">{pesos(c.gasto_mxn)}</td>
                    <td className="tabular-nums">{pesos(c.costo_ia_usd * usdMxn)}</td>
                    <td className="tabular-nums">{c.citas ? pesos(costo / c.citas) : "—"}</td>
                    <td className="tabular-nums">{c.switcheos ? pesos(costo / c.switcheos) : "—"}</td>
                    <td className={`tabular-nums ${c.comision_mxn - costo < 0 ? "text-granate" : ""}`}>{pesos(c.comision_mxn - costo)}</td>
                  </tr>
                );
              })}
              {campanas.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-esmeralda/60">
                    Sin datos todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <GastoForm />
        </div>
        <p className="mt-2 font-sans text-xs text-esmeralda/60">
          Para que una campaña aparezca, sus links deben llevar ?utm_source=facebook&amp;utm_campaign=nombre-del-grupo. El costo de IA se convierte a pesos con el tipo de cambio del último precio de metales.
        </p>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-serif text-xl">Leads</h2>
          <form className="flex flex-wrap items-end gap-2 font-sans text-sm" method="get">
            <select name="etapa" defaultValue={etapa || ""} className="rounded-md border border-esmeralda/20 bg-papel px-2 py-1.5 text-base sm:text-sm" aria-label="Filtrar por etapa">
              <option value="">Todas las etapas</option>
              {ETAPAS.map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
            <input name="q" defaultValue={q} placeholder="Código o nombre" className="rounded-md border border-esmeralda/20 bg-papel px-2 py-1.5 text-base sm:text-sm" />
            <button className="rounded-full border border-esmeralda/25 px-3 py-1.5">Filtrar</button>
          </form>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {leads.map((l) => (
            <article key={l.codigo} className="rounded-xl border border-esmeralda/10 bg-papel-alto p-4 font-sans text-sm">
              <header className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-xs">{l.codigo}</span>
                <span className="text-esmeralda/60">{fmt(l.created_at)}</span>
                <span>{PERFILES[l.perfil]?.etiqueta || l.perfil}</span>
                {l.probabilidad != null && <span className="text-esmeralda/60">{l.probabilidad} %</span>}
              </header>
              <p className="mb-2 text-esmeralda/80">{l.resumen}</p>
              <dl className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-esmeralda/70">
                <dt>Origen</dt>
                <dd>{l.institucion_origen || "—"}</dd>
                <dt>Tasa → oferta</dt>
                <dd>
                  {l.tasa_actual != null ? `${Number(l.tasa_actual)} %` : "—"}
                  {l.tasa_oferta != null ? ` → ${Number(l.tasa_oferta)} %` : ""}
                </dd>
                <dt>Ahorro estimado</dt>
                <dd>{l.ahorro != null ? pesos(l.ahorro) : "—"}</dd>
                <dt>Cita</dt>
                <dd>{l.cita_inicio ? `${citaMX.format(new Date(l.cita_inicio))} (${l.cita_estado})` : "—"}</dd>
                <dt>Contacto</dt>
                <dd>{l.consent_at ? `${l.nombre} · ${l.telefono}` : "—"}</dd>
                <dt>Campaña</dt>
                <dd>{l.utm_campaign || l.utm_source || "directo"}</dd>
                <dt>Primer contacto</dt>
                <dd>{fmt(l.contactado_at)}</dd>
              </dl>
              <LeadEditor lead={l} />
            </article>
          ))}
          {leads.length === 0 && <p className="font-sans text-sm text-esmeralda/60">No hay leads con ese filtro.</p>}
        </div>
      </section>

      {rol === "dueno" && bitacora.length > 0 && (
        <section>
          <h2 className="mb-3 font-serif text-xl">Bitácora del panel</h2>
          <ul className="space-y-1 font-sans text-xs text-esmeralda/70">
            {bitacora.map((b, i) => (
              <li key={i}>
                {fmt(b.creado_at)} · {b.usuario} · {b.accion} {b.objetivo || ""} {b.detalle?.etapa ? `→ ${b.detalle.etapa}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Marco>
  );
}

function Marco({ rol, children }) {
  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 md:px-8">
      <header>
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-esmeralda/60">Interno</p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-serif text-3xl">Panel de CAP &amp; Co.</h1>
          {rol === "dueno" && (
            <a href="/api/admin/leads/csv" className="rounded-full border border-esmeralda/25 px-4 py-1.5 font-sans text-sm hover:border-esmeralda">
              Descargar leads (CSV)
            </a>
          )}
        </div>
        <p className="mt-1 font-sans text-sm text-esmeralda/70">
          Nombre y teléfono solo aparecen si la persona aceptó el aviso de privacidad. Todo cambio queda en bitácora.
        </p>
      </header>
      {children}
    </main>
  );
}

function Cifra({ etiqueta, valor, nota, alerta = false }) {
  return (
    <div className={`rounded-xl border p-4 ${alerta ? "border-granate/40 bg-granate/5" : "border-esmeralda/10 bg-papel-alto"}`}>
      <div className="font-sans text-xs uppercase tracking-[0.14em] text-esmeralda/60">{etiqueta}</div>
      <div className="mt-1 font-serif text-3xl tabular-nums">{valor}</div>
      <div className="font-sans text-xs text-esmeralda/60">{nota}</div>
    </div>
  );
}

function Barras({ titulo, filas, base }) {
  return (
    <div>
      <p className="mb-2 font-sans text-xs uppercase tracking-[0.12em] text-esmeralda/60">{titulo}</p>
      <div className="space-y-2">
        {filas.map(([nombre, n]) => (
          <div key={nombre} className="font-sans text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-esmeralda/80">{nombre}</span>
              <span className="tabular-nums">
                {n} <span className="text-esmeralda/50">{pct(n, base)}</span>
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-esmeralda/5">
              <div className="h-2 rounded-full bg-esmeralda" style={{ width: `${Math.min(100, (n / base) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
