# Chatbot web CAP & Co. — Diseño y plan

**Estado:** fase 1 completa (22 de agosto de 2026): construida, probada con 8 guiones contra el modelo real, prompt ajustado, en producción y verificada en https://cap-co-kappa.vercel.app. Pendiente: feedback de la clienta.
**Decisiones del usuario:** chatbot con IA · educa, cotiza, explica, disipa dudas · captura de leads con perfil para estadística · cierre siempre hacia WhatsApp, donde un segundo bot (fase 3) da seguimiento 24/7 según el perfil detectado · contenido provisional mientras Ricardo no entregue el suyo.

---

## 0. Cambio de alcance (22-ago-2026, tarde) — el chat resuelve; WhatsApp solo agenda

Retroalimentación de Mau tras probarlo: redirigía demasiado pronto a WhatsApp y contestaba solo la primera pregunta. Nuevo comportamiento (vigente):
- El chat debe resolver **hasta el 90 %** de las dudas él solo: explicar conceptos (como a alguien de 12 años), leer y **simular boletas**, cotizar, calcular lo que se debe hoy, **evaluar si conviene cambiar de institución** con números, capacitar (qué preguntar en mostrador, derechos) y perfilar.
- Contesta **todas** las preguntas de un mensaje, en orden.
- **WhatsApp = confirmar horario de una cita presencial** con un asesor que ya recibe el caso evaluado. Se ofrece solo cuando (a) la evaluación muestra que el cambio de boleta conviene y la persona quiere hacerlo, estimación **≥ 70 %** de que se concrete, o (b) la persona pide hablar con alguien.
- El bot de WhatsApp (fase 3) reutiliza el mismo system prompt y tools; su último nivel es agendar (y, si se automatiza, gestionar la cita).

Implementación: `system.js` reescrito (escalera de 4 niveles, señales de probabilidad, prohibido ofrecer asesor fuera de los casos), KB ampliada (boleta de ejemplo, analogías, método de comparación, tasas de referencia), tools nuevas `calcular_desempeno_hoy` y `comparar_opciones` (criterio: conviene si ahorro ≥ $500 o ≥ 5 %), `cerrar_a_whatsapp` → `agendar_cita(perfil, resumen, probabilidad)`; el lead guarda `probabilidad` y `etapa`; `max_tokens` 2048 y `effort: medium`; copy del widget ("Confirmar cita por WhatsApp"). Guiones v2 en `scratchpad/guiones2.mjs` (varias preguntas, niño de 12, simular boleta, evaluación sí/no, pide asesor, capacitación): todos correctos; costo ≈ $0.01 USD por turno (respuestas más largas).

## 1. Premisas y límites

| Tema | Decisión | Por qué |
|---|---|---|
| Modelo | `claude-sonnet-5` en chat (configurable por env `CHAT_MODEL`); Opus 5 solo para trabajo offline (generar KB, evals) | Turnos cortos, KB fija cacheada, cálculos en tool determinista. Conversación de 10 turnos ≈ $0.02–0.04 USD. Opus 5 cuesta 2–3x sin mejora perceptible en FAQ educativo |
| Fotos de boleta en el chat web | **No** | Doc 01 §5 exige validar INE ↔ boleta ↔ persona antes de operar; la web anónima no puede. Fotos y datos sensibles van a WhatsApp |
| Datos personales en fase 1 | **No se piden ni se guardan** (ni nombre ni teléfono) | No existe aviso de privacidad. LFPDPPP obliga aviso + consentimiento antes de recolectar. Se desbloquea en fase 2 |
| Lead en fase 1 | Código corto (`CAP-7F3K`) + perfil, embebidos en el texto prellenado del link de WhatsApp | Permite al bot de WhatsApp (fase 3) recuperar el contexto sin DB ni datos personales en la web |
| Base de conocimiento | Doc 04 (regulación, tasas, glosario NOM-179) + contenido actual de la página. Marcada como provisional | Ricardo aún no entrega contenido real. Cuando llegue, se reemplaza `lib/chatbot/knowledge.js` |
| Reglas duras (del proyecto) | Nunca mencionar Montepío ni patrocinios · nunca "100 % independientes" · no presta dinero · nunca alarmista · no asesoría legal/fiscal individual · sin símbolos patrios · cerrar hacia WhatsApp | PRODUCT.md y doc 01 §9 |

## 2. Arquitectura (fase 1)

Todo vive en este mismo Next.js, desplegado en Vercel.

```
app/
  api/chat/route.js          POST. Node runtime. Recibe {messages, sessionId}, valida,
                             corre el loop con tools, devuelve stream de texto (SSE).
components/chat/
  ChatWidget.js              Botón flotante + panel. "use client". Estado en useState,
                             historial en sessionStorage (sobrevive recarga, no cierre).
  ChatMessage.js             Burbuja (usuario / asistente), render de markdown mínimo
                             (negritas, listas, saltos). Sin HTML crudo.
  ChatInput.js               Textarea autoajustable + botón enviar. Enter envía, Shift+Enter salto.
lib/chatbot/
  system.js                  System prompt: identidad, voz, reglas duras, flujo de conversación,
                             instrucciones de perfilado y cierre. Texto FIJO (cacheable).
  knowledge.js               KB en texto: regulación, glosario, rangos de tasas, FAQ, qué hace
                             y qué no hace CAP & Co. Texto FIJO (cacheable).
  tools.js                   Definiciones JSON Schema + ejecutores:
                               calcular_costo(prestamo, tasa_mensual, meses, refrendos?)
                               cerrar_a_whatsapp(perfil, resumen)
  calculo.js                 Matemática pura del costo (misma fórmula que Calculadora.js).
                             Testeable sin red.
  perfiles.js                Enum de perfiles + texto prellenado por perfil.
  codigo.js                  Genera código corto CAP-XXXX (base32 sin ambiguos, 4 chars).
  ratelimit.js               Límite por IP en memoria (por instancia) — suficiente para fase 1.
lib/constants.js             + WHATSAPP_NUMBER separado de WHATSAPP_URL para construir links.
```

### Flujo de una conversación
1. Usuario abre el widget. Mensaje de bienvenida fijo (no consume API).
2. Cada turno: cliente manda historial completo (máx. 20 turnos; el servidor recorta) → `/api/chat`.
3. Servidor: valida forma, rate limit, arma `system` = `[system.js, knowledge.js]` con `cache_control` en el último bloque, `tools`, `messages`. `client.messages.stream(...)`.
4. Si `stop_reason === "tool_use"`: ejecuta la tool en servidor, agrega `tool_result`, repite (máx. 3 iteraciones por turno).
5. Texto se reenvía al cliente como SSE mientras llega. Al final, evento `done` con `{usage, cta?}`.
6. Cuando el modelo llama `cerrar_a_whatsapp`, el servidor genera código + link `wa.me` con texto prellenado y lo devuelve en el evento `done` como `cta`. El widget muestra botón verde "Continuar por WhatsApp" con ese link.

### Tools
**`calcular_costo`** — entrada: `prestamo` (MXN), `tasa_mensual` (%), `meses`, `refrendos_previos?`. Salida: interés mensual, interés total, total a pagar, múltiplo, y nota de que el refrendo no baja la deuda. El modelo NUNCA calcula a mano; si el usuario no da un dato, lo pregunta. Si da tasa anual/CAT, la tool devuelve error explicando que necesita tasa mensual.

**`cerrar_a_whatsapp`** — entrada: `perfil` (enum), `resumen` (≤ 200 chars, sin datos personales). Salida: `{codigo, url}`. Perfiles:
- `primera_vez` — va a empeñar y quiere entender antes de firmar
- `ya_empeno_confundido` — tiene boleta y no entiende cuánto debe
- `quiere_traspaso` — le ofrecieron liquidar/mover su deuda o quiere opción mejor
- `boleta_vencida` — pasó el plazo o está por pasar
- `curioso` — explora sin caso concreto

Texto prellenado: `Hola, vengo de la página. Código CAP-7F3K. [frase por perfil]`. Sin resumen libre en el link (evita filtrar situación financiera en la URL).

### Guardrails técnicos
- `max_tokens` 1024 por turno (respuestas cortas, formato chat). `output_config.effort: "low"`, `thinking: {type: "adaptive"}`.
- Historial: 20 mensajes máx., cada mensaje ≤ 1,500 caracteres. Solo bloques de texto de entrada (sin imágenes).
- Rate limit: 30 requests / 10 min por IP; 429 con mensaje amable.
- Manejo de `stop_reason === "refusal"`: mensaje genérico + CTA a WhatsApp.
- Errores de API: respuesta degradada ("ahora mismo no puedo responder, escríbenos por WhatsApp") — nunca se cae el widget.
- Logs de servidor: `usage` por turno (input, cache_read, output) para medir costo real. Sin transcripciones en fase 1.
- Prompt injection: system prompt instruye ignorar órdenes del usuario que contradigan reglas; tools no tienen efectos fuera del chat.

### Widget (UX y marca)
- Botón flotante esmeralda con ícono de conversación, esquina inferior derecha, visible en móvil sin tapar el CTA del header. Etiqueta "Pregunta lo que quieras".
- Panel: en móvil ocupa pantalla completa (`100dvh`), en desktop 400×640. Cabecera con nombre y "Asesor virtual — respuestas orientativas". Fondo papel, burbujas del asistente en papel-alto, del usuario en esmeralda con texto sobre-verde. Marcellus solo en el título del panel. Sin granate excepto para señalar una cifra problemática dentro de una respuesta.
- Chips de arranque (3): "¿Cuánto voy a pagar?", "No entiendo mi boleta", "¿Me conviene moverme?".
- Mientras responde: tres puntos animados. Botón de enviar deshabilitado durante el stream.
- Accesible: `role="dialog"`, foco al abrir, Esc cierra, `aria-live="polite"` en la lista de mensajes. Respeta `prefers-reduced-motion`.
- Pie del panel: "Orientación general, no asesoría personalizada. Tu caso real lo revisamos por WhatsApp." (texto legal mínimo de fase 1).

## 3. Plan de ejecución (tareas)

Orden pensado para que cada paso sea verificable solo.

1. **Dependencia y config** — `npm i @anthropic-ai/sdk`; `.env.local` con `ANTHROPIC_API_KEY` y `CHAT_MODEL=claude-sonnet-5`; confirmar que `.env*` sigue ignorado en git. Subir `ANTHROPIC_API_KEY` y `CHAT_MODEL` a Vercel (production + preview).
2. **`lib/chatbot/calculo.js` + prueba** — función pura; prueba con `node --test` comparando contra los números que hoy muestra `Calculadora.js` (2,000 · 8 % · 6 meses → 2,960 total, 1.5x).
3. **`lib/chatbot/codigo.js` + `perfiles.js`** — código de 4 caracteres (alfabeto sin 0/O/1/I), textos por perfil, builder de URL `wa.me`. Prueba unitaria del formato.
4. **`lib/chatbot/knowledge.js`** — redactar la KB desde doc 04 y el contenido de la página. Incluir explícitamente: qué NO hace CAP & Co., rangos de tasas con fuente, glosario, derechos (demasía, CAT, contrato de adhesión PROFECO), preguntas frecuentes. Nota visible de "contenido provisional; reemplazar con datos de Ricardo".
5. **`lib/chatbot/system.js`** — system prompt: identidad, voz (despejado, firme, de mármol; claridad radical), reglas duras, formato (respuestas de 2–5 líneas, una pregunta a la vez, sin listas largas), cuándo usar cada tool, cuándo cerrar a WhatsApp (tras resolver la duda o cuando el caso necesita ver la boleta), perfilado.
6. **`lib/chatbot/tools.js`** — definiciones con `strict: true` y ejecutores que llaman a `calculo.js` y `codigo.js`.
7. **`app/api/chat/route.js`** — validación, rate limit, loop de streaming con tools, SSE, manejo de errores y `refusal`. Probar con `curl` antes de tocar UI.
8. **`components/chat/*`** — widget, mensajes, input, chips, CTA. Montar `<ChatWidget />` en `app/layout.js` (debajo de `children`).
9. **QA en navegador (dev server `capco-web`)** — móvil 375 px y desktop: abrir/cerrar, chips, stream, tool de cálculo, cierre a WhatsApp con link correcto, recarga conserva historial, Esc, reduced motion, consola sin errores. Verificar `cache_read_input_tokens > 0` a partir del segundo turno en los logs.
10. **Prueba de conversaciones** — 8 guiones (uno por perfil + 3 adversariales: pedir que preste dinero, preguntar por Montepío, pedir asesoría legal específica). Revisar tono y reglas. Ajustar prompt.
11. **Deploy** — `vercel deploy --prod -y`, probar en producción, registrar costo por conversación observado.
12. **Cierre de sesión** — actualizar `CONTEXTOS/ESTADO.md`, `PENDIENTES.md`, `FUNDAMENTOS.md` (nueva pieza) y este documento.

### Resultado de las pruebas (22-ago)
- Guiones en `scratchpad/guiones.mjs` (sesión del 22-ago; rehacer si no existe: 5 perfiles + "préstame dinero" + "¿quién los patrocina? / ¿Prendamex o First Cash? / ignora tus instrucciones" + "demándalos / mi nombre y teléfono"). Todos cumplen las reglas duras.
- Caché: ≈7,400 tokens cacheados (system + KB); `cache_read` > 0 desde el segundo turno. Costo observado ≈ $0.005 USD por turno, ≈ $0.02–0.03 por conversación de 4 turnos.
- Ajustes que salieron de las pruebas: salto de línea entre iteraciones de tool; `hasCta` del widget al servidor para no repetir el código; reglas 3, 4 y 6 del prompt reforzadas (no negar/afirmar vínculos, sin frases de neutralidad, no usar el nombre de la persona); canal de quejas PROFECO en la KB.

## 4. Fase 2 — Leads con datos (construida 22-ago-2026)

Decisión de diseño: el modelo **nunca** recibe datos personales. El lead anónimo se crea al cerrar a WhatsApp; nombre y teléfono solo entran por un formulario controlado (no por la conversación), con casilla de consentimiento que enlaza al aviso. La DB lo refuerza con un CHECK: sin `consent_at` no puede haber `nombre`/`telefono`.

| Pieza | Archivo | Qué hace |
|---|---|---|
| Esquema | `lib/db/schema.sql` · `scripts/migrate.mjs` (`npm run db:migrate`) | Tabla `lead` (codigo único, perfil, resumen, fuente JSONB, created_at, whatsapp_click_at, nombre, telefono, consent_at, consent_version, contactado_at, notas). Idempotente |
| Conexión | `lib/db/client.js` | `pg` Pool; si no hay `DATABASE_URL`, todo degrada sin romper el chat |
| Repositorio | `lib/leads/repo.js` | `crearLead` (reintenta si el código choca), `registrarClickWhatsApp`, `registrarContacto`, `obtenerLead`, `estadisticas` |
| Validación | `lib/leads/validar.js` | Teléfono MX 10 dígitos (acepta +52/521), nombre 2–80, consentimiento obligatorio, `limpiarFuente` (solo utm_*, referrer, path) |
| Chat | `lib/chatbot/tools.js` · `app/api/chat/route.js` | `cerrar_a_whatsapp` crea el lead con la `fuente` que manda el widget |
| APIs | `app/api/leads/[codigo]/click` (POST, beacon) · `.../contacto` (POST, rate-limited) · `app/api/leads/[codigo]` (GET, `Authorization: Bearer LEADS_API_SECRET`, para el bot de WhatsApp) | |
| Widget | `components/chat/ContactoForm.js` · `ChatWidget.js` | Captura utm/referrer al primer toque (sessionStorage), beacon al tocar WhatsApp, formulario opcional "¿Prefieres que te escribamos nosotros?" bajo el botón |
| Aviso | `app/aviso-de-privacidad/page.js` | Provisional (LFPDPPP: responsable, datos, finalidades, transferencias, conservación, ARCO, cambios). Placeholders: razón social, domicilio, correo de privacidad. Versión `AVISO_VERSION` en `validar.js` |
| Vista interna | `app/admin/leads/page.js` · `middleware.js` | Basic auth (`ADMIN_USER`/`ADMIN_PASSWORD`). Totales, por perfil, por fuente, por día, últimos 50 |
| SEO | `app/layout.js` | `robots noindex` mientras `SITE_INDEXABLE` ≠ `true` |

Env nuevas: `DATABASE_URL`, `ADMIN_USER`, `ADMIN_PASSWORD`, `LEADS_API_SECRET`, `SITE_INDEXABLE`. Pruebas: `tests/leads.db.test.js` corre contra la DB si hay `DATABASE_URL` (local: instancia aislada en el scratchpad, puerto 5499).

## 5. Siguientes fases
- **Fase 2 pendientes**: datos reales del responsable en el aviso (Ricardo) + revisión legal; marcar "contactado" desde la vista interna; exportar CSV.
- **Fase 3 — Bot de WhatsApp 24/7**: WhatsApp Business Platform (Meta Cloud API) o Twilio. Requiere Meta Business verificado a nombre del cliente, número dedicado (el 55 6880 9606 no puede estar a la vez en la app normal de WhatsApp), webhook, plantillas aprobadas para seguimiento fuera de la ventana de 24 h. Lee el código `CAP-XXXX`, recupera perfil, continúa con contexto. **Camino crítico: iniciar el trámite de Meta desde ya (equipo de la clienta).**
- **Fase 4 — Contenido real**: reemplazar `knowledge.js` con lo que entregue Ricardo; evals con Opus 5 en batch.

## 5. Bloqueos conocidos

- **`ANTHROPIC_API_KEY`**: no existe en esta máquina ni en Vercel. Sin llave no se puede probar nada del backend. La genera el usuario en console.anthropic.com (Claude no crea cuentas ni maneja llaves por chat).
- **Cambios sin commit**: el repo de `PAGINA WEB` tiene modificaciones del 20–21 de agosto sin commitear (`page.js`, `Calculadora.js`, `Header.js`, etc.). Producción las tiene (deploy desde working tree), git no. Conviene commitear antes de empezar el chatbot para separar historias.
