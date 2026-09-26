# Chatbot web CAP & Co. — Diseño y plan

**Estado (verificado 11-sep-2026):** fases 1 y 2 en producción en **https://casa-ap.com** (alias `cap-co-kappa.vercel.app`); leads en Neon; panel `/admin/leads`; 21 pruebas (19 unitarias + 2 contra DB). Último cambio de código: `1cae839` (22-ago). Pendiente: tasas reales del aliado, datos del aviso de privacidad, feedback de la clienta, fase 3 (WhatsApp).
**Decisiones del usuario:** chatbot con IA · resuelve solo hasta el 90 % (educa, simula, cotiza, evalúa, capacita) · compara instituciones con datos públicos · tasa preferente con Montepío Luz Saviñón para boletas evaluadas · leads con perfil para estadística · WhatsApp **solo** para confirmar cita presencial cuando el traspaso conviene (≥ 70 %) o la persona lo pide · el bot de WhatsApp (fase 3) reutiliza el mismo cerebro · contenido provisional mientras Ricardo no entregue el suyo.

> **Cómo leer este documento:** §0 y §0.1 describen el comportamiento vigente. §1–§3 son el diseño original de la fase 1 (21-ago), actualizados donde cambió; lo superado se marca como tal en vez de borrarse.

---

## 0. Cambio de alcance (22-ago-2026, tarde) — el chat resuelve; WhatsApp solo agenda

Retroalimentación de Mau tras probarlo: redirigía demasiado pronto a WhatsApp y contestaba solo la primera pregunta. Nuevo comportamiento (vigente):
- El chat debe resolver **hasta el 90 %** de las dudas él solo: explicar conceptos (como a alguien de 12 años), leer y **simular boletas**, cotizar, calcular lo que se debe hoy, **evaluar si conviene cambiar de institución** con números, capacitar (qué preguntar en mostrador, derechos) y perfilar.
- Contesta **todas** las preguntas de un mensaje, en orden.
- **WhatsApp = confirmar horario de una cita presencial** con un asesor que ya recibe el caso evaluado. Se ofrece solo cuando (a) la evaluación muestra que el cambio de boleta conviene y la persona quiere hacerlo, estimación **≥ 70 %** de que se concrete, o (b) la persona pide hablar con alguien.
- El bot de WhatsApp (fase 3) reutiliza el mismo system prompt y tools; su último nivel es agendar (y, si se automatiza, gestionar la cita).

Implementación: `system.js` reescrito (escalera de 4 niveles, señales de probabilidad, prohibido ofrecer asesor fuera de los casos), KB ampliada (boleta de ejemplo, analogías, método de comparación, tasas de referencia), tools nuevas `calcular_desempeno_hoy` y `comparar_opciones` (criterio: conviene si ahorro ≥ $500 o ≥ 5 %), `cerrar_a_whatsapp` → `agendar_cita(perfil, resumen, probabilidad)`; el lead guarda `probabilidad` y `etapa`; `max_tokens` 2048 y `effort: medium`; copy del widget ("Confirmar cita por WhatsApp"). Guiones v2 en `scratchpad/guiones2.mjs` (varias preguntas, niño de 12, simular boleta, evaluación sí/no, pide asesor, capacitación): todos correctos; costo ≈ $0.01 USD por turno (respuestas más largas).

## 0.1 Comparador con nombre y tasa preferente del aliado (22-ago-2026, noche)

Aclaración de Mau: la regla de "no nombrar" era sobre la información interna de CAP & Co. (quién está detrás), no sobre las instituciones. CAP & Co. actúa como aliado de la persona y, al cotizar, sí usa y nombra datos públicos de las instituciones. Además, CAP & Co. tendrá **autorización de Montepío Luz Saviñón para una tasa preferente** en boletas que lleguen evaluadas y con cita (no es tasa pública de Montepío).

Regla de oferta (propuesta de CAP & Co.; parámetros **provisionales** en `lib/chatbot/instituciones.js` hasta recibir las tasas reales):
- Tasa actual **mayor** que la pública del aliado → oferta = tasa pública (Montepío queda #1 por números).
- Tasa actual **igual o menor** (p. ej. viene de Nacional Monte de Piedad con tasa preferente) → oferta = tasa actual − 5 % relativo, con **piso por valor de la pieza** (≥ $20k: 2.5 % · ≥ $5k: 3.0 % · resto: 3.25 %).
- **No avanza** si la oferta toca el piso sin mejorar la tasa actual (perdería la casa de empeño) o si el ahorro < $500 y < 5 % (perdería el cliente). Mensaje: "por ahora tienes el mejor trato posible del mercado; continúa con tus pagos". Sin cita.

Implementación: `instituciones.js` (tabla pública con CAT/tipo/fuente/fecha desde doc 04 + `ALIADO`), `cotizacion.js` (`cotizarTraspaso`), tools `comparar_instituciones` y `cotizar_traspaso`, `agendar_cita` guarda `institucion_origen`, `tasa_actual`, `tasa_oferta`, `ahorro` (visibles en `/admin/leads`). Prompt: solo puede nombrar instituciones con datos de las herramientas; nunca opina de una institución; la tasa preferente siempre se presenta como "tasa que CAP & Co. puede gestionar en Montepío Luz Saviñón para boletas evaluadas". Guiones v3 (`scratchpad/guiones3.mjs`): ranking con fuente, no inventa CAT de Dondé, Prendamex 10 % → 3.5 % y cita, Nacional 3.4 % → 3.23 % no compensa, caso corto no avanza. Todos correctos.

Pendiente del cliente: CAT/tasa pública real de Montepío, descuento y pisos reales, tasa de referencia de Nacional Monte de Piedad, y decisión escrita sobre cómo se nombra la relación con Montepío (hoy: "aliado con tasa preferente", que es verificable; **no** se programó ningún ranking fijo ni inclinación oculta: el orden sale de los números).

## 0.2 Tema cerrado y respuestas cortas (26-sep-2026)

Pedido de Mau tras probarlo: que no conteste nada fuera de lo prendario y que sea mucho más conciso ("dice mucho y a la vez nada").
- **Tema**: empeño y boletas, costos y cotizaciones, traspaso y comparación de instituciones, valor de metales/piedras/relojes, cuidado y restauración de piezas (taller de CAP & Co.), derechos PROFECO, empeño vs otros créditos solo para comparar costo, y qué es CAP & Co. Todo lo demás se declina con una respuesta fija que sugiere los cuatro temas más buscados. En mensajes mixtos contesta lo del tema y cierra con "Lo otro no lo puedo contestar; aquí solo veo temas de empeño."
- **Concisión**: 30–80 palabras por respuesta (hasta 150 solo si pidió algo completo); un párrafo o una frase + lista de máximo 4 puntos; sin preámbulos; la nota de comisiones una sola vez por conversación.
- **Base de conocimiento nueva**: §12 cómo se valúan oro (pureza por kilate y fórmula), plata, platino, diamantes (4C), otras piedras y relojes, sin precios del día; §13 taller de restauración (existe; costos y tiempos se cotizan en cita — **faltan los datos reales del taller**).
- **Perfil nuevo** `restauracion`; `agendar_cita` también cuando quieren cotizar una restauración.
- Reglas reforzadas: prohibidas las palabras "independiente/neutral/imparcial/objetivo" (apareció "asesoría independiente" en una corrida); ante "¿quién está detrás?" no se nombra ninguna institución (respuesta modelo en el prompt); si piden hablar con una persona, `agendar_cita` en ese mismo turno.
- **Evaluación**: `npm run eval` (`scripts/eval-chat.mjs`, 28 casos: 8 fuera de tema, 8 en el borde del tema, 5 de concisión, 7 de regresión). Usa `lib/chatbot/motor.js`, el mismo ciclo que `/api/chat`. Antes: 8/26 y 148 palabras promedio; después: 28/28 en dos corridas seguidas y 62–64 palabras promedio.

## 1. Premisas y límites

| Tema | Decisión | Por qué |
|---|---|---|
| Modelo | `claude-sonnet-5` en chat (configurable por env `CHAT_MODEL`); Opus 5 solo para trabajo offline (generar KB, evals) | Turnos cortos, KB fija cacheada, cálculos en tool determinista. Conversación de 10 turnos ≈ $0.02–0.04 USD. Opus 5 cuesta 2–3x sin mejora perceptible en FAQ educativo |
| Fotos de boleta en el chat web | **No** | Doc 01 §5 exige validar INE ↔ boleta ↔ persona antes de operar; la web anónima no puede. Fotos y datos sensibles van a WhatsApp |
| Datos personales | **Nunca por la conversación.** Desde la fase 2 solo por formulario con casilla del aviso de privacidad; la DB rechaza nombre/teléfono sin `consent_at` | LFPDPPP obliga aviso + consentimiento antes de recolectar. El aviso sigue siendo provisional (§4) |
| Lead | Código corto (`CAP-7F3K`) + perfil en el texto prellenado de `wa.me`; desde la fase 2 además se guarda en la tabla `lead` (§4) | Permite al bot de WhatsApp (fase 3) recuperar el contexto con `GET /api/leads/CAP-XXXX` |
| Base de conocimiento | Doc 04 (regulación, tasas, glosario NOM-179) + contenido actual de la página. Marcada como provisional | Ricardo aún no entrega contenido real. Cuando llegue, se reemplaza `lib/chatbot/knowledge.js` |
| Reglas duras (vigentes) | No presta dinero · nombra instituciones solo con datos públicos de las herramientas (fuente y fecha), nunca opina de ellas · la tasa preferente se presenta como "gestionada por CAP & Co. en Montepío Luz Saviñón" · no habla de quién está detrás de CAP & Co. (ni afirma ni niega) · nunca "100 % independientes", "neutral" ni equivalentes · nunca alarmista · no asesoría legal/fiscal individual · sin símbolos patrios | PRODUCT.md, doc 01 §9 (publicidad engañosa) y §0.1. **Superada:** la regla original "nunca mencionar Montepío ni ninguna institución" y "cerrar siempre hacia WhatsApp" |

## 2. Arquitectura (vigente)

Todo vive en este mismo Next.js, desplegado en Vercel.

```
app/
  api/chat/route.js          POST. Node runtime. Recibe {messages, hasCta, fuente}, valida,
                             corre el loop con tools, devuelve stream NDJSON.
  api/leads/[codigo]/...     click (beacon), contacto (formulario), GET con Bearer (§4).
  admin/leads/page.js        Panel interno con Basic auth (middleware.js).
  aviso-de-privacidad/       Aviso provisional (LFPDPPP).
components/chat/
  ChatWidget.js              Botón flotante + panel. "use client". Estado en useState,
                             historial en sessionStorage (sobrevive recarga, no cierre).
  ChatMessage.js             Burbuja (usuario / asistente), render de markdown mínimo
                             (negritas, listas, saltos). Sin HTML crudo.
  ChatInput.js               Textarea autoajustable + botón enviar. Enter envía, Shift+Enter salto.
  ContactoForm.js            Formulario opcional (nombre + WhatsApp + consentimiento) bajo el CTA.
  markdown.js                Negritas, viñetas y listas numeradas. Sin tablas ni HTML.
lib/chatbot/
  system.js                  System prompt: identidad, voz, reglas duras, flujo de conversación,
                             instrucciones de perfilado y cierre. Texto FIJO (cacheable).
  knowledge.js               KB en texto: regulación, glosario, rangos de tasas, FAQ, qué hace
                             y qué no hace CAP & Co. Texto FIJO (cacheable).
  tools.js                   Seis herramientas (strict) + ejecutores:
                               calcular_costo · calcular_desempeno_hoy · comparar_opciones
                               comparar_instituciones · cotizar_traspaso · agendar_cita
  calculo.js                 Matemática pura: costo total, deuda hoy, quedarse vs moverse.
  cotizacion.js              Regla de oferta con tasa preferente del aliado (§0.1).
  instituciones.js           Tabla pública (CAT, tipo, fuente, fecha) + parámetros del aliado.
                             PROVISIONAL hasta recibir tasas reales.
  perfiles.js                Enum de perfiles + texto prellenado por perfil.
  codigo.js                  Genera código corto CAP-XXXX (base32 sin ambiguos, 4 chars).
  ratelimit.js               Límite por IP en memoria (por instancia) — suficiente para fase 1.
lib/db/                      client.js (pg Pool, degrada sin DATABASE_URL) · schema.sql (idempotente).
lib/leads/                   repo.js (crear, click, contacto, stats) · validar.js (teléfono MX, consentimiento).
lib/constants.js             WHATSAPP_NUMBER separado de WHATSAPP_URL para construir links.
```

### Flujo de una conversación
1. Usuario abre el widget. Mensaje de bienvenida fijo (no consume API).
2. Cada turno: cliente manda historial completo (máx. 20 turnos; el servidor recorta) → `/api/chat`.
3. Servidor: valida forma, rate limit, arma `system` = `[system.js, knowledge.js]` con `cache_control` en el último bloque, `tools`, `messages`. `client.messages.stream(...)`.
4. Si `stop_reason === "tool_use"`: ejecuta la tool en servidor, agrega `tool_result`, repite (máx. 3 iteraciones por turno).
5. Texto se reenvía al cliente como SSE mientras llega. Al final, evento `done` con `{usage, cta?}`.
6. Cuando el modelo llama `agendar_cita` (solo si `cotizar_traspaso` avanzó y la persona quiere, o si pide asesor), el servidor crea el lead, genera código + link `wa.me` y emite un evento `cta` con `persistido`. El widget muestra "Confirmar cita por WhatsApp" y, si hay DB, el formulario opcional de contacto. Con `hasCta` no se genera un segundo código.

### Tools
> Vigentes: `calcular_costo`, `calcular_desempeno_hoy`, `comparar_opciones`, `comparar_instituciones`, `cotizar_traspaso`, `agendar_cita` (detalle de las cuatro últimas en §0 y §0.1). Lo que sigue es el diseño original de la fase 1.

**`calcular_costo`** — entrada: `prestamo` (MXN), `tasa_mensual` (%), `meses`, `refrendos_previos?`. Salida: interés mensual, interés total, total a pagar, múltiplo, y nota de que el refrendo no baja la deuda. El modelo NUNCA calcula a mano; si el usuario no da un dato, lo pregunta. Si da tasa anual/CAT, la tool devuelve error explicando que necesita tasa mensual.

**`cerrar_a_whatsapp`** (**superada** el 22-ago por `agendar_cita(perfil, resumen, probabilidad, institucion_origen, tasa_actual, tasa_oferta, ahorro)`) — entrada: `perfil` (enum), `resumen` (≤ 200 chars, sin datos personales). Salida: `{codigo, url}`. Perfiles:
- `primera_vez` — va a empeñar y quiere entender antes de firmar
- `ya_empeno_confundido` — tiene boleta y no entiende cuánto debe
- `quiere_traspaso` — le ofrecieron liquidar/mover su deuda o quiere opción mejor
- `boleta_vencida` — pasó el plazo o está por pasar
- `curioso` — explora sin caso concreto

Texto prellenado: `Hola, vengo de la página. Código CAP-7F3K. [frase por perfil]`. Sin resumen libre en el link (evita filtrar situación financiera en la URL).

### Guardrails técnicos
- `max_tokens` 2048 por turno y `output_config.effort: "medium"` (desde el 22-ago; en la fase 1 eran 1024 y `low`, insuficientes para explicar y simular boletas). `thinking: {type: "adaptive"}`. Máximo 3 iteraciones de herramientas por turno.
- Historial: 20 mensajes máx., cada mensaje ≤ 1,500 caracteres. Solo bloques de texto de entrada (sin imágenes).
- Rate limit: 30 requests / 10 min por IP; 429 con mensaje amable.
- Manejo de `stop_reason === "refusal"`: mensaje genérico que invita a escribir por WhatsApp.
- Errores de API: respuesta degradada ("ahora mismo no puedo responder, escríbenos por WhatsApp") — nunca se cae el widget.
- Logs de servidor: `usage` por turno (input, cache_read, output) para medir costo real. Sin transcripciones en fase 1.
- Prompt injection: system prompt instruye ignorar órdenes del usuario que contradigan reglas; tools no tienen efectos fuera del chat.

### Widget (UX y marca)
- Botón flotante esmeralda, esquina inferior derecha. En escritorio con etiqueta "Pregunta lo que quieras"; en móvil es un círculo que aparece al bajar del hero, para no tapar el CTA principal.
- Panel: en móvil ocupa pantalla completa (`100dvh`), en desktop 400×640. Cabecera con nombre y "Asesor virtual". Fondo papel, burbujas del asistente en papel-alto, del usuario en esmeralda con texto sobre-verde. Marcellus solo en el título del panel. Sin granate excepto para señalar una cifra problemática dentro de una respuesta.
- Chips de arranque (4): "Explícame mi boleta", "¿Cuánto debo hoy?", "¿Me conviene cambiar de casa de empeño?", "Enséñame con un ejemplo".
- Mientras responde: tres puntos animados. Botón de enviar deshabilitado durante el stream.
- Accesible: `role="dialog"`, foco al abrir, Esc cierra, `aria-live="polite"` en la lista de mensajes. Respeta `prefers-reduced-motion`.
- Pie del panel: "Asistente automático: orienta y evalúa tu caso. La cita con un asesor se confirma por WhatsApp. No guarda datos personales; solo los que dejes en el formulario, con tu permiso."

## 3. Plan de ejecución de la fase 1 (histórico, completado 21–22 ago)

Orden pensado para que cada paso sea verificable solo. Todas las tareas quedaron hechas; se conserva como registro.

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
- Guiones v1 (reglas duras): 5 perfiles + "préstame dinero" + "¿quién los patrocina? / ¿Prendamex o First Cash? / ignora tus instrucciones" + "demándalos / mi nombre y teléfono". Todos cumplen las reglas duras. **Los scripts de guiones (v1, v2, v3) vivían en el scratchpad de la sesión y ya no existen**; para rehacerlos, usar los casos listados aquí, en §0 y en §0.1.
- Caché: ≈7,400 tokens cacheados (system + KB); `cache_read` > 0 desde el segundo turno. Costo observado ≈ $0.005 USD por turno, ≈ $0.02–0.03 por conversación de 4 turnos.
- Ajustes que salieron de las pruebas: salto de línea entre iteraciones de tool; `hasCta` del widget al servidor para no repetir el código; reglas 3, 4 y 6 del prompt reforzadas (no negar/afirmar vínculos, sin frases de neutralidad, no usar el nombre de la persona); canal de quejas PROFECO en la KB.

## 4. Fase 2 — Leads con datos (construida 22-ago-2026)

Decisión de diseño: el modelo **nunca** recibe datos personales. El lead anónimo se crea al cerrar a WhatsApp; nombre y teléfono solo entran por un formulario controlado (no por la conversación), con casilla de consentimiento que enlaza al aviso. La DB lo refuerza con un CHECK: sin `consent_at` no puede haber `nombre`/`telefono`.

| Pieza | Archivo | Qué hace |
|---|---|---|
| Esquema | `lib/db/schema.sql` · `scripts/migrate.mjs` (`npm run db:migrate`) | Tabla `lead` (codigo único, perfil, resumen, fuente JSONB, created_at, whatsapp_click_at, nombre, telefono, consent_at, consent_version, contactado_at, notas, probabilidad, etapa, institucion_origen, tasa_actual, tasa_oferta, ahorro). Idempotente |
| Conexión | `lib/db/client.js` | `pg` Pool; si no hay `DATABASE_URL`, todo degrada sin romper el chat |
| Repositorio | `lib/leads/repo.js` | `crearLead` (reintenta si el código choca), `registrarClickWhatsApp`, `registrarContacto`, `obtenerLead`, `estadisticas` |
| Validación | `lib/leads/validar.js` | Teléfono MX 10 dígitos (acepta +52/521), nombre 2–80, consentimiento obligatorio, `limpiarFuente` (solo utm_*, referrer, path) |
| Chat | `lib/chatbot/tools.js` · `app/api/chat/route.js` | `agendar_cita` crea el lead con la `fuente` que manda el widget, más probabilidad, institución de origen, tasa actual, tasa ofrecida y ahorro |
| APIs | `app/api/leads/[codigo]/click` (POST, beacon) · `.../contacto` (POST, rate-limited) · `app/api/leads/[codigo]` (GET, `Authorization: Bearer LEADS_API_SECRET`, para el bot de WhatsApp) | |
| Widget | `components/chat/ContactoForm.js` · `ChatWidget.js` | Captura utm/referrer al primer toque (sessionStorage), beacon al tocar WhatsApp, formulario opcional "¿Prefieres que te escribamos nosotros?" bajo el botón |
| Aviso | `app/aviso-de-privacidad/page.js` | Provisional (LFPDPPP: responsable, datos, finalidades, transferencias, conservación, ARCO, cambios). Placeholders: razón social, domicilio, correo de privacidad. Versión `AVISO_VERSION` en `validar.js` |
| Vista interna | `app/admin/leads/page.js` · `middleware.js` | Basic auth (`ADMIN_USER`/`ADMIN_PASSWORD`). Totales, por perfil, por fuente, por día, últimos 50 |
| SEO | `app/layout.js` | `robots noindex` mientras `SITE_INDEXABLE` ≠ `true` |

Env nuevas: `DATABASE_URL`, `ADMIN_USER`, `ADMIN_PASSWORD`, `LEADS_API_SECRET`, `SITE_INDEXABLE`. Pruebas: `tests/leads.db.test.js` corre contra la DB si hay `DATABASE_URL` (se salta si no).

**Producción (22-ago):** Neon vía integración de Vercel (recurso `neon-byzantium-fence`). Migrar: `vercel env pull .env.production.local --environment production` → `node --env-file=.env.production.local scripts/migrate.mjs` → borrar el archivo. ⚠️ `vercel integration add` y `vercel env pull` sobrescriben `.env.local`: respaldarlo antes. Lead de prueba en producción: `CAP-FSS7`.

## 5. Siguientes fases
- **Fase 2 pendientes**: datos reales del responsable en el aviso (Ricardo) + revisión legal; marcar "contactado" desde la vista interna; exportar CSV.
- **Parámetros reales del aliado**: CAT/tasa pública de Montepío, descuento autorizado, pisos por valor de pieza y tasa de referencia de Nacional → `lib/chatbot/instituciones.js`. Hoy son provisionales y el bot cotiza con ellos en producción.
- **Fase 3 — Bot de WhatsApp 24/7** (reutiliza el mismo system prompt y herramientas; su último nivel es agendar la cita): WhatsApp Business Platform (Meta Cloud API) o Twilio. Requiere Meta Business verificado a nombre del cliente, número dedicado (el 55 6880 9606 no puede estar a la vez en la app normal de WhatsApp), webhook, plantillas aprobadas para seguimiento fuera de la ventana de 24 h. Lee el código `CAP-XXXX`, recupera perfil, continúa con contexto. **Camino crítico: iniciar el trámite de Meta desde ya (equipo de la clienta).**
- **Fase 4 — Contenido real**: reemplazar `knowledge.js` con lo que entregue Ricardo; evals con Opus 5 en batch.

## 6. Bloqueos y riesgos conocidos

- **Contenido del cliente:** tasas reales del aliado, decisión escrita sobre cómo se nombra la relación con Montepío y datos del responsable para el aviso de privacidad (Ricardo).
- **Meta Business** verificado con `casa-ap.com` + número dedicado: camino crítico de la fase 3.
- **Carpeta en iCloud:** `next build`/`next dev` se cuelgan en `Mobile Documents`; espejar a una carpeta local o mover el repo a `~/Coding/cap-co`.
- **Migración manual:** el esquema se aplica a producción a mano; conviene correr `db:migrate` dentro del build.
- Resueltos el 22-ago: `ANTHROPIC_API_KEY` (en Vercel y local) y los cambios sin commit de la web.
