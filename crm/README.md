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

## Roles

- **Asesor:** ve y trabaja todos los leads, sus tareas ("Mías") y las del equipo; registra contactos,
  acuerda citas, marca el checklist, aprueba clasificaciones y descarta.
- **Dueño:** además registra cobros y gasto de publicidad, borra datos a solicitud (ARCO), maneja
  usuarios y reparto, y es el único que crea tokens del servidor MCP.

Los leads que dejan datos se reparten por turnos entre los usuarios activos que "reciben leads"
(Ajustes). El asesor a cargo se puede cambiar en la ficha.

## Automatización (`../lib/crm`)

- **Clasificación** (`reglas.js`, `ia.js`, `clasificacion.js`): reglas fijas con los números de la
  cotización y la comisión; la IA (solo datos anónimos) da segunda opinión, perfil y propensión a
  taller. Regla segura + IA de acuerdo → se aplica sola; desacuerdo o caso gris → cola de revisión.
- **Seguimiento** (`seguimiento-plan.js`, `seguimiento.js`): al dejar datos, correo de bienvenida
  (si dejó correo; pide confirmarlo) y la tarea de llamarle en la franja que pidió; sin respuesta,
  recordatorios a 1, 3 y 7 días hábiles (por correo solo si lo confirmó). Cada paso se reclama en la
  base antes de mandar nada: el sitio y el cron nunca mandan dos veces el mismo correo. Se detiene
  si responde, avanza de etapa, pide no ser contactado (ficha o MCP) o se da de baja
  (`casa-ap.com/baja/<token>`, con botón de confirmación; baja de un clic por `List-Unsubscribe-Post`).
- Un "no aplica" automático de alguien que dejó datos pasa por revisión antes de apagar el contacto.
  Lo que decide una persona no lo cambia el sistema.
- **Cron** (`/api/cron/seguimiento`, días hábiles 9:30 y 13:30 CDMX): corre el seguimiento,
  clasifica con IA a quien dejó datos y con reglas a los leads sin clasificar.

## Servidor MCP

`/api/mcp` (Streamable HTTP) con 18 herramientas: resumen_hoy, listar_leads, ver_lead,
cola_revision, aprobar_clasificacion, reclasificar, registrar_contacto, preparar_whatsapp,
no_contactar, asignar_asesor, registrar_cobro, tareas_pendientes, completar_tarea, agenda,
actualizar_cita, actualizar_caso, marcar_traspaso y trafico. Solo tokens del dueño (Ajustes, 90
días). Por defecto no devuelve nombre ni teléfono (`incluir_contacto: true` para pedirlos) y cada
lectura queda en la bitácora. Conexión desde Claude Code:

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
