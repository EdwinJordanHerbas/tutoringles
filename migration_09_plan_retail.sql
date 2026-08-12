-- TutorIngles · Migration 09 — EL PLAN DE 30 DÍAS INCORPORA EL CARRIL DIARIO
--
-- Hasta ahora el plan solo mandaba vocabulario, gramática y una tarea suelta de
-- speaking. Las situaciones del sector quedaban fuera, así que había que acordarse
-- de entrar a mano. Esto las mete en el plan.
--
-- Reparto: las 12 situaciones caen en los 12 primeros días (primero tu mostrador),
-- y las 6 más difíciles se repiten en la segunda mitad para consolidarlas.
--
-- Aplicar:
--   docker exec -i postgres psql -U postgres -d tutoringles -v ON_ERROR_STOP=1 < migration_09_plan_retail.sql
--
-- Idempotente.

BEGIN;

ALTER TABLE curriculum
  ADD COLUMN IF NOT EXISTS situation_id INTEGER REFERENCES situations(id) ON DELETE SET NULL;

-- Días 1-12: una situación nueva cada día, en su orden natural de dificultad.
UPDATE curriculum c
   SET situation_id = s.id
  FROM situations s
  JOIN tracks t ON t.id = s.track_id AND t.slug = 'retail'
 WHERE s.order_index = c.day
   AND c.day BETWEEN 1 AND 12;

-- Segunda vuelta: las seis situaciones de nivel B1 (las que más cuestan) se repasan
-- en días alternos de la segunda mitad del plan.
UPDATE curriculum c
   SET situation_id = s.id
  FROM (
    SELECT s.id, ROW_NUMBER() OVER (ORDER BY s.order_index) AS rn
      FROM situations s
      JOIN tracks t ON t.id = s.track_id AND t.slug = 'retail'
     WHERE s.level = 'B1'
  ) s
 WHERE c.day = 16 + (s.rn - 1) * 2       -- días 16, 18, 20, 22, 24, 26
   AND c.day BETWEEN 16 AND 26;

COMMIT;
