"use client";

import { useEffect, useRef, useState } from "react";
import { comprimirImagen } from "./comprimir";

const MAX_CHARS = 1500;
const CLAVE_CONSENTIMIENTO = "capco-consentimiento-boleta";
const TEXTO_POR_DEFECTO = "Te envío mi boleta para que la analices.";

function leerConsentimiento() {
  try {
    return sessionStorage.getItem(CLAVE_CONSENTIMIENTO) === "1";
  } catch {
    return false;
  }
}

export default function ChatInput({ onEnviar, deshabilitado, autoFocus }) {
  const [texto, setTexto] = useState("");
  const [adjunto, setAdjunto] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [consentido, setConsentido] = useState(false);
  const [aceptaAhora, setAceptaAhora] = useState(false);
  const ref = useRef(null);
  const archivoRef = useRef(null);

  useEffect(() => {
    setConsentido(leerConsentimiento());
  }, []);

  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus();
  }, [autoFocus]);

  // Autoajuste de altura. Se mide en el siguiente frame para leer el DOM ya actualizado.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (texto === "") {
      el.style.height = "auto";
      el.style.overflowY = "hidden";
      return;
    }
    const id = requestAnimationFrame(() => {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
      // La barra de desplazamiento solo aparece cuando el texto ya no cabe.
      el.style.overflowY = el.scrollHeight > 120 ? "auto" : "hidden";
    });
    return () => cancelAnimationFrame(id);
  }, [texto]);

  const faltaConsentimiento = adjunto && !consentido && !aceptaAhora;
  const puedeEnviar = !deshabilitado && !procesando && !faltaConsentimiento && (texto.trim() !== "" || adjunto);

  async function elegirArchivo(e) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setError("");
    setProcesando(true);
    try {
      setAdjunto(await comprimirImagen(archivo));
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  function quitarAdjunto() {
    setAdjunto(null);
    setAceptaAhora(false);
    setError("");
  }

  function enviar() {
    if (!puedeEnviar) return;
    const limpio = texto.trim() || (adjunto ? TEXTO_POR_DEFECTO : "");
    let imagen = null;
    if (adjunto) {
      imagen = { media_type: adjunto.media_type, data: adjunto.data };
      if (!consentido) {
        try {
          sessionStorage.setItem(CLAVE_CONSENTIMIENTO, "1");
        } catch {
          // sin almacenamiento: se volverá a pedir la próxima vez
        }
        setConsentido(true);
      }
    }
    onEnviar(limpio, imagen);
    setTexto("");
    setAdjunto(null);
    setAceptaAhora(false);
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  return (
    <div className="border-t border-esmeralda/10 bg-papel">
      {(adjunto || procesando || error) && (
        <div className="space-y-2 px-3 pt-3">
          {procesando && <p className="font-sans text-xs text-esmeralda/60">Preparando la foto…</p>}
          {error && <p className="font-sans text-xs text-granate">{error}</p>}
          {adjunto && (
            <div className="flex items-center gap-3 rounded-xl border border-esmeralda/15 bg-papel-alto p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={adjunto.vistaPrevia} alt="Vista previa de tu boleta" className="h-12 w-12 rounded-md object-cover" />
              <span className="flex-1 font-sans text-sm text-esmeralda/80">Foto de tu boleta lista para analizar</span>
              <button
                type="button"
                onClick={quitarAdjunto}
                aria-label="Quitar la foto"
                className="rounded-full p-1.5 text-esmeralda/60 hover:bg-esmeralda/5 hover:text-esmeralda"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          )}
          {adjunto && !consentido && (
            <label className="flex items-start gap-2 font-sans text-xs leading-snug text-esmeralda/75">
              <input
                type="checkbox"
                checked={aceptaAhora}
                onChange={(e) => setAceptaAhora(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-esmeralda"
              />
              <span>
                Acepto que se analice la foto de mi boleta según el{" "}
                <a href="/aviso-de-privacidad" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  aviso de privacidad
                </a>
                . La foto no se guarda. Si prefieres, tapa tu nombre y domicilio antes de tomarla.
              </span>
            </label>
          )}
        </div>
      )}
      <form
        className="flex items-end gap-2 px-3 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <input ref={archivoRef} type="file" accept="image/*" className="hidden" onChange={elegirArchivo} />
        <button
          type="button"
          onClick={() => archivoRef.current?.click()}
          disabled={deshabilitado || procesando}
          aria-label="Subir foto de tu boleta"
          title="Subir foto de tu boleta"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-esmeralda/20 text-esmeralda/70 transition-colors hover:border-esmeralda/40 hover:text-esmeralda disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
            <circle cx="12" cy="12.5" r="3.5" />
          </svg>
        </button>
        <textarea
          ref={ref}
          rows={1}
          value={texto}
          maxLength={MAX_CHARS}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={adjunto ? "Comentario (opcional)…" : "Escribe aquí tu duda…"}
          aria-label="Escribe tu mensaje"
          className="max-h-[120px] flex-1 resize-none overflow-y-hidden rounded-xl border border-esmeralda/15 bg-papel-alto px-3.5 py-2.5 font-sans text-[15px] leading-snug text-esmeralda caret-granate outline-none placeholder:text-esmeralda/40 focus:border-esmeralda focus:ring-2 focus:ring-esmeralda/15"
        />
        <button
          type="submit"
          disabled={!puedeEnviar}
          aria-label="Enviar"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-esmeralda text-sobre-verde transition-opacity disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
    </div>
  );
}
