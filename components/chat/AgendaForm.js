"use client";

import { useEffect, useId, useRef, useState } from "react";
import { normalizarEmail, normalizarNombre, normalizarTelefono } from "@/lib/leads/validar";

// Agenda dentro del chat, en dos modos (AGENDA_MODO en el servidor):
// · "llamada" (por defecto): día → franja → nombre y WhatsApp; un asesor llama para acordar la cita.
// · "citas": día → hora → nombre y WhatsApp; la cita queda apartada y se confirma por WhatsApp.
// Horario: lunes a viernes, 9:00 a 17:00 (CDMX).

const DIA = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Mexico_City" });
const HORA = new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", timeZone: "America/Mexico_City" });

// Borde con contraste suficiente para ubicar el campo; el foco lo marca el contorno global.
const CLASE_CAMPO =
  "w-full rounded-lg border border-esmeralda/60 bg-papel px-3 py-2.5 font-sans text-base text-esmeralda placeholder:text-esmeralda/60 focus:border-esmeralda aria-[invalid=true]:border-granate";
const CLASE_ETIQUETA = "mb-1 block font-sans text-sm text-esmeralda";
const CLASE_ERROR = "mt-1 font-sans text-xs text-granate";

// Mismas reglas que el servidor (lib/leads/validar), con un mensaje junto a cada campo. Sin horario
// elegido los campos aún no se muestran: primero se pide el horario.
function validar({ opcion, modo, nombre, telefono, email, acepta }) {
  if (!opcion) return { opcion: modo === "llamada" ? "Elige a qué hora te llamamos." : "Elige la hora de tu cita." };
  const errores = {};
  if (!normalizarNombre(nombre)) errores.nombre = "Escribe tu nombre (2 a 80 letras).";
  if (!normalizarTelefono(telefono)) errores.telefono = "Escribe un WhatsApp de 10 dígitos.";
  if (!normalizarEmail(email.trim()).ok) errores.email = "Revisa tu correo, o déjalo vacío.";
  if (!acepta) errores.acepta = "Para agendar necesitas aceptar el aviso de privacidad.";
  return errores;
}

function Chip({ activo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`min-h-[44px] rounded-full border px-3.5 font-sans text-sm transition-colors ${
        activo ? "border-esmeralda bg-esmeralda text-sobre-verde" : "border-esmeralda/25 text-esmeralda hover:border-esmeralda"
      }`}
    >
      {children}
    </button>
  );
}

export default function AgendaForm({ codigo, onReservada }) {
  const [modo, setModo] = useState("llamada");
  const [dias, setDias] = useState(null);
  const [dia, setDia] = useState(null);
  const [opcion, setOpcion] = useState(null); // hora ISO (citas) o franja (llamada)
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [estado, setEstado] = useState({ tipo: "idle" });
  const [errores, setErrores] = useState({});
  const campos = useRef(null);
  const formRef = useRef(null);
  const opcionesRef = useRef(null);
  const id = useId();

  async function cargar() {
    try {
      const res = await fetch("/api/citas/disponibles", { cache: "no-store" });
      const data = await res.json();
      setModo(data.modo === "citas" ? "citas" : "llamada");
      setDias(data.dias || []);
      setDia((data.dias || [])[0]?.fecha || null);
    } catch {
      setDias([]);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function elegir(valor) {
    setOpcion(valor);
    setErrores(({ opcion: _, ...resto }) => resto);
    // En el teléfono, el teclado tapa los campos: los traemos a la vista (sin animación si la
    // persona pidió menos movimiento).
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => campos.current?.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "nearest" }));
  }

  async function reservar(e) {
    e.preventDefault();
    if (estado.tipo === "enviando") return;
    // El botón nunca se deshabilita: al enviar se dice qué falta y el foco va al primer campo con error.
    const nuevos = validar({ opcion, modo, nombre, telefono, email, acepta });
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) {
      requestAnimationFrame(() => {
        const destino = nuevos.opcion ? opcionesRef.current?.querySelector("button") : formRef.current?.querySelector('[aria-invalid="true"]');
        destino?.focus();
      });
      return;
    }
    setEstado({ tipo: "enviando" });
    const cuando = modo === "llamada" ? { fecha: dia, franja: opcion } : { inicio: opcion };
    try {
      const res = await fetch("/api/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, nombre, telefono, email, acepta, ...cuando }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEstado({ tipo: "error", mensaje: data.error || "No pudimos apartar tu lugar." });
        // Solo si el horario ya no sirve se elige otro; con un dato mal escrito, los campos se quedan.
        if (data.motivo === "ocupado" || data.motivo === "horario_invalido") {
          setOpcion(null);
          cargar();
        }
        return;
      }
      setEstado({ tipo: "idle" });
      onReservada?.({ ...data, codigo });
    } catch {
      setEstado({ tipo: "error", mensaje: "Sin conexión. Inténtalo de nuevo." });
    }
  }

  if (dias === null) {
    return <p role="status" className="font-sans text-sm text-esmeralda/75">Cargando horarios…</p>;
  }
  if (dias.length === 0) {
    return (
      <p className="font-sans text-sm text-esmeralda/70">
        No hay horarios disponibles en los próximos días. Escríbenos por WhatsApp y te buscamos lugar.
      </p>
    );
  }

  const delDia = dias.find((d) => d.fecha === dia);
  const opciones =
    modo === "llamada"
      ? (delDia?.franjas || []).map((f) => ({ valor: f.franja, texto: f.texto }))
      : (delDia?.horas || []).map((h) => ({ valor: h, texto: HORA.format(new Date(h)) }));
  const primerInstante = (d) => (modo === "llamada" ? d.franjas[0].inicio : d.horas[0]);
  // Quita el mensaje de un campo en cuanto la persona lo corrige.
  const limpiar = (campo) => errores[campo] && setErrores(({ [campo]: _, ...resto }) => resto);
  const errorDe = (campo) =>
    errores[campo] ? { "aria-invalid": true, "aria-describedby": `${id}-${campo}-error` } : { "aria-invalid": false };

  return (
    <form ref={formRef} onSubmit={reservar} noValidate className="space-y-3 rounded-xl border border-esmeralda/15 bg-papel-alto p-4">
      <p className="font-sans text-sm font-medium text-esmeralda">
        {modo === "llamada" ? "¿Cuándo te llamamos para agendar tu cita?" : "Elige día y hora para tu cita presencial"}
      </p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Día">
        {dias.map((d) => (
          <Chip
            key={d.fecha}
            activo={d.fecha === dia}
            onClick={() => {
              setDia(d.fecha);
              setOpcion(null);
            }}
          >
            {DIA.format(new Date(primerInstante(d)))}
          </Chip>
        ))}
      </div>
      <div
        ref={opcionesRef}
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label={modo === "llamada" ? "Franja" : "Hora"}
        aria-describedby={errores.opcion ? `${id}-opcion-error` : undefined}
      >
        {opciones.map((o) => (
          <Chip key={o.valor} activo={o.valor === opcion} onClick={() => elegir(o.valor)}>
            {o.texto}
          </Chip>
        ))}
      </div>
      {errores.opcion && (
        <p id={`${id}-opcion-error`} className={CLASE_ERROR}>
          {errores.opcion}
        </p>
      )}
      {opcion && (
        <div ref={campos} className="space-y-3">
          <div>
            <label htmlFor={`${id}-nombre`} className={CLASE_ETIQUETA}>
              Tu nombre
            </label>
            <input
              id={`${id}-nombre`}
              type="text"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                limpiar("nombre");
              }}
              autoComplete="name"
              maxLength={80}
              required
              aria-required="true"
              {...errorDe("nombre")}
              className={CLASE_CAMPO}
            />
            {errores.nombre && <p id={`${id}-nombre-error`} className={CLASE_ERROR}>{errores.nombre}</p>}
          </div>
          <div>
            <label htmlFor={`${id}-telefono`} className={CLASE_ETIQUETA}>
              Tu WhatsApp (10 dígitos)
            </label>
            <input
              id={`${id}-telefono`}
              type="tel"
              inputMode="numeric"
              value={telefono}
              onChange={(e) => {
                setTelefono(e.target.value);
                limpiar("telefono");
              }}
              autoComplete="tel"
              maxLength={20}
              required
              aria-required="true"
              {...errorDe("telefono")}
              className={CLASE_CAMPO}
            />
            {errores.telefono && <p id={`${id}-telefono-error`} className={CLASE_ERROR}>{errores.telefono}</p>}
          </div>
          <div>
            <label htmlFor={`${id}-email`} className={CLASE_ETIQUETA}>
              Tu correo (opcional, para mandarte tu confirmación)
            </label>
            <input
              id={`${id}-email`}
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                limpiar("email");
              }}
              autoComplete="email"
              maxLength={120}
              {...errorDe("email")}
              className={CLASE_CAMPO}
            />
            {errores.email && <p id={`${id}-email-error`} className={CLASE_ERROR}>{errores.email}</p>}
          </div>
          <div>
            <label className="flex items-start gap-2 font-sans text-xs leading-snug text-esmeralda/75">
              <input
                type="checkbox"
                checked={acepta}
                onChange={(e) => {
                  setAcepta(e.target.checked);
                  limpiar("acepta");
                }}
                required
                aria-required="true"
                {...errorDe("acepta")}
                className="mt-0.5 h-5 w-5 shrink-0 accent-esmeralda"
              />
              <span>
                Acepto el{" "}
                <a href="/aviso-de-privacidad" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  aviso de privacidad
                </a>
                , que me contacten por llamada, WhatsApp o correo para {modo === "llamada" ? "agendar" : "confirmar"} mi cita
                y, si decido hacer el cambio, que compartan mis datos con la casa de empeño que yo elija.
              </span>
            </label>
            {errores.acepta && <p id={`${id}-acepta-error`} className={CLASE_ERROR}>{errores.acepta}</p>}
          </div>
        </div>
      )}
      {estado.tipo === "error" && (
        <p role="alert" className="font-sans text-xs text-granate">
          {estado.mensaje}
        </p>
      )}
      <button type="submit" aria-disabled={estado.tipo === "enviando"} className="min-h-[44px] rounded-full bg-esmeralda px-5 font-sans text-sm font-medium text-sobre-verde aria-disabled:opacity-60">
        {estado.tipo === "enviando" ? "Enviando…" : modo === "llamada" ? "Pedir llamada" : "Apartar cita"}
      </button>
      <p className="font-sans text-xs text-esmeralda/70">Lunes a viernes, de 9:00 a 17:00. No lleves tu pieza hasta que te confirmemos.</p>
    </form>
  );
}

/** Confirmación de la cita o la llamada; la muestra el widget (sobrevive a recargar la página). */
export function TarjetaCita({ cita }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const llamada = cita.modo === "llamada";
  return (
    <div ref={ref} tabIndex={-1} className="space-y-2 rounded-xl border border-esmeralda/15 bg-papel-alto p-4 font-sans text-sm text-esmeralda outline-none">
      <p>
        <strong>{llamada ? "Te llamamos:" : "Tu cita quedó apartada:"}</strong> {cita.cuando}
      </p>
      <p className="text-esmeralda/75">
        {llamada
          ? "Un asesor te marca a ese número para acordar día, hora y lugar de tu cita."
          : `Lugar: ${!cita.lugar || cita.lugar === "Por confirmar" ? "te lo confirmamos por WhatsApp" : cita.lugar}.${cita.confirmarAntes ? ` Confírmala por WhatsApp antes del ${cita.confirmarAntes}; si no, el horario se libera.` : ""}`}{" "}
        No lleves tu pieza ni pagues nada hasta que te confirmemos.
        {cita.codigo && (
          <>
            {" "}Tu código es <span className="font-mono">{cita.codigo}</span>.
          </>
        )}
      </p>
    </div>
  );
}
