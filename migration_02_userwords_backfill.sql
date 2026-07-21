-- Migración 02 — backfill de user_words
-- La migración inicial insertaba palabras en `words` pero no creaba su
-- ficha en `user_words`, así que la cola de repaso salía vacía. Esto
-- rellena las que falten. Es idempotente: se puede correr las veces que sea.
INSERT INTO user_words (word_id)
SELECT w.id FROM words w
WHERE NOT EXISTS (SELECT 1 FROM user_words uw WHERE uw.word_id = w.id);

SELECT COUNT(*) AS user_words_totales FROM user_words;
