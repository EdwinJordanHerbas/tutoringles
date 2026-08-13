-- TutorIngles — migración 23: que el test de nivel pueda guardarse.
--
-- Idempotente. Aplicar como `postgres` (las tablas son suyas):
--   docker exec -i postgres psql -U postgres -d tutoringles < migration_23_diagnostico_seccion.sql
--
-- El diagnóstico de la migración 22 nunca llegó a guardar un intento: el POST
-- escribe `section = 'diag'` y el CHECK de exam_attempts sólo admitía las cuatro
-- destrezas del examen. Verificado en los logs del contenedor — cinco intentos
-- el 12-ago-2026 entre las 22:31:27 y las 22:31:37 UTC, los cinco con
-- "violates check constraint exam_attempts_section_check", y exam_attempts a
-- cero filas.
--
-- 'diag' no es una destreza del CAE y por eso no estaba: es una medición de
-- partida, y se guarda aquí porque es el sitio donde vive el historial de notas
-- — que es justo lo que hay que poder mirar dentro de dos meses para saber si
-- se ha avanzado.

BEGIN;

-- ─────────────────────────────────────────────────────────
-- 1. El CHECK que rechazaba el diagnóstico
-- ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_attempts_section_check') THEN
    ALTER TABLE exam_attempts DROP CONSTRAINT exam_attempts_section_check;
  END IF;
  ALTER TABLE exam_attempts ADD CONSTRAINT exam_attempts_section_check CHECK (section IN (
    -- las cuatro destrezas del examen
    'reading','writing','listening','speaking',
    -- medición de partida (test de nivel)
    'diag'
  ));
END $$;

-- ─────────────────────────────────────────────────────────
-- 2. Deshacer la medición a medias
-- ─────────────────────────────────────────────────────────
-- El POST no iba en transacción: los tres INSERT de `config` se escribieron y
-- el de `exam_attempts` reventó después. Resultado: `nivel_medido = 'B1'` con un
-- 4 % que nadie llegó a ver en pantalla, y la tarjeta de HOY encogida a una
-- línea porque `ya_hecho` sólo mira que `nivel_medido` no esté vacío. O sea que
-- el fallo dejó a la app diciendo que el test estaba hecho.
--
-- Se limpia SÓLO si no hay ningún intento de verdad guardado, para que
-- reejecutar esta migración no borre una medición buena.
UPDATE config SET value = ''
 WHERE key IN ('nivel_medido','nivel_medido_pct','nivel_medido_fecha')
   AND NOT EXISTS (SELECT 1 FROM exam_attempts WHERE section = 'diag');

COMMIT;

-- Comprobación:
--   SELECT key, value FROM config WHERE key LIKE 'nivel_%';
--   INSERT INTO exam_attempts (profile_id,date,section,score,max_score,notes)
--     VALUES (1, CURRENT_DATE, 'diag', 50, 100, 'prueba'); -- debe entrar
--   DELETE FROM exam_attempts WHERE notes = 'prueba';
