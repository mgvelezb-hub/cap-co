import { notFound } from "next/navigation";
import { fichaLead, CHECKLIST_TRASPASO } from "@lib/crm/leads";
import { linkWhatsApp, NOMBRE_WHATSAPP } from "@lib/crm/plantillas";
import { TIPOS_EVENTO } from "@lib/crm/eventos";
import { TIPOS_TAREA } from "@lib/crm/tareas";
import { comisionCambio } from "@lib/chatbot/comision";
import { PATRON_CODIGO } from "@lib/chatbot/codigo";
import { requireSesion } from "@/lib/auth";
import { Clase, SinContestar, Seccion, Vacio, CAMPO, BOTON, BOTON_SUAVE } from "@/components/ui";
import WhatsAppBoton from "@/components/WhatsAppBoton";
import Enviar from "@/components/Enviar";
import { pesos, fecha, fechaHora, hace, etapaNombre, ETAPAS_PANEL, NOMBRE_CLASE, PERFILES, hoyCDMX } from "@/lib/formato";
import { accionContacto, accionReclasificar, accionAprobar, accionCaso, accionTraspaso, accionCita, accionTarea } from "../../acciones";

export async function generateMetadata({ params }) {
  return { title: (await params).codigo };
}

const SEGUIMIENTO = {
  activo: "Seguimiento automático activo",
  sin_datos: "Sin datos de contacto",
  baja: "Pidió no recibir mensajes",
  avanzo: "Ya avanzó de etapa",
  no_aplica: "No aplica: sin recordatorios",
  respondio: "Ya respondió: lo lleva el asesor",
  terminado: "Seguimiento terminado",
};
const FRANJA = { manana: "9:00 a 13:00", tarde: "13:00 a 17:00" };
const ESTADOS_CITA = [["reservada", "Reservada"], ["confirmada", "Confirmada"], ["atendida", "Atendida"], ["no_asistio", "No asistió"], ["cancelada", "Cancelada"], ["expirada", "Expirada"]];

function Dato({ etiqueta, children }) {
  return (
    <div>
      <dt className="text-xs text-esmeralda/60">{etiqueta}</dt>
      <dd className="text-sm">{children ?? "—"}</dd>
    </div>
  );
}

export default async function Ficha({ params }) {
  const { codigo } = await params;
  if (!PATRON_CODIGO.test(codigo)) notFound();
  const s = await requireSesion();
  const f = await fichaLead(codigo);
  if (!f) notFound();
  const { lead: l, eventos, tareas, citas, conversacion } = f;
  const asesor = s.nombre.split(" ")[0];
  const comision = l.ahorro !== null ? comisionCambio(Number(l.ahorro)) : null;
  const citaActiva = citas.find((c) => ["reservada", "confirmada"].includes(c.estado));
  const cuandoCita = citaActiva && citaActiva.tipo === "cita" ? fechaHora(citaActiva.inicio) : null;
  const plantillas = ["primer_contacto", "recordatorio", ...(cuandoCita ? ["confirmar_cita"] : []), "taller", "seguimiento_cita"];
  const sug = l.sugerencia;

  return (
    <>
      <header className="space-y-2">
        <a href="/leads" className="text-sm underline">← Leads</a>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-serif text-3xl">{l.nombre || "Sin datos de contacto"}</h1>
          <span className="font-mono text-sm">{l.codigo}</span>
          <Clase clase={l.clasificacion} pendiente={l.revision_pendiente} />
          <span className="text-sm text-esmeralda/70">{etapaNombre(l.etapa)}</span>
          <SinContestar info={l.sinContestar} />
        </div>
        <p className="text-sm text-esmeralda/70">
          {PERFILES[l.perfil] || l.perfil} · llegó {fecha(l.created_at)} por {l.utm_campaign || l.utm_source || "directo"} · {SEGUIMIENTO[l.seguimiento] || l.seguimiento}
          {l.proximo_seguimiento_at && l.seguimiento === "activo" && ` (siguiente: ${fechaHora(l.proximo_seguimiento_at)})`}
        </p>
      </header>

      {l.telefono && (
        <Seccion titulo="Contactar">
          <div className="space-y-3 rounded-xl border border-esmeralda/10 bg-papel-alto p-4">
            <div className="flex flex-wrap gap-2 text-sm">
              <a href={`tel:+52${l.telefono}`} className={BOTON_SUAVE}>Llamar {l.telefono}</a>
              {l.email && <a href={`mailto:${l.email}`} className={BOTON_SUAVE}>{l.email}</a>}
            </div>
            {l.no_contactar_at ? (
              <p className="text-sm text-granate">Pidió no recibir más mensajes el {fecha(l.no_contactar_at)}.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {plantillas.map((p) => {
                  const w = linkWhatsApp(l, p, asesor, { cuando: cuandoCita, lugar: citaActiva?.lugar !== "Por confirmar" ? citaActiva?.lugar : null });
                  return w ? <WhatsAppBoton key={p} codigo={l.codigo} url={w.url} texto={w.texto} plantilla={p} etiqueta={NOMBRE_WHATSAPP[p]} /> : null;
                })}
              </div>
            )}
            <form action={accionContacto} className="flex flex-wrap items-end gap-2 border-t border-esmeralda/10 pt-3">
              <input type="hidden" name="codigo" value={l.codigo} />
              <label className="flex flex-col text-xs text-esmeralda/70">
                Registrar
                <select name="tipo" className={CAMPO} defaultValue="llamada_hecha">
                  <option value="llamada_hecha">Llamada: hablé con la persona</option>
                  <option value="llamada_sin_respuesta">Llamada: no contestó</option>
                  <option value="whatsapp_enviado">WhatsApp enviado</option>
                  <option value="respondio">La persona respondió</option>
                  <option value="nota">Nota</option>
                </select>
              </label>
              <label className="flex min-w-[14rem] flex-1 flex-col text-xs text-esmeralda/70">
                Nota (opcional)
                <input name="nota" maxLength={1000} className={CAMPO} placeholder="Qué se habló, qué sigue" />
              </label>
              <Enviar className={BOTON}>Registrar</Enviar>
            </form>
          </div>
        </Seccion>
      )}

      <div className="grid gap-8 xl:grid-cols-2">
        <Seccion titulo="Clasificación">
          <div className="space-y-3 rounded-xl border border-esmeralda/10 bg-papel-alto p-4 text-sm">
            <p>
              <Clase clase={l.clasificacion} /> <span className="text-esmeralda/70">por {l.clasificacion_fuente === "humano" ? "el equipo" : l.clasificacion_fuente === "ia" ? "la IA" : "reglas"}</span>
            </p>
            <p className="text-esmeralda/80">{l.clasificacion_motivo || "Sin clasificar todavía."}</p>
            {l.propension_taller !== null && <p className="text-esmeralda/70">Propensión a taller: <strong>{l.propension_taller} %</strong></p>}
            {l.perfil_ia && (
              <dl className="grid grid-cols-2 gap-2 rounded-lg bg-esmeralda/[0.04] p-3">
                <Dato etiqueta="Urgencia">{l.perfil_ia.urgencia}</Dato>
                <Dato etiqueta="Pieza">{l.perfil_ia.tipo_pieza}</Dato>
                <Dato etiqueta="Sensibilidad al precio">{l.perfil_ia.sensibilidad_precio}</Dato>
                <Dato etiqueta="Siguiente paso">{l.perfil_ia.siguiente_paso}</Dato>
              </dl>
            )}
            {l.revision_pendiente && (
              <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
                <p className="font-medium text-ambar">Pendiente de aprobar</p>
                {sug && (
                  <p>
                    Sugerencia ({sug.fuente === "ia" ? "IA" : "reglas"}, {sug.confianza} %): <strong>{NOMBRE_CLASE[sug.clasificacion]}</strong> — {sug.motivo}
                  </p>
                )}
                <form action={accionAprobar} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="codigo" value={l.codigo} />
                  <select name="clasificacion" defaultValue={sug?.clasificacion || l.clasificacion || "revision"} className={CAMPO} aria-label="Clasificación final">
                    {Object.entries(NOMBRE_CLASE).map(([v, t]) => (
                      <option key={v} value={v}>{t}</option>
                    ))}
                  </select>
                  <input name="motivo" placeholder="Motivo (opcional)" maxLength={300} className={`${CAMPO} flex-1`} />
                  <Enviar className={BOTON}>Aprobar</Enviar>
                </form>
              </div>
            )}
            <form action={accionReclasificar}>
              <input type="hidden" name="codigo" value={l.codigo} />
              <Enviar className="text-xs underline underline-offset-2" pendiente="Clasificando…">Volver a clasificar (reglas + IA)</Enviar>
            </form>
          </div>
        </Seccion>

        <Seccion titulo="El caso">
          <div className="space-y-3 rounded-xl border border-esmeralda/10 bg-papel-alto p-4">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Dato etiqueta="Casa actual">{l.institucion_origen}</Dato>
              <Dato etiqueta="Tasa actual">{l.tasa_actual ? `${Number(l.tasa_actual)} % mensual` : null}</Dato>
              <Dato etiqueta="Tasa ofrecida">{l.tasa_oferta ? `${Number(l.tasa_oferta)} % mensual` : null}</Dato>
              <Dato etiqueta="Ahorro estimado">{pesos(l.ahorro)}</Dato>
              <Dato etiqueta="Comisión estimada">{comision !== null ? pesos(comision) : "sin monto configurado"}</Dato>
              <Dato etiqueta="Ahorro neto">{comision !== null && l.ahorro !== null ? pesos(Number(l.ahorro) - comision) : "—"}</Dato>
              <Dato etiqueta="Probabilidad (chat)">{l.probabilidad !== null ? `${l.probabilidad} %` : null}</Dato>
              {conversacion && <Dato etiqueta="Conversación">{conversacion.turnos} mensajes{conversacion.fotos ? ` · ${conversacion.fotos} foto` : ""}</Dato>}
            </dl>
            <p className="rounded-lg bg-esmeralda/[0.04] p-3 text-sm">{l.resumen || "Sin resumen."}</p>
          </div>
        </Seccion>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <Seccion titulo="Cita del cambio">
          <div className="space-y-3">
            {citas.length === 0 && <Vacio>Todavía no hay cita ni llamada.</Vacio>}
            {citas.map((c) => (
              <form key={c.id} action={accionCita} className="space-y-2 rounded-xl border border-esmeralda/10 bg-papel-alto p-3 text-sm">
                <input type="hidden" name="id" value={c.id} />
                <p>
                  <strong>{c.tipo === "llamada" ? `Llamar ${fecha(c.inicio)}, ${FRANJA[c.franja]}` : fechaHora(c.inicio)}</strong>{" "}
                  <span className="text-esmeralda/60">· {c.estado}</span>
                </p>
                {["reservada", "confirmada"].includes(c.estado) && (
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col text-xs text-esmeralda/70">
                      Estado
                      <select name="estado" defaultValue="" className={CAMPO}>
                        <option value="">(sin cambio)</option>
                        {ESTADOS_CITA.map(([v, t]) => (<option key={v} value={v}>{t}</option>))}
                      </select>
                    </label>
                    <label className="flex flex-col text-xs text-esmeralda/70">
                      Lugar
                      <input name="lugar" defaultValue={c.lugar} maxLength={200} className={CAMPO} />
                    </label>
                    <label className="flex flex-col text-xs text-esmeralda/70">
                      {c.tipo === "llamada" ? "Acordar: día" : "Reprogramar: día"}
                      <input type="date" name="dia" min={hoyCDMX()} className={CAMPO} />
                    </label>
                    <label className="flex flex-col text-xs text-esmeralda/70">
                      Hora
                      <select name="hora" defaultValue="" className={CAMPO}>
                        <option value="">—</option>
                        {[9, 10, 11, 12, 13, 14, 15, 16].map((h) => (<option key={h} value={h}>{h}:00</option>))}
                      </select>
                    </label>
                    <Enviar className={BOTON}>Guardar</Enviar>
                  </div>
                )}
              </form>
            ))}
          </div>
        </Seccion>

        <Seccion titulo="Checklist del cambio">
          <ul className="divide-y divide-esmeralda/10 rounded-xl border border-esmeralda/10 bg-papel-alto">
            {CHECKLIST_TRASPASO.map(([k, t]) => {
              const hecho = l.traspaso?.[k];
              return (
                <li key={k}>
                  <form action={accionTraspaso} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <input type="hidden" name="codigo" value={l.codigo} />
                    <input type="hidden" name="paso" value={k} />
                    <input type="hidden" name="hecho" value={hecho ? "0" : "1"} />
                    <span className={hecho ? "" : "text-esmeralda/70"}>
                      {hecho ? "✓ " : "○ "}
                      {t}
                      {hecho && <span className="ml-2 text-xs text-esmeralda/50">{hecho.por}, {fecha(hecho.at)}</span>}
                    </span>
                    <Enviar className="min-h-[36px] shrink-0 text-xs underline underline-offset-2">{hecho ? "Desmarcar" : "Marcar"}</Enviar>
                  </form>
                </li>
              );
            })}
          </ul>
        </Seccion>
      </div>

      <Seccion titulo="Etapa y cierre">
        <form action={accionCaso} className="grid gap-3 rounded-xl border border-esmeralda/10 bg-papel-alto p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="codigo" value={l.codigo} />
          <label className="flex flex-col text-xs text-esmeralda/70">
            Etapa
            <select name="etapa" defaultValue={l.etapa} className={CAMPO}>
              {ETAPAS_PANEL.map(([v, t]) => (<option key={v} value={v}>{t}</option>))}
            </select>
          </label>
          <label className="flex flex-col text-xs text-esmeralda/70">
            Asesor
            <input name="asesor" defaultValue={l.asesor || ""} maxLength={80} className={CAMPO} />
          </label>
          <label className="flex flex-col text-xs text-esmeralda/70">
            Casa de destino
            <input name="casa_destino" defaultValue={l.casa_destino || ""} maxLength={120} className={CAMPO} />
          </label>
          <label className="flex flex-col text-xs text-esmeralda/70">
            Comisión cobrada (pesos)
            <input name="comision_mxn" inputMode="decimal" pattern="\d+(\.\d{1,2})?" defaultValue={l.comision_mxn !== null ? String(Number(l.comision_mxn)) : ""} className={CAMPO} />
          </label>
          <label className="flex flex-col text-xs text-esmeralda/70 sm:col-span-2">
            Motivo de descarte
            <input name="motivo_descarte" defaultValue={l.motivo_descarte || ""} maxLength={300} className={CAMPO} />
          </label>
          <label className="flex flex-col text-xs text-esmeralda/70 sm:col-span-2 lg:col-span-3">
            Notas del caso (sin datos de otras personas)
            <textarea name="notas" defaultValue={l.notas || ""} maxLength={2000} rows={3} className={CAMPO} />
          </label>
          <div><Enviar className={BOTON}>Guardar caso</Enviar></div>
        </form>
      </Seccion>

      <div className="grid gap-8 xl:grid-cols-2">
        <Seccion titulo="Tareas abiertas">
          {tareas.length === 0 ? (
            <Vacio>Sin tareas abiertas.</Vacio>
          ) : (
            <ul className="space-y-2">
              {tareas.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-esmeralda/10 bg-papel-alto p-3 text-sm">
                  <span>
                    <span className="text-xs uppercase text-esmeralda/60">{TIPOS_TAREA[t.tipo]}</span> {t.titulo} · vence {fechaHora(t.vence_at)}
                  </span>
                  <form action={accionTarea}>
                    <input type="hidden" name="id" value={t.id} />
                    <Enviar className="text-xs underline">Hecha</Enviar>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Seccion>

        <Seccion titulo="Historial">
          <ol className="space-y-2 border-l border-esmeralda/15 pl-4 text-sm">
            {eventos.map((e) => (
              <li key={e.id}>
                <p>
                  <strong>{TIPOS_EVENTO[e.tipo] || e.tipo}</strong>
                  {e.detalle?.clasificacion && ` · ${NOMBRE_CLASE[e.detalle.clasificacion]}`}
                  {e.detalle?.de && ` · ${etapaNombre(e.detalle.de)} → ${etapaNombre(e.detalle.a)}`}
                  {e.detalle?.plantilla && ` · ${NOMBRE_WHATSAPP[e.detalle.plantilla] || e.detalle.plantilla}`}
                  {e.detalle?.paso && e.tipo === "traspaso" && ` · ${Object.fromEntries(CHECKLIST_TRASPASO)[e.detalle.paso]} ${e.detalle.hecho ? "✓" : "(desmarcado)"}`}
                  {e.detalle?.motivo && e.tipo === "correo_fallido" && ` · ${e.detalle.motivo}`}
                </p>
                {e.detalle?.nota && <p className="text-esmeralda/80">{e.detalle.nota}</p>}
                <p className="text-xs text-esmeralda/50">{fechaHora(e.creado_at)} · {e.usuario || "sistema"} ({hace(e.creado_at)})</p>
              </li>
            ))}
          </ol>
        </Seccion>
      </div>
    </>
  );
}
