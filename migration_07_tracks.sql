-- TutorIngles · Migration 07 — SECTORES, SITUACIONES Y PERFILES
--
-- Añade el "carril diario": el inglés que necesitas en tu trabajo, organizado por
-- sector (track) y por situación real, no por nivel teórico.
--
-- De paso deja el esquema preparado para varios usuarios sin romper nada:
-- todo el progreso pasa a colgar de profile_id, con el perfil 1 por defecto.
--
-- Aplicar:
--   docker exec -i postgres psql -U postgres -d tutoringles < migration_07_tracks.sql
--
-- Idempotente: se puede reejecutar.

BEGIN;

-- ══════════════════════ PERFILES ══════════════════════
-- Un perfil = una persona aprendiendo. De momento solo existe el 1.
CREATE TABLE IF NOT EXISTS profiles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(80)  NOT NULL DEFAULT 'Stark',
  track_id    INTEGER,                                  -- sector activo (FK más abajo)
  goal        VARCHAR(10)  NOT NULL DEFAULT 'both'
              CHECK (goal IN ('daily','c1','both')),    -- qué persigue: día a día, título, o ambos
  level       VARCHAR(4)   NOT NULL DEFAULT 'B1'
              CHECK (level IN ('A2','B1','B2','C1')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Perfil por defecto (id = 1)
INSERT INTO profiles (id, name, goal)
VALUES (1, 'Stark', 'both')
ON CONFLICT (id) DO NOTHING;

-- Que el SERIAL no choque con el id fijado a mano
SELECT setval('profiles_id_seq', GREATEST((SELECT MAX(id) FROM profiles), 1));

-- ══════════════════════ SECTORES ══════════════════════
CREATE TABLE IF NOT EXISTS tracks (
  id           SERIAL PRIMARY KEY,
  slug         VARCHAR(40)  NOT NULL UNIQUE,   -- 'retail', 'hospitality'…
  name         VARCHAR(120) NOT NULL,          -- 'Dependiente / tienda'
  icon         VARCHAR(32)  DEFAULT 'work',   -- nombre de un icono de src/img/icons, no un emoji
  description  TEXT,
  order_index  INTEGER      NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- FK de profiles.track_id → tracks.id (se añade aquí porque tracks no existía antes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_track_id_fkey'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_track_id_fkey
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ══════════════════════ SITUACIONES ══════════════════════
-- Una situación es un momento concreto que vives: "el cliente quiere otra talla".
CREATE TABLE IF NOT EXISTS situations (
  id           SERIAL PRIMARY KEY,
  track_id     INTEGER      NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  slug         VARCHAR(60)  NOT NULL,
  title_es     VARCHAR(200) NOT NULL,          -- cómo la llamas tú
  title_en     VARCHAR(200) NOT NULL,          -- cómo se llama en inglés
  context_es   TEXT,                           -- cuándo pasa y qué se espera de ti
  level        VARCHAR(4)   NOT NULL DEFAULT 'A2'
               CHECK (level IN ('A2','B1','B2','C1')),
  order_index  INTEGER      NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (track_id, slug)
);
CREATE INDEX IF NOT EXISTS situations_track_idx ON situations(track_id, order_index);

-- ══════════════════════ FRASES Y DIÁLOGO ══════════════════════
-- kind:
--   'key'      → frase clave que debes saber decir (van al SRS y a pronunciación)
--   'customer' → turno del cliente en el role-play
--   'you'      → tu turno en el role-play
CREATE TABLE IF NOT EXISTS situation_lines (
  id            SERIAL PRIMARY KEY,
  situation_id  INTEGER     NOT NULL REFERENCES situations(id) ON DELETE CASCADE,
  kind          VARCHAR(10) NOT NULL CHECK (kind IN ('key','customer','you')),
  en            TEXT        NOT NULL,
  es            TEXT        NOT NULL,
  note          TEXT,                           -- registro, aviso de pronunciación, falso amigo…
  order_index   INTEGER     NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS situation_lines_sit_idx ON situation_lines(situation_id, kind, order_index);

-- ══════════════════════ PROGRESO POR SITUACIÓN ══════════════════════
CREATE TABLE IF NOT EXISTS situation_progress (
  id                SERIAL PRIMARY KEY,
  profile_id        INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(id) ON DELETE CASCADE,
  situation_id      INTEGER NOT NULL REFERENCES situations(id) ON DELETE CASCADE,
  practiced_count   INTEGER NOT NULL DEFAULT 0,
  best_score        INTEGER CHECK (best_score BETWEEN 0 AND 100),
  completed         BOOLEAN NOT NULL DEFAULT FALSE,
  last_practiced_at TIMESTAMPTZ,
  UNIQUE (profile_id, situation_id)
);

-- ══════════════════════ VOCABULARIO POR SECTOR ══════════════════════
-- Las palabras pueden colgar de un sector; las que no, son de uso general.
ALTER TABLE words ADD COLUMN IF NOT EXISTS track_id INTEGER REFERENCES tracks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS words_track_idx ON words(track_id);

-- Ampliar las categorías permitidas con 'work' (vocabulario de oficio)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'words_category_check') THEN
    ALTER TABLE words DROP CONSTRAINT words_category_check;
  END IF;
  ALTER TABLE words ADD CONSTRAINT words_category_check
    CHECK (category IN ('general','business','academic','phrasal','idiom','work'));
END $$;

-- ══════════════════════ MULTIUSUARIO: profile_id EN TODO EL PROGRESO ══════════════════════
-- Se añade con DEFAULT 1 para que los datos existentes queden en el perfil actual.
-- Añadir un segundo usuario más adelante será enchufar la auth, no migrar el esquema.

ALTER TABLE user_words        ADD COLUMN IF NOT EXISTS profile_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE grammar_progress  ADD COLUMN IF NOT EXISTS profile_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE study_sessions    ADD COLUMN IF NOT EXISTS profile_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE daily_goals       ADD COLUMN IF NOT EXISTS profile_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE speaking_practice ADD COLUMN IF NOT EXISTS profile_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE exam_attempts     ADD COLUMN IF NOT EXISTS profile_id INTEGER NOT NULL DEFAULT 1;

-- FKs hacia profiles
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['user_words','grammar_progress','study_sessions',
                           'daily_goals','speaking_practice','exam_attempts']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_profile_id_fkey') THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (profile_id)
         REFERENCES profiles(id) ON DELETE CASCADE',
        t, t || '_profile_id_fkey');
    END IF;
  END LOOP;
END $$;

-- Los índices únicos pasan a ser por perfil: dos personas pueden tener
-- progreso distinto sobre la misma palabra, tema o día.
DO $$
BEGIN
  -- user_words: UNIQUE(word_id) → UNIQUE(profile_id, word_id)
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_words_word_id_key') THEN
    ALTER TABLE user_words DROP CONSTRAINT user_words_word_id_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_words_profile_word_key') THEN
    ALTER TABLE user_words ADD CONSTRAINT user_words_profile_word_key UNIQUE (profile_id, word_id);
  END IF;

  -- grammar_progress: UNIQUE(topic_id) → UNIQUE(profile_id, topic_id)
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grammar_progress_topic_id_key') THEN
    ALTER TABLE grammar_progress DROP CONSTRAINT grammar_progress_topic_id_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grammar_progress_profile_topic_key') THEN
    ALTER TABLE grammar_progress ADD CONSTRAINT grammar_progress_profile_topic_key UNIQUE (profile_id, topic_id);
  END IF;

  -- daily_goals: UNIQUE(date) → UNIQUE(profile_id, date)
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_goals_date_key') THEN
    ALTER TABLE daily_goals DROP CONSTRAINT daily_goals_date_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_goals_profile_date_key') THEN
    ALTER TABLE daily_goals ADD CONSTRAINT daily_goals_profile_date_key UNIQUE (profile_id, date);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS user_words_profile_idx     ON user_words(profile_id, next_review_date);
CREATE INDEX IF NOT EXISTS study_sessions_profile_idx ON study_sessions(profile_id, date);

COMMIT;
