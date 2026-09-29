"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import AgendaForm, { TarjetaCita } from "./AgendaForm";
import PerfilForm from "./PerfilForm";
import { MENSAJE_POR_CASO, PREGUNTAS_PERFIL, NO_DICE } from "@/lib/chatbot/perfil-visita";
import { WHATSAPP_URL } from "@/lib/constants";

const STORAGE_KEY = "capco-chat-v1";
const FUENTE_KEY = "capco-fuente-v1";
const CONVERSACION_KEY = "capco-conversacion-v1";

function idConversacion(nueva = false) {
  try {
    let id = nueva ? null : sessionStorage.getItem(CONVERSACION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(CONVERSACION_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
const BIENVENIDA =
  "¡Hola! Soy el asesor virtual de CAP & Co. y te ayudo con tu empeño: qué dice tu boleta, cuánto vas a pagar, cuánto vale tu oro o si te conviene cambiar de institución. Sin costo.";
const INVITA_CASO =
  "¿Cuál es tu caso? Elige una opción o escríbelo con tus palabras. No te pido nombre ni teléfono.";
const INVITA_TEMA =
  "Cuéntame tu caso con tus palabras o elige un tema. También puedes subir una foto de tu boleta con el botón de la cámara y te hago el análisis completo.";
const CHIPS = [
  "Explícame mi boleta",
  "¿Cuánto debo hoy?",
  "¿Me conviene cambiar de casa de empeño?",
  "Enséñame con un ejemplo",
];
const MENSAJE_CAIDA =
  "Ahora mismo no puedo responder. Escríbenos por WhatsApp y seguimos con tu caso; respondemos de lunes a viernes de 9:00 a 17:00.";

// Fuente de la visita (primer toque): utm_* de la URL, referrer y ruta. Sin datos personales.
function capturarFuente() {
  try {
    const previa = sessionStorage.getItem(FUENTE_KEY);
    if (previa) return JSON.parse(previa);
    const q = new URLSearchParams(window.location.search);
    const fuente = { path: window.location.pathname };
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
      const v = q.get(k);
      if (v) fuente[k] = v;
    }
    if (document.referrer && !document.referrer.startsWith(window.location.origin)) {
      fuente.referrer = document.referrer.slice(0, 200);
    }
    sessionStorage.setItem(FUENTE_KEY, JSON.stringify(fuente));
    return fuente;
  } catch {
    return {};
  }
}

function cargarEstado() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data.mensajes)) return null;
    return data;
  } catch {
    return null;
  }
}

export default function ChatWidget() {
  // El panel interno no lleva el chat público.
  const ruta = usePathname();
  if (ruta?.startsWith("/admin")) return null;
  return <ChatWidgetPublico />;
}

function ChatWidgetPublico() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [cta, setCta] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [hidratado, setHidratado] = useState(false);
  const [visible, setVisible] = useState(false);
  const [citaApartada, setCitaApartada] = useState(null);
  // null = aún no contesta el formulario de bienvenida; { omitido: true } = lo saltó.
  const [perfil, setPerfil] = useState(null);
  // La tarjeta con las 4 preguntas opcionales se ofrece una sola vez, tras la primera respuesta.
  const [detalleCerrado, setDetalleCerrado] = useState(false);
  const fuenteRef = useRef({});
  const listaRef = useRef(null);
  const panelRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    const guardado = cargarEstado();
    if (guardado) {
      setMensajes(guardado.mensajes);
      setCta(guardado.cta || null);
      setCitaApartada(guardado.citaApartada || null);
      setPerfil(guardado.perfil || null);
      setDetalleCerrado(guardado.detalleCerrado === true);
    }
    fuenteRef.current = capturarFuente();
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ mensajes, cta, citaApartada, perfil, detalleCerrado }));
    } catch {
      // sin almacenamiento: el chat sigue funcionando en memoria
    }
  }, [mensajes, cta, citaApartada, perfil, detalleCerrado, hidratado]);

  // Registro anónimo de que se abrió el chat (y del perfil cuando cambia), escriba o no la persona.
  // Así se sabe si la bienvenida espanta gente. Una vez por conversación y por cambio de perfil.
  const aperturaRef = useRef("");
  useEffect(() => {
    if (!abierto || !hidratado) return;
    const id = idConversacion();
    const clave = `${id}|${JSON.stringify(perfil)}`;
    if (aperturaRef.current === clave) return;
    aperturaRef.current = clave;
    try {
      fetch("/api/chat/apertura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversacionId: id, fuente: fuenteRef.current, perfil }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // sin red: no pasa nada
    }
  }, [abierto, hidratado, perfil, mensajes.length]);

  const mostrarDetalle =
    !detalleCerrado && !cargando && mensajes.length >= 2 && !mensajes[mensajes.length - 1].pendiente;
  const ultimoRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const el = listaRef.current;
    if (!el) return;
    // Sin mensajes, el saludo se lee desde arriba. Con la tarjeta de preguntas opcionales, se deja
    // a la vista el inicio de la respuesta: la tarjeta queda abajo y no tapa lo que se contestó.
    if (mensajes.length === 0) el.scrollTop = 0;
    else if (mostrarDetalle && ultimoRef.current) el.scrollTop = ultimoRef.current.offsetTop - el.offsetTop - 12;
    else el.scrollTop = el.scrollHeight;
  }, [mensajes, cta, abierto, mostrarDetalle]);

  useEffect(() => {
    if (!abierto) return;
    function onKey(e) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [abierto]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // Al cerrar, el foco regresa a lo que abrió el chat (o al botón flotante), para no perder el
  // lugar con teclado o lector de pantalla.
  const origenFocoRef = useRef(null);
  const mensajePendienteRef = useRef(null);
  const lanzadorRef = useRef(null);
  const estabaAbierto = useRef(false);
  useEffect(() => {
    if (abierto) {
      estabaAbierto.current = true;
      return;
    }
    if (!estabaAbierto.current) return;
    estabaAbierto.current = false;
    const origen = origenFocoRef.current;
    origenFocoRef.current = null;
    if (origen && document.contains(origen)) origen.focus();
    else lanzadorRef.current?.focus();
  }, [abierto]);

  useEffect(() => {
    const abrir = (e) => {
      origenFocoRef.current = document.activeElement;
      if (typeof e?.detail?.mensaje === "string") mensajePendienteRef.current = e.detail.mensaje.slice(0, 200);
      setAbierto(true);
    };
    window.addEventListener("capco:abrir-chat", abrir);
    return () => window.removeEventListener("capco:abrir-chat", abrir);
  }, []);

  // En móvil el botón aparece hasta que la persona baja del hero, para no tapar
  // el CTA principal. En escritorio se muestra desde el inicio.
  useEffect(() => {
    function evaluar() {
      setVisible(window.innerWidth >= 768 || window.scrollY > 120);
    }
    evaluar();
    window.addEventListener("scroll", evaluar, { passive: true });
    window.addEventListener("resize", evaluar);
    return () => {
      window.removeEventListener("scroll", evaluar);
      window.removeEventListener("resize", evaluar);
    };
  }, []);

  const enviar = useCallback(
    async (texto, imagen = null, perfilElegido = perfil) => {
      if (cargando) return;
      // Escribir sin contestar el formulario cuenta como saltarlo.
      const perfilTurno = perfilElegido || { omitido: true };
      if (!perfilElegido) setPerfil(perfilTurno);
      // Si sigue platicando, la tarjeta de preguntas opcionales ya no aparece.
      if (mensajes.length >= 2) setDetalleCerrado(true);
      // La foto viaja solo en este envío; en el historial queda la marca, nunca la imagen.
      const historial = [...mensajes, { role: "user", content: texto, adjunto: Boolean(imagen) }];
      setMensajes([...historial, { role: "assistant", content: "", pendiente: true }]);
      setCargando(true);

      const controller = new AbortController();
      abortRef.current = controller;

      let acumulado = "";
      let conWhatsApp = false;
      const pintar = (contenido, pendiente) =>
        setMensajes([...historial, { role: "assistant", content: contenido, pendiente, whatsapp: conWhatsApp }]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: historial.map(({ role, content }) => ({ role, content })),
            hasCta: Boolean(cta),
            fuente: fuenteRef.current,
            perfil: perfilTurno,
            conversacionId: idConversacion(),
            ...(imagen ? { imagen } : {}),
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          let msg = MENSAJE_CAIDA;
          try {
            const data = await res.json();
            if (data?.error) msg = data.error;
            conWhatsApp = data?.whatsapp === true || res.status >= 500;
          } catch {
            // respuesta sin JSON
          }
          pintar(msg, false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lineas = buffer.split("\n");
          buffer = lineas.pop() ?? "";
          for (const linea of lineas) {
            if (!linea.trim()) continue;
            let evento;
            try {
              evento = JSON.parse(linea);
            } catch {
              continue;
            }
            if (evento.type === "text") {
              acumulado += evento.text;
              pintar(acumulado, true);
            } else if (evento.type === "cta" && evento.url) {
              setCta({ codigo: evento.codigo, url: evento.url, persistido: evento.persistido === true });
            } else if (evento.type === "error") {
              conWhatsApp = true;
              acumulado = acumulado ? `${acumulado}\n\n${evento.message}` : evento.message;
              pintar(acumulado, true);
            }
          }
        }
        pintar(acumulado || MENSAJE_CAIDA, false);
      } catch (err) {
        if (err?.name === "AbortError") return;
        conWhatsApp = true;
        pintar(acumulado || MENSAJE_CAIDA, false);
      } finally {
        setCargando(false);
        abortRef.current = null;
      }
    },
    [cargando, mensajes, cta, perfil],
  );

  // Abrir el chat con una pregunta ya escrita (p. ej. "mi boleta vence en días" desde el hero).
  useEffect(() => {
    if (!abierto || !hidratado || cargando || !mensajePendienteRef.current) return;
    const texto = mensajePendienteRef.current;
    mensajePendienteRef.current = null;
    enviar(texto);
  }, [abierto, hidratado, cargando, enviar]);

  function elegirCaso(caso) {
    const p = { caso };
    setPerfil(p);
    const inicial = MENSAJE_POR_CASO[caso];
    if (inicial) enviar(inicial, null, p);
  }

  function detalleListo(respuestas) {
    setPerfil((p) => ({ ...(p && !p.omitido ? p : {}), ...respuestas }));
    setDetalleCerrado(true);
  }

  function reiniciar() {
    idConversacion(true);
    abortRef.current?.abort();
    setMensajes([]);
    setCta(null);
    setCitaApartada(null);
    setCargando(false);
  }

  // Marca el click en WhatsApp sin bloquear la navegación (sendBeacon sobrevive al cambio de pestaña).
  function registrarClick() {
    if (!cta?.codigo) return;
    try {
      navigator.sendBeacon(`/api/leads/${cta.codigo}/click`);
    } catch {
      // sin beacon: no pasa nada, el link sigue funcionando
    }
  }

  return (
    <>
      {!abierto && (
        <button
          ref={lanzadorRef}
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir chat: resuelve tus dudas de empeño"
          className={`fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-esmeralda font-sans text-sm font-medium text-sobre-verde shadow-[0_8px_30px_rgba(20,64,47,0.28)] transition-all duration-500 ease-expo hover:scale-[1.03] md:bottom-7 md:right-7 md:h-auto md:w-auto md:gap-3 md:py-3 md:pl-4 md:pr-5 ${
            visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
          }`}
        >
          <IconoChat className="h-6 w-6 md:h-5 md:w-5" />
          <span className="hidden md:inline">Resuelve tus dudas de empeño</span>
        </button>
      )}

      {abierto && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Asesor virtual de CAP & Co."
          className="fixed inset-0 z-[70] flex flex-col bg-papel md:inset-auto md:bottom-7 md:right-7 md:h-[640px] md:max-h-[calc(100dvh-3.5rem)] md:w-[400px] md:overflow-hidden md:rounded-2xl md:border md:border-esmeralda/10 md:shadow-[0_20px_60px_rgba(20,64,47,0.25)]"
        >
          <header className="flex items-center justify-between border-b border-esmeralda/10 bg-esmeralda px-4 py-3 text-sobre-verde">
            <div className="leading-tight">
              <div className="font-serif text-lg tracking-wide">CAP & Co.</div>
              <div className="whitespace-nowrap font-sans text-[11px] uppercase tracking-[0.16em] text-sobre-verde/70">
                Asesor virtual
              </div>
            </div>
            <div className="flex items-center gap-1">
              {mensajes.length > 0 && (
                <button
                  type="button"
                  onClick={reiniciar}
                  aria-label="Empezar de nuevo"
                  title="Empezar de nuevo"
                  className="rounded-full p-2 text-sobre-verde/70 transition-colors hover:bg-white/10 hover:text-sobre-verde"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar chat"
                className="rounded-full p-2 text-sobre-verde/70 transition-colors hover:bg-white/10 hover:text-sobre-verde"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </header>

          <div
            ref={listaRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
            aria-live="polite"
            aria-relevant="additions text"
          >
            <ChatMessage role="assistant" content={BIENVENIDA} />
            {hidratado && mensajes.length === 0 && !perfil && (
              <>
                <ChatMessage role="assistant" content={INVITA_CASO} />
                <div className="flex flex-wrap gap-2 pt-1">
                  {[...PREGUNTAS_PERFIL.caso.opciones, [NO_DICE, "Prefiero no decir"]].map(([v, t]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => elegirCaso(v)}
                      className={`rounded-full border px-3.5 py-2 font-sans text-sm transition-colors ${
                        v === NO_DICE
                          ? "border-esmeralda/15 text-esmeralda/60 hover:border-esmeralda/40"
                          : "border-esmeralda/25 bg-papel-alto text-esmeralda hover:border-esmeralda hover:bg-esmeralda hover:text-sobre-verde"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}
            {mensajes.length === 0 && perfil && <ChatMessage role="assistant" content={INVITA_TEMA} />}
            {mensajes.length === 0 && perfil && (
              <div className="flex flex-wrap gap-2 pt-1">
                {CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => enviar(chip)}
                    className="rounded-full border border-esmeralda/25 bg-papel-alto px-3.5 py-2 font-sans text-sm text-esmeralda transition-colors hover:border-esmeralda hover:bg-esmeralda hover:text-sobre-verde"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
            {mensajes.map((m, i) => (
              <div key={i} ref={i === mensajes.length - 1 ? ultimoRef : undefined} className="space-y-2">
                <ChatMessage role={m.role} content={m.content} pendiente={m.pendiente} adjunto={m.adjunto} />
                {m.whatsapp && !m.pendiente && (
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-esmeralda/25 px-4 py-2 font-sans text-sm text-esmeralda hover:border-esmeralda"
                  >
                    Escribir por WhatsApp
                  </a>
                )}
              </div>
            ))}
            {mostrarDetalle && (
              <PerfilForm onListo={detalleListo} onOmitir={() => setDetalleCerrado(true)} />
            )}
            {cta && (
              <div className="space-y-3">
                {cta.persistido && !citaApartada && (
                  <AgendaForm codigo={cta.codigo} onReservada={(d) =>
                      setCitaApartada({ cuando: d.cuando, whatsapp: d.whatsapp, modo: d.modo, lugar: d.lugar, confirmarAntes: d.confirmarAntes, codigo: d.codigo })
                    } />
                )}
                {citaApartada && <TarjetaCita cita={citaApartada} />}
                <div className="flex justify-start">
                  <a
                    href={citaApartada?.whatsapp || cta.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={registrarClick}
                    className={
                      cta.persistido && !citaApartada
                        ? "inline-flex items-center gap-2 font-sans text-sm text-esmeralda/70 underline underline-offset-4 hover:text-esmeralda"
                        : "inline-flex items-center gap-2 rounded-full bg-esmeralda px-5 py-3 font-sans text-sm font-medium text-sobre-verde transition-transform duration-300 ease-expo hover:scale-[1.03]"
                    }
                  >
                    <IconoWhatsApp className="h-5 w-5" />
                    {cta.persistido && !citaApartada
                      ? "Prefiero agendar por WhatsApp"
                      : citaApartada?.modo === "llamada"
                        ? "Escríbenos por WhatsApp"
                        : "Confirmar cita por WhatsApp"}
                  </a>
                </div>
              </div>
            )}
          </div>

          <ChatInput onEnviar={enviar} deshabilitado={cargando} autoFocus />

          <p className="border-t border-esmeralda/10 bg-papel px-4 py-2 text-center font-sans text-[11px] leading-snug text-esmeralda/55">
            Asesor virtual automático. No guarda tu nombre ni teléfono, salvo que los dejes para agendar una cita.{" "}
            <a href="/aviso-de-privacidad" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              Aviso de privacidad
            </a>
            .
          </p>
        </div>
      )}
    </>
  );
}

function IconoChat(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z" />
      <path d="M8 8h8M8 11.5h5" />
    </svg>
  );
}

function IconoWhatsApp(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 12 12 0 0 0 4.6 4c.6.3 1.1.4 1.5.5a3.6 3.6 0 0 0 1.6.1c.5-.1 1.5-.6 1.7-1.2s.2-1.1.1-1.2-.2-.2-.4-.3z" />
    </svg>
  );
}
