// Herramientas del servidor MCP del CRM. Cada una llama al mismo servicio que la pantalla
// (../lib/crm): una sola lógica para la app, las acciones y Claude.
import { z } from "zod";
import {
  listarLeads, fichaLead, registrarAccion, actualizarCaso, marcarTraspaso, prepararWhatsApp, resumenHoy, CHECKLIST_TRASPASO, ACCIONES_CONTACTO,
  marcarNoContactar, asignarAsesor, registrarCobro, METODOS_COBRO,
} from "@lib/crm/leads";
import { clasificarLead, aprobarClasificacion, colaRevision } from "@lib/crm/clasificacion";
import { tareasAbiertas, completarTarea } from "@lib/crm/tareas";
import { CLASES } from "@lib/crm/reglas";
import { WHATSAPP } from "@lib/crm/plantillas";
import { citasProximas, actualizarCita, ESTADOS_CITA } from "@lib/agenda/repo";
import { serieDiaria, porFuente } from "@lib/crm/trafico";
import { embudo } from "@lib/metricas/conversaciones";
import { ETAPAS } from "@lib/leads/repo";
import { PATRON_CODIGO } from "@lib/chatbot/codigo";
import { registrarAccion as bitacora } from "@lib/leads/bitacora";

const CODIGO = z.string().regex(PATRON_CODIGO, "Código con formato CAP-XXXX");

function usuario(ctx) {
  const u = ctx?.http?.authInfo?.extra?.usuario;
  if (typeof u !== "string") throw new Error("no autenticado");
  return u;
}

async function correr(fn) {
  try {
    const valor = await fn();
    if (valor && valor.ok === false) return { isError: true, content: [{ type: "text", text: `No se pudo: ${valor.motivo}` }] };
    return { content: [{ type: "text", text: JSON.stringify(valor, null, 1) }] };
  } catch (e) {
    console.error("[crm] mcp", e);
    return { isError: true, content: [{ type: "text", text: "Error interno del CRM." }] };
  }
}

// Datos mínimos por defecto: el nombre y el teléfono solo salen si se piden (incluir_contacto).
const INCLUIR = z.boolean().optional().describe("true para incluir nombre, teléfono y correo. Pídelo solo si el usuario los necesita.");

async function registrarLectura(ctx, herramienta, objetivo, conContacto) {
  await bitacora(usuario(ctx), "mcp_lectura", objetivo, { herramienta, con_contacto: Boolean(conContacto) });
}

// Vista compacta del lead para listas.
const vista = (l, conContacto) => ({
  codigo: l.codigo,
  ...(conContacto ? { nombre: l.nombre, telefono: l.telefono } : { tiene_datos: Boolean(l.consent_at) }),
  asesor: l.asesor_usuario,
  etapa: l.etapa,
  clasificacion: l.clasificacion,
  revision_pendiente: l.revision_pendiente,
  propension_taller: l.propension_taller,
  sin_contestar: l.sinContestar,
  seguimiento: l.seguimiento,
  ahorro: l.ahorro !== null ? Number(l.ahorro) : null,
  institucion: l.institucion_origen,
  campana: l.utm_campaign || l.utm_source || "directo",
  llego: l.created_at,
  cita: l.cita_inicio ? { inicio: l.cita_inicio, estado: l.cita_estado, tipo: l.cita_tipo } : null,
});

export function registrarHerramientas(server) {
  const lectura = { annotations: { readOnlyHint: true } };

  server.registerTool(
    "resumen_hoy",
    { title: "Resumen de hoy", description: "Números del día: sin atender, sin respuesta 3+ días, por aprobar, aplican por agendar, candidatos a taller, nuevos y tareas vencidas.", inputSchema: z.object({}), ...lectura },
    async () => correr(() => resumenHoy()),
  );

  server.registerTool(
    "listar_leads",
    {
      title: "Listar leads",
      description: "Leads con filtros. sin_contestar_min_dias=0 da todos los pendientes de contacto o respuesta; 3 da los que llevan 3 días o más. Incluye días sin contestar y estado del seguimiento automático.",
      inputSchema: z.object({
        etapa: z.enum(ETAPAS).optional(),
        clasificacion: z.enum(CLASES).optional(),
        revision_pendiente: z.boolean().optional(),
        sin_contestar_min_dias: z.number().int().min(0).max(365).optional(),
        con_datos: z.boolean().optional(),
        campana: z.string().max(80).optional(),
        texto: z.string().max(60).optional(),
        limite: z.number().int().min(1).max(200).optional(),
        solo_mios: z.boolean().optional(),
        incluir_contacto: INCLUIR,
      }),
      ...lectura,
    },
    async (f, ctx) =>
      correr(async () => {
        await registrarLectura(ctx, "listar_leads", null, f.incluir_contacto);
        return (
          await listarLeads({
            etapa: f.etapa ?? null,
            clasificacion: f.clasificacion ?? null,
            revision: f.revision_pendiente ?? null,
            sinContestarMin: f.sin_contestar_min_dias ?? null,
            conDatos: f.con_datos ?? null,
            campana: f.campana ?? null,
            texto: f.texto ?? "",
            limite: f.limite ?? 50,
            asesor: f.solo_mios ? usuario(ctx) : null,
          })
        ).map((l) => vista(l, f.incluir_contacto));
      }),
  );

  server.registerTool(
    "ver_lead",
    { title: "Ficha de un lead", description: "Un lead: cotización, clasificación y perfil, citas, tareas abiertas e historial. Datos de contacto solo con incluir_contacto.", inputSchema: z.object({ codigo: CODIGO, incluir_contacto: INCLUIR }), ...lectura },
    async ({ codigo, incluir_contacto }, ctx) =>
      correr(async () => {
        const f = await fichaLead(codigo);
        if (!f) return { ok: false, motivo: "no_existe" };
        await registrarLectura(ctx, "ver_lead", codigo, incluir_contacto);
        const { nombre, telefono, email, notas, baja_token, ...resto } = f.lead;
        const lead = incluir_contacto ? { ...resto, nombre, telefono, email, notas } : { ...resto, tiene_datos: Boolean(f.lead.consent_at) };
        const eventos = f.eventos.slice(0, 30).map((e) => (incluir_contacto ? e : { ...e, detalle: { ...e.detalle, nota: e.detalle?.nota ? "(nota)" : undefined } }));
        return { lead, eventos, tareas: f.tareas.map(({ nombre: _n, telefono: _t, ...t }) => t), citas: f.citas, conversacion: f.conversacion };
      }),
  );

  server.registerTool(
    "cola_revision",
    { title: "Cola de revisión", description: "Leads cuya clasificación espera aprobación humana, con la sugerencia (IA o reglas) y su motivo.", inputSchema: z.object({}), ...lectura },
    async () => correr(() => colaRevision()),
  );

  server.registerTool(
    "aprobar_clasificacion",
    {
      title: "Aprobar clasificación",
      description: "Fija la clasificación de un lead (aplica_auto, revision, no_aplica, taller). Queda como decisión humana: el sistema ya no la cambia. Solo hazlo si el usuario lo pidió o lo confirmó.",
      inputSchema: z.object({ codigo: CODIGO, clasificacion: z.enum(CLASES), motivo: z.string().max(300).optional() }),
    },
    async (i, ctx) => correr(() => aprobarClasificacion(i.codigo, { clasificacion: i.clasificacion, motivo: i.motivo, usuario: usuario(ctx) })),
  );

  server.registerTool(
    "reclasificar",
    { title: "Reclasificar", description: "Vuelve a clasificar un lead con reglas + IA (reabre incluso decisiones humanas).", inputSchema: z.object({ codigo: CODIGO }) },
    async ({ codigo }, ctx) => correr(() => clasificarLead(codigo, { usarIA: true, forzar: true, usuario: usuario(ctx) })),
  );

  server.registerTool(
    "registrar_contacto",
    {
      title: "Registrar contacto",
      description: "Anota en el historial un contacto con la persona: whatsapp_enviado, llamada_hecha, llamada_sin_respuesta, respondio o nota. Mueve los relojes de días sin contestar y detiene el seguimiento automático si hubo conversación.",
      inputSchema: z.object({ codigo: CODIGO, tipo: z.enum(ACCIONES_CONTACTO), nota: z.string().max(1000).optional() }),
    },
    async (i, ctx) => correr(() => registrarAccion(i.codigo, { tipo: i.tipo, nota: i.nota || "", usuario: usuario(ctx) })),
  );

  server.registerTool(
    "preparar_whatsapp",
    {
      title: "Preparar WhatsApp",
      description: "Devuelve el texto y el link wa.me al teléfono de la persona con una plantilla (el asesor lo envía desde su teléfono; luego registra whatsapp_enviado).",
      inputSchema: z.object({ codigo: CODIGO, plantilla: z.enum(Object.keys(WHATSAPP)), asesor: z.string().max(40).optional() }),
      ...lectura,
    },
    async (i, ctx) =>
      correr(async () => {
        await registrarLectura(ctx, "preparar_whatsapp", i.codigo, true);
        return prepararWhatsApp(i.codigo, i.plantilla, i.asesor || ctx?.http?.authInfo?.extra?.nombre?.split(" ")[0]);
      }),
  );

  server.registerTool(
    "no_contactar",
    { title: "Pidió no ser contactado", description: "Registra que la persona pidió que no la contactemos: detiene seguimiento, cierra tareas de contacto.", inputSchema: z.object({ codigo: CODIGO, nota: z.string().max(300).optional() }) },
    async (i, ctx) => correr(() => marcarNoContactar(i.codigo, { usuario: usuario(ctx), nota: i.nota || "" })),
  );

  server.registerTool(
    "asignar_asesor",
    { title: "Asignar asesor", description: "Pone a un usuario del CRM a cargo del lead (vacío para quitarlo).", inputSchema: z.object({ codigo: CODIGO, asesor_usuario: z.string().max(30).optional() }) },
    async (i, ctx) => correr(() => asignarAsesor(i.codigo, i.asesor_usuario || null, usuario(ctx))),
  );

  server.registerTool(
    "registrar_cobro",
    {
      title: "Registrar cobro",
      description: "Registra el cobro de la comisión (monto en pesos, fecha AAAA-MM-DD, método). Pasa el caso a comisión cobrada. Solo si el usuario lo confirmó.",
      inputSchema: z.object({ codigo: CODIGO, monto: z.number().positive().max(10_000_000), fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), metodo: z.enum(METODOS_COBRO) }),
    },
    async (i, ctx) =>
      correr(async () => {
        const r = await registrarCobro(i.codigo, { monto: i.monto, fecha: i.fecha ?? null, metodo: i.metodo, usuario: usuario(ctx) });
        if (r.ok) await bitacora(usuario(ctx), "cobro_registrado", i.codigo, { monto: i.monto, metodo: i.metodo, via: "mcp" });
        return r;
      }),
  );

  server.registerTool(
    "tareas_pendientes",
    { title: "Tareas pendientes", description: "Tareas abiertas (WhatsApp, llamadas, revisiones, confirmar cita), las vencidas primero. solo_mias filtra las del usuario.", inputSchema: z.object({ codigo: CODIGO.optional(), solo_mias: z.boolean().optional() }), ...lectura },
    async ({ codigo, solo_mias }, ctx) =>
      correr(async () => (await tareasAbiertas({ codigo: codigo ?? null, asesor: solo_mias ? usuario(ctx) : null, limite: 100 })).map(({ nombre: _n, telefono: _t, ...t }) => t)),
  );

  server.registerTool(
    "completar_tarea",
    { title: "Completar tarea", description: "Marca una tarea como hecha.", inputSchema: z.object({ id: z.number().int().positive() }) },
    async ({ id }, ctx) => correr(async () => (await completarTarea(id, usuario(ctx))) || { ok: false, motivo: "no_existe_o_ya_hecha" }),
  );

  server.registerTool(
    "agenda",
    { title: "Agenda", description: "Citas presenciales y llamadas por hacer de los próximos días (máximo 14).", inputSchema: z.object({ dias: z.number().int().min(1).max(14).optional() }), ...lectura },
    async ({ dias }) => correr(async () => (await citasProximas({ dias: dias ?? 7 })).map(({ nombre: _n, telefono: _t, ...c }) => c)),
  );

  server.registerTool(
    "actualizar_cita",
    {
      title: "Actualizar cita",
      description: "Cambia estado, lugar u horario de una cita. inicio en ISO, en punto, lunes a viernes 9:00–16:00 CDMX. Poner horario a una llamada la vuelve cita confirmada.",
      inputSchema: z.object({ id: z.number().int().positive(), estado: z.enum(ESTADOS_CITA).optional(), lugar: z.string().max(200).optional(), inicio: z.string().datetime({ offset: true }).optional() }),
    },
    async (i, ctx) =>
      correr(async () => {
        const r = await actualizarCita(i.id, { estado: i.estado, lugar: i.lugar, inicio: i.inicio });
        if (r.ok) await bitacora(usuario(ctx), "cita_actualizada", r.cita.lead_codigo, { estado: i.estado, lugar: i.lugar, inicio: i.inicio, via: "mcp" });
        return r;
      }),
  );

  server.registerTool(
    "actualizar_caso",
    {
      title: "Actualizar caso",
      description: "Cambia etapa, asesor, casa de destino, comisión cobrada o motivo de descarte. Descartar cierra tareas y seguimiento. Para notas usa registrar_contacto con tipo nota.",
      inputSchema: z.object({
        codigo: CODIGO,
        etapa: z.enum(ETAPAS).optional(),
        asesor: z.string().max(80).optional(),
        casa_destino: z.string().max(120).optional(),
        comision_mxn: z.number().min(0).max(10_000_000).optional(),
        motivo_descarte: z.string().max(300).optional(),
      }),
    },
    async ({ codigo, ...cambios }, ctx) =>
      correr(async () => {
        const r = await actualizarCaso(codigo, cambios, usuario(ctx));
        if (r.ok) await bitacora(usuario(ctx), "lead_actualizado", codigo, { ...cambios, via: "mcp" });
        return r;
      }),
  );

  server.registerTool(
    "marcar_traspaso",
    {
      title: "Checklist del cambio",
      description: `Marca o desmarca un paso del cambio de boleta: ${CHECKLIST_TRASPASO.map(([k, t]) => `${k} (${t})`).join(", ")}.`,
      inputSchema: z.object({ codigo: CODIGO, paso: z.enum(CHECKLIST_TRASPASO.map(([k]) => k)), hecho: z.boolean() }),
    },
    async (i, ctx) => correr(() => marcarTraspaso(i.codigo, { paso: i.paso, hecho: i.hecho, usuario: usuario(ctx) })),
  );

  server.registerTool(
    "trafico",
    { title: "Tráfico y conversión", description: "Embudo (visitas → chats → cotizaciones → citas → cambios → cobrados), serie diaria y desglose por fuente.", inputSchema: z.object({ dias: z.number().int().min(1).max(365).optional() }), ...lectura },
    async ({ dias }) =>
      correr(async () => {
        const d = dias ?? 30;
        const [e, serie, fuentes] = await Promise.all([embudo({ dias: d }), serieDiaria({ dias: Math.min(d, 90) }), porFuente({ dias: d })]);
        return { embudo: e, por_dia: serie, por_fuente: fuentes };
      }),
  );
}
