// Vista interna de leads del chatbot. Protegida por middleware.js (Basic auth).
// Solo lectura. Datos personales visibles únicamente aquí (consentidos).

import { estadisticas } from "@/lib/leads/repo";
import { PERFILES } from "@/lib/chatbot/perfiles";
import { dbDisponible } from "@/lib/db/client";
import { embudo } from "@/lib/metricas/conversaciones";
import { eventosRecientes } from "@/lib/alertas/eventos";
import LeadEditor from "./LeadEditor";

const NOMBRE_EVENTO = {
  saldo_anthropic: "Sin saldo de Anthropic: el chat no responde",
  llave_anthropic: "La llave de Anthropic falló",
  limite_anthropic: "Límite de uso alcanzado",
  chat_caido: "El chat está fallando",
  error_chat: "Error del chat",
  precios_fallo: "Falló la toma de precios",
  precios_viejos: "Precio de metales desactualizado",
};

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Leads del chatbot — CAP & Co. (interno)",
  robots: { index: false, follow: false },
};

const fechaMX = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Mexico_City",
});

function fmt(fecha) {
  return fecha ? fechaMX.format(new Date(fecha)) : "—";
}

function pct(parte, total) {
  if (!total) return "0 %";
  return `${Math.round((parte / total) * 100)} %`;
}

export default async function LeadsPage() {
  if (!dbDisponible()) {
    return (
      <Marco>
        <p className="font-sans text-esmeralda/80">
          Falta configurar <code>DATABASE_URL</code>. Sin base de datos no se guardan leads.
        </p>
      </Marco>
    );
  }

  const [s, e, eventos] = await Promise.all([
    estadisticas({ dias: 30 }),
    embudo({ dias: 30 }),
    eventosRecientes({ horas: 24, limite: 10 }),
  ]);
  const t = s.totales;
  const criticos = eventos.filter((ev) => ev.nivel === "critico");
  const pasos = [
    ["Conversaciones", e.conversaciones],
    ["Con interacción (2+ mensajes)", e.con_interaccion],
    ["Cotizaron un cambio", e.cotizaron],
    ["La cotización conviene", e.avanzaron],
    ["Pidieron cita", e.citas],
    ["Tocaron WhatsApp", e.whatsapp],
    ["Dejaron contacto", e.contacto],
    ["Cita confirmada o atendida", e.confirmadas],
    ["Atendidos", e.atendidos],
  ];
  const base = Math.max(e.conversaciones, 1);

  return (
    <Marco>
      {criticos.length > 0 && (
        <section className="rounded-xl border border-granate/30 bg-granate/5 p-4 font-sans text-sm text-esmeralda">
          <p className="font-medium">Alertas en las últimas 24 horas</p>
          <ul className="mt-2 space-y-1">
            {criticos.map((ev) => (
              <li key={ev.id}>
                {fmt(ev.created_at || ev.creado_at)} · {NOMBRE_EVENTO[ev.tipo] || ev.tipo}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-serif text-xl">Embudo de los últimos 30 días</h2>
        <div className="space-y-1.5 rounded-xl border border-esmeralda/10 bg-papel-alto p-4">
          {pasos.map(([nombre, n]) => (
            <div key={nombre} className="grid grid-cols-[14rem_1fr_5rem] items-center gap-3 font-sans text-sm">
              <span className="text-esmeralda/80">{nombre}</span>
              <div className="h-2.5 rounded-full bg-esmeralda/5">
                <div className="h-2.5 rounded-full bg-esmeralda" style={{ width: `${Math.min(100, (n / base) * 100)}%` }} />
              </div>
              <span className="text-right tabular-nums">
                {n} <span className="text-esmeralda/50">{pct(n, base)}</span>
              </span>
            </div>
          ))}
          <p className="pt-2 font-sans text-xs text-esmeralda/60">
            Porcentajes sobre el total de conversaciones; los leads cuentan solo si vienen de una conversación del periodo.{" "}
            {e.con_foto} conversaciones con foto de boleta · {e.fuera_de_tema} con preguntas fuera de tema · {e.turnos_promedio} mensajes en promedio.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-4">
        <Cifra etiqueta="Leads" valor={t.leads} nota={`${t.ultimos_7} en 7 días`} />
        <Cifra etiqueta="Tocaron WhatsApp" valor={t.clicks} nota={pct(t.clicks, t.leads)} />
        <Cifra etiqueta="Dejaron contacto" valor={t.contactos} nota={pct(t.contactos, t.leads)} />
        <Cifra etiqueta="Perfiles distintos" valor={s.porPerfil.length} nota={`de ${Object.keys(PERFILES).length}`} />
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Tabla titulo="Por perfil" encabezados={["Perfil", "Leads", "WhatsApp", "Contacto"]}>
          {s.porPerfil.map((r) => (
            <tr key={r.perfil}>
              <td>{PERFILES[r.perfil]?.etiqueta || r.perfil}</td>
              <td className="tabular-nums">{r.n}</td>
              <td className="tabular-nums">{r.clicks}</td>
              <td className="tabular-nums">{r.contactos}</td>
            </tr>
          ))}
        </Tabla>

        <Tabla titulo="Por fuente (utm_source)" encabezados={["Fuente", "Leads"]}>
          {s.porFuente.map((r) => (
            <tr key={r.fuente}>
              <td>{r.fuente}</td>
              <td className="tabular-nums">{r.n}</td>
            </tr>
          ))}
        </Tabla>
      </div>

      <Tabla titulo="Por día (últimos 30)" encabezados={["Día", "Leads", "WhatsApp"]}>
        {s.porDia.map((r) => (
          <tr key={r.dia}>
            <td>{r.dia}</td>
            <td className="tabular-nums">{r.n}</td>
            <td className="tabular-nums">{r.clicks}</td>
          </tr>
        ))}
      </Tabla>

      <Tabla
        titulo="Últimos 50 leads"
        encabezados={["Código", "Fecha", "Etapa y notas", "Perfil", "Prob.", "Origen", "Tasa → oferta", "Ahorro", "Resumen", "Fuente", "WhatsApp", "Contacto"]}
      >
        {s.recientes.map((r) => (
          <tr key={r.codigo}>
            <td className="font-mono text-xs">{r.codigo}</td>
            <td className="whitespace-nowrap">{fmt(r.created_at)}</td>
            <td>
              <LeadEditor codigo={r.codigo} etapa={r.etapa} notas={r.notas} />
            </td>
            <td>{PERFILES[r.perfil]?.etiqueta || r.perfil}</td>
            <td className="tabular-nums">{r.probabilidad != null ? `${r.probabilidad} %` : "—"}</td>
            <td>{r.institucion_origen || "—"}</td>
            <td className="whitespace-nowrap tabular-nums">
              {r.tasa_actual != null ? `${Number(r.tasa_actual)} %` : "—"}
              {r.tasa_oferta != null ? ` → ${Number(r.tasa_oferta)} %` : ""}
            </td>
            <td className="tabular-nums">{r.ahorro != null ? `$${Math.round(Number(r.ahorro)).toLocaleString("es-MX")}` : "—"}</td>
            <td className="min-w-[24ch] max-w-[40ch] text-esmeralda/80">{r.resumen}</td>
            <td>{r.utm_source || "directo"}</td>
            <td>{r.whatsapp_click_at ? "sí" : "—"}</td>
            <td className="whitespace-nowrap">
              {r.consent_at ? (
                <>
                  {r.nombre} · {r.telefono}
                </>
              ) : (
                "—"
              )}
            </td>
          </tr>
        ))}
      </Tabla>
    </Marco>
  );
}

function Marco({ children }) {
  return (
    <main className="mx-auto max-w-6xl space-y-10 px-5 py-10 md:px-8">
      <header>
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-esmeralda/60">Interno</p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-serif text-3xl">Leads del chatbot</h1>
          <a href="/api/admin/leads/csv" className="rounded-full border border-esmeralda/25 px-4 py-1.5 font-sans text-sm hover:border-esmeralda">
            Descargar en Excel (CSV)
          </a>
        </div>
        <p className="mt-1 font-sans text-sm text-esmeralda/70">
          Cada lead es una conversación en la que el asistente ofreció cita con un asesor (cambio de boleta con
          probabilidad alta, o la persona lo pidió). Nombre y teléfono solo aparecen si aceptó el aviso de privacidad.
        </p>
      </header>
      {children}
    </main>
  );
}

function Cifra({ etiqueta, valor, nota }) {
  return (
    <div className="rounded-xl border border-esmeralda/10 bg-papel-alto p-5">
      <div className="font-sans text-xs uppercase tracking-[0.16em] text-esmeralda/60">{etiqueta}</div>
      <div className="mt-1 font-serif text-4xl tabular-nums">{valor}</div>
      <div className="font-sans text-sm text-esmeralda/60">{nota}</div>
    </div>
  );
}

function Tabla({ titulo, encabezados, children }) {
  return (
    <section>
      <h2 className="mb-3 font-serif text-xl">{titulo}</h2>
      <div className="overflow-x-auto rounded-xl border border-esmeralda/10 bg-papel-alto">
        <table className="w-full font-sans text-sm [&_td]:px-4 [&_td]:py-2.5 [&_th]:px-4 [&_th]:py-2.5">
          <thead className="border-b border-esmeralda/10 text-left text-xs uppercase tracking-[0.12em] text-esmeralda/60">
            <tr>
              {encabezados.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr+tr]:border-t [&_tr+tr]:border-esmeralda/5">{children}</tbody>
        </table>
      </div>
    </section>
  );
}
