// Vista interna de leads del chatbot. Protegida por middleware.js (Basic auth).
// Solo lectura. Datos personales visibles únicamente aquí (consentidos).

import { estadisticas } from "@/lib/leads/repo";
import { PERFILES } from "@/lib/chatbot/perfiles";
import { dbDisponible } from "@/lib/db/client";

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

  const s = await estadisticas({ dias: 30 });
  const t = s.totales;

  return (
    <Marco>
      <section className="grid gap-4 sm:grid-cols-4">
        <Cifra etiqueta="Leads" valor={t.leads} nota={`${t.ultimos_7} en 7 días`} />
        <Cifra etiqueta="Tocaron WhatsApp" valor={t.clicks} nota={pct(t.clicks, t.leads)} />
        <Cifra etiqueta="Dejaron contacto" valor={t.contactos} nota={pct(t.contactos, t.leads)} />
        <Cifra etiqueta="Perfiles distintos" valor={s.porPerfil.length} nota="de 5" />
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
        encabezados={["Código", "Fecha", "Perfil", "Prob.", "Resumen", "Fuente", "WhatsApp", "Contacto"]}
      >
        {s.recientes.map((r) => (
          <tr key={r.codigo}>
            <td className="font-mono text-xs">{r.codigo}</td>
            <td className="whitespace-nowrap">{fmt(r.created_at)}</td>
            <td>{PERFILES[r.perfil]?.etiqueta || r.perfil}</td>
            <td className="tabular-nums">{r.probabilidad != null ? `${r.probabilidad} %` : "—"}</td>
            <td className="max-w-[36ch] text-esmeralda/80">{r.resumen}</td>
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
        <h1 className="font-serif text-3xl">Leads del chatbot</h1>
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
