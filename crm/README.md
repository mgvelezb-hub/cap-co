# CRM de CAP & Co.

App de administración de los leads de casa-ap.com. Vive en `crm/` como workspace de npm y usa la
misma lógica y la misma base de datos que el sitio (`../lib`): agenda, leads, comisión,
clasificación y seguimiento no están duplicados.

## Qué hace

- **Hoy:** sin atender, sin respuesta (3+ días), por aprobar, aplican por agendar, candidatos a
  taller y las tareas del día (WhatsApp listo para enviar, llamadas, confirmar citas).
- **Leads:** filtros por etapa, clasificación, días sin contestar, campaña y datos de contacto.
- **Ficha:** contactar (llamar, WhatsApp con plantilla, registrar llamada/respuesta/nota),
  clasificación y perfil, el caso con ahorro neto, cita (acordar, reprogramar, confirmar),
  checklist del cambio, etapa y cierre, tareas e historial completo.
- **Revisión:** casos grises y desacuerdos regla–IA; lo que se aprueba ya no lo cambia el sistema.
- **Citas:** llamadas por hacer, citas presenciales y cambios en curso con su avance.
- **Tráfico:** visitas → chats → cotizaciones → citas → cambios → cobros, por día y por fuente,
  margen por campaña y páginas más vistas.
- **Ajustes:** estado de la automatización, tokens del servidor MCP y usuarios.

## Automatización (`../lib/crm`)

- **Clasificación** (`reglas.js`, `ia.js`, `clasificacion.js`): reglas fijas con los números de la
  cotización y la comisión; la IA (solo datos anónimos) da segunda opinión, perfil y propensión a
  taller. Regla segura + IA de acuerdo → se aplica sola; desacuerdo o caso gris → cola de revisión.
- **Seguimiento** (`seguimiento-plan.js`, `seguimiento.js`): al dejar datos, correo de bienvenida
  (si dejó correo) y tarea de WhatsApp; sin respuesta, recordatorios a 1, 3 y 7 días hábiles. Se
  detiene si responde, avanza de etapa, se descarta o pide baja (`casa-ap.com/baja/<token>`).
- **Cron** (`/api/cron/seguimiento`, días hábiles 9:30 y 13:30 CDMX): corre el seguimiento,
  clasifica con IA a quien dejó datos y con reglas a los leads sin clasificar.

## Servidor MCP

`/api/mcp` (Streamable HTTP) con 15 herramientas: resumen_hoy, listar_leads, ver_lead,
cola_revision, aprobar_clasificacion, reclasificar, registrar_contacto, preparar_whatsapp,
tareas_pendientes, completar_tarea, agenda, actualizar_cita, actualizar_caso, marcar_traspaso y
trafico. Token personal en Ajustes (90 días). Conexión desde Claude Code:

```
claude mcp add --transport http capco-crm https://<dominio-del-crm>/api/mcp --header "Authorization: Bearer capco_…"
```

## Variables (proyecto de Vercel del CRM)

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | La misma base Neon del sitio (la migración la corre el build del sitio, no el del CRM) |
| `CRM_SESSION_SECRET` | Firma de la sesión (32+ caracteres, obligatoria) |
| `CRON_SECRET` | Protege el cron de seguimiento |
| `ANTHROPIC_API_KEY` | Clasificación con IA (sin ella, solo reglas) |
| `RESEND_API_KEY`, `CORREO_REMITENTE` | Correos automáticos a la persona (dominio verificado en Resend) |
| `COMISION_FIJA_MXN`, `COMISION_PCT_AHORRO` | Mismos valores que en el sitio |
| `RATE_SALT` | Freno de intentos de login |

El sitio también necesita `RESEND_API_KEY` y `CORREO_REMITENTE` para el correo de bienvenida
(lo manda en cuanto la persona deja sus datos).

## Desarrollo

```
npm install                     # en la raíz de cap-co (instala sitio y CRM)
npm run dev --workspace crm     # http://localhost:3035
npm run usuario --workspace crm -- <usuario> <dueno|asesor> "Nombre"
```

`crm/.env.local` es un enlace a `../.env.local`. Las pruebas de la lógica del CRM están en
`../tests/crm*.test.js` (`npm test` y `npm run test:db` en la raíz).
