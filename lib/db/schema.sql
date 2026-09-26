-- Esquema de leads del chatbot (fase 2). Idempotente: se puede correr varias veces.
-- Datos personales (nombre, telefono) solo se guardan con consent_at (aviso de privacidad).

CREATE TABLE IF NOT EXISTS lead (
  id            BIGSERIAL PRIMARY KEY,
  codigo        TEXT        NOT NULL UNIQUE,            -- CAP-XXXX
  perfil        TEXT        NOT NULL,                   -- primera_vez | ya_empeno_confundido | quiere_traspaso | boleta_vencida | curioso
  resumen       TEXT        NOT NULL DEFAULT '',        -- resumen del modelo, sin datos personales, <= 200 chars
  fuente        JSONB       NOT NULL DEFAULT '{}'::jsonb, -- utm_source, utm_medium, utm_campaign, referrer, path
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  whatsapp_click_at TIMESTAMPTZ,                        -- cuando tocó "Continuar por WhatsApp"
  nombre        TEXT,                                   -- solo con consentimiento
  telefono      TEXT,                                   -- solo con consentimiento, 10 dígitos MX
  consent_at    TIMESTAMPTZ,                            -- aceptó el aviso de privacidad
  consent_version TEXT,                                 -- versión del aviso aceptada
  contactado_at TIMESTAMPTZ,                            -- lo marca el equipo / bot de WhatsApp
  notas         TEXT
);

-- Fase 2.1: calificación del lead al agendar.
ALTER TABLE lead ADD COLUMN IF NOT EXISTS probabilidad SMALLINT;   -- 0-100, estimada por el modelo al agendar
ALTER TABLE lead ADD COLUMN IF NOT EXISTS etapa TEXT NOT NULL DEFAULT 'cita_solicitada'; -- cita_solicitada | cita_confirmada | atendido | descartado

-- Fase 2.2: cotización del traspaso al agendar.
ALTER TABLE lead ADD COLUMN IF NOT EXISTS institucion_origen TEXT;
ALTER TABLE lead ADD COLUMN IF NOT EXISTS tasa_actual NUMERIC(5,2);
ALTER TABLE lead ADD COLUMN IF NOT EXISTS tasa_oferta NUMERIC(5,2);
ALTER TABLE lead ADD COLUMN IF NOT EXISTS ahorro NUMERIC(12,2);

CREATE INDEX IF NOT EXISTS lead_created_at_idx ON lead (created_at DESC);
CREATE INDEX IF NOT EXISTS lead_perfil_idx     ON lead (perfil);

-- Integridad: si hay datos personales, tiene que haber consentimiento.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_datos_con_consentimiento'
  ) THEN
    ALTER TABLE lead ADD CONSTRAINT lead_datos_con_consentimiento
      CHECK ((nombre IS NULL AND telefono IS NULL) OR consent_at IS NOT NULL);
  END IF;
END $$;

-- Fotografías de precios de metales (dos al día, entre semana). El chat usa siempre la última,
-- para que una misma evaluación no cambie cada minuto.
CREATE TABLE IF NOT EXISTS precio_metal (
  id            BIGSERIAL PRIMARY KEY,
  capturado_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  sesion        TEXT          NOT NULL,              -- manana | tarde | manual
  oro_usd_oz    NUMERIC(12,4) NOT NULL,
  plata_usd_oz  NUMERIC(12,4) NOT NULL,
  platino_usd_oz NUMERIC(12,4) NOT NULL,
  paladio_usd_oz NUMERIC(12,4) NOT NULL,
  usd_mxn       NUMERIC(10,4) NOT NULL,
  fx_fecha      DATE          NOT NULL,              -- fecha del tipo de cambio publicado
  fuente        TEXT          NOT NULL               -- p. ej. "gold-api.com + BCE (Frankfurter)"
);
CREATE INDEX IF NOT EXISTS precio_metal_capturado_idx ON precio_metal (capturado_at DESC);

-- Eventos del sistema (errores del chat, fallas del cron de precios). Alimentan las alertas
-- por correo y el estado que muestra el panel. Sin datos personales.
CREATE TABLE IF NOT EXISTS evento_sistema (
  id            BIGSERIAL PRIMARY KEY,
  creado_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo          TEXT        NOT NULL,   -- saldo_anthropic | llave_anthropic | limite_anthropic | error_chat | chat_caido | precios_fallo | precios_viejos
  nivel         TEXT        NOT NULL,   -- critico | aviso
  detalle       TEXT        NOT NULL DEFAULT '',
  notificado_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS evento_sistema_creado_idx ON evento_sistema (creado_at DESC);
CREATE INDEX IF NOT EXISTS evento_sistema_tipo_idx ON evento_sistema (tipo, creado_at DESC);

-- Contadores de uso por ventana fija, para frenar abuso aunque haya varias instancias.
-- La clave lleva un hash de la IP, nunca la IP.
CREATE TABLE IF NOT EXISTS limite_uso (
  clave   TEXT        NOT NULL,
  ventana TIMESTAMPTZ NOT NULL,
  n       INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY (clave, ventana)
);

-- Conversaciones anónimas del chat, para medir el embudo (interacciones → conversiones).
-- No guarda texto ni datos personales: solo conteos y banderas.
CREATE TABLE IF NOT EXISTS conversacion (
  id              TEXT        PRIMARY KEY,           -- id aleatorio que genera el widget
  creado_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  fuente          JSONB       NOT NULL DEFAULT '{}'::jsonb,
  turnos          INTEGER     NOT NULL DEFAULT 0,
  fotos           INTEGER     NOT NULL DEFAULT 0,
  herramientas    TEXT[]      NOT NULL DEFAULT '{}',
  cotizo          BOOLEAN     NOT NULL DEFAULT false, -- usó cotizar_traspaso
  avanzo          BOOLEAN     NOT NULL DEFAULT false, -- la cotización dio "avanza"
  fuera_de_tema   INTEGER     NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS conversacion_creado_idx ON conversacion (creado_at DESC);

ALTER TABLE lead ADD COLUMN IF NOT EXISTS conversacion_id TEXT;

-- Silencio atómico de alertas: una fila por tipo; solo quien logra actualizarla envía el correo.
CREATE TABLE IF NOT EXISTS alerta_silencio (
  tipo      TEXT        PRIMARY KEY,
  ultimo_at TIMESTAMPTZ NOT NULL
);

-- Fase 4: agenda de citas y cierre del embudo hasta el dinero.
ALTER TABLE lead ADD COLUMN IF NOT EXISTS casa_destino    TEXT;
ALTER TABLE lead ADD COLUMN IF NOT EXISTS comision_mxn    NUMERIC(12,2);
ALTER TABLE lead ADD COLUMN IF NOT EXISTS motivo_descarte TEXT;
ALTER TABLE lead ADD COLUMN IF NOT EXISTS asesor          TEXT;
ALTER TABLE lead ADD COLUMN IF NOT EXISTS cerrado_at      TIMESTAMPTZ;  -- switcheo concretado
CREATE INDEX IF NOT EXISTS lead_conversacion_idx ON lead (conversacion_id);
CREATE INDEX IF NOT EXISTS lead_etapa_idx ON lead (etapa);

-- Una cita activa por lead. El cupo por horario lo controla lib/agenda/repo.js (CITA_CAPACIDAD).
CREATE TABLE IF NOT EXISTS cita (
  id          BIGSERIAL PRIMARY KEY,
  lead_codigo TEXT        NOT NULL REFERENCES lead (codigo) ON DELETE CASCADE,
  inicio      TIMESTAMPTZ NOT NULL,
  estado      TEXT        NOT NULL DEFAULT 'reservada', -- reservada | confirmada | atendida | cancelada | no_asistio
  lugar       TEXT        NOT NULL DEFAULT 'Por confirmar',
  creado_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- (El índice único por horario de la fase 4 se quitó en la 4.1: el cupo lo cuida la reserva.
--  No volver a crearlo aquí: con varias llamadas por franja, la migración fallaría.)
CREATE UNIQUE INDEX IF NOT EXISTS cita_lead_activa_idx ON cita (lead_codigo) WHERE estado IN ('reservada', 'confirmada');
CREATE INDEX IF NOT EXISTS cita_inicio_idx ON cita (inicio);

-- Costo de IA por conversación (USD), para costo por lead y por switcheo.
ALTER TABLE conversacion ADD COLUMN IF NOT EXISTS costo_usd NUMERIC(10,5) NOT NULL DEFAULT 0;

-- Gasto de publicidad capturado a mano por campaña.
CREATE TABLE IF NOT EXISTS gasto_campana (
  id           BIGSERIAL PRIMARY KEY,
  fecha        DATE        NOT NULL,
  utm_campaign TEXT        NOT NULL,
  monto_mxn    NUMERIC(12,2) NOT NULL CHECK (monto_mxn >= 0),
  nota         TEXT,
  creado_por   TEXT,
  creado_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bitácora del panel: quién cambió qué.
CREATE TABLE IF NOT EXISTS bitacora_panel (
  id        BIGSERIAL PRIMARY KEY,
  creado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario   TEXT        NOT NULL,
  accion    TEXT        NOT NULL,   -- lead_actualizado | cita_actualizada | csv_descargado | gasto_capturado
  objetivo  TEXT,
  detalle   JSONB       NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS bitacora_panel_creado_idx ON bitacora_panel (creado_at DESC);

-- Fase 4.1 (QA de la agenda):
-- · Capacidad por número de asesores (CITA_CAPACIDAD): el cupo lo cuida la reserva con un candado
--   por horario, así que el índice único por horario sale.
-- · tipo 'llamada': la persona deja día y franja y el asesor le llama para acordar cita (modo por
--   defecto mientras no haya local ni línea de WhatsApp activa).
-- · estado 'expirada': reservas no confirmadas que ya pasaron o que nadie confirmó a tiempo.
DROP INDEX IF EXISTS cita_horario_activo_idx;
ALTER TABLE cita ADD COLUMN IF NOT EXISTS tipo   TEXT NOT NULL DEFAULT 'cita';   -- cita | llamada
ALTER TABLE cita ADD COLUMN IF NOT EXISTS franja TEXT;                          -- manana | tarde (solo llamada)
CREATE INDEX IF NOT EXISTS cita_activa_inicio_idx ON cita (inicio) WHERE estado IN ('reservada', 'confirmada');

-- Comisión: fecha de cobro propia (el mes de la comisión no es el del cierre) y última actividad
-- del lead (la retención cuenta desde ahí).
ALTER TABLE lead ADD COLUMN IF NOT EXISTS cobrado_at     TIMESTAMPTZ;
ALTER TABLE lead ADD COLUMN IF NOT EXISTS actualizado_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS lead_telefono_idx ON lead (telefono) WHERE telefono IS NOT NULL;

-- Fase 4.2 (QA final): el reloj de confirmación empieza al apartar o reprogramar, no al crear la
-- fila (una llamada convertida en cita no debe expirar por la antigüedad de la llamada).
ALTER TABLE cita ADD COLUMN IF NOT EXISTS apartada_at TIMESTAMPTZ;
UPDATE cita SET apartada_at = creado_at WHERE apartada_at IS NULL;
ALTER TABLE cita ALTER COLUMN apartada_at SET DEFAULT now();

-- ============================================================================================
-- CRM (app crm/, admin.casa-ap.com). Mismas tablas del sitio más las de seguimiento.
-- ============================================================================================

-- Contacto y seguimiento del lead.
ALTER TABLE lead ADD COLUMN IF NOT EXISTS email                  TEXT;          -- opcional, con consentimiento
ALTER TABLE lead ADD COLUMN IF NOT EXISTS ultimo_contacto_at     TIMESTAMPTZ;   -- último mensaje o llamada nuestra
ALTER TABLE lead ADD COLUMN IF NOT EXISTS ultima_respuesta_at    TIMESTAMPTZ;   -- última vez que la persona respondió
ALTER TABLE lead ADD COLUMN IF NOT EXISTS seguimiento_paso       SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE lead ADD COLUMN IF NOT EXISTS proximo_seguimiento_at TIMESTAMPTZ;
ALTER TABLE lead ADD COLUMN IF NOT EXISTS no_contactar_at        TIMESTAMPTZ;   -- pidió no recibir más mensajes
ALTER TABLE lead ADD COLUMN IF NOT EXISTS baja_token             TEXT;          -- para el link "no quiero más correos"
-- Clasificación: la vigente (regla, IA aprobada o humano) y la sugerencia pendiente de aprobar.
ALTER TABLE lead ADD COLUMN IF NOT EXISTS clasificacion            TEXT;        -- aplica_auto | revision | no_aplica | taller
ALTER TABLE lead ADD COLUMN IF NOT EXISTS clasificacion_fuente     TEXT;        -- regla | ia | humano
ALTER TABLE lead ADD COLUMN IF NOT EXISTS clasificacion_motivo     TEXT;
ALTER TABLE lead ADD COLUMN IF NOT EXISTS clasificacion_at         TIMESTAMPTZ;
ALTER TABLE lead ADD COLUMN IF NOT EXISTS sugerencia               JSONB;       -- {clasificacion, motivo, confianza, fuente}
ALTER TABLE lead ADD COLUMN IF NOT EXISTS revision_pendiente       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE lead ADD COLUMN IF NOT EXISTS perfil_ia                JSONB;       -- urgencia, pieza, siguiente paso…
ALTER TABLE lead ADD COLUMN IF NOT EXISTS propension_taller        SMALLINT;    -- 0-100
ALTER TABLE lead ADD COLUMN IF NOT EXISTS traspaso                 JSONB NOT NULL DEFAULT '{}'::jsonb; -- checklist del cambio
CREATE INDEX IF NOT EXISTS lead_revision_idx ON lead (revision_pendiente) WHERE revision_pendiente;
CREATE INDEX IF NOT EXISTS lead_seguimiento_idx ON lead (proximo_seguimiento_at) WHERE proximo_seguimiento_at IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS lead_baja_token_idx ON lead (baja_token) WHERE baja_token IS NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lead_email_con_consentimiento') THEN
    ALTER TABLE lead ADD CONSTRAINT lead_email_con_consentimiento CHECK (email IS NULL OR consent_at IS NOT NULL);
  END IF;
END $$;

-- Historial de todo lo que pasa con un lead (contactos, respuestas, cambios, correos).
CREATE TABLE IF NOT EXISTS lead_evento (
  id          BIGSERIAL PRIMARY KEY,
  lead_codigo TEXT        NOT NULL REFERENCES lead (codigo) ON DELETE CASCADE,
  creado_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo        TEXT        NOT NULL,  -- ver lib/crm/eventos.js
  canal       TEXT,                  -- whatsapp | llamada | correo | sistema | chat
  usuario     TEXT,                  -- quién (null = sistema)
  detalle     JSONB       NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS lead_evento_lead_idx ON lead_evento (lead_codigo, creado_at DESC);

-- Tareas del equipo (WhatsApp por mandar, llamadas, revisiones).
CREATE TABLE IF NOT EXISTS crm_tarea (
  id          BIGSERIAL PRIMARY KEY,
  lead_codigo TEXT        NOT NULL REFERENCES lead (codigo) ON DELETE CASCADE,
  tipo        TEXT        NOT NULL,  -- whatsapp | llamar | revisar | confirmar_cita
  titulo      TEXT        NOT NULL,
  vence_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  creado_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  hecha_at    TIMESTAMPTZ,
  hecha_por   TEXT,
  detalle     JSONB       NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS crm_tarea_abierta_idx ON crm_tarea (vence_at) WHERE hecha_at IS NULL;
DROP INDEX IF EXISTS crm_tarea_unica_idx;
-- Una tarea abierta por lead, tipo y plantilla (primer contacto y oferta de taller conviven).
CREATE UNIQUE INDEX IF NOT EXISTS crm_tarea_abierta_unica_idx ON crm_tarea (lead_codigo, tipo, (coalesce(detalle->>'plantilla', ''))) WHERE hecha_at IS NULL;

-- Usuarios del CRM y tokens para el servidor MCP.
CREATE TABLE IF NOT EXISTS crm_usuario (
  usuario     TEXT        PRIMARY KEY,
  nombre      TEXT        NOT NULL,
  rol         TEXT        NOT NULL DEFAULT 'asesor', -- dueno | asesor
  sal         TEXT        NOT NULL,
  hash        TEXT        NOT NULL,                  -- PBKDF2-SHA256, 210 000 iteraciones
  activo      BOOLEAN     NOT NULL DEFAULT true,
  creado_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  acceso_at   TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS crm_token (
  id          BIGSERIAL PRIMARY KEY,
  usuario     TEXT        NOT NULL REFERENCES crm_usuario (usuario) ON DELETE CASCADE,
  nombre      TEXT        NOT NULL,
  hash        TEXT        NOT NULL UNIQUE,           -- sha256 del token; el token solo se muestra una vez
  creado_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  vence_at    TIMESTAMPTZ NOT NULL,
  usado_at    TIMESTAMPTZ,
  revocado_at TIMESTAMPTZ
);

-- Visitas anónimas a la página (tráfico): sin IP ni datos personales.
CREATE TABLE IF NOT EXISTS visita (
  id        BIGSERIAL PRIMARY KEY,
  creado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sesion    TEXT        NOT NULL,   -- id aleatorio por pestaña
  path      TEXT        NOT NULL,
  fuente    JSONB       NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS visita_creado_idx ON visita (creado_at DESC);
ALTER TABLE lead ADD COLUMN IF NOT EXISTS esperando_respuesta_desde TIMESTAMPTZ; -- primer contacto nuestro sin respuesta

-- CRM 1.1 (comité): asignación a un asesor del CRM, cobro con método y retención ARCO.
ALTER TABLE lead ADD COLUMN IF NOT EXISTS asesor_usuario TEXT;   -- usuario de crm_usuario a cargo
ALTER TABLE lead ADD COLUMN IF NOT EXISTS cobro_metodo   TEXT;   -- efectivo | transferencia | tarjeta | otro
CREATE INDEX IF NOT EXISTS lead_asesor_usuario_idx ON lead (asesor_usuario) WHERE asesor_usuario IS NOT NULL;
ALTER TABLE crm_usuario ADD COLUMN IF NOT EXISTS asignado_at TIMESTAMPTZ; -- último lead asignado (reparto por turnos)
ALTER TABLE crm_usuario ADD COLUMN IF NOT EXISTS recibe_leads BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE lead ADD COLUMN IF NOT EXISTS ia_intentado_at    TIMESTAMPTZ;  -- último intento de clasificar con IA
ALTER TABLE lead ADD COLUMN IF NOT EXISTS ia_intentos        SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE lead ADD COLUMN IF NOT EXISTS email_confirmado_at TIMESTAMPTZ; -- confirmó su correo: recibe recordatorios por correo
CREATE INDEX IF NOT EXISTS cita_lead_creado_idx ON cita (lead_codigo, creado_at DESC);
CREATE INDEX IF NOT EXISTS lead_consent_idx ON lead (consent_at) WHERE consent_at IS NOT NULL;
-- Leads que dejaron datos antes del CRM (26-sep-2026): no entran al seguimiento automático;
-- el equipo los atiende desde la bandeja. Solo afecta filas anteriores a esa fecha.
UPDATE lead SET seguimiento_paso = 4
 WHERE seguimiento_paso = 0 AND consent_at IS NOT NULL AND consent_at < '2026-09-26T20:00:00Z';
