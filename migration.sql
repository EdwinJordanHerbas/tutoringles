-- TutorIngles · Migration
-- Ejecutar en el servidor:
-- psql -U <usuario> -d tutoringles -f migration.sql

-- ── VOCABULARIO (SRS tipo Anki) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS words (
  id               SERIAL PRIMARY KEY,
  word             VARCHAR(200) NOT NULL,           -- palabra en inglés
  translation      VARCHAR(400) NOT NULL,           -- traducción al español
  example_sentence TEXT,                            -- frase de ejemplo
  level            VARCHAR(4) NOT NULL DEFAULT 'B1' CHECK (level IN ('A2','B1','B2','C1')),
  category         VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (category IN ('general','business','academic','phrasal','idiom')),
  audio_hint       TEXT,                            -- pronunciación fonética o pista de audio
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_words (
  id               SERIAL PRIMARY KEY,
  word_id          INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  status           VARCHAR(10) NOT NULL DEFAULT 'new' CHECK (status IN ('new','learning','review','mastered')),
  ease_factor      NUMERIC(4,2) DEFAULT 2.5,        -- factor de facilidad SRS (estilo SM-2)
  interval_days    INTEGER DEFAULT 1,               -- próximo intervalo en días
  next_review_date DATE DEFAULT CURRENT_DATE,
  times_correct    INTEGER DEFAULT 0,
  times_wrong      INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (word_id)
);

CREATE INDEX IF NOT EXISTS user_words_next_review_idx ON user_words(next_review_date);
CREATE INDEX IF NOT EXISTS user_words_status_idx      ON user_words(status);

-- ── GRAMÁTICA ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grammar_topics (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  level        VARCHAR(4) NOT NULL DEFAULT 'B1' CHECK (level IN ('B1','B2','C1')),
  description  TEXT,
  order_index  INTEGER DEFAULT 0,
  content_html TEXT                                 -- contenido de la lección en HTML
);

CREATE TABLE IF NOT EXISTS grammar_progress (
  id           SERIAL PRIMARY KEY,
  topic_id     INTEGER NOT NULL REFERENCES grammar_topics(id) ON DELETE CASCADE,
  completed    BOOLEAN DEFAULT FALSE,
  score        INTEGER CHECK (score >= 0 AND score <= 100),
  completed_at TIMESTAMPTZ,
  UNIQUE (topic_id)
);

-- ── SESIONES DE ESTUDIO ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_sessions (
  id               SERIAL PRIMARY KEY,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  type             VARCHAR(10) NOT NULL CHECK (type IN ('vocab','grammar','speaking','reading','exam')),
  duration_minutes INTEGER DEFAULT 0,
  score            INTEGER CHECK (score >= 0 AND score <= 100),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_goals (
  id             SERIAL PRIMARY KEY,
  date           DATE NOT NULL UNIQUE,
  vocab_target   INTEGER DEFAULT 20,               -- palabras a repasar hoy
  vocab_done     INTEGER DEFAULT 0,
  grammar_done   BOOLEAN DEFAULT FALSE,
  speaking_done  BOOLEAN DEFAULT FALSE,
  streak         INTEGER DEFAULT 0                 -- racha de días consecutivos
);

-- ── SPEAKING ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS speaking_practice (
  id              SERIAL PRIMARY KEY,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  phrase_en       TEXT NOT NULL,                   -- frase propuesta
  user_transcript TEXT,                            -- lo que dijo el usuario
  score           INTEGER CHECK (score >= 0 AND score <= 100),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── SIMULACROS CAMBRIDGE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_attempts (
  id         SERIAL PRIMARY KEY,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  section    VARCHAR(10) NOT NULL CHECK (section IN ('reading','writing','listening','speaking')),
  score      INTEGER NOT NULL,
  max_score  INTEGER NOT NULL DEFAULT 100,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CONFIGURACIÓN ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS config (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT
);

-- Valores por defecto de configuración
INSERT INTO config (key, value) VALUES
  ('user_level',        'B1'),
  ('target_exam_date',  '2026-12-01'),
  ('daily_vocab_target','20'),
  ('xp_total',          '0'),
  ('streak_max',        '0')
ON CONFLICT (key) DO NOTHING;

-- ── TEMAS DE GRAMÁTICA DE EJEMPLO ───────────────────────────────
INSERT INTO grammar_topics (title, level, description, order_index) VALUES
  ('Present Perfect vs Past Simple',  'B1', 'Diferencias clave y usos en contexto Cambridge', 1),
  ('Passive Voice — all tenses',       'B1', 'Voz pasiva en todos los tiempos verbales',       2),
  ('Conditionals 0, 1, 2, 3 & Mixed', 'B2', 'Condicionales completos con ejemplos CAE',        3),
  ('Reported Speech',                  'B2', 'Estilo indirecto: afirmaciones, preguntas, órdenes', 4),
  ('Modal Verbs — advanced',           'B2', 'Must/should/might/would y matices de probabilidad', 5),
  ('Inversion for Emphasis',           'C1', 'Inversión gramatical en registro formal',         6),
  ('Cleft Sentences',                  'C1', 'It is... that / What... is para énfasis',         7),
  ('Participle Clauses',               'C1', 'Cláusulas de participio y gerundio reducido',     8)
ON CONFLICT DO NOTHING;

-- ── VOCABULARIO DE EJEMPLO ───────────────────────────────────────
INSERT INTO words (word, translation, example_sentence, level, category) VALUES
  ('endeavour',   'esfuerzo, empeño',    'Despite every endeavour, the project failed.',            'C1', 'academic'),
  ('paraphrase',  'parafrasear',         'Could you paraphrase that in simpler terms?',             'B2', 'academic'),
  ('substantial', 'sustancial, considerable', 'There has been a substantial improvement in his scores.', 'B2', 'general'),
  ('give up',     'rendirse, abandonar', 'Don''t give up — keep practising every day.',             'A2', 'phrasal'),
  ('keep up with','mantenerse al día',   'It''s hard to keep up with all the new vocabulary.',      'B1', 'phrasal'),
  ('shrewd',      'astuto, perspicaz',   'She made a shrewd investment in property.',               'C1', 'general'),
  ('Nevertheless','sin embargo, no obstante', 'It was difficult; nevertheless, she passed.',       'B2', 'academic'),
  ('Pull off',    'lograr algo difícil', 'He pulled off an impressive score in the CAE exam.',      'B2', 'phrasal'),
  ('Candid',      'sincero, franco',     'I''d like your candid opinion on my essay.',              'C1', 'general'),
  ('Bear in mind','tener en cuenta',     'Bear in mind that the exam lasts four hours.',            'B1', 'idiom')
ON CONFLICT DO NOTHING;

-- ── SEMILLA DE user_words ────────────────────────────────────────
-- Sin esto, las palabras existen en `words` pero no entran en la cola de
-- repaso (que lee user_words), así que "Repasar ahora" arranca vacío.
-- Toda palabra sin ficha SRS obtiene una, en estado 'new' y vencida hoy.
INSERT INTO user_words (word_id)
SELECT w.id FROM words w
WHERE NOT EXISTS (SELECT 1 FROM user_words uw WHERE uw.word_id = w.id);

SELECT 'TutorIngles Migration OK · ' || NOW() AS status;
