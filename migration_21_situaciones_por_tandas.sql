-- TutorIngles — migración 21: las situaciones se practican por tandas
--
-- Idempotente. Aplicar como `postgres` (las tablas son suyas, no del usuario
-- `tutoringles`, así que un ALTER como tutoringles da "must be owner"):
--   docker exec -i postgres psql -U postgres -d tutoringles < migration_21_situaciones_por_tandas.sql
--
-- Contexto: TRABAJO lleva 12 situaciones y 148 frases desde julio y
-- `situation_progress` tiene CERO filas. No es que no se llegue —está en la
-- barra, a un toque—: es que cada situación son 12-13 frases con micrófono y
-- sólo cuentan al terminarla entera, mientras la sesión de 5 minutos da la
-- misma marca en la pantalla de HOY sin sacar el móvil de la mano. Puestas al
-- lado, entrar en TRABAJO es triplicar el esfuerzo por el mismo resultado
-- visible.

BEGIN;

-- Por qué frase va la situación en curso. Sin esto no hay forma de retomar:
-- `practiced_count` cuenta rondas, no frases, así que al volver se empezaba
-- otra vez por la primera.
ALTER TABLE situation_progress ADD COLUMN IF NOT EXISTS lines_done INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN situation_progress.lines_done IS
  'Frases practicadas de la situación en curso. Se reinicia a 0 al completarla.';

-- Cuántas frases entran en una tanda. Va en config y no en el código porque es
-- el número que hay que poder mover si sigue sin usarse: cuatro frases son
-- ~3 minutos, comparable a la sesión diaria.
INSERT INTO config (key, value) VALUES ('situation_batch', '4')
  ON CONFLICT (key) DO NOTHING;

COMMIT;

-- Comprobación:
--   SELECT key, value FROM config WHERE key='situation_batch';
--   SELECT situation_id, lines_done, practiced_count, completed FROM situation_progress;
