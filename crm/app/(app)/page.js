import { resumenHoy } from "@lib/crm/leads";
import { tareasAbiertas, TIPOS_TAREA } from "@lib/crm/tareas";
import { citasProximas } from "@lib/agenda/repo";
import { linkWhatsApp, NOMBRE_WHATSAPP } from "@lib/crm/plantillas";
import { requireSesion } from "@/lib/auth";
import { Cifra, Seccion, Vacio, Clase, BOTON_SUAVE } from "@/components/ui";
import WhatsAppBoton from "@/components/WhatsAppBoton";
import { fechaHora, hace } from "@/lib/formato";
import { accionTarea } from "./acciones";

export const metadata = { title: "Hoy" };
const FRANJA = { manana: "9:00 a 13:00", tarde: "13:00 a 17:00" };

export default async function Hoy() {
  const s = await requireSesion();
  const finDeHoy = new Date(Date.now() + 12 * 3600_000);
  const [r, tareas, citas] = await Promise.all([resumenHoy(), tareasAbiertas({ hasta: finDeHoy }), citasProximas({ dias: 2 })]);
  return (
    <>
      <header>
        <h1 className="font-serif text-3xl">Hoy</h1>
        <p className="text-sm text-esmeralda/70">Lo que hay que atender, lo más urgente primero.</p>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Cifra etiqueta="Sin atender" valor={r.sin_atender} nota="dejaron datos, nadie les ha escrito" href="/leads?contestar=0" alerta={r.sin_atender > 0} />
        <Cifra etiqueta="Sin respuesta" valor={r.sin_respuesta_3d} nota="3 días o más" href="/leads?contestar=3" alerta={r.sin_respuesta_3d > 0} />
        <Cifra etiqueta="Por aprobar" valor={r.en_revision} nota="clasificación" href="/revision" />
        <Cifra etiqueta="Aplican" valor={r.aplica_por_agendar} nota="por agendar" href="/leads?clase=aplica_auto&etapa=cita_solicitada" />
        <Cifra etiqueta="Taller" valor={r.taller} nota="candidatos" href="/leads?clase=taller" />
        <Cifra etiqueta="Nuevos" valor={r.nuevos_24h} nota="últimas 24 h" href="/leads" />
      </div>

      <Seccion titulo={`Tareas (${tareas.length})`}>
        {tareas.length === 0 ? (
          <Vacio>No hay tareas pendientes para hoy.</Vacio>
        ) : (
          <ul className="space-y-2">
            {tareas.map((t) => {
              const plantilla = t.detalle?.plantilla;
              const w = t.tipo === "whatsapp" && plantilla ? linkWhatsApp({ ...t, codigo: t.lead_codigo }, plantilla, s.nombre.split(" ")[0]) : null;
              const vencida = new Date(t.vence_at) < new Date();
              return (
                <li key={t.id} className="rounded-xl border border-esmeralda/10 bg-papel-alto p-3">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className={`text-xs font-medium uppercase tracking-wide ${vencida ? "text-granate" : "text-esmeralda/60"}`}>
                      {TIPOS_TAREA[t.tipo]} · {vencida ? `venció ${hace(t.vence_at)}` : `vence ${fechaHora(t.vence_at)}`}
                    </span>
                    <a href={`/leads/${t.lead_codigo}`} className="font-medium underline-offset-2 hover:underline">
                      {t.titulo}
                    </a>
                    <span className="font-mono text-xs">{t.lead_codigo}</span>
                    <span className="text-sm">{t.nombre || "sin nombre"}</span>
                    {t.clasificacion && <Clase clase={t.clasificacion} />}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {w && <WhatsAppBoton codigo={t.lead_codigo} url={w.url} texto={w.texto} plantilla={plantilla} etiqueta={NOMBRE_WHATSAPP[plantilla]} tareaId={t.id} />}
                    {t.tipo === "llamar" && t.telefono && (
                      <a href={`tel:+52${t.telefono}`} className={BOTON_SUAVE}>
                        Llamar {t.telefono}
                      </a>
                    )}
                    <form action={accionTarea}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="min-h-[40px] px-2 text-sm text-esmeralda/60 underline underline-offset-2">Marcar hecha</button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Seccion>

      <Seccion titulo="Citas y llamadas de hoy y mañana" accion={<a href="/citas" className="text-sm underline">Agenda completa</a>}>
        {citas.length === 0 ? (
          <Vacio>Sin citas ni llamadas en los próximos dos días.</Vacio>
        ) : (
          <ul className="divide-y divide-esmeralda/10 rounded-xl border border-esmeralda/10 bg-papel-alto">
            {citas.map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline gap-x-3 p-3 text-sm">
                <strong>{c.tipo === "llamada" ? `Llamar ${fechaHora(c.inicio).split(",")[0]}, ${FRANJA[c.franja]}` : fechaHora(c.inicio)}</strong>
                <a href={`/leads/${c.lead_codigo}`} className="font-mono text-xs underline">
                  {c.lead_codigo}
                </a>
                <span>{c.nombre}</span>
                <span className="text-esmeralda/60">{c.estado}</span>
              </li>
            ))}
          </ul>
        )}
      </Seccion>
    </>
  );
}
