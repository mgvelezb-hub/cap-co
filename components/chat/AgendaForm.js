"use client";

import { useEffect, useRef, useState } from "react";

// Agenda dentro del chat, en dos modos (AGENDA_MODO en el servidor):
// · "llamada" (por defecto): día → franja → nombre y WhatsApp; un asesor llama para acordar la cita.
// · "citas": día → hora → nombre y WhatsApp; la cita queda apartada y se confirma por WhatsApp.
// Horario: lunes a viernes, 9:00 a 17:00 (CDMX).

const DIA = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Mexico_City" });
const HORA = new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", timeZone: "America/Mexico_City" });

const CLASE_CAMPO =
  "w-full rounded-lg border border-esmeralda/15 bg-papel px-3 py-2.5 font-sans text-base text-esmeralda outline-none placeholder:text-esmeralda/40 focus:border-esmeralda/40";

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
  const [acepta, setAcepta] = useState(false);
  const [estado, setEstado] = useState({ tipo: "idle" });
  const campos = useRef(null);

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
    // En el teléfono, el teclado tapa los campos: los traemos a la vista.
    requestAnimationFrame(() => campos.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  async function reservar(e) {
    e.preventDefault();
    if (!opcion || estado.tipo === "enviando") return;
    setEstado({ tipo: "enviando" });
    const cuando = modo === "llamada" ? { fecha: dia, franja: opcion } : { inicio: opcion };
    try {
      const res = await fetch("/api/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, nombre, telefono, acepta, ...cuando }),
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
    return <p className="font-sans text-sm text-esmeralda/60">Cargando horarios…</p>;
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
  const puede = opcion && nombre.trim().length >= 2 && telefono.trim() && acepta && estado.tipo !== "enviando";

  return (
    <form onSubmit={reservar} className="space-y-3 rounded-xl border border-esmeralda/15 bg-papel-alto p-4">
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
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={modo === "llamada" ? "Franja" : "Hora"}>
        {opciones.map((o) => (
          <Chip key={o.valor} activo={o.valor === opcion} onClick={() => elegir(o.valor)}>
            {o.texto}
          </Chip>
        ))}
      </div>
      {opcion && (
        <div ref={campos} className="space-y-3">
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" autoComplete="name" maxLength={80} aria-label="Tu nombre" className={CLASE_CAMPO} />
          <input type="tel" inputMode="numeric" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="WhatsApp (10 dígitos)" autoComplete="tel" maxLength={20} aria-label="Tu número de WhatsApp" className={CLASE_CAMPO} />
          <label className="flex items-start gap-2 font-sans text-xs leading-snug text-esmeralda/75">
            <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-esmeralda" />
            <span>
              Acepto el{" "}
              <a href="/aviso-de-privacidad" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                aviso de privacidad
              </a>{" "}
              y que me contacten por llamada o WhatsApp para {modo === "llamada" ? "agendar" : "confirmar"} mi cita.
            </span>
          </label>
        </div>
      )}
      {estado.tipo === "error" && (
        <p role="alert" className="font-sans text-xs text-granate">
          {estado.mensaje}
        </p>
      )}
      <button type="submit" disabled={!puede} className="min-h-[44px] rounded-full bg-esmeralda px-5 font-sans text-sm font-medium text-sobre-verde disabled:opacity-40">
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
