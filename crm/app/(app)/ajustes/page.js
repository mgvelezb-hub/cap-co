import { headers } from "next/headers";
import { requireSesion } from "@/lib/auth";
import { tokensDe } from "@/lib/tokens";
import { query } from "@lib/db/client";
import { correoPersonasConfigurado } from "@lib/crm/correo";
import { comisionCambio } from "@lib/chatbot/comision";
import { Seccion, Vacio } from "@/components/ui";
import NuevoToken from "@/components/NuevoToken";
import { fecha, hace } from "@/lib/formato";
import { accionRevocarToken, accionUsuarioActivo, accionRecibeLeads } from "../acciones";
import FormAccion from "@/components/FormAccion";

export const metadata = { title: "Ajustes" };

function Estado({ ok, si, no }) {
  return <li className="flex gap-2"><span className={ok ? "text-esmeralda" : "text-granate"}>{ok ? "✓" : "✗"}</span><span>{ok ? si : no}</span></li>;
}

export default async function Ajustes() {
  const s = await requireSesion();
  const h = await headers();
  const urlMcp = `${h.get("x-forwarded-proto") || "https"}://${h.get("host")}/api/mcp`;
  const [tokens, usuarios] = await Promise.all([
    tokensDe(s.usuario),
    s.rol === "dueno" ? query(`SELECT usuario, nombre, rol, activo, acceso_at, recibe_leads FROM crm_usuario ORDER BY usuario`).then((r) => r.rows) : [],
  ]);
  const comision = comisionCambio(2000);
  return (
    <>
      <header>
        <h1 className="font-serif text-3xl">Ajustes</h1>
      </header>

      <Seccion titulo="Estado de la automatización">
        <ul className="space-y-1 rounded-xl border border-esmeralda/10 bg-papel-alto p-4 text-sm">
          <Estado ok={correoPersonasConfigurado()} si="Correos automáticos activos (Resend)." no="Correos automáticos apagados: falta RESEND_API_KEY o CORREO_REMITENTE con dominio verificado. Las tareas de WhatsApp sí se crean." />
          <Estado ok={Boolean(process.env.ANTHROPIC_API_KEY)} si="Clasificación con IA activa." no="Sin ANTHROPIC_API_KEY: solo clasifican las reglas." />
          <Estado ok={comision !== null} si={`Comisión configurada (con $2,000 de ahorro serían ${comision?.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}).`} no="Comisión sin configurar (COMISION_FIJA_MXN / COMISION_PCT_AHORRO): las reglas usan el ahorro sin descontarla." />
          <Estado ok={Boolean(process.env.CRON_SECRET)} si="Seguimiento diario programado." no="Falta CRON_SECRET: el seguimiento automático diario no corre." />
        </ul>
      </Seccion>

      {s.rol === "dueno" && (
      <Seccion titulo="Conectar Claude (servidor MCP)">
        <div className="space-y-4 rounded-xl border border-esmeralda/10 bg-papel-alto p-4 text-sm">
          <p className="text-esmeralda/80">
            Solo el dueño crea tokens. Con un token, Claude puede consultar y trabajar los leads por ti: &ldquo;¿quién lleva 3 días sin contestar?&rdquo;,
            &ldquo;aprueba la clasificación de CAP-XXXX&rdquo;, &ldquo;¿qué citas hay mañana?&rdquo;. Usa tus mismos permisos.
          </p>
          <NuevoToken urlMcp={urlMcp} />
          {tokens.length === 0 ? (
            <Vacio>No tienes tokens.</Vacio>
          ) : (
            <ul className="divide-y divide-esmeralda/10">
              {tokens.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <strong>{t.nombre}</strong> · creado {fecha(t.creado_at)} · vence {fecha(t.vence_at)} · {t.usado_at ? `usado ${hace(t.usado_at)}` : "sin uso"}
                    {t.revocado_at && <span className="text-granate"> · revocado</span>}
                    {!t.revocado_at && new Date(t.vence_at) < new Date() && <span className="text-granate"> · vencido</span>}
                  </span>
                  {!t.revocado_at && (
                    <FormAccion accion={accionRevocarToken}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="min-h-[44px] px-2 text-sm text-granate underline">Revocar</button>
                    </FormAccion>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-esmeralda/75">
            Claude verá los datos de contacto solo cuando se los pidas (herramientas con «incluir_contacto»); cada consulta queda en la bitácora.
            Úsalo solo con tu cuenta de trabajo.
          </p>
        </div>
      </Seccion>
      )}

      {s.rol === "dueno" && (
        <Seccion titulo="Usuarios">
          <div className="space-y-2 rounded-xl border border-esmeralda/10 bg-papel-alto p-4 text-sm">
            <ul className="divide-y divide-esmeralda/10">
              {usuarios.map((u) => (
                <li key={u.usuario} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <strong>{u.nombre}</strong> ({u.usuario}, {u.rol === "dueno" ? "dueño" : "asesor"}) · {u.acceso_at ? `entró ${hace(u.acceso_at)}` : "nunca ha entrado"}
                    {!u.activo && <span className="text-granate"> · desactivado</span>}
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <FormAccion accion={accionRecibeLeads}>
                      <input type="hidden" name="usuario" value={u.usuario} />
                      <input type="hidden" name="recibe" value={u.recibe_leads ? "0" : "1"} />
                      <button className="min-h-[44px] px-2 text-sm underline">{u.recibe_leads ? "Recibe leads nuevos · pausar" : "No recibe leads · activar reparto"}</button>
                    </FormAccion>
                    {u.usuario !== s.usuario && (
                      <FormAccion accion={accionUsuarioActivo}>
                        <input type="hidden" name="usuario" value={u.usuario} />
                        <input type="hidden" name="activo" value={u.activo ? "0" : "1"} />
                        <button className="min-h-[44px] px-2 text-sm underline">{u.activo ? "Desactivar" : "Activar"}</button>
                      </FormAccion>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-esmeralda/75">
              Para dar de alta a alguien: <code>npm run usuario --workspace crm -- &lt;usuario&gt; &lt;dueno|asesor&gt; &quot;Nombre&quot;</code> (ver README del CRM).
            </p>
          </div>
        </Seccion>
      )}
    </>
  );
}
