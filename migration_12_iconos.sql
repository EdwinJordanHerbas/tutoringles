-- TutorIngles · Migration 12 — LOS ICONOS DEJAN DE SER EMOJIS
--
-- tracks.icon guardaba un emoji. Ahora guarda el NOMBRE de un icono del set
-- propio (src/img/icons/<nombre>.png), que se dibuja igual en todos los
-- dispositivos. Los emojis los pintaba cada sistema operativo a su manera.
--
-- Aplicar:
--   docker exec -i postgres psql -U postgres -d tutoringles -v ON_ERROR_STOP=1 < migration_12_iconos.sql
--
-- Idempotente.

BEGIN;

COMMENT ON COLUMN tracks.icon IS
  'Nombre de un icono de src/img/icons (sin extensión). No usar emojis.';

UPDATE tracks SET icon = 'work' WHERE slug = 'retail';

-- Cualquier sector futuro sin icono asignado cae en el genérico
UPDATE tracks SET icon = 'work' WHERE icon IS NULL OR icon = '' OR icon !~ '^[a-z][a-z0-9_-]*$';

COMMIT;
