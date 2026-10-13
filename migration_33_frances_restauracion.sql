-- TutorIngles — migración 33: francés de restauración y estación, y cola reordenada
--
-- Idempotente. Aplicada a mano en Neon el 13-oct-2026 y registrada en `migraciones`.
--
-- Por qué: las 54 palabras de `work` eran todas de tienda de deporte, y desde
-- octubre el trabajo probable de Edwin es de temporada en una estación (sala,
-- plonge, conserjería: proceso abierto con TLML, Leysin). No había ni
-- "l'addition" ni "débarrasser" ni "allergènes".
--
-- Qué hace:
--   1. 40 palabras nuevas de restauración y estación, categoría `work` (cuentan
--      en la fase 2, "Vocabulario de trabajo"). Mismo criterio que la 25: en
--      `word` sólo lo que se dice en voz alta; lo regional y las trampas, tras " — ".
--   2. Cola de estudio. La sesión ordena por next_review_date, uw.id. Las nuevas
--      de la 25 tenían todas el 29-sep, así que iban por delante de los repasos
--      vencidos (6-10 oct) y estos no salían hasta acabar las 181 nuevas.
--      Ahora: repasos vencidos → restauración (11-oct) → resto de nuevas (12-oct).
--      El arreglo de fondo va en server.js (los repasos antes que las nuevas).
--   3. Las 36 `academic` (DALF C1) que aún no se habían visto salen de la cola
--      hasta el 1-mar-2027. Para recuperarlas antes:
--        UPDATE user_words uw SET next_review_date = CURRENT_DATE FROM words w
--         WHERE w.id = uw.word_id AND w.lang = 'fr' AND w.category = 'academic' AND uw.reps = 0;
--   4. Dos tarjetas precisadas: permis L y vacaciones.

BEGIN;

-- ── 1. Restauración y estación ───────────────────────────────
INSERT INTO words (word, translation, example_sentence, level, category, lang)
SELECT v.word, v.translation, v.example, v.level, 'work', 'fr'
FROM (VALUES
  -- Sala: de la llegada del cliente a la cuenta.
  ('Vous avez réservé ?', '¿Tienen reserva?', 'Bonsoir, vous avez réservé ? À quel nom ?', 'A2', 1),
  ('C''est complet.', 'Está lleno, no queda sitio', 'Désolé, ce soir c''est complet, mais demain midi il reste de la place.', 'A2', 2),
  ('Vous avez choisi ?', '¿Ya han elegido? — la pregunta para tomar nota', 'Bonsoir ! Vous avez choisi, ou je vous laisse encore un moment ?', 'A2', 3),
  ('prendre la commande', 'tomar la comanda, tomar nota — "la commande" es el pedido', 'Je prends la commande de la table six et j''arrive.', 'A2', 4),
  ('Et pour boire ?', '¿Y para beber?', 'Deux croûtes au fromage. Et pour boire ?', 'A2', 5),
  ('le plat du jour', 'el plato del día — en Suiza también "l''assiette du jour"', 'Le plat du jour, c''est un émincé de poulet avec du riz.', 'A2', 6),
  ('un déci de blanc', 'una copa de blanco (1 dl) — en Suiza el vino se pide por decilitros: un déci, deux décis, trois décis; "un demi" es medio litro', 'Pour moi, un déci de fendant, s''il vous plaît.', 'A2', 7),
  ('une carafe d''eau', 'una jarra de agua del grifo — se pide con toda normalidad; casi siempre es gratis', 'On peut avoir une carafe d''eau pour la table ?', 'A2', 8),
  ('Je vous apporte ça tout de suite.', 'Se lo traigo enseguida', 'Une autre carafe ? Oui, je vous apporte ça tout de suite.', 'A2', 9),
  ('Bon appétit !', '¡Que aproveche! — al dejar el plato en la mesa', 'Voilà, la raclette pour madame. Bon appétit !', 'A2', 10),
  ('Ça a été ?', '¿Qué tal todo?, ¿les ha gustado? — al retirar el plato; responden "c''était très bon"', 'Ça a été ? Je peux vous débarrasser ?', 'A2', 11),
  ('débarrasser', 'retirar los platos, recoger la mesa — OJO: no es "desembarazar"', 'Je débarrasse la table quatre et je la remets pour le service du soir.', 'A2', 12),
  ('mettre la table', 'poner la mesa — en sala también "dresser la table"', 'Avant le service, on met les tables : le couteau à droite, la fourchette à gauche.', 'A2', 13),
  ('le couvert', 'el cubierto; y también cada comensal: "une table de six couverts"', 'Ce soir, on a huitante couverts réservés.', 'B1', 14),
  ('l''addition', 'la cuenta (del restaurante)', 'La table trois demande l''addition.', 'A2', 15),
  ('Vous payez ensemble ou séparément ?', '¿Pagan juntos o por separado? — en Suiza es muy normal que cada uno pague lo suyo', 'Ça fait cinquante-huit francs. Vous payez ensemble ou séparément ?', 'A2', 16),
  ('le pourboire', 'la propina — en Suiza el servicio va incluido en el precio: la propina es redondear, no una obligación', 'Ils ont arrondi à soixante francs, deux francs de pourboire.', 'A2', 17),
  -- Alérgenos: lo que no se puede improvisar.
  ('Vous avez des allergies ?', '¿Tiene alguna alergia? — pregúntalo antes de tomar nota si el cliente duda', 'Avant de commander, vous avez des allergies ?', 'A2', 18),
  ('les allergènes', 'los alérgenos — si no sabes la respuesta, no la inventes: "je vais demander en cuisine"', 'Je ne suis pas sûr pour les allergènes, je vais demander en cuisine.', 'B1', 19),
  ('sans gluten', 'sin gluten', 'Est-ce que la fondue est sans gluten ?', 'A2', 20),
  ('sans lactose', 'sin lactosa', 'Vous avez un dessert sans lactose ?', 'A2', 21),
  ('un plat végétarien', 'un plato vegetariano — vegano es "végane"', 'Il y a un plat végétarien sur la carte ?', 'A2', 22),
  -- Cocina y plonge: lo que se oye detrás.
  ('la plonge', 'la zona de fregar; "faire la plonge" = fregar los platos — "le plongeur" es quien lo hace', 'Ce soir, je suis à la plonge jusqu''à vingt-deux heures.', 'A2', 23),
  ('le lave-vaisselle', 'el lavavajillas', 'Le lave-vaisselle est plein, je le lance.', 'A2', 24),
  ('la mise en place', 'la preparación antes del servicio: cortar, rellenar, montar mesas', 'La mise en place commence à dix heures, le service à midi.', 'B1', 25),
  ('Chaud devant !', '¡Cuidado, que quema! — se grita al pasar con algo caliente', 'Chaud devant ! Je passe avec la soupe.', 'A2', 26),
  ('Attention derrière !', '¡Ojo, que paso por detrás! — para no chocar con un compañero', 'Attention derrière ! J''ai des assiettes.', 'A2', 27),
  ('la chambre froide', 'la cámara frigorífica', 'Tu peux ranger la livraison de fromage dans la chambre froide ?', 'B1', 28),
  ('le coup de feu', 'el momento de más jaleo del servicio — OJO: nada que ver con un disparo', 'Entre midi et une heure, c''est le coup de feu.', 'B1', 29),
  ('le chef de rang', 'el camarero responsable de un grupo de mesas; por debajo está "le commis de salle"', 'Le chef de rang s''occupe des tables un à huit, toi tu l''aides.', 'B1', 30),
  ('le commis de cuisine', 'el ayudante de cocina', 'Le commis de cuisine prépare les légumes pour le soir.', 'B1', 31),
  -- La estación.
  ('les remontées mécaniques', 'los remontes: telesillas, telecabinas, telesquís — TLML es la empresa de remontes de Leysin', 'Les remontées mécaniques ouvrent à huit heures et demie.', 'B1', 32),
  ('le forfait', 'el forfait, el pase de remontes — OJO: también "tarifa plana" ("un forfait mobile")', 'Le forfait journée, c''est à la caisse en bas de la télécabine.', 'A2', 33),
  ('le télésiège', 'el telesilla', 'Le télésiège est fermé à cause du vent.', 'A2', 34),
  ('la télécabine', 'la telecabina', 'Le restaurant est en haut de la télécabine.', 'A2', 35),
  ('la piste', 'la pista; "hors-piste" = fuera de pista', 'La piste bleue descend jusqu''au village.', 'A2', 36),
  ('le saisonnier', 'el temporero, el trabajador de temporada (ella: la saisonnière)', 'Cet hiver, on engage douze saisonniers pour le restaurant.', 'A2', 37),
  ('logé et nourri', 'con alojamiento y comida incluidos — en el contrato se descuenta del sueldo: pregunta cuánto, por escrito', 'Le poste est logé et nourri, la déduction est indiquée dans le contrat.', 'B1', 38),
  ('le logement du personnel', 'el alojamiento para el personal', 'Le logement du personnel est à cinq minutes du restaurant.', 'B1', 39),
  ('les horaires coupés', 'el turno partido: mañana y noche con un descanso en medio — muy normal en hostelería de estación', 'Avec les horaires coupés, je travaille de dix à quatorze heures et de dix-huit à vingt-deux heures.', 'B1', 40)
) AS v(word, translation, example, level, ord)
WHERE NOT EXISTS (SELECT 1 FROM words w WHERE w.lang = 'fr' AND lower(w.word) = lower(v.word))
ORDER BY v.ord;

INSERT INTO user_words (profile_id, word_id, next_review_date)
SELECT 1, w.id, DATE '2026-10-11' FROM words w
WHERE w.lang = 'fr'
  AND w.id > (SELECT max(id) FROM words WHERE lang = 'fr' AND category = 'academic')
  AND NOT EXISTS (SELECT 1 FROM user_words uw WHERE uw.profile_id = 1 AND uw.word_id = w.id);

-- ── 2 y 3. Cola: el resto de nuevas detrás; lo académico, fuera hasta marzo ──
UPDATE user_words uw SET next_review_date = DATE '2026-10-12'
  FROM words w
 WHERE w.id = uw.word_id AND w.lang = 'fr' AND uw.profile_id = 1
   AND uw.reps = 0 AND uw.status = 'new'
   AND w.category IN ('chunk', 'suisse', 'general')
   AND uw.next_review_date < DATE '2026-10-12';

UPDATE user_words uw SET next_review_date = DATE '2026-10-12'
  FROM words w
 WHERE w.id = uw.word_id AND w.lang = 'fr' AND uw.profile_id = 1
   AND uw.reps = 0 AND uw.status = 'new'
   AND w.category = 'work' AND uw.next_review_date < DATE '2026-10-11';

UPDATE user_words uw SET next_review_date = DATE '2027-03-01'
  FROM words w
 WHERE w.id = uw.word_id AND w.lang = 'fr' AND uw.profile_id = 1
   AND uw.reps = 0 AND w.category = 'academic'
   AND uw.next_review_date < DATE '2027-03-01';

-- ── 4. Precisiones ────────────────────────────────────────────
UPDATE words SET translation = 'el permiso L, de corta duración: contratos de más de 3 meses y menos de 12 — hasta 3 meses no hace falta permiso, basta con el anuncio en línea'
 WHERE lang = 'fr' AND word = 'le permis L';

UPDATE words SET translation = 'las vacaciones — en Suiza el mínimo legal son 4 semanas al año (5 hasta los 20 años); en hostelería, el convenio (CCNT) da 5'
 WHERE lang = 'fr' AND word = 'les vacances';

COMMIT;

-- Comprobación:
--   SELECT w.category, uw.next_review_date, count(*) FROM user_words uw JOIN words w ON w.id = uw.word_id
--    WHERE w.lang = 'fr' GROUP BY 1, 2 ORDER BY 2, 1;
