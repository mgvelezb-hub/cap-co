import { requireSesion } from "@/lib/auth";
import { CANALES_ALTA } from "@lib/crm/leads";
import FormAccion from "@/components/FormAccion";
import Enviar from "@/components/Enviar";
import { CAMPO, BOTON } from "@/components/ui";
import { PERFILES } from "@/lib/formato";
import { accionNuevoLead } from "../../acciones";

export const metadata = { title: "Nuevo lead" };

// Para quien llega por WhatsApp, llamada o recomendación y no pasó por el chat del sitio.
export default async function NuevoLead() {
  await requireSesion();
  return (
    <>
      <header className="space-y-2">
        <a href="/leads" className="inline-flex min-h-[44px] items-center text-sm underline">← Leads</a>
        <h1 className="font-serif text-3xl">Nuevo lead</h1>
        <p className="text-sm text-esmeralda/75">Para casos que llegan por WhatsApp, llamada o recomendación. Queda a tu cargo y clasificado por reglas.</p>
      </header>
      <FormAccion accion={accionNuevoLead} className="grid max-w-2xl gap-3 rounded-xl border border-esmeralda/15 bg-papel-alto p-4 text-sm sm:grid-cols-2">
        <label className="flex flex-col text-xs text-esmeralda/75">
          Nombre
          <input name="nombre" required maxLength={80} autoComplete="off" className={CAMPO} />
        </label>
        <label className="flex flex-col text-xs text-esmeralda/75">
          WhatsApp (10 dígitos)
          <input name="telefono" required inputMode="numeric" maxLength={20} autoComplete="off" className={CAMPO} />
        </label>
        <label className="flex flex-col text-xs text-esmeralda/75">
          Correo (opcional)
          <input name="email" type="email" maxLength={120} autoComplete="off" className={CAMPO} />
        </label>
        <label className="flex flex-col text-xs text-esmeralda/75">
          Llegó por
          <select name="canal" required defaultValue="whatsapp" className={CAMPO}>
            {Object.entries(CANALES_ALTA).map(([v, t]) => (<option key={v} value={v}>{t}</option>))}
          </select>
        </label>
        <label className="flex flex-col text-xs text-esmeralda/75 sm:col-span-2">
          Situación
          <select name="perfil" defaultValue="quiere_traspaso" className={CAMPO}>
            {Object.entries(PERFILES).map(([v, t]) => (<option key={v} value={v}>{t}</option>))}
          </select>
        </label>
        <label className="flex flex-col text-xs text-esmeralda/75 sm:col-span-2">
          Resumen del caso (números de la boleta, qué quiere; sin datos de otras personas)
          <textarea name="resumen" rows={3} maxLength={400} className={CAMPO} />
        </label>
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="consentimiento" value="1" required className="mt-1 h-5 w-5" />
          <span>La persona aceptó el aviso de privacidad para que la contactemos (se lo compartiste por WhatsApp o se lo leíste por teléfono).</span>
        </label>
        <div><Enviar className={BOTON}>Crear lead</Enviar></div>
      </FormAccion>
    </>
  );
}
