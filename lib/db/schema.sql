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
