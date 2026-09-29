-- TutorIngles — migración 24: dos idiomas (inglés y francés) y el modo Tetris.
--
-- Idempotente. Aplicar como `postgres` (las tablas son suyas):
--   docker exec -i postgres psql -U postgres -d tutoringles -v ON_ERROR_STOP=1 < migration_24_idiomas_y_tetris.sql
--
-- Contexto (27-sep-2026): Edwin se va a trabajar a un cantón francófono de
-- Suiza en torno a un mes. El francés pasa a ser lo primero (A2, entiende mucho
-- más de lo que es capaz de decir) y el inglés sigue en paralelo (B1) camino
-- del C1. Los dos objetivos son el C1 de cada idioma: DALF C1 y Cambridge C1.
--
-- Decisión de diseño: el francés NO es una app aparte. Va en las mismas tablas
-- con una columna `lang`, para que el SRS, la sesión de 5 minutos, TRABAJO y
-- HABLAR sirvan para los dos idiomas sin duplicar nada. El idioma activo se
-- guarda en `config.idioma_activo` y todas las consultas de contenido filtran
-- por él.
--
-- Y el modo Tetris: estudio intensivo de día, repaso justo antes de dormir y,
-- ya dormido, pistas de audio de lo estudiado ese día (reactivación dirigida de
-- la memoria, TMR). Con una parte de las palabras de control que NO suena por la
-- noche, para que el test de la mañana diga si a él le funciona o no.

BEGIN;

-- ─────────────────────────────────────────────────────────
-- 1. Idioma del contenido
-- ─────────────────────────────────────────────────────────
-- Todo lo que ya existe es inglés: el DEFAULT 'en' deja los datos como estaban.
ALTER TABLE words          ADD COLUMN IF NOT EXISTS lang VARCHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE tracks         ADD COLUMN IF NOT EXISTS lang VARCHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE grammar_topics ADD COLUMN IF NOT EXISTS lang VARCHAR(2) NOT NULL DEFAULT 'en';

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['words','tracks','grammar_topics'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_lang_check') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (lang IN (''en'',''fr''))',
                     t, t || '_lang_check');
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS words_lang_idx ON words(lang);

-- Dos categorías nuevas para el francés:
--   'suisse' → lo que sólo se dice así en la Suiza romanda (septante, natel,
--              souper…). Saberlo es la diferencia entre entender y no entender
--              a tu jefe el primer día.
--   'chunk'  → frases de rescate para PRODUCIR: pedir ayuda, reformular, ganar
--              tiempo. Es el hueco exacto de un A2 que entiende pero no se
--              explica.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'words_category_check') THEN
    ALTER TABLE words DROP CONSTRAINT words_category_check;
  END IF;
  ALTER TABLE words ADD CONSTRAINT words_category_check CHECK (category IN (
    'general','business','academic','phrasal','idiom','work','suisse','chunk'));
END $$;

-- ─────────────────────────────────────────────────────────
-- 2. Ajustes
-- ─────────────────────────────────────────────────────────
-- El francés arranca como idioma activo porque es lo que pidió: "el francés es
-- primordial". Se cambia con un toque en la cabecera.
INSERT INTO config (key, value) VALUES
  ('idioma_activo',        'fr'),
  ('tetris_activo',        '1'),
  -- Rondas de 5 minutos al día. Seis son media hora repartida en huecos.
  ('tetris_rondas',        '6'),
  -- Avisos del modo Tetris: el test del despertar y el repaso de almohada.
  ('tetris_hora_manana',   '08:00'),
  ('tetris_hora_almohada', '22:30'),
  -- Modo noche. Espera antes de la primera pista (lo que tarda en dormirse),
  -- cuánto dura el tramo con pistas (el primer tercio de la noche es el de
  -- sueño profundo) y cada cuántos segundos suena una.
  ('noche_espera_min',     '30'),
  ('noche_duracion_min',   '90'),
  ('noche_intervalo_s',    '6')
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 3. El día Tetris
-- ─────────────────────────────────────────────────────────
-- Un día de estudio va de 05:00 a 05:00, no de medianoche a medianoche: quien
-- repasa a las 00:30 y se duerme a la 01:00 sigue en SU día, y la noche tiene
-- que tirar de lo que estudió esa tarde. Lo calcula lib/tetris.js.
CREATE TABLE IF NOT EXISTS tetris_dias (
  profile_id  INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(id) ON DELETE CASCADE,
  fecha       DATE NOT NULL,
  lang        VARCHAR(2) NOT NULL,
  rondas      INTEGER NOT NULL DEFAULT 0,
  almohada_at TIMESTAMPTZ,                   -- repaso de antes de dormir hecho
  PRIMARY KEY (profile_id, fecha, lang)
);

-- Una noche con pistas. `pistas` las cuenta el móvil al sonar de verdad: si se
-- bloqueó la pantalla y no sonó nada, la noche se queda con 0 y NO entra en la
-- comparación de la mañana. Una noche sin pistas contada como noche con pistas
-- falsearía justo el dato que decide si esto sirve.
CREATE TABLE IF NOT EXISTS noches (
  id         SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(id) ON DELETE CASCADE,
  fecha      DATE NOT NULL,                  -- el día de estudio del que tira
  lang       VARCHAR(2) NOT NULL,
  empezada   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  terminada  TIMESTAMPTZ,
  pistas     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (profile_id, fecha, lang)
);

-- Qué palabras sonaron (con_pista) y cuáles se guardaron de control, y cómo
-- salieron en el test del despertar: 0 no salía · 1 con dudas · 2 a la primera.
CREATE TABLE IF NOT EXISTS noche_palabras (
  noche_id     INTEGER NOT NULL REFERENCES noches(id) ON DELETE CASCADE,
  user_word_id INTEGER NOT NULL REFERENCES user_words(id) ON DELETE CASCADE,
  con_pista    BOOLEAN NOT NULL,
  recordada    SMALLINT CHECK (recordada BETWEEN 0 AND 2),
  probada_at   TIMESTAMPTZ,
  PRIMARY KEY (noche_id, user_word_id)
);

-- El repaso del día (rondas y noche) filtra review_log por fecha; sin índice
-- por perfil y momento eso es un recorrido entero de la tabla en cada ronda.
CREATE INDEX IF NOT EXISTS review_log_profile_at_idx ON review_log(profile_id, reviewed_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "tutoringles";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "tutoringles";

COMMIT;

-- Comprobación:
--   SELECT lang, count(*) FROM words GROUP BY lang;
--   SELECT key, value FROM config WHERE key LIKE 'tetris_%' OR key LIKE 'noche_%' OR key = 'idioma_activo';
