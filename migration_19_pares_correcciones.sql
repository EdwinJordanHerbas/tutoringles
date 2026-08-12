-- TutorIngles — migración 19: arreglos de los pares mínimos
--
-- Idempotente, como todas. Aplicar con:
--   docker exec -i postgres psql -U tutoringles -d tutoringles < migration_19_pares_correcciones.sql
--
-- Sale de revisar los 12 contrastes y los 71 pares uno a uno. Tres de ellos
-- enseñaban algo distinto de lo que decían enseñar, y el AFI de los pares
-- llevaba desde la migración 17 sin rellenar (1 de 71).

BEGIN;

-- ─────────────────────────────────────────────────────────
-- 1. La h se escribe h, no j
-- ─────────────────────────────────────────────────────────
-- El contraste explicaba "cuando la pronunciamos nos sale la j fuerte de
-- jamón" y acto seguido enseñaba la figurada como `j`, que es exactamente el
-- error que pide evitar. La regla está en lib/respelling.js con test desde el
-- 30-jul (/h/ → 'h' marcada, nunca 'j'), pero esta tabla es de la migración 16
-- y se quedó con el criterio viejo.
UPDATE pron_contrasts
   SET figurada_b = 'h',
       como_se_hace = 'Empaña un cristal con el aliento: ese soplo es la h inglesa. '
                   || 'La garganta no raspa — si raspa, te ha salido la jota.'
 WHERE slug = 'h-suave';

-- ─────────────────────────────────────────────────────────
-- 2. La s sonora tenía una descripción donde va un símbolo
-- ─────────────────────────────────────────────────────────
-- `figurada_b` decía "s (sonora)" — 12 caracteres, justo el ancho del campo —
-- mientras el resto de contrastes muestra un símbolo (b, v, sh, ng). En el
-- sistema del proyecto /s/ y /z/ se escriben las dos `s` y las separa el color,
-- así que el texto tiene que decir qué las diferencia, no describir el campo.
UPDATE pron_contrasts
   SET figurada_b = 's zumbada'
 WHERE slug = 's-z';

-- ─────────────────────────────────────────────────────────
-- 3. Qué contrastes valen para el oído y cuáles solo para la boca
-- ─────────────────────────────────────────────────────────
-- Dos de los doce no pueden funcionar como ejercicio de percepción:
--
--   · e-fantasma. El error es que TÚ añadas una e delante ("escuul" por
--     school). Eso es producción. El par school/cool solo entrena a oír si hay
--     una /s/, que no es el problema, así que el ejercicio nunca podría
--     detectar el fallo que dice atacar.
--   · r-inglesa. Los pares eran right/light, red/led, rock/lock: eso es R
--     contra L, la dificultad clásica del japonés. Un español no confunde
--     *right* con *light* — confunde la r inglesa con la rr española, y esas
--     dos no forman ningún par mínimo en inglés porque la rr no existe ahí.
--
-- En los dos casos las palabras siguen valiendo: son buenos ejemplos para
-- imitar. Lo que cambia es que dejan de aparecer en la ronda de oído.
ALTER TABLE pron_contrasts ADD COLUMN IF NOT EXISTS modo VARCHAR(12) NOT NULL DEFAULT 'ambos';
UPDATE pron_contrasts SET modo = 'produccion' WHERE slug IN ('e-fantasma', 'r-inglesa');
UPDATE pron_contrasts SET modo = 'ambos'      WHERE slug NOT IN ('e-fantasma', 'r-inglesa');

COMMENT ON COLUMN pron_contrasts.modo IS
  'ambos = sirve para oído y producción · produccion = solo para decirlo (no hay par mínimo real)';

-- Y la explicación de r-inglesa tiene que dejar de prometer un ejercicio de
-- oído que no existe.
UPDATE pron_contrasts
   SET por_que_es = 'La r española vibra porque la lengua golpea el paladar. La inglesa no toca '
                 || 'nada, y una r vibrada delata el acento a la primera. No hay dos palabras '
                 || 'inglesas que se distingan por esto: no es cosa de oído, es de boca.'
 WHERE slug = 'r-inglesa';

-- ─────────────────────────────────────────────────────────
-- 4. Dónde tiene sentido la cámara lenta
-- ─────────────────────────────────────────────────────────
-- Ralentizar hace time-stretch: alarga bien lo estacionario (las vocales) y
-- emborrona los transitorios. Medido sobre el audio del propio proyecto con
-- atempo=0.7: la duración total sube un 40% en los cuatro casos probados, pero
-- el ataque no acompaña — en `avoid` la rampa de entrada de la /v/ pasa de
-- 23,9 ms a 0, o sea que la v ralentizada entra MÁS de golpe y se parece más a
-- una b. Justo lo contrario de lo que busca el ejercicio.
--
-- Así que se apaga donde el contraste vive en un transitorio corto: b/v y las
-- dos africadas (ch en sh-ch, dʒ en dj-y llevan oclusión dentro).
ALTER TABLE pron_contrasts ADD COLUMN IF NOT EXISTS lento_ok BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE pron_contrasts SET lento_ok = FALSE WHERE slug IN ('b-v', 'sh-ch', 'dj-y');
UPDATE pron_contrasts SET lento_ok = TRUE  WHERE slug NOT IN ('b-v', 'sh-ch', 'dj-y');

COMMENT ON COLUMN pron_contrasts.lento_ok IS
  'FALSE cuando el contraste vive en un transitorio y el time-stretch lo emborrona en vez de aclararlo';

-- ─────────────────────────────────────────────────────────
-- 5. curb/curve no es por donde se empieza
-- ─────────────────────────────────────────────────────────
-- La /v/ en posición final se ensordece y la diferencia casi desaparece
-- incluso en boca de un nativo. Va al final; los buenos para empezar son los
-- que llevan el sonido al principio.
UPDATE pron_pairs SET orden = 90
 WHERE word_a = 'curb' AND word_b = 'curve';

UPDATE pron_pairs p SET orden = v.n
  FROM (VALUES ('berry',1), ('very',1), ('ban',2), ('van',2), ('best',3), ('vest',3),
               ('bet',4), ('vet',4), ('boat',5), ('vote',5)) AS v(w, n)
 WHERE p.word_a = v.w
   AND p.contrast_id = (SELECT id FROM pron_contrasts WHERE slug = 'b-v');

-- ─────────────────────────────────────────────────────────
-- 6. El AFI de los pares, que llevaba 70 de 71 vacío
-- ─────────────────────────────────────────────────────────
-- La migración 17 se llamaba "AFI por par mínimo" y solo llegó a rellenar una
-- fila. Sin esto, la figurada de estas palabras sale del diccionario general y
-- en las que tienen dos pronunciaciones (live = /lɪv/ o /laɪv/) da la que le
-- toque. Se rellena desde `lexicon`, que ya está cargado en la base.
UPDATE pron_pairs p
   SET ipa_a = l.ipa
  FROM lexicon l
 WHERE lower(p.word_a) = l.word
   AND (p.ipa_a IS NULL OR p.ipa_a = '');

UPDATE pron_pairs p
   SET ipa_b = l.ipa
  FROM lexicon l
 WHERE lower(p.word_b) = l.word
   AND (p.ipa_b IS NULL OR p.ipa_b = '');

-- `live` en el par live/leave es el verbo, /lɪv/, no el adjetivo /laɪv/. El
-- diccionario no puede saberlo y es justo el caso para el que existe la
-- columna.
UPDATE pron_pairs SET ipa_a = 'lˈɪv'
 WHERE word_a = 'live' AND word_b = 'leave';

COMMIT;

-- Comprobación (no modifica nada):
--   SELECT slug, modo, lento_ok, figurada_a, figurada_b FROM pron_contrasts ORDER BY orden;
--   SELECT count(*) FILTER (WHERE ipa_a <> '' AND ipa_a IS NOT NULL) AS con_ipa,
--          count(*) AS total FROM pron_pairs;
