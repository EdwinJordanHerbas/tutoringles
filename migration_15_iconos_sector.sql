-- ════════════════════════════════════════════════════════════════════
-- Migración 15 — El icono del sector deja de ser un emoji
--
-- La 07 creó tracks.icon como VARCHAR(8) con un emoji dentro ('💼' por
-- defecto, '🛍️' en retail). La 12 pasó toda la interfaz al set de iconos
-- propio, y desde entonces work.js pinta el sector con ico(track_icon),
-- que espera el NOMBRE de un archivo de src/img/icons. Con un emoji en la
-- columna, la etiqueta quedaba apuntando a "src/img/icons/🛍️.png": una
-- imagen rota, no un emoji.
--
-- Aquí se guarda el nombre del icono. VARCHAR(8) se queda corto para
-- nombres como 'headphones', así que se amplía a 32.
--
-- Idempotente: se puede reejecutar sin romper nada.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE tracks ALTER COLUMN icon TYPE VARCHAR(32);
ALTER TABLE tracks ALTER COLUMN icon SET DEFAULT 'work';

-- Cualquier valor que no sea un nombre de icono válido (emojis incluidos)
-- pasa a 'work', que es el genérico de "tu oficio".
-- El set de iconos no tiene uno específico de tienda, así que retail y los
-- sectores futuros arrancan con 'work' hasta que se dibuje el suyo.
UPDATE tracks
   SET icon = 'work'
 WHERE icon IS NULL
    OR icon !~ '^[a-z0-9_-]+$';
