-- TutorIngles — migración 20: qué pares tienen audio que de verdad contrasta
--
-- GENERADO por tools/cortar-pares.js. No editar a mano: se rehace cada vez
-- que se regenera el audio, y los números salen de medir los ficheros.
--
-- Criterio por tipo de contraste: duración para la longitud vocálica (que
-- ES el rasgo) y reparto de energía por bandas para el resto. Medir la
-- duración de ban/van, como se hizo la primera vez, no dice nada sobre si
-- la b y la v se distinguen.

BEGIN;

ALTER TABLE pron_pairs ADD COLUMN IF NOT EXISTS audio_ok BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN pron_pairs.audio_ok IS 'TRUE si el audio grabado separa los dos sonidos, medido por tools/cortar-pares.js';

UPDATE pron_pairs SET audio_ok = FALSE;
UPDATE pron_pairs SET audio_ok = TRUE WHERE id IN (6, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 64, 65, 66, 67, 68, 69, 70, 71, 21, 22, 23, 25, 26, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 46, 47, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 62, 63);

-- Sin audio fiable (siguen con la voz del móvil, y la app lo dice):
--   i-corta-larga   ship/sheep           ×0.75 de duración (1.15–2.5)
--   i-corta-larga   live/leave           ×1.04 de duración (1.15–2.5)
--   i-corta-larga   bit/beat             ×1.01 de duración (1.15–2.5)
--   i-corta-larga   fill/feel            ×1.12 de duración (1.15–2.5)
--   i-corta-larga   this/these           ×0.98 de duración (1.15–2.5)
--   i-corta-larga   sit/seat             ×2.88 de duración (1.15–2.5)
--   i-corta-larga   it/eat               ×0.60 de duración (1.15–2.5)
--   a-e-abierta     bat/bet              1.4 dB de separación (mín 1.5)
--   u-corta-larga   full/fool            ×0.50 de duración (1.15–2.5)
--   u-corta-larga   pull/pool            ×0.39 de duración (1.15–2.5)
--   u-corta-larga   look/Luke            ×0.97 de duración (1.15–2.5)
--   u-corta-larga   foot/food            ×0.91 de duración (1.15–2.5)
--   u-corta-larga   should/shooed        ×1.10 de duración (1.15–2.5)
--   sh-ch           shop/chop            1.1 dB de separación (mín 2)
--   n-ng            sin/sing             1.4 dB de separación (mín 1.5)
--   n-ng            win/wing             1.2 dB de separación (mín 1.5)
--   r-inglesa       rock/lock            1.3 dB de separación (mín 1.5)

COMMIT;
