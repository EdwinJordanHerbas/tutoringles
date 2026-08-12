-- TutorIngles — migración 22: el examen pasa a finales de octubre, y antes de
-- planificar nada se mide de dónde se parte.
--
-- Idempotente. Aplicar como `postgres` (las tablas son suyas):
--   docker exec -i postgres psql -U postgres -d tutoringles < migration_22_diagnostico_y_octubre.sql
--
-- Contexto: la fecha objetivo era el 1-dic-2026 y pasa a finales de octubre.
-- Eso quita seis semanas de un plan que ya iba justo, así que lo que antes era
-- opcional pasa a ser lo primero: **saber el nivel de verdad**.
--
-- `user_level` decía B1, pero es un valor escrito a mano en la migración base y
-- `exam_attempts` tiene CERO filas. Nadie ha medido nada. La diferencia entre
-- B1 y B2 alto son dos meses de trabajo distinto, así que planificar sin ese
-- dato es elegir el camino a ciegas.

BEGIN;

-- ─────────────────────────────────────────────────────────
-- 1. La fecha
-- ─────────────────────────────────────────────────────────
-- Convocatoria confirmada en papel el 17-oct-2026 (inscripción del 7 al 9 de
-- septiembre). El formato DIGITAL se celebra casi todas las semanas en ciudades
-- grandes y admite inscripción hasta 10 días antes, así que la fecha exacta la
-- elige él: esto es sólo el objetivo con el que se planifica.
UPDATE config SET value = '2026-10-31' WHERE key = 'target_exam_date';
INSERT INTO config (key, value) VALUES ('target_exam_date', '2026-10-31')
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ─────────────────────────────────────────────────────────
-- 2. El nivel medido, separado del declarado
-- ─────────────────────────────────────────────────────────
-- `user_level` se queda como estaba —es lo que él dijo— y el resultado del
-- diagnóstico va aparte. Mezclarlos haría imposible saber cuál de los dos
-- números viene de una medición, que es justo el problema que hubo hasta ahora.
INSERT INTO config (key, value) VALUES ('nivel_medido', '')       ON CONFLICT (key) DO NOTHING;
INSERT INTO config (key, value) VALUES ('nivel_medido_pct', '')   ON CONFLICT (key) DO NOTHING;
INSERT INTO config (key, value) VALUES ('nivel_medido_fecha', '') ON CONFLICT (key) DO NOTHING;

COMMIT;

-- Comprobación:
--   SELECT key, value FROM config WHERE key LIKE 'nivel_%' OR key='target_exam_date';
