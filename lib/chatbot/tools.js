// Herramientas que el modelo puede llamar. Definiciones fijas (cacheables) y
// ejecutores puros. El orden del array no debe cambiar entre requests.

import { modoAgenda } from "../agenda/horarios.js";
import { alCrearLead } from "../crm/automatizacion.js";
import { diferir } from "../diferir.js";
import { calcularCosto, calcularDesempenoHoy, compararOpciones, formatearMXN } from "./calculo.js";
import { construirLinkWhatsApp } from "./codigo.js";
import { crearLead } from "../leads/repo.js";
import { cotizarTraspaso } from "./cotizacion.js";
import { rankingPublico, ALIADO } from "./instituciones.js";
import { PERFIL_IDS, esPerfilValido } from "./perfiles.js";
import { ultimaFotografia } from "../precios/repo.js";
import { tablaPorGramo, estimarValorMetal, fotografiaVigente } from "../precios/calculo.js";
import { registrarEvento } from "../alertas/eventos.js";
import { WHATSAPP_NUMBER } from "../constants.js";

let ultimoAvisoPrecio = 0;

export const TOOLS = [
  {
    name: "calcular_costo",
    description:
      "Calcula cuánto terminará pagando una persona por su empeño con interés simple mensual. Úsala siempre que tengas préstamo, tasa mensual y meses; nunca calcules a mano. Devuelve interés mensual, interés total, total a pagar y cuántas veces el préstamo representa.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["prestamo", "tasa_mensual", "meses"],
      properties: {
        prestamo: {
          type: "number",
          description: "Dinero que le prestaron a la persona, en pesos mexicanos.",
        },
        tasa_mensual: {
          type: "number",
          description: "Tasa de interés MENSUAL en porcentaje, tal como aparece en la boleta (ej. 8 para 8 %). No usar tasa anual ni CAT.",
        },
        meses: {
          type: "integer",
          description: "Meses que pasarán hasta que recupere su pieza (incluyendo refrendos).",
        },
      },
    },
  },
  {
    name: "calcular_desempeno_hoy",
    description:
      "Calcula cuánto debe hoy una persona que ya lleva tiempo empeñada: cuánto pagaría por refrendar hoy (solo intereses pendientes) y cuánto por desempeñar hoy (recuperar la pieza). Úsala cuando ya empeñó y pregunta cuánto debe, cuánto cuesta refrendar o cuánto le cuesta liquidar.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["prestamo", "tasa_mensual", "meses_sin_pagar", "penalizacion"],
      properties: {
        prestamo: { type: "number", description: "Dinero que le prestaron, en pesos." },
        tasa_mensual: { type: "number", description: "Tasa de interés MENSUAL en porcentaje (ej. 8 para 8 %)." },
        meses_sin_pagar: {
          type: "integer",
          description: "Meses cuyos intereses todavía no ha pagado (los refrendos ya pagados cubren meses anteriores). Si acaba de refrendar, 0 o 1.",
        },
        penalizacion: {
          type: "number",
          description: "Recargo en pesos si ya venció y aplica desempeño extemporáneo. 0 si no aplica o no se sabe.",
        },
      },
    },
  },
  {
    name: "comparar_opciones",
    description:
      "Compara quedarse en la institución actual vs. mover la boleta (traspaso) a otra con tasa menor, para los meses que le faltan. Devuelve costo de liquidar hoy, total si se queda, total si se mueve, ahorro en pesos y porcentaje, y si conviene según el criterio de CAP & Co. Úsala siempre que la persona pregunte si le conviene cambiarse, o cuando su tasa esté arriba del rango bajo del mercado. Para tasa_nueva usa una referencia del rango bajo del mercado (3 a 4 % mensual en IAP) y dilo como orientativo.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["prestamo", "tasa_actual", "tasa_nueva", "meses_restantes", "meses_sin_pagar", "penalizacion"],
      properties: {
        prestamo: { type: "number", description: "Préstamo original en pesos." },
        tasa_actual: { type: "number", description: "Tasa MENSUAL actual en porcentaje." },
        tasa_nueva: { type: "number", description: "Tasa MENSUAL de la opción a comparar, en porcentaje." },
        meses_restantes: { type: "integer", description: "Meses que la persona calcula que seguirá necesitando el préstamo." },
        meses_sin_pagar: { type: "integer", description: "Meses de intereses pendientes hoy en la institución actual. 0 si está al corriente." },
        penalizacion: { type: "number", description: "Recargo en pesos por liquidar hoy, si lo hay. 0 si no." },
      },
    },
  },
  {
    name: "comparar_instituciones",
    description:
      "Devuelve el ranking público de casas de empeño e instituciones de asistencia privada por CAT (menor primero), con fuente y fecha de los datos, más la tasa pública del aliado con el que CAP & Co. gestiona tasa preferente. Úsala cuando pregunten con cuál institución irse, cuál es la más barata o cómo se compara la suya.",
    strict: true,
    input_schema: { type: "object", additionalProperties: false, required: [], properties: {} },
  },
  {
    name: "cotizar_traspaso",
    description:
      "Cotiza el cambio de boleta de la persona hacia el aliado de CAP & Co. con la regla de tasa preferente: si su tasa actual es mayor que la pública del aliado, la oferta es la pública; si es igual o menor, la oferta es su tasa menos un descuento, con un piso según el valor de la pieza. Devuelve la tasa ofrecida, el ahorro para los meses que le faltan y si el caso AVANZA o NO (no avanza si la casa de empeño perdería o si el ahorro no es claro). Úsala siempre que ya empeñó y pregunte si le conviene cambiarse, en lugar de comparar_opciones.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["prestamo", "tasa_actual", "meses_restantes", "meses_sin_pagar", "penalizacion", "valor_pieza", "institucion_actual"],
      properties: {
        prestamo: { type: "number", description: "Préstamo original en pesos." },
        tasa_actual: { type: "number", description: "Tasa MENSUAL actual en porcentaje." },
        meses_restantes: { type: "integer", description: "Meses que seguirá necesitando el préstamo." },
        meses_sin_pagar: { type: "integer", description: "Meses de intereses pendientes hoy. 0 si está al corriente." },
        penalizacion: { type: "number", description: "Recargo en pesos por liquidar hoy. 0 si no hay." },
        valor_pieza: { type: ["number", "null"], description: "Avalúo o valor aproximado de la pieza en pesos. null si no lo sabe." },
        institucion_actual: { type: ["string", "null"], description: "Nombre de la institución donde está empeñada la pieza, tal como lo dijo la persona. null si no lo dijo." },
      },
    },
  },
  {
    name: "precio_metales",
    description:
      "Devuelve el precio de referencia por gramo, en pesos, de oro (puro y por kilataje), plata, platino y paladio, de la última fotografía de precios (se toman dos al día entre semana). Úsala cuando pregunten a cuánto está el oro, la plata o un metal. Siempre di la fecha y hora de la fotografía y que es precio internacional de referencia, no lo que paga una casa de empeño.",
    strict: true,
    input_schema: { type: "object", additionalProperties: false, required: [], properties: {} },
  },
  {
    name: "estimar_valor_metal",
    description:
      "Estima el valor de referencia del metal de una pieza (sin piedras ni mano de obra) y el rango típico de préstamo (40 %–60 %), con la última fotografía de precios. Úsala cuando den metal, pureza y peso de una pieza.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["metal", "pureza", "gramos"],
      properties: {
        metal: { type: "string", enum: ["oro", "plata", "platino", "paladio"] },
        pureza: { type: "string", description: "Kilataje o ley tal como la dijo la persona: \"14k\", \"585\", \"925\", \"PT950\"." },
        gramos: { type: "number", description: "Peso de la pieza en gramos." },
      },
    },
  },
  {
    name: "agendar_cita",
    description:
      "Registra al prospecto y genera el botón de WhatsApp para confirmar horario de una cita presencial con un asesor. Llámala SOLO cuando (a) ya evaluaste con comparar_opciones que el cambio de boleta le conviene y la persona quiere hacerlo (probabilidad 70 % o más), o (b) la persona pide explícitamente hablar con un asesor o agendar. Una sola vez por conversación.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["perfil", "resumen", "probabilidad", "institucion_origen", "tasa_actual", "tasa_oferta", "ahorro"],
      properties: {
        perfil: {
          type: "string",
          enum: PERFIL_IDS,
          description: "Perfil que mejor describe la situación de la persona.",
        },
        institucion_origen: { type: ["string", "null"], description: "Institución donde está hoy la boleta, si se sabe." },
        tasa_actual: { type: ["number", "null"], description: "Tasa mensual actual en %, si se sabe." },
        tasa_oferta: { type: ["number", "null"], description: "Tasa mensual ofrecida por cotizar_traspaso, si se cotizó." },
        ahorro: { type: ["number", "null"], description: "Ahorro estimado en pesos según cotizar_traspaso, si se cotizó." },
        resumen: {
          type: "string",
          description: "Resumen del caso para el asesor, máximo 400 caracteres, SIN datos personales: números de la boleta (préstamo, tasa, meses), resultado de la evaluación (ahorro), qué quiere la persona.",
        },
        probabilidad: {
          type: "integer",
          description: "Tu estimación, de 0 a 100, de que el cambio de boleta se concrete. Si la persona solo pidió hablar con alguien sin evaluación, pon tu mejor estimación con las señales que tengas.",
        },
      },
    },
  },
];

/**
 * Ejecuta una tool. Devuelve {resultado: string, cta?: {codigo,url,perfil}}.
 * El resultado es lo que ve el modelo; cta es lo que se manda al cliente.
 */
export async function ejecutarTool(nombre, entrada, contexto = {}) {
  if (nombre === "calcular_costo") {
    const r = calcularCosto({
      prestamo: entrada.prestamo,
      tasaMensual: entrada.tasa_mensual,
      meses: entrada.meses,
    });
    if (!r.ok) {
      return { resultado: JSON.stringify({ error: r.error }), esError: true };
    }
    return {
      resultado: JSON.stringify({
        prestamo: formatearMXN(r.prestamo),
        tasa_mensual: `${r.tasaMensual}%`,
        meses: r.meses,
        interes_mensual: formatearMXN(r.interesMensual),
        interes_total: formatearMXN(r.interesTotal),
        total_a_pagar: formatearMXN(r.total),
        veces_el_prestamo: r.veces,
        nota: r.nota,
      }),
    };
  }

  if (nombre === "calcular_desempeno_hoy") {
    const r = calcularDesempenoHoy({
      prestamo: entrada.prestamo,
      tasaMensual: entrada.tasa_mensual,
      mesesSinPagar: entrada.meses_sin_pagar,
      penalizacion: entrada.penalizacion,
    });
    if (!r.ok) return { resultado: JSON.stringify({ error: r.error }), esError: true };
    return {
      resultado: JSON.stringify({
        interes_mensual: formatearMXN(r.interesMensual),
        interes_pendiente: formatearMXN(r.interesPendiente),
        penalizacion: formatearMXN(r.penalizacion),
        refrendar_hoy: formatearMXN(r.refrendarHoy),
        desempenar_hoy: formatearMXN(r.desempenarHoy),
        nota: r.nota,
      }),
    };
  }

  if (nombre === "comparar_opciones") {
    const r = compararOpciones({
      prestamo: entrada.prestamo,
      tasaActual: entrada.tasa_actual,
      tasaNueva: entrada.tasa_nueva,
      mesesRestantes: entrada.meses_restantes,
      mesesSinPagar: entrada.meses_sin_pagar,
      penalizacion: entrada.penalizacion,
    });
    if (!r.ok) return { resultado: JSON.stringify({ error: r.error }), esError: true };
    return {
      resultado: JSON.stringify({
        liquidar_hoy: formatearMXN(r.liquidarHoy),
        quedarse: { tasa_mensual: `${r.quedarse.tasaMensual}%`, interes_restante: formatearMXN(r.quedarse.interesRestante), total: formatearMXN(r.quedarse.total) },
        moverse: { tasa_mensual: `${r.moverse.tasaMensual}%`, nuevo_prestamo: formatearMXN(r.moverse.nuevoPrestamo), interes_restante: formatearMXN(r.moverse.interesRestante), total: formatearMXN(r.moverse.total) },
        ahorro: formatearMXN(r.ahorro),
        ahorro_pct: `${r.ahorroPct}%`,
        conviene: r.conviene,
        criterio: r.criterio,
        nota: r.nota,
      }),
    };
  }

  if (nombre === "comparar_instituciones") {
    const r = rankingPublico();
    return {
      resultado: JSON.stringify({
        fecha_datos: r.fecha,
        aviso: "Datos públicos; pueden cambiar. Siempre recomendar confirmar en sucursal o en el sitio oficial.",
        ranking_por_cat: r.conDato.map((i, idx) => ({ posicion: idx + 1, nombre: i.nombre, tipo: i.tipo, cat_anual: `${i.catAnual}%`, tasa_mensual_ref: i.tasaMensualRef != null ? `${i.tasaMensualRef}%` : null, fuente: i.fuente, nota: i.nota || null })),
        sin_cat_publico: r.sinDato.map((i) => ({ nombre: i.nombre, tipo: i.tipo, tasa_mensual_ref: i.tasaMensualRef != null ? `${i.tasaMensualRef}%` : null, fuente: i.fuente, nota: i.nota || null })),
        aliado: { nombre: ALIADO.nombre, tasa_publica_mensual: `${ALIADO.tasaPublicaMensual}%`, nota: "CAP & Co. gestiona una tasa preferente en esta institución para boletas que llegan evaluadas (usar cotizar_traspaso para el número exacto)." },
      }),
    };
  }

  if (nombre === "cotizar_traspaso") {
    const r = cotizarTraspaso({
      prestamo: entrada.prestamo,
      tasaActual: entrada.tasa_actual,
      mesesRestantes: entrada.meses_restantes,
      mesesSinPagar: entrada.meses_sin_pagar,
      penalizacion: entrada.penalizacion,
      valorPieza: entrada.valor_pieza,
      institucionActual: entrada.institucion_actual,
    });
    if (!r.ok) return { resultado: JSON.stringify({ error: r.error }), esError: true };
    const c = r.comparacion;
    return {
      meta: { avanza: r.avanza },
      resultado: JSON.stringify({
        avanza: r.avanza,
        motivo_no_avanza: r.motivoNoAvanza,
        aliado: r.aliado,
        institucion_actual: r.institucionActual,
        tasa_actual: `${r.tasaActual}%`,
        tasa_publica_aliado: `${r.tasaPublicaAliado}%`,
        tasa_oferta: `${r.tasaOferta}%`,
        tipo_oferta: r.tipoOferta,
        toco_piso: r.tocoPiso,
        comparacion: c
          ? {
              liquidar_hoy: formatearMXN(c.liquidarHoy),
              total_si_se_queda: formatearMXN(c.quedarse.total),
              total_si_se_mueve: formatearMXN(c.moverse.total),
              ahorro: formatearMXN(c.ahorro),
              ahorro_pct: `${c.ahorroPct}%`,
              ahorro_numero: c.ahorro,
              nota: c.nota,
            }
          : null,
        comision_cap: r.comision !== null ? formatearMXN(r.comision) : "por definir: el asesor la dice antes de cualquier trámite",
        ahorro_neto: r.ahorroNeto !== null ? formatearMXN(r.ahorroNeto) : null,
        mensaje_sugerido: r.mensajeSugerido,
        instruccion: r.avanza
          ? "Presenta la oferta con la tasa y el ahorro (si hay ahorro_neto, da ese: ya descuenta la comisión), di que es una tasa preferente que CAP & Co. gestiona en el aliado para boletas evaluadas, menciona la comisión como dice mensaje_sugerido, y pregunta si quiere hacerlo. Si dice que sí, llama agendar_cita con tasa_actual, tasa_oferta, ahorro_numero e institucion_actual."
          : "Da el mensaje_sugerido: por ahora le conviene quedarse y seguir con sus pagos (no digas que es el mejor trato del mercado). NO ofrezcas cita ni WhatsApp. Ofrece seguir resolviendo dudas.",
      }),
    };
  }

  if (nombre === "precio_metales" || nombre === "estimar_valor_metal") {
    const foto = await ultimaFotografia();
    if (!fotografiaVigente(foto)) {
      // Una vez cada 10 min por instancia basta; el silencio del correo lo pone registrarEvento.
      if (Date.now() - ultimoAvisoPrecio > 10 * 60_000) {
        ultimoAvisoPrecio = Date.now();
        await registrarEvento("precios_viejos", "critico", foto ? `Último precio: ${new Date(foto.capturadoAt).toISOString()}` : "No hay ningún precio guardado.");
      }
      return {
        resultado: JSON.stringify({
          disponible: false,
          instruccion: "No hay precio de referencia vigente. No des ninguna cifra de precio: explica la fórmula (gramos × pureza × precio del gramo puro) y sugiere consultar el precio del día en un banco.",
        }),
      };
    }
    const cuando = fechaHoraMX(foto.capturadoAt);
    const aviso = "Precio internacional de referencia del metal; la casa de empeño aplica su propio precio y presta solo una parte.";
    if (nombre === "precio_metales") {
      const t = tablaPorGramo(foto);
      return {
        resultado: JSON.stringify({
          disponible: true,
          fotografia: cuando,
          pesos_por_gramo: {
            oro: { puro: formatearMXN2(t.oro.puro), "24k": formatearMXN2(t.oro["24k"]), "22k": formatearMXN2(t.oro["22k"]), "18k": formatearMXN2(t.oro["18k"]), "14k": formatearMXN2(t.oro["14k"]), "10k": formatearMXN2(t.oro["10k"]) },
            plata: { "925": formatearMXN2(t.plata["925"]), puro: formatearMXN2(t.plata.puro) },
            platino: { "950": formatearMXN2(t.platino["950"]) },
            paladio: { "950": formatearMXN2(t.paladio["950"]) },
          },
          tipo_de_cambio: `${foto.usdMxn.toFixed(2)} pesos por dólar`,
          aviso,
        }),
      };
    }
    const r = estimarValorMetal({ metal: entrada.metal, pureza: entrada.pureza, gramos: entrada.gramos, foto });
    if (!r.ok) return { resultado: JSON.stringify({ error: r.error }), esError: true };
    return {
      resultado: JSON.stringify({
        disponible: true,
        fotografia: cuando,
        metal: r.metal,
        pureza: r.pureza,
        gramos: r.gramos,
        precio_por_gramo: formatearMXN2(r.precioGramo),
        valor_del_metal: formatearMXN(r.valorMetal),
        prestamo_tipico: `${formatearMXN(r.prestamoBajo)} a ${formatearMXN(r.prestamoAlto)}`,
        aviso: `${aviso} No incluye piedras ni diseño.`,
      }),
    };
  }

  if (nombre === "agendar_cita") {
    if (contexto.yaHayCta) {
      return {
        resultado: JSON.stringify({
          ok: true,
          nota: "El botón de WhatsApp ya estaba en pantalla desde antes; no se generó otro. Solo recuérdale a la persona que lo use, en una línea.",
        }),
      };
    }
    const perfil = esPerfilValido(entrada.perfil) ? entrada.perfil : "curioso";
    const { codigo, persistido } = await crearLead({
      perfil,
      resumen: entrada.resumen,
      fuente: contexto.fuente,
      probabilidad: entrada.probabilidad,
      institucionOrigen: entrada.institucion_origen,
      tasaActual: entrada.tasa_actual,
      tasaOferta: entrada.tasa_oferta,
      ahorro: entrada.ahorro,
      conversacionId: contexto.conversacionId,
    });
    if (persistido) await diferir(() => alCrearLead(codigo, { perfil, probabilidad: entrada.probabilidad }));
    const url = construirLinkWhatsApp({ numero: WHATSAPP_NUMBER, codigo, perfil });
    return {
      resultado: JSON.stringify({
        ok: true,
        codigo,
        instruccion:
          modoAgenda() === "llamada"
            ? "Abajo ya aparece un formulario: la persona elige día y franja (lunes a viernes, 9:00 a 17:00) y deja su nombre y WhatsApp; un asesor le llama en esa franja para acordar la cita. Díselo en una o dos frases, que el asesor ya recibe su caso evaluado y que no lleve su pieza ni pague nada hasta que se lo confirmen. No repitas el link ni el código."
            : "Abajo ya aparece la agenda: la persona elige día y hora (lunes a viernes, 9:00 a 17:00) y deja su nombre y WhatsApp; el lugar se le confirma por WhatsApp. Díselo en una o dos frases, que el asesor ya recibe su caso evaluado y que no lleve su pieza ni pague nada hasta que se lo confirmen. No repitas el link ni el código.",
      }),
      // persistido=false (sin DB): el widget no ofrece el formulario de contacto.
      cta: { codigo, url, perfil, persistido },
    };
  }

  return { resultado: JSON.stringify({ error: `Herramienta desconocida: ${nombre}` }), esError: true };
}

function fechaHoraMX(fecha) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date(fecha));
}

function formatearMXN2(n) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
