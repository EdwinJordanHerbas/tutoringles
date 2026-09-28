-- TutorIngles — migración 29: escribir y el oral, también en francés.
--
-- Idempotente. Aplicar como `postgres` (las tablas son suyas):
--   docker exec -i postgres psql -U postgres -d tutoringles -v ON_ERROR_STOP=1 < migration_29_escribir_y_oral_por_idioma.sql
--
-- Hasta aquí ESCRIBIR y el oral de HABLAR eran sólo del Cambridge, y con el
-- francés activo se avisaba arriba de que no eran de francés. La fase 3 del
-- plan del francés tenía un objetivo marcado "aún no está en la app".
--
-- Tres columnas y dos listas de valores:
--   lang   → de qué idioma es cada tarea, y de qué idioma es cada nota.
--   nivel  → en francés conviven tareas prácticas de B1 (un correo a la régie)
--            con las del DALF C1. Sólo las C1 cuentan como intento de examen:
--            un 18/20 en un correo de B1 no dice que escribas en C1, y si
--            contase, la cabecera se inventaría un nivel.
--   kind   → los géneros del DALF (synthese, essai) y el correo (email).

BEGIN;

ALTER TABLE writing_tasks  ADD COLUMN IF NOT EXISTS lang  VARCHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE speaking_tasks ADD COLUMN IF NOT EXISTS lang  VARCHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE exam_attempts  ADD COLUMN IF NOT EXISTS lang  VARCHAR(2) NOT NULL DEFAULT 'en';
-- Todo lo que ya existe es del CAE, o sea C1.
ALTER TABLE writing_tasks  ADD COLUMN IF NOT EXISTS nivel VARCHAR(4) NOT NULL DEFAULT 'C1';
ALTER TABLE speaking_tasks ADD COLUMN IF NOT EXISTS nivel VARCHAR(4) NOT NULL DEFAULT 'C1';

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['writing_tasks','speaking_tasks','exam_attempts'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_lang_check') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (lang IN (''en'',''fr''))',
                     t, t || '_lang_check');
    END IF;
  END LOOP;
  FOREACH t IN ARRAY ARRAY['writing_tasks','speaking_tasks'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_nivel_check') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (nivel IN (''A2'',''B1'',''B2'',''C1''))',
                     t, t || '_nivel_check');
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'writing_tasks_kind_check') THEN
    ALTER TABLE writing_tasks DROP CONSTRAINT writing_tasks_kind_check;
  END IF;
  ALTER TABLE writing_tasks ADD CONSTRAINT writing_tasks_kind_check CHECK (kind IN (
    -- Cambridge
    'essay','letter','proposal','report','review',
    -- francés: el correo de todos los días y los dos del DALF
    'email','synthese','essai'));
END $$;

CREATE INDEX IF NOT EXISTS exam_attempts_lang_idx ON exam_attempts(profile_id, lang, section);

COMMIT;

-- Comprobación:
--   SELECT lang, nivel, count(*) FROM writing_tasks GROUP BY 1, 2;
--   SELECT lang, count(*) FROM exam_attempts GROUP BY 1;
