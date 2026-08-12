-- TutorIngles · Migration 10 — SRS: DE SM-2 A FSRS
--
-- FSRS (Free Spaced Repetition Scheduler) modela la memoria con tres variables
-- en vez de un único "factor de facilidad":
--   · stability      (S) — días que aguanta el recuerdo antes de caer al 90%
--   · difficulty     (D) — lo que cuesta esa carta en concreto, de 1 a 10
--   · retrievability (R) — probabilidad de acordarte AHORA, se deriva de S y del
--                          tiempo transcurrido
--
-- Frente a SM-2 necesita entre un 20% y un 30% menos de repasos para la misma
-- retención (benchmark sobre ~500 millones de repasos reales de Anki).
--
-- Los datos de SM-2 no se tiran: se convierten. interval_days es la mejor
-- estimación inicial de la estabilidad, y ease_factor se mapea a dificultad.
--
-- Aplicar:
--   docker exec -i postgres psql -U postgres -d tutoringles -v ON_ERROR_STOP=1 < migration_10_fsrs.sql
--
-- Idempotente.

BEGIN;

ALTER TABLE user_words ADD COLUMN IF NOT EXISTS stability   REAL;
ALTER TABLE user_words ADD COLUMN IF NOT EXISTS difficulty  REAL;
ALTER TABLE user_words ADD COLUMN IF NOT EXISTS reps        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_words ADD COLUMN IF NOT EXISTS lapses      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_words ADD COLUMN IF NOT EXISTS last_review DATE;

-- Historial de repasos. FSRS lo necesita para poder reoptimizar los pesos
-- con los datos reales del usuario más adelante.
CREATE TABLE IF NOT EXISTS review_log (
  id            SERIAL PRIMARY KEY,
  profile_id    INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(id) ON DELETE CASCADE,
  user_word_id  INTEGER NOT NULL REFERENCES user_words(id) ON DELETE CASCADE,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 4), -- 1 again · 2 hard · 3 good · 4 easy
  state_before  VARCHAR(10),
  stability     REAL,
  difficulty    REAL,
  elapsed_days  INTEGER,
  scheduled_days INTEGER,
  reviewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS review_log_word_idx ON review_log(user_word_id, reviewed_at);

-- ── Conversión desde SM-2 ────────────────────────────────
-- Solo para las cartas ya estudiadas: las nuevas arrancan sin estado y FSRS
-- les asigna la estabilidad inicial en el primer repaso.
UPDATE user_words
   SET stability  = GREATEST(0.5, LEAST(365, interval_days::real)),
       -- ease_factor va de 1.3 a 3.0; dificultad FSRS de 1 a 10, en sentido inverso
       difficulty = GREATEST(1, LEAST(10, 11 - ((ease_factor - 1.3) / 1.7 * 9 + 1))),
       reps       = times_correct + times_wrong,
       lapses     = times_wrong
 WHERE stability IS NULL
   AND status <> 'new';

COMMIT;
