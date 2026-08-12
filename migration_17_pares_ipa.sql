-- TutorIngles · Migración 17 — AFI propio por par mínimo
--
-- Aplicar:
--   ssh droplet 'docker exec -i postgres psql -U postgres -d tutoringles \
--     -v ON_ERROR_STOP=1 < /opt/tutoringles/migration_17_pares_ipa.sql'
--
-- Dos problemas que salieron al revisar los 71 pares uno a uno:
--
-- 1. Palabras con dos pronunciaciones. El diccionario devuelve "live" como
--    /laɪv/ (el adjetivo, "en directo"), no /lɪv/ (el verbo). En el par
--    live/leave eso rompe el contraste que se quiere enseñar: salía LAIV/LIIV,
--    que no se diferencian en la longitud de la i sino en otra cosa.
--
-- 2. "mall" venía como /mæl/ y frente a "small" /smɔːl/ el par dejaba de ser
--    mínimo: cambiaban dos cosas a la vez.
--
-- La solución es dejar que cada par fije su propia transcripción cuando la
-- palabra es ambigua. Un override global no vale: "live" en directo también
-- existe y aparece en otras frases.

ALTER TABLE pron_pairs ADD COLUMN IF NOT EXISTS ipa_a TEXT;
ALTER TABLE pron_pairs ADD COLUMN IF NOT EXISTS ipa_b TEXT;

COMMENT ON COLUMN pron_pairs.ipa_a IS
  'AFI forzado para word_a. Solo cuando la palabra tiene varias pronunciaciones y el par necesita una concreta.';

UPDATE pron_pairs SET ipa_a = 'lɪv'  WHERE word_a = 'live'  AND ipa_a IS NULL;
UPDATE pron_pairs SET ipa_b = 'mɔːl' WHERE word_b = 'mall'  AND ipa_b IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "tutoringles";
