-- TutorIngles — migración 34: la IA (API de Claude)
-- 23-oct-2026. Idempotente: se puede pasar dos veces sin romper nada.
--
--  1. ia_uso: cada llamada a Claude, con sus tokens y lo que ha costado. De aquí
--     sale el gasto del mes y el tope (config.ia_tope_mes), que es lo que impide
--     que un bucle o un mal día vacíen el crédito.
--  2. ia_errores: el perfil del alumno. Los errores que la IA encuentra, con una
--     clave estable y cuántas veces se han repetido. Es lo que hace que la
--     corrección se adapte, y los repetidos se convierten en tarjetas del SRS
--     (word_id apunta a la tarjeta, si la hay).
--  3. speaking_submissions: las tareas orales no se guardaban en ninguna parte
--     (sólo había un cronómetro). Ahora se guarda la transcripción y la
--     corrección.
--  4. writing_submissions.ia_feedback: la corrección de la IA junto al texto.
--  5. La categoría 'errores' en words, para las tarjetas que salen de errores
--     repetidos. Es neutra a propósito: lib/fases.js no la cuenta en ninguna
--     fase del francés, así que no infla los objetivos.
--  6. Ajustes por defecto: modelo, tope mensual y crédito inicial.

BEGIN;

CREATE TABLE IF NOT EXISTS ia_uso (
  id              SERIAL PRIMARY KEY,
  profile_id      INT NOT NULL DEFAULT 1,
  creado          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mes             CHAR(7) NOT NULL,              -- 'AAAA-MM' en la zona del usuario
  funcion         VARCHAR(20) NOT NULL,          -- pronunciacion, conversacion, escritura, oral, consejo, prueba
  lang            VARCHAR(2),
  modelo          VARCHAR(40) NOT NULL,
  servido_por     VARCHAR(40),
  tokens_entrada  INT NOT NULL DEFAULT 0,
  tokens_salida   INT NOT NULL DEFAULT 0,
  cache_leida     INT NOT NULL DEFAULT 0,
  cache_escrita   INT NOT NULL DEFAULT 0,
  coste_usd       NUMERIC(10,6) NOT NULL DEFAULT 0,
  ok              BOOLEAN NOT NULL,
  error           VARCHAR(40)
);
CREATE INDEX IF NOT EXISTS ia_uso_mes_idx ON ia_uso (profile_id, mes);

CREATE TABLE IF NOT EXISTS ia_errores (
  id           SERIAL PRIMARY KEY,
  profile_id   INT NOT NULL DEFAULT 1,
  lang         VARCHAR(2) NOT NULL CHECK (lang IN ('en','fr')),
  tipo         VARCHAR(20) NOT NULL CHECK (tipo IN ('pronunciacion','gramatica','vocabulario','ortografia','registro')),
  clave        VARCHAR(120) NOT NULL,
  mal          TEXT,
  bien         TEXT,
  traduccion   TEXT,
  explicacion  TEXT,
  origen       VARCHAR(20),                       -- la función que lo vio por última vez
  veces        INT NOT NULL DEFAULT 1,
  primera      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultima       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  word_id      INT REFERENCES words(id) ON DELETE SET NULL,
  superado     BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (profile_id, lang, tipo, clave)
);
CREATE INDEX IF NOT EXISTS ia_errores_lang_idx ON ia_errores (profile_id, lang, superado, veces DESC);

CREATE TABLE IF NOT EXISTS speaking_submissions (
  id              SERIAL PRIMARY KEY,
  profile_id      INT NOT NULL DEFAULT 1,
  task_id         INT NOT NULL REFERENCES speaking_tasks(id) ON DELETE CASCADE,
  lang            VARCHAR(2) NOT NULL CHECK (lang IN ('en','fr')),
  transcript      TEXT NOT NULL,
  segundos        INT,
  via             VARCHAR(10),                   -- 'voz' (reconocedor) o 'texto' (dictado o escrito)
  gramatica       SMALLINT CHECK (gramatica BETWEEN 0 AND 5),
  lexico          SMALLINT CHECK (lexico BETWEEN 0 AND 5),
  discurso        SMALLINT CHECK (discurso BETWEEN 0 AND 5),
  tarea           SMALLINT CHECK (tarea BETWEEN 0 AND 5),
  nivel_estimado  VARCHAR(2),
  ia_feedback     JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS speaking_submissions_idx ON speaking_submissions (profile_id, lang, created_at DESC);

ALTER TABLE writing_submissions ADD COLUMN IF NOT EXISTS ia_feedback JSONB;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'words_category_check') THEN
    ALTER TABLE words DROP CONSTRAINT words_category_check;
  END IF;
  ALTER TABLE words ADD CONSTRAINT words_category_check CHECK (category IN (
    'general','business','academic','phrasal','idiom','work','suisse','chunk','errores'));
END $$;

INSERT INTO config (key, value) VALUES
  ('ia_modelo',   'claude-opus-5-5'),
  ('ia_tope_mes', '15'),
  ('ia_credito',  '100')
ON CONFLICT (key) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON ia_uso, ia_errores, speaking_submissions TO "tutoringles";
GRANT USAGE, SELECT ON SEQUENCE ia_uso_id_seq, ia_errores_id_seq, speaking_submissions_id_seq TO "tutoringles";

COMMIT;
