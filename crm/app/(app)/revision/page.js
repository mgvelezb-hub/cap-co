import { requireSesion } from "@/lib/auth";
import { colaRevision } from "@lib/crm/clasificacion";
import { Clase, Vacio, CAMPO, BOTON } from "@/components/ui";
import Enviar from "@/components/Enviar";
import FormAccion from "@/components/FormAccion";
import { pesos, fecha, NOMBRE_CLASE, PERFILES } from "@/lib/formato";
import { accionAprobar } from "../acciones";

export const metadata = { title: "Revisión" };

export default async function Revision() {
  await requireSesion();
  const cola = await colaRevision();
  return (
    <>
      <header>
        <h1 className="font-serif text-3xl">Revisión</h1>
        <p className="text-sm text-esmeralda/70">
          Casos grises y desacuerdos entre reglas e IA. Lo que apruebes aquí ya no lo cambia el sistema.
        </p>
      </header>
      {cola.length === 0 ? (
        <Vacio>No hay casos por aprobar.</Vacio>
      ) : (
        <ul className="space-y-3">
          {cola.map((l) => {
            const sug = l.sugerencia;
            return (
              <li key={l.codigo} className="space-y-2 rounded-xl border border-esmeralda/10 bg-papel-alto p-4 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <a href={`/leads/${l.codigo}`} className="font-mono underline">{l.codigo}</a>
                  <span>{l.nombre || "sin datos"}</span>
                  <span className="text-esmeralda/75">{PERFILES[l.perfil]} · {fecha(l.created_at)}</span>
                  <span className="text-esmeralda/75">ahorro {pesos(l.ahorro)}{l.institucion_origen ? ` · ${l.institucion_origen}` : ""}</span>
                </div>
                <p className="text-esmeralda/80">{l.resumen}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <p>
                    Vigente: <Clase clase={l.clasificacion} /> <span className="text-esmeralda/70">{l.clasificacion_motivo}</span>
                  </p>
                  {sug && (
                    <p>
                      Sugerencia {sug.fuente === "ia" ? "IA" : "reglas"} ({sug.confianza} %): <Clase clase={sug.clasificacion} />{" "}
                      <span className="text-esmeralda/70">{sug.motivo}</span>
                    </p>
                  )}
                </div>
                {l.propension_taller >= 50 && <p className="text-granate">Propensión a taller: {l.propension_taller} %</p>}
                <FormAccion accion={accionAprobar} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="codigo" value={l.codigo} />
                  <select name="clasificacion" defaultValue={sug?.clasificacion || l.clasificacion} className={CAMPO} aria-label={`Clasificación final de ${l.codigo}`}>
                    {Object.entries(NOMBRE_CLASE).map(([v, t]) => (
                      <option key={v} value={v}>{t}</option>
                    ))}
                  </select>
                  <input name="motivo" placeholder="Motivo (opcional)" maxLength={300} aria-label={`Motivo para ${l.codigo}`} className={`${CAMPO} min-w-[12rem] flex-1`} />
                  <Enviar className={BOTON}>Aprobar</Enviar>
                </FormAccion>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
