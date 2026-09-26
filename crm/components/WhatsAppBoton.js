"use client";

import { useState } from "react";
import { accionContacto } from "@/app/(app)/acciones";
import FormAccion from "./FormAccion";

// Abre WhatsApp con el mensaje listo y luego pregunta si se envió, para registrarlo.
export default function WhatsAppBoton({ codigo, url, texto, plantilla, etiqueta, tareaId = null }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setAbierto(true)}
        title={texto}
        className="inline-flex min-h-[44px] items-center rounded-full bg-[#1f7a4d] px-4 text-sm font-medium text-white"
      >
        WhatsApp: {etiqueta}
      </a>
      {abierto && (
        <FormAccion accion={accionContacto} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="codigo" value={codigo} />
          <input type="hidden" name="tipo" value="whatsapp_enviado" />
          <input type="hidden" name="plantilla" value={plantilla} />
          {tareaId && <input type="hidden" name="tareaId" value={tareaId} />}
          <span className="text-sm text-esmeralda/75">¿Lo enviaste?</span>
          <button className="min-h-[44px] rounded-full border border-esmeralda/40 px-3 text-sm">Sí, registrar</button>
        </FormAccion>
      )}
    </div>
  );
}
