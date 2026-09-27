import { notFound } from "next/navigation";
import { fichaLead, duplicados, CHECKLIST_TRASPASO, METODOS_COBRO } from "@lib/crm/leads";
import { linkWhatsApp, NOMBRE_WHATSAPP } from "@lib/crm/plantillas";
import { TIPOS_EVENTO } from "@lib/crm/eventos";
import { TIPOS_TAREA } from "@lib/crm/tareas";
import { comisionCambio } from "@lib/chatbot/comision";
import { PATRON_CODIGO } from "@lib/chatbot/codigo";
import { query } from "@lib/db/client";
import { guionPara, DOCUMENTOS, OBJECIONES } from "@lib/crm/guiones";
import { requireSesion } from "@/lib/auth";
import { Clase, SinContestar, Seccion, Vacio, CAMPO, BOTON, BOTON_SUAVE } from "@/components/ui";
import WhatsAppBoton from "@/components/WhatsAppBoton";
import FormAccion from "@/components/FormAccion";
import Enviar from "@/components/Enviar";
import { pesos, fecha, fechaHora, hace, etapaNombre, ETAPAS_PANEL, NOMBRE_CLASE, PERFILES, hoyCDMX, NOMBRE_ESTADO_CITA } from "@/lib/formato";
import {
  accionContacto, accionReclasificar, accionAprobar, accionCaso, accionTraspaso, accionCita, accionTarea,
  accionAsignar, accionCobro, accionNoContactar, accionAnonimizar, accionDescartarRapido, accionAcordarCita,
} from "../../acciones";

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
  terminado: "Seguimiento automático terminado",
};
const FRANJA = { manana: "9:00 a 13:00", tarde: "13:00 a 17:00" };
const METODO = { efectivo: "Efectivo", transferencia: "Transferencia", tarjeta: "Tarjeta", otro: "Otro" };
const HORAS = [9, 10, 11, 12, 13, 14, 15, 16];

function Dato({ etiqueta, children }) {
  return (
    <div>
      <dt className="text-xs text-esmeralda/75">{etiqueta}</dt>
      <dd className="text-sm">{children ?? "—"}</dd>
    </div>
  );
}

function GuionLlamada({ lead }) {
  const g = guionPara(lead);
  if (!g) return null;
  return (
    <details className="rounded-lg bg-esmeralda/[0.04] p-3 text-sm">
      <summary className="inline-flex min-h-[44px] cursor-pointer items-center font-medium">Guion de llamada: {g.titulo}</summary>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        {g.pasos.map((p) => (<li key={p}>{p}</li>))}
      </ol>
      <p className="mt-3 font-medium">Documentos para el cambio</p>
      <ul className="list-disc pl-5">
        {DOCUMENTOS.map((d) => (<li key={d}>{d}</li>))}
      </ul>
      <p className="mt-3 font-medium">Si pregunta…</p>
      <dl className="space-y-1">
        {OBJECIONES.map(([q, a]) => (
          <div key={q}>
            <dt className="italic">{q}</dt>
            <dd className="text-esmeralda/80">{a}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/** Qué mensajes de WhatsApp tienen sentido ahora para este caso. */
function plantillasQueAplican(l, citaPresencial) {
  const lista = [l.ultimo_contacto_at ? "recordatorio" : "primer_contacto"];
  if (citaPresencial) lista.push("confirmar_cita");
  if (l.clasificacion === "taller" || Number(l.propension_taller) >= 50) lista.push("taller");
  if (["atendido", "switcheo_concretado"].includes(l.etapa)) lista.push("seguimiento_cita");
  if (l.etapa === "cita_solicitada" && l.ultima_cita_estado === "no_asistio") lista.push("reagendar");
  return lista;
}

function detalleEvento(e) {
  const d = e.detalle || {};
  const partes = [];
  if (e.tipo === "clasificacion" || e.tipo === "clasificacion_aprobada") partes.push(NOMBRE_CLASE[d.clasificacion]);
  if (e.tipo === "etapa") partes.push(`${d.de ? `${etapaNombre(d.de)} → ` : ""}${etapaNombre(d.a)}`);
  if (d.plantilla) partes.push(NOMBRE_WHATSAPP[d.plantilla] || d.plantilla);
  if (e.tipo === "traspaso") partes.push(`${Object.fromEntries(CHECKLIST_TRASPASO)[d.paso]} ${d.hecho ? "✓" : "(desmarcado)"}`);
  if (e.tipo === "correo_fallido") partes.push(d.motivo === "sin_configurar" ? "correo sin configurar" : d.motivo);
  if (e.tipo === "seguimiento" && typeof d.paso === "number") partes.push(`paso ${d.paso + 1} de 4`);
  if (e.tipo === "asignado") partes.push(d.a ? `a ${d.a}${d.por === "turno" ? " (por turno)" : ""}` : "sin asesor");
  if (e.tipo === "cita" && d.estado) partes.push(NOMBRE_ESTADO_CITA[d.estado] || d.estado);
  if (e.tipo === "cobro") partes.push(`${pesos(d.monto)} · ${METODO[d.metodo] || d.metodo}`);
  return partes.filter(Boolean).join(" · ");
}

export default async function Ficha({ params }) {
  const { codigo } = await params;
  if (!PATRON_CODIGO.test(codigo)) notFound();
  const s = await requireSesion();
  const [f, dups, usuarios] = await Promise.all([
    fichaLead(codigo),
    duplicados(codigo),
    query(`SELECT usuario, nombre FROM crm_usuario WHERE activo ORDER BY nombre`).then((r) => r.rows),
  ]);
  if (!f) notFound();
  const { lead: l, eventos, tareas, citas, conversacion } = f;
  const dueno = s.rol === "dueno";
  const asesor = s.nombre.split(" ")[0];
  const comision = l.ahorro !== null ? comisionCambio(Number(l.ahorro)) : null;
  const citaActiva = citas.find((c) => ["reservada", "confirmada"].includes(c.estado));
  l.ultima_cita_estado = citas[0]?.estado ?? null;
  const citaPresencial = citaActiva && citaActiva.tipo === "cita" ? citaActiva : null;
  const lugar = citaPresencial?.lugar && citaPresencial.lugar !== "Por confirmar" ? citaPresencial.lugar : null;
  const sug = l.sugerencia;
  const cerrado = ["comision_cobrada", "descartado"].includes(l.etapa);

  return (
    <>
      <header className="space-y-2">
        <a href="/leads" className="inline-flex min-h-[44px] items-center text-sm underline">← Leads</a>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-serif text-3xl">{l.nombre || "Sin datos de contacto"}</h1>
          <span className="font-mono text-sm">{l.codigo}</span>
          <Clase clase={l.clasificacion} pendiente={l.revision_pendiente} />
          <span className="text-sm text-esmeralda/75">{etapaNombre(l.etapa)}</span>
          <SinContestar info={l.sinContestar} />
        </div>
        <p className="text-sm text-esmeralda/75">
          {PERFILES[l.perfil] || l.perfil} · llegó {fecha(l.created_at)} por {l.utm_campaign || l.utm_source || "directo"} · {SEGUIMIENTO[l.seguimiento] || l.seguimiento}
          {l.proximo_seguimiento_at && l.seguimiento === "activo" && ` (siguiente: ${fechaHora(l.proximo_seguimiento_at)})`}
        </p>
        <FormAccion accion={accionAsignar} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="codigo" value={l.codigo} />
          <label className="flex flex-col text-xs text-esmeralda/75">
            Asesor a cargo
            <select name="asesor_usuario" defaultValue={l.asesor_usuario || ""} className={CAMPO}>
              <option value="">Sin asignar</option>
              {usuarios.map((u) => (<option key={u.usuario} value={u.usuario}>{u.nombre}</option>))}
            </select>
          </label>
          <Enviar className={BOTON_SUAVE}>Asignar</Enviar>
        </FormAccion>
        {dups.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
            <span className="text-ambar">Mismo teléfono que {dups.map((d) => <a key={d.codigo} href={`/leads/${d.codigo}`} className="mr-1 font-mono underline">{d.codigo}</a>)}</span>
            {!cerrado && (
              <FormAccion accion={accionDescartarRapido} className="contents">
                <input type="hidden" name="codigo" value={l.codigo} />
                <input type="hidden" name="motivo" value="Duplicado" />
                <Enviar className={BOTON_SUAVE}>Descartar como duplicado</Enviar>
              </FormAccion>
            )}
          </div>
        )}
      </header>

      {l.telefono && (
        <Seccion titulo="Contactar">
          <div className="space-y-3 rounded-xl border border-esmeralda/15 bg-papel-alto p-4">
            {l.no_contactar_at ? (
              <p className="text-sm text-granate">Pidió no ser contactado el {fecha(l.no_contactar_at)}. No le escribas ni le llames.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {plantillasQueAplican(l, citaPresencial).map((p) => {
                    const w = linkWhatsApp(l, p, asesor, { cuando: citaPresencial ? fechaHora(citaPresencial.inicio) : null, lugar });
                    return w ? <WhatsAppBoton key={p} codigo={l.codigo} url={w.url} texto={w.texto} plantilla={p} etiqueta={NOMBRE_WHATSAPP[p]} /> : null;
                  })}
                  <a href={`tel:+52${l.telefono}`} className={BOTON_SUAVE}>Llamar {l.telefono}</a>
                  {l.email && <a href={`mailto:${l.email}`} className={BOTON_SUAVE}>{l.email}{l.email_confirmado_at ? " ✓" : ""}</a>}
                </div>
                <FormAccion accion={accionContacto} className="flex flex-wrap items-end gap-2 border-t border-esmeralda/10 pt-3">
                  <input type="hidden" name="codigo" value={l.codigo} />
                  <label className="flex flex-col text-xs text-esmeralda/75">
                    Registrar
                    <select name="tipo" className={CAMPO} defaultValue="llamada_hecha">
                      <option value="llamada_hecha">Llamada: hablé con la persona</option>
                      <option value="llamada_sin_respuesta">Llamada: no contestó</option>
                      <option value="whatsapp_enviado">WhatsApp enviado</option>
                      <option value="respondio">La persona respondió</option>
                      <option value="nota">Nota</option>
                    </select>
                  </label>
                  <label className="flex min-w-[14rem] flex-1 flex-col text-xs text-esmeralda/75">
                    Nota (obligatoria si registras una nota)
                    <input name="nota" maxLength={1000} className={CAMPO} placeholder="Qué se habló, qué sigue" />
                  </label>
                  <Enviar className={BOTON}>Registrar</Enviar>
                </FormAccion>
                <GuionLlamada lead={l} />
                <details className="text-sm">
                  <summary className="inline-flex min-h-[44px] cursor-pointer items-center text-esmeralda/75 underline underline-offset-2">Pidió que no lo contactemos</summary>
                  <FormAccion accion={accionNoContactar} className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="codigo" value={l.codigo} />
                    <input name="nota" maxLength={300} placeholder="Cómo lo pidió (opcional)" className={`${CAMPO} min-w-[14rem] flex-1`} aria-label="Cómo lo pidió" />
                    <Enviar className={BOTON}>Ya no contactar</Enviar>
                  </FormAccion>
                </details>
              </>
            )}
          </div>
        </Seccion>
      )}

      <div className="grid gap-8 xl:grid-cols-2">
        <div id="clasificacion" className="scroll-mt-4">
          <Seccion titulo="Clasificación">
            <div className="space-y-3 rounded-xl border border-esmeralda/15 bg-papel-alto p-4 text-sm">
              <p>
                <Clase clase={l.clasificacion} /> <span className="text-esmeralda/75">por {l.clasificacion_fuente === "humano" ? "el equipo" : l.clasificacion_fuente === "ia" ? "la IA" : "reglas"}</span>
              </p>
              <p className="text-esmeralda/80">{l.clasificacion_motivo || "Sin clasificar todavía."}</p>
              {l.revision_pendiente && (
                <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <p className="font-medium text-ambar">Pendiente de aprobar</p>
                  {sug && (
                    <p>
                      Sugerencia ({sug.fuente === "ia" ? "IA" : "reglas"}, {sug.confianza} %): <strong>{NOMBRE_CLASE[sug.clasificacion]}</strong> — {sug.motivo}
                    </p>
                  )}
                  <FormAccion accion={accionAprobar} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="codigo" value={l.codigo} />
                    <select name="clasificacion" defaultValue={sug?.clasificacion || l.clasificacion || "revision"} className={CAMPO} aria-label="Clasificación final">
                      {Object.entries(NOMBRE_CLASE).map(([v, t]) => (<option key={v} value={v}>{t}</option>))}
                    </select>
                    <input name="motivo" placeholder="Motivo (opcional)" maxLength={300} aria-label="Motivo" className={`${CAMPO} flex-1`} />
                    <Enviar className={BOTON}>Aprobar</Enviar>
                  </FormAccion>
                </div>
              )}
              {(l.perfil_ia || l.propension_taller !== null) && (
                <details>
                  <summary className="inline-flex min-h-[44px] cursor-pointer items-center text-esmeralda/75 underline underline-offset-2">Perfil del caso</summary>
                  <dl className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-esmeralda/[0.04] p-3">
                    {l.propension_taller !== null && <Dato etiqueta="Propensión a taller">{l.propension_taller} %</Dato>}
                    {l.perfil_ia && (
                      <>
                        <Dato etiqueta="Urgencia">{l.perfil_ia.urgencia}</Dato>
                        <Dato etiqueta="Pieza">{l.perfil_ia.tipo_pieza}</Dato>
                        <Dato etiqueta="Sensibilidad al precio">{l.perfil_ia.sensibilidad_precio}</Dato>
                        <Dato etiqueta="Siguiente paso sugerido">{l.perfil_ia.siguiente_paso}</Dato>
                      </>
                    )}
                  </dl>
                </details>
              )}
              <FormAccion accion={accionReclasificar} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="codigo" value={l.codigo} />
                <Enviar className="min-h-[44px] text-sm underline underline-offset-2" pendiente="Clasificando…">Volver a clasificar (reglas + IA)</Enviar>
              </FormAccion>
            </div>
          </Seccion>
        </div>

        <Seccion titulo="El caso">
          <div className="space-y-3 rounded-xl border border-esmeralda/15 bg-papel-alto p-4">
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
        <div id="cita" className="scroll-mt-4">
          <Seccion titulo="Cita del cambio">
            <div className="space-y-3">
              {citas.length === 0 && <Vacio>Todavía no hay cita ni llamada.</Vacio>}
              {!citaActiva && !cerrado && (
                <FormAccion accion={accionAcordarCita} className="flex flex-wrap items-end gap-2 rounded-xl border border-esmeralda/15 bg-papel-alto p-3 text-sm">
                  <input type="hidden" name="codigo" value={l.codigo} />
                  <p className="basis-full font-medium">{citas.length ? "Acordar nueva fecha" : "Acordar cita"} (ya hablada con la persona)</p>
                  <label className="flex flex-col text-xs text-esmeralda/75">
                    Día
                    <input type="date" name="dia" min={hoyCDMX()} required className={CAMPO} />
                  </label>
                  <label className="flex flex-col text-xs text-esmeralda/75">
                    Hora
                    <select name="hora" required defaultValue="" className={CAMPO}>
                      <option value="" disabled>—</option>
                      {HORAS.map((h) => (<option key={h} value={h}>{h}:00</option>))}
                    </select>
                  </label>
                  <label className="flex min-w-[12rem] flex-1 flex-col text-xs text-esmeralda/75">
                    Lugar
                    <input name="lugar" maxLength={200} placeholder="Por confirmar" className={CAMPO} />
                  </label>
                  <Enviar className={BOTON}>Acordar</Enviar>
                </FormAccion>
              )}
              {citas.map((c) => (
                <FormAccion key={c.id} accion={accionCita} className="space-y-2 rounded-xl border border-esmeralda/15 bg-papel-alto p-3 text-sm">
                  <input type="hidden" name="id" value={c.id} />
                  <p>
                    <strong>{c.tipo === "llamada" ? `Llamar ${fecha(c.inicio)}, ${FRANJA[c.franja]}` : fechaHora(c.inicio)}</strong>{" "}
                    <span className="text-esmeralda/75">· {NOMBRE_ESTADO_CITA[c.estado] || c.estado}{c.tipo === "cita" && c.lugar ? ` · ${c.lugar}` : ""}</span>
                  </p>
                  {["reservada", "confirmada"].includes(c.estado) && (
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="flex flex-col text-xs text-esmeralda/75">
                        Estado
                        <select name="estado" defaultValue="" className={CAMPO}>
                          <option value="">(sin cambio)</option>
                          {Object.entries(NOMBRE_ESTADO_CITA).map(([v, t]) => (<option key={v} value={v}>{t}</option>))}
                        </select>
                      </label>
                      <label className="flex flex-col text-xs text-esmeralda/75">
                        Lugar
                        <input name="lugar" defaultValue={c.lugar} maxLength={200} className={CAMPO} />
                      </label>
                      <label className="flex flex-col text-xs text-esmeralda/75">
                        {c.tipo === "llamada" ? "Acordar cita: día" : "Mover a: día"}
                        <input type="date" name="dia" min={hoyCDMX()} className={CAMPO} />
                      </label>
                      <label className="flex flex-col text-xs text-esmeralda/75">
                        Hora
                        <select name="hora" defaultValue="" className={CAMPO}>
                          <option value="">—</option>
                          {HORAS.map((h) => (<option key={h} value={h}>{h}:00</option>))}
                        </select>
                      </label>
                      <label className="flex min-w-[12rem] flex-1 flex-col text-xs text-esmeralda/75">
                        Qué pasó (opcional)
                        <input name="nota" maxLength={1000} className={CAMPO} placeholder="Resultado de la cita o la llamada" />
                      </label>
                      <Enviar className={BOTON}>Guardar</Enviar>
                    </div>
                  )}
                </FormAccion>
              ))}
            </div>
          </Seccion>
        </div>

        <Seccion titulo="Checklist del cambio">
          <ul className="divide-y divide-esmeralda/10 rounded-xl border border-esmeralda/15 bg-papel-alto">
            {CHECKLIST_TRASPASO.map(([k, t]) => {
              const hecho = l.traspaso?.[k];
              const esCobro = k === "comision_cobrada";
              return (
                <li key={k}>
                  <FormAccion accion={accionTraspaso} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                    <input type="hidden" name="codigo" value={l.codigo} />
                    <input type="hidden" name="paso" value={k} />
                    <input type="hidden" name="hecho" value={hecho ? "0" : "1"} />
                    <span className={hecho ? "" : "text-esmeralda/75"}>
                      {hecho ? "✓ " : "○ "}
                      {t}
                      {hecho && <span className="ml-2 text-xs text-esmeralda/70">{hecho.por}, {fecha(hecho.at)}</span>}
                      {k === "boleta_nueva" && !hecho && <span className="ml-2 text-xs text-esmeralda/70">(pasa el caso a «Cambio concretado»)</span>}
                    </span>
                    {esCobro ? (
                      <span className="text-xs text-esmeralda/75">{hecho ? "registrado con el cobro" : "se marca al registrar el cobro"}</span>
                    ) : (
                      <Enviar className={BOTON_SUAVE}>{hecho ? "Desmarcar" : "Marcar"}</Enviar>
                    )}
                  </FormAccion>
                </li>
              );
            })}
          </ul>
        </Seccion>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <Seccion titulo="Etapa y cierre">
          <FormAccion accion={accionCaso} className="grid gap-3 rounded-xl border border-esmeralda/15 bg-papel-alto p-4 text-sm sm:grid-cols-2">
            <input type="hidden" name="codigo" value={l.codigo} />
            <label className="flex flex-col text-xs text-esmeralda/75">
              Etapa
              <select name="etapa" defaultValue={l.etapa} className={CAMPO}>
                {ETAPAS_PANEL.filter(([v]) => v !== "comision_cobrada" || l.etapa === "comision_cobrada").map(([v, t]) => (<option key={v} value={v}>{t}</option>))}
              </select>
            </label>
            <label className="flex flex-col text-xs text-esmeralda/75">
              Casa de destino
              <input name="casa_destino" defaultValue={l.casa_destino || ""} maxLength={120} className={CAMPO} />
            </label>
            <label className="flex flex-col text-xs text-esmeralda/75 sm:col-span-2">
              Motivo de descarte
              <input name="motivo_descarte" defaultValue={l.motivo_descarte || ""} maxLength={300} className={CAMPO} />
            </label>
            <label className="flex flex-col text-xs text-esmeralda/75 sm:col-span-2">
              Notas del caso (sin datos de otras personas)
              <textarea name="notas" defaultValue={l.notas || ""} maxLength={2000} rows={3} className={CAMPO} />
            </label>
            <div><Enviar className={BOTON}>Guardar caso</Enviar></div>
          </FormAccion>
        </Seccion>

        <Seccion titulo="Cobro de la comisión">
          <div className="rounded-xl border border-esmeralda/15 bg-papel-alto p-4 text-sm">
            {l.etapa === "comision_cobrada" ? (
              <p>
                Cobrada: <strong>{pesos(l.comision_mxn)}</strong> el {fecha(l.cobrado_at)}{l.cobro_metodo ? ` · ${METODO[l.cobro_metodo]}` : ""}.
              </p>
            ) : dueno ? (
              <FormAccion accion={accionCobro} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="codigo" value={l.codigo} />
                <label className="flex flex-col text-xs text-esmeralda/75">
                  Monto (pesos)
                  <input name="monto" inputMode="decimal" required defaultValue={comision !== null ? String(comision) : ""} className={`${CAMPO} w-32`} />
                </label>
                <label className="flex flex-col text-xs text-esmeralda/75">
                  Fecha
                  <input type="date" name="fecha" defaultValue={hoyCDMX()} max={hoyCDMX()} className={CAMPO} />
                </label>
                <label className="flex flex-col text-xs text-esmeralda/75">
                  Cómo se cobró
                  <select name="metodo" required defaultValue="" className={CAMPO}>
                    <option value="" disabled>Elige…</option>
                    {METODOS_COBRO.map((m) => (<option key={m} value={m}>{METODO[m]}</option>))}
                  </select>
                </label>
                <Enviar className={BOTON}>Registrar cobro</Enviar>
              </FormAccion>
            ) : (
              <p className="text-esmeralda/75">{l.etapa === "switcheo_concretado" ? "Cambio concretado: la comisión está por cobrar. El cobro lo registra el dueño." : "Se registra cuando se concreta el cambio."}</p>
            )}
          </div>
        </Seccion>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <Seccion titulo="Tareas abiertas">
          {tareas.length === 0 ? (
            <Vacio>Sin tareas abiertas.</Vacio>
          ) : (
            <ul className="space-y-2">
              {tareas.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-esmeralda/15 bg-papel-alto p-3 text-sm">
                  <span>
                    <span className="text-xs uppercase text-esmeralda/75">{TIPOS_TAREA[t.tipo]}</span> {t.titulo} · para {fechaHora(t.vence_at)}
                  </span>
                  {t.tipo !== "revisar" && (
                    <FormAccion accion={accionTarea} className="contents">
                      <input type="hidden" name="id" value={t.id} />
                      <Enviar className={BOTON_SUAVE}>Hecha</Enviar>
                    </FormAccion>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Seccion>

        <Seccion titulo="Historial">
          <ol className="space-y-2 border-l border-esmeralda/15 pl-4 text-sm">
            {eventos.map((e) => {
              const extra = detalleEvento(e);
              return (
                <li key={e.id}>
                  <p>
                    <strong>{TIPOS_EVENTO[e.tipo] || e.tipo}</strong>
                    {extra ? ` · ${extra}` : ""}
                  </p>
                  {e.detalle?.nota && <p className="text-esmeralda/80">{e.detalle.nota}</p>}
                  <p className="text-xs text-esmeralda/70">{fechaHora(e.creado_at)} · {e.usuario || "sistema"} ({hace(e.creado_at)})</p>
                </li>
              );
            })}
          </ol>
        </Seccion>
      </div>

      {dueno && (l.nombre || l.telefono || l.email) && (
        <details className="rounded-xl border border-granate/30 p-4 text-sm">
          <summary className="inline-flex min-h-[44px] cursor-pointer items-center font-medium text-granate">Borrar datos personales (solicitud de la persona)</summary>
          <p className="mt-2 text-esmeralda/80">
            Borra nombre, teléfono, correo y notas de este caso y de su historial. Queda el registro anónimo (y lo fiscal si ya se cobró). No se puede deshacer.
          </p>
          <FormAccion accion={accionAnonimizar} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="codigo" value={l.codigo} />
            <label className="flex flex-col text-xs text-esmeralda/75">
              Escribe {l.codigo} para confirmar
              <input name="confirmar" autoComplete="off" className={CAMPO} />
            </label>
            <Enviar className="inline-flex min-h-[44px] items-center rounded-full bg-granate px-4 text-sm font-medium text-white">Borrar datos</Enviar>
          </FormAccion>
        </details>
      )}
    </>
  );
}
