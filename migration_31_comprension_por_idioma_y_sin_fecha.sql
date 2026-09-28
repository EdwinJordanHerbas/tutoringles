-- TutorIngles — migración 31: comprensión oral y escrita por idioma, y el
-- Cambridge sin fecha.
--
-- Idempotente. Aplicar como `postgres` (las tablas son suyas):
--   docker exec -i postgres psql -U postgres -d tutoringles -v ON_ERROR_STOP=1 < migration_31_comprension_por_idioma_y_sin_fecha.sql
--
-- 1. Los textos de Reading (exam_texts) y los audios de Listening
--    (listening_tasks) llevan idioma, igual que el resto del contenido desde la
--    migración 24. Así el francés puede tener su comprensión oral y escrita
--    (migración 32) sin que se mezcle con la del Cambridge.
--
-- 2. La fecha del Cambridge. Era el 31-oct-2026 (migración 22), y coincidía
--    con la marcha a Suiza. El 28-sep Edwin lo dejó claro: el C1 de Cambridge
--    sigue siendo un objetivo, pero ya sin fecha. Una cuenta atrás hacia una
--    fecha que nadie va a cumplir es otra forma de mentir con el progreso, así
--    que se quita. Sólo si seguía siendo la de la migración 22: si alguien pone
--    otra a mano en Ajustes, reejecutar esto no se la borra.

BEGIN;

ALTER TABLE exam_texts      ADD COLUMN IF NOT EXISTS lang VARCHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE listening_tasks ADD COLUMN IF NOT EXISTS lang VARCHAR(2) NOT NULL DEFAULT 'en';

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['exam_texts','listening_tasks'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_lang_check') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (lang IN (''en'',''fr''))',
                     t, t || '_lang_check');
    END IF;
  END LOOP;
END $$;

-- Sin fecha = cadena vacía, que es lo que la app ya entiende como "no hay".
UPDATE config SET value = '' WHERE key = 'target_exam_date' AND value = '2026-10-31';

COMMIT;

-- Comprobación:
--   SELECT key, value FROM config WHERE key = 'target_exam_date';
--   SELECT lang, level, count(*) FROM exam_texts GROUP BY 1, 2;
