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

-- Una cita por lead; un horario solo puede tener una cita activa (capacidad 1: un asesor).
CREATE TABLE IF NOT EXISTS cita (
  id          BIGSERIAL PRIMARY KEY,
  lead_codigo TEXT        NOT NULL REFERENCES lead (codigo) ON DELETE CASCADE,
  inicio      TIMESTAMPTZ NOT NULL,
  estado      TEXT        NOT NULL DEFAULT 'reservada', -- reservada | confirmada | atendida | cancelada | no_asistio
  lugar       TEXT        NOT NULL DEFAULT 'Por confirmar',
  creado_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cita_horario_activo_idx ON cita (inicio) WHERE estado IN ('reservada', 'confirmada');
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
