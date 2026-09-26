import { resumenHoy } from "@lib/crm/leads";
import { tareasAbiertas, TIPOS_TAREA } from "@lib/crm/tareas";
import { citasProximas } from "@lib/agenda/repo";
import { linkWhatsApp, NOMBRE_WHATSAPP } from "@lib/crm/plantillas";
import { requireSesion } from "@/lib/auth";
import { Cifra, Seccion, Vacio, Clase, BOTON_SUAVE } from "@/components/ui";
import WhatsAppBoton from "@/components/WhatsAppBoton";
import FormAccion from "@/components/FormAccion";
import { fechaHora, hace, NOMBRE_ESTADO_CITA } from "@/lib/formato";
import { accionTarea, accionContacto } from "./acciones";

export const metadata = { title: "Hoy" };

function Llamada({ t }) {
  return (
    <>
      <a href={`tel:+52${t.telefono}`} className={BOTON_SUAVE}>Llamar {t.telefono}</a>
      <FormAccion accion={accionContacto} className="contents">
        <input type="hidden" name="codigo" value={t.lead_codigo} />
        <input type="hidden" name="tareaId" value={t.id} />
        <button name="tipo" value="llamada_hecha" className={BOTON_SUAVE}>Hablé con la persona</button>
        <button name="tipo" value="llamada_sin_respuesta" className={BOTON_SUAVE}>No contestó</button>
      </FormAccion>
    </>
  );
}

export default async function Hoy({ searchParams }) {
  const s = await requireSesion();
  const equipo = (await searchParams).ver === "equipo";
  const finDeHoy = new Date(Date.now() + 12 * 3600_000);
  const [r, tareas, citas] = await Promise.all([
    resumenHoy(),
    tareasAbiertas({ hasta: finDeHoy, asesor: equipo ? null : s.usuario }),
    citasProximas({ dias: 2 }),
  ]);
  const presenciales = citas.filter((c) => c.tipo !== "llamada");
  const asesor = s.nombre.split(" ")[0];
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Hoy</h1>
          <p className="text-sm text-esmeralda/75">Lo que hay que atender, lo más urgente primero.</p>
        </div>
        <nav aria-label="De quién" className="flex gap-1 text-sm">
          <a href="/" aria-current={!equipo ? "page" : undefined} className={`inline-flex min-h-[44px] items-center rounded-full px-4 ${!equipo ? "bg-esmeralda text-sobre-verde" : "border border-esmeralda/40"}`}>Mías</a>
          <a href="/?ver=equipo" aria-current={equipo ? "page" : undefined} className={`inline-flex min-h-[44px] items-center rounded-full px-4 ${equipo ? "bg-esmeralda text-sobre-verde" : "border border-esmeralda/40"}`}>Todo el equipo</a>
        </nav>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Cifra etiqueta="Sin atender" valor={r.sin_atender} nota="dejaron datos, nadie les ha escrito" href="/leads?pendiente=sin_atender" alerta={r.sin_atender > 0} />
        <Cifra etiqueta="3+ días sin contestar" valor={r.sin_respuesta_3d} nota="sin atender o sin respuesta" href="/leads?contestar=3" alerta={r.sin_respuesta_3d > 0} />
        <Cifra etiqueta="Por aprobar" valor={r.en_revision} nota="clasificación" href="/revision" />
        <Cifra etiqueta="Aplican" valor={r.aplica_por_agendar} nota="por agendar" href="/leads?clase=aplica_auto&etapa=cita_solicitada" />
        <Cifra etiqueta="Taller" valor={r.taller} nota="candidatos" href="/leads?clase=taller" />
        <Cifra etiqueta="Nuevos" valor={r.nuevos_24h} nota="últimas 24 h" href="/leads" />
      </div>

      <Seccion titulo={`${equipo ? "Tareas del equipo" : "Mis tareas"} (${tareas.length})`}>
        {tareas.length === 0 ? (
          <Vacio>{equipo ? "El equipo no tiene tareas pendientes para hoy." : "No tienes tareas pendientes para hoy. Revisa las del equipo."}</Vacio>
        ) : (
          <ul className="space-y-2">
            {tareas.map((t) => {
              const lead = { ...t, codigo: t.lead_codigo };
              const plantilla = t.detalle?.plantilla || (t.tipo === "confirmar_cita" ? "primer_contacto" : null);
              const w = t.telefono && !t.no_contactar_at && plantilla ? linkWhatsApp(lead, plantilla, asesor) : null;
              const vencida = new Date(t.vence_at) < new Date();
              return (
                <li key={t.id} className="rounded-xl border border-esmeralda/15 bg-papel-alto p-3">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className={`text-xs font-medium uppercase tracking-wide ${vencida ? "text-granate" : "text-esmeralda/75"}`}>
                      {TIPOS_TAREA[t.tipo]} · {vencida ? `venció ${hace(t.vence_at)}` : `para ${fechaHora(t.vence_at)}`}
                    </span>
                    <a href={`/leads/${t.lead_codigo}`} className="font-medium underline-offset-2 hover:underline">{t.titulo}</a>
                    <span className="font-mono text-xs">{t.lead_codigo}</span>
                    <span className="text-sm">{t.nombre || "sin nombre"}</span>
                    {t.clasificacion && <Clase clase={t.clasificacion} />}
                    {!t.asesor_usuario && <span className="text-xs text-ambar">sin asesor</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {t.tipo === "revisar" ? (
                      <a href={`/leads/${t.lead_codigo}#clasificacion`} className={BOTON_SUAVE}>Revisar y aprobar</a>
                    ) : (
                      <>
                        {w && t.tipo !== "llamar" && <WhatsAppBoton codigo={t.lead_codigo} url={w.url} texto={w.texto} plantilla={plantilla} etiqueta={NOMBRE_WHATSAPP[plantilla]} tareaId={t.id} />}
                        {t.telefono && !t.no_contactar_at && (t.tipo === "llamar" || t.tipo === "confirmar_cita") && <Llamada t={t} />}
                        {t.tipo === "confirmar_cita" && <a href={`/leads/${t.lead_codigo}#cita`} className={BOTON_SUAVE}>Acordar la cita</a>}
                        <FormAccion accion={accionTarea} className="contents">
                          <input type="hidden" name="id" value={t.id} />
                          <button className="min-h-[44px] px-2 text-sm text-esmeralda/75 underline underline-offset-2">Marcar hecha</button>
                        </FormAccion>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Seccion>

      <Seccion titulo="Citas presenciales de hoy y mañana" accion={<a href="/citas" className="inline-flex min-h-[44px] items-center text-sm underline">Agenda completa</a>}>
        {presenciales.length === 0 ? (
          <Vacio>Sin citas presenciales en los próximos dos días. Las llamadas pedidas están en la cola de arriba.</Vacio>
        ) : (
          <ul className="divide-y divide-esmeralda/10 rounded-xl border border-esmeralda/15 bg-papel-alto">
            {presenciales.map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline gap-x-3 p-3 text-sm">
                <strong>{fechaHora(c.inicio)}</strong>
                <a href={`/leads/${c.lead_codigo}`} className="inline-flex min-h-[44px] items-center font-mono text-xs underline">{c.lead_codigo}</a>
                <span>{c.nombre}</span>
                <span className="text-esmeralda/75">{NOMBRE_ESTADO_CITA[c.estado] || c.estado} · {c.lugar}</span>
              </li>
            ))}
          </ul>
        )}
      </Seccion>
    </>
  );
}
