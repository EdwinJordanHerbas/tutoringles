-- TutorIngles — migración 36: francés de atención al público y venta
--
-- Idempotente. Para quién: Edwin, francés A2 tirando a B1 (entiende bastante,
-- le cuesta producir), que en una semana empieza a trabajar en la Suiza
-- romanda, probablemente de temporada en una estación (Leysin, Vaud: sala,
-- plonge, conserjería; ver la cabecera de la 33). En Sprinter vende muy bien,
-- pero en español: aquí está lo mismo en francés, de mostrador.
--
-- Qué hace:
--   1. Seis situaciones nuevas en el sector 'suisse-romande' (order_index 13 a
--      18), con el molde de la 26: 8 frases clave ('key') = dos tandas de 4, y un
--      role-play de 8 turnos 'customer'/'you'. Registro de "vous" con clientes.
--      Las notas avisan de lo que falla un hispanohablante (falsos amigos,
--      pronunciación, registro) y de lo que en Suiza se dice distinto.
--      Tipografía como en la 26: antes de ? ! : ; va un espacio de no
--      separación (U+00A0) en las situaciones. En las palabras no, como en la
--      25 y la 33: así casan con las que ya hay y con las que crea la IA.
--   2. 54 palabras de mostrador, categoría `work` (cuentan en la fase 2). En
--      `word` sólo lo que se dice en voz alta; los matices, tras " — ".
--   3. Cola: estas 54 van las PRIMERAS entre las nuevas (2026-10-10), por
--      delante de restauración (11-oct) y del resto (12-oct). Sólo se crean las
--      de esta migración: se buscan por su texto (tabla temporal) y no por id,
--      porque por detrás de la 33 ya hay palabras que crea la IA ('errores') y
--      no hay que adelantarlas.
--
-- Qué NO toca: las 12 situaciones de la 26 ni sus líneas, el sector inglés,
-- ninguna palabra ni user_word que no sea de esta migración.
--
-- OJO al reaplicar a mano: la 26 borra y regenera las líneas de TODO el
-- sector, así que si alguien la vuelve a pasar, deja estas seis situaciones
-- sin líneas. Después de la 26, reaplicar también esta.

BEGIN;

-- ══════════════════════ SITUACIONES ══════════════════════
-- Detrás de las 12 de la 26, en el orden en que pasa un día de mostrador.
INSERT INTO situations (track_id, slug, title_es, title_en, context_es, level, order_index)
SELECT t.id, v.slug, v.title_es, v.title_en, v.context_es, v.level, v.ord
FROM tracks t, (VALUES
  ('accueil-client',      'Recibir al cliente y averiguar qué busca', 'Accueillir le client et comprendre ce qu''il cherche',
   'Lo que en Sprinter haces sin pensar, ahora en francés: saludar sin echarte encima, dejar mirar, entrar con una pregunta abierta, escuchar y repetir lo que has entendido antes de enseñar nada. En Suiza, el "bonjour" va siempre primero.', 'A2', 13),
  ('argumenter-conclure', 'Aconsejar y cerrar la venta',              'Argumenter et conclure la vente',
   'Tu punto fuerte, en francés: ventajas concretas, la objeción del precio, el "je vais réfléchir", el complemento que de verdad sirve y un cierre que no presiona. El condicional ("ça vous irait ?", "à votre place, je prendrais…") lo suaviza todo.', 'B1', 14),
  ('location-skis',       'Alquiler de esquís: nivel, número y fianza', 'À la location de skis : niveau, pointure et caution',
   'En la estación, el alquiler de material es un mostrador con cola: nivel, número, altura y peso, casco, días, precio, fianza y seguro. Las preguntas son siempre las mismas; aprendidas, el resto son números (con septante y huitante: Leysin está en Vaud).', 'A2', 15),
  ('accueil-infos',       'En recepción: informar a un turista',      'À l''accueil : renseigner un touriste',
   'En recepción o en la oficina de turismo te preguntan lo mismo cien veces: a qué hora abren los remontes, cuánto cuesta el forfait, qué tiempo hará, dónde comer y cómo se llega. Respuestas cortas, con la hora y el precio bien claros.', 'A2', 16),
  ('client-mecontent',    'Un cliente descontento',                   'Gérer un client mécontent',
   'Alguien vuelve enfadado porque algo se ha roto o no le atendieron bien. Como en Sprinter: dejarle hablar, disculparte sin culpar a nadie, proponer algo concreto (cambio, reembolso o vale) y, si no está en tu mano, avisar al responsable.', 'B1', 17),
  ('telephone-client',    'Coger el teléfono: reservas y recados',    'Répondre au téléphone : réservation et message',
   'Al teléfono no hay gestos y los números se escapan. Coger con el nombre del sitio, mirar si hay hueco, apuntar la reserva, tomar un recado y repetir en voz alta nombres y números, con septante y nonante.', 'B1', 18)
) AS v(slug, title_es, title_en, context_es, level, ord)
WHERE t.slug = 'suisse-romande'
ON CONFLICT (track_id, slug) DO UPDATE
  SET title_es = EXCLUDED.title_es, title_en = EXCLUDED.title_en,
      context_es = EXCLUDED.context_es, level = EXCLUDED.level,
      order_index = EXCLUDED.order_index;

-- Regenerar SÓLO las líneas de estas seis (la 26 borra las de todo el sector;
-- aquí no: las otras doce no se tocan).
DELETE FROM situation_lines
 WHERE situation_id IN (
   SELECT s.id FROM situations s JOIN tracks t ON t.id = s.track_id
    WHERE t.slug = 'suisse-romande'
      AND s.slug IN ('accueil-client', 'argumenter-conclure', 'location-skis',
                     'accueil-infos', 'client-mecontent', 'telephone-client')
 );

-- ══════════════════════ LÍNEAS ══════════════════════
-- Las 'key' van 1..8. El role-play va 1..8 en una sola serie que alterna
-- 'customer' y 'you', igual que en la 26.
INSERT INTO situation_lines (situation_id, kind, en, es, note, order_index)
SELECT s.id, v.kind, v.en, v.es, v.note, v.ord
FROM situations s
JOIN tracks t ON t.id = s.track_id AND t.slug = 'suisse-romande'
JOIN (VALUES

-- ── 13. RECIBIR AL CLIENTE ──────────────────────────────
('accueil-client','key','Bonjour Madame, je peux vous aider ?','Buenos días, señora, ¿le puedo ayudar?','En Suiza se saluda "Bonjour Madame" o "Bonjour Monsieur", sin apellido. Deja unos segundos entre que entra y la pregunta: que se sitúe.',1),
('accueil-client','key','Je vous laisse regarder, je suis juste à côté.','Le dejo mirar con calma, estoy aquí al lado.','La respuesta a "je regarde seulement": espacio sin desaparecer. Vuelve cuando coja un producto o te busque con la mirada.',2),
('accueil-client','key','Qu''est-ce qui vous amène aujourd''hui ?','¿Qué le trae hoy por aquí?','Pregunta abierta: no se puede contestar con un "non, merci". "Amener" = traer a alguien; "apporter" = traer una cosa.',3),
('accueil-client','key','C''est pour quelle activité ? La course, la randonnée, le ski ?','¿Para qué actividad es? ¿Correr, senderismo, esquí?','Dar opciones ayuda al cliente a contestar, y a ti a entender la respuesta: ya sabes qué palabras van a salir.',4),
('accueil-client','key','Vous en faites souvent ?','¿Lo practica a menudo?','"En faire" = practicarlo (el deporte del que se habla): "je fais du ski" → "j''en fais tous les week-ends". La frecuencia te dice qué gama enseñar.',5),
('accueil-client','key','Qu''est-ce qui compte le plus pour vous : le confort, le poids ou le prix ?','¿Qué es lo que más le importa: la comodidad, el peso o el precio?','La pregunta del buen vendedor: te dice qué argumento usar después. "Le poids" suena "puá": ni la d ni la s suenan.',6),
('accueil-client','key','Si je comprends bien, vous cherchez une chaussure légère pour courir en montagne ?','Si lo entiendo bien, busca una zapatilla ligera para correr por montaña, ¿verdad?','Reformular: repites lo que has entendido. Si te equivocas, te corrige ahora; si aciertas, nota que le escuchas.',7),
('accueil-client','key','Vous avez une marque que vous aimez bien ?','¿Hay alguna marca que le guste?','Con cosas, "j''aime bien" = me gusta; "j''aime" a secas suena más fuerte. "Une marque" = una marca.',8),
('accueil-client','customer','Bonjour ! Je regarde juste un peu, merci.','¡Buenos días! Solo estoy mirando, gracias.','"Je regarde juste" = solo estoy mirando. No es un no: es un "todavía no".',1),
('accueil-client','you','Bonjour Madame, pas de souci. Je vous laisse regarder, je suis juste à côté.','Buenos días, señora, sin problema. Le dejo mirar, estoy aquí al lado.','Sonríe, contesta y retírate. Si insistes ahora, se va. "Pas de souci" = sin problema.',2),
('accueil-client','customer','Excusez-moi ! En fait, je cherche des chaussures, mais je n''y connais pas grand-chose.','¡Perdone! En realidad busco calzado, pero no entiendo mucho del tema.','"Je n''y connais pas grand-chose" = no sé mucho de esto. Es el momento de ser útil, no de vender.',3),
('accueil-client','you','Avec plaisir ! C''est pour quelle activité ?','¡Con mucho gusto! ¿Para qué actividad es?','Primero preguntas; el producto llega después. "Avec plaisir" = con mucho gusto.',4),
('accueil-client','customer','Surtout pour marcher. Et en été, je fais un peu de randonnée.','Sobre todo para caminar. Y en verano hago un poco de senderismo.','"En été" se liga: "an-né-té". "Surtout" = sobre todo.',5),
('accueil-client','you','D''accord. Et qu''est-ce qui compte le plus pour vous : le confort, le poids ou le prix ?','Vale. ¿Y qué es lo que más le importa: la comodidad, el peso o el precio?','Con esta respuesta ya sabes qué argumento usar: aquí será la comodidad, no el precio.',6),
('accueil-client','customer','Le confort, avant tout. Avec mes chaussures actuelles, j''ai mal aux pieds.','La comodidad, ante todo. Con el calzado que tengo ahora me duelen los pies.','"Avoir mal aux pieds" = dolerle a uno los pies: "aux" porque son varios.',7),
('accueil-client','you','Si je comprends bien, il vous faut quelque chose de confortable, pour marcher et pour des randonnées faciles. Je vous montre deux modèles ?','Si lo entiendo bien, necesita algo cómodo, para caminar y para rutas fáciles. ¿Le enseño dos modelos?','Reformular antes de enseñar nada: si has entendido mal, te corrige ahora y no tras diez minutos. "Il vous faut" = necesita.',8),

-- ── 14. ACONSEJAR Y CERRAR LA VENTA ─────────────────────
('argumenter-conclure','key','Ce modèle est plus léger, et il tient mieux le pied.','Este modelo es más ligero y sujeta mejor el pie.','"Tenir le pied" = sujetar el pie. Ventaja concreta, no "es muy bueno": el cliente quiere saber qué gana.',1),
('argumenter-conclure','key','Pour ce que vous cherchez, c''est le meilleur rapport qualité-prix.','Para lo que busca, es la mejor relación calidad-precio.','"Pour ce que vous cherchez" une el argumento con lo que te dijo. Así no suena a discurso aprendido.',2),
('argumenter-conclure','key','Je comprends, c''est un investissement. Mais il va vous durer plusieurs saisons.','Lo entiendo, es una inversión. Pero le va a durar varias temporadas.','Primero dar la razón, luego el argumento. "C''est un investissement" = es una inversión: das la razón sobre el precio y lo cambias de gasto a inversión.''est pas cher".',3),
('argumenter-conclure','key','Si c''est trop cher, j''ai aussi un modèle à cent dix-neuf francs.','Si es demasiado caro, también tengo un modelo de ciento diecinueve francos.','Ofrecer algo más barato no es perder la venta: es no perder al cliente. "Dix-neuf" suena "diz-nëf".',4),
('argumenter-conclure','key','Qu''est-ce qui vous fait hésiter ?','¿Qué es lo que le hace dudar?','Cuando oyes "je vais réfléchir", esta pregunta saca la duda real: el precio, la talla, el color… Y a esa sí puedes responder.',5),
('argumenter-conclure','key','Si vous voulez, je vous le mets de côté jusqu''à demain.','Si quiere, se lo aparto hasta mañana.','"Mettre de côté" = apartar. Le das tiempo sin perder la venta; y quien aparta, suele volver.',6),
('argumenter-conclure','key','Avec ces chaussures, je vous conseille aussi des chaussettes techniques.','Con estas zapatillas, le recomiendo también unos calcetines técnicos.','El complemento, sólo si sirve de verdad y con su motivo: "…pour éviter les ampoules" (para que no salgan ampollas).',7),
('argumenter-conclure','key','Alors, je vous les emballe ?','Entonces, ¿se las envuelvo?','Cierre natural: das por hecho el sí, pero en pregunta. Si dice que no, vuelves a "qu''est-ce qui vous fait hésiter ?".',8),
('argumenter-conclure','customer','Elles sont bien, mais cent huitante-neuf francs… c''est un peu cher.','Están bien, pero ciento ochenta y nueve francos… es un poco caro.','En Vaud (Leysin) se dice huitante: 189 = "cent huitante-neuf". En Ginebra oirás "cent quatre-vingt-neuf".',1),
('argumenter-conclure','you','Je comprends, c''est un investissement. Mais elles sont imperméables, et elles vont vous durer plusieurs saisons.','Lo entiendo, es una inversión. Pero son impermeables y le van a durar varias temporadas.','Primero "je comprends"; después, la ventaja concreta. "Elles" porque "les chaussures" es femenino.',2),
('argumenter-conclure','customer','Oui… Je vais réfléchir.','Sí… Me lo voy a pensar.','"Je vais réfléchir" = me lo voy a pensar. Muchas veces es el precio, dicho con educación.',3),
('argumenter-conclure','you','Bien sûr. Qu''est-ce qui vous fait hésiter : le prix ou le modèle ?','Claro. ¿Qué le hace dudar: el precio o el modelo?','Dar dos opciones hace más fácil contestar. Si es el precio, tienes algo que proponer.',4),
('argumenter-conclure','customer','Plutôt le prix. Je ne voulais pas mettre plus de cent cinquante francs.','Más bien el precio. No quería gastarme más de ciento cincuenta francos.','"Mettre" + dinero = gastarse. "Plutôt" = más bien.',5),
('argumenter-conclure','you','Alors regardez celles-ci : cent vingt-neuf francs. Elles sont un peu moins techniques, mais très confortables.','Entonces mire estas: ciento veintinueve francos. Son algo menos técnicas, pero muy cómodas.','Honestidad: dices lo que pierde ("moins techniques") y lo que conserva. Así te cree con lo demás.',6),
('argumenter-conclure','customer','Ah oui, elles sont bien aussi. Je préfère celles-là.','Ah, sí, también están bien. Prefiero esas.','"Celles-là" = esas (las zapatillas). Con "un modèle" sería "celui-là".',7),
('argumenter-conclure','you','Très bon choix. Avec ça, je vous conseille des chaussettes de randonnée, pour éviter les ampoules. On passe à la caisse ?','Muy buena elección. Con esto le recomiendo unos calcetines de senderismo, para evitar ampollas. ¿Pasamos por caja?','"Une ampoule" = una ampolla (y también una bombilla). El complemento con su motivo, y el cierre en pregunta.',8),

-- ── 15. ALQUILER DE ESQUÍS ──────────────────────────────
('location-skis','key','Vous skiez à quel niveau : débutant, moyen ou confirmé ?','¿Qué nivel tiene esquiando: principiante, medio o avanzado?','"Confirmé" = avanzado, con experiencia; "débutant" = principiante. El nivel decide el esquí y el reglaje de las fijaciones.',1),
('location-skis','key','Quelle est votre pointure ?','¿Qué número calza?','"La pointure" = el número de calzado; "la taille" es la talla de ropa (y también la estatura).',2),
('location-skis','key','Vous mesurez combien, et vous pesez combien ?','¿Cuánto mide y cuánto pesa?','Hace falta para el largo del esquí y para ajustar las fijaciones. "Mesurer" = medir; "peser" = pesar. Es técnico: pregúntalo con naturalidad.',3),
('location-skis','key','Vous voulez aussi un casque ?','¿Quiere también un casco?','"Le casque" = el casco (y también los auriculares). Con niños, ofrécelo siempre.',4),
('location-skis','key','C''est pour combien de jours ?','¿Para cuántos días es?','Cuantos más días, más barato sale cada día: por eso se pregunta pronto. En "jours" la s no suena.',5),
('location-skis','key','Pour six jours, ça fait cent septante-cinq francs.','Para seis días son ciento setenta y cinco francos.','"Septante-cinq" = 75, en toda la Romandía. La x de "six" no suena delante de consonante: "six jours" se dice "si jours", con la j francesa, suave, como la "ll" argentina; nunca como la jota.',6),
('location-skis','key','Il faut laisser une pièce d''identité en caution.','Hay que dejar un documento de identidad como fianza.','FALSO AMIGO: "la caution" = la fianza, el depósito; no es "precaución". Según la tienda, vale el documento o la tarjeta.',7),
('location-skis','key','Vous voulez l''assurance casse et vol ? C''est dix pour cent du prix.','¿Quiere el seguro de rotura y robo? Es un diez por ciento del precio.','"La casse" = la rotura; "le vol" = el robo (y también el vuelo). El porcentaje es de ejemplo: el real es el de tu tienda.',8),
('location-skis','customer','Bonjour ! Je voudrais louer des skis pour la semaine, s''il vous plaît.','¡Buenos días! Quería alquilar unos esquís para la semana, por favor.','"Louer" = alquilar; "la location" = el alquiler. Nada que ver con "localización".',1),
('location-skis','you','Bonjour ! Bien sûr. Vous skiez à quel niveau ?','¡Buenos días! Claro. ¿Qué nivel tiene esquiando?','Lo primero, el nivel: de él depende todo lo demás.',2),
('location-skis','customer','Moyen, je dirais. Je fais les pistes rouges, mais pas trop vite.','Medio, diría yo. Bajo pistas rojas, pero no muy rápido.','En Suiza las pistas son azules (fáciles), rojas (medias) y negras (difíciles); la verde es cosa de Francia. "Faire une piste" = bajarla.',3),
('location-skis','you','D''accord. Quelle est votre pointure ? Et vous mesurez combien, et vous pesez combien ?','Vale. ¿Qué número calza? ¿Y cuánto mide y cuánto pesa?','Tres preguntas seguidas es lo normal en el mostrador: apunta las respuestas en la ficha mientras contesta.',4),
('location-skis','customer','Je fais du quarante-trois. Je mesure un mètre huitante, et je pèse septante-cinq kilos.','Calzo un cuarenta y tres. Mido un metro ochenta y peso setenta y cinco kilos.','En Vaud (Leysin) se dice huitante: 1,80 m = "un mètre huitante". En Ginebra oirás "un mètre quatre-vingts".',5),
('location-skis','you','Parfait. Pour six jours, skis, chaussures et bâtons, ça fait cent septante-cinq francs. Vous voulez l''assurance casse et vol ?','Perfecto. Para seis días, esquís, botas y bastones, son ciento setenta y cinco francos. ¿Quiere el seguro de rotura y robo?','En el alquiler, las botas son "les chaussures" a secas. "Les bâtons" = los bastones.',6),
('location-skis','customer','Oui, d''accord. Et je dois rendre le matériel quand ?','Sí, vale. ¿Y cuándo tengo que devolver el material?','"Rendre" = devolver. "Le matériel" = el equipo.',7),
('location-skis','you','Le dernier jour, avant dix-sept heures. Je vous demande juste une pièce d''identité en caution. Bonne glisse !','El último día, antes de las cinco de la tarde. Solo le pido un documento de identidad como fianza. ¡Que disfrute esquiando!','"Bonne glisse !" es la despedida de cualquier tienda de esquí. Y repite la hora de devolución: es lo que más se olvida.',8),

-- ── 16. EN RECEPCIÓN: INFORMAR A UN TURISTA ─────────────
('accueil-infos','key','Les remontées ouvrent à huit heures trente et ferment à seize heures trente.','Los remontes abren a las ocho y media y cierran a las cuatro y media.','En horarios de servicio se usa el formato de 24 horas: "seize heures trente". "Quatre heures et demie" es de conversación.',1),
('accueil-infos','key','Le forfait journée coûte cinquante-neuf francs pour un adulte.','El forfait de un día cuesta cincuenta y nueve francos por adulto.','Precio de ejemplo: mira siempre la tarifa del día, que en muchas estaciones cambia según la demanda. "La journée" = el día entero.',2),
('accueil-infos','key','Vous pouvez l''acheter à la caisse ou en ligne, c''est souvent moins cher.','Puede comprarlo en la taquilla o por internet, que suele salir más barato.','"En ligne" = por internet. "La caisse" de los remontes es la taquilla.',3),
('accueil-infos','key','Demain, il va faire beau le matin, mais il va neiger l''après-midi.','Mañana hará bueno por la mañana, pero nevará por la tarde.','El tiempo va con "il fait": "il fait beau, il fait froid". Y para el parte, el futuro próximo ("il va neiger") es lo más natural.',4),
('accueil-infos','key','Je vous conseille le restaurant en haut de la télécabine : la vue est magnifique.','Le recomiendo el restaurante de arriba de la telecabina: las vistas son preciosas.','"La vue" = las vistas, en singular. "En haut de" = arriba de; "en bas de" = abajo de.',5),
('accueil-infos','key','Pour une fondue, allez au village : il y a un très bon restaurant près de l''église.','Para una fondue, vaya al pueblo: hay un restaurante muy bueno cerca de la iglesia.','Recomendar algo concreto queda mucho mejor que "il y a beaucoup de restaurants". "Près de" = cerca de.',6),
('accueil-infos','key','C''est à cinq minutes à pied : à gauche en sortant, puis tout droit.','Está a cinco minutos andando: a la izquierda al salir y luego todo recto.','"Tout droit" (todo recto, la t final no suena) ≠ "à droite" (a la derecha, la t sí suena). Se confunden mucho. "En sortant" = al salir.',7),
('accueil-infos','key','Le bus pour la gare passe toutes les vingt minutes.','El autobús a la estación pasa cada veinte minutos.','"Toutes les vingt minutes" = cada veinte minutos. "La gare" es la estación de tren; la de esquí es "la station".',8),
('accueil-infos','customer','Bonjour ! Excusez-moi, les remontées mécaniques ouvrent à quelle heure, demain ?','¡Buenos días! Perdone, ¿a qué hora abren mañana los remontes?','"Les remontées mécaniques" = los remontes. Mucha gente dice sólo "les remontées".',1),
('accueil-infos','you','Bonjour ! À huit heures trente, et elles ferment à seize heures trente.','¡Buenos días! A las ocho y media, y cierran a las cuatro y media.','Con turistas que hablan poco francés: despacio, claro, y la hora repetida si hace falta.',2),
('accueil-infos','customer','Et le forfait, il coûte combien ? On est deux adultes et un enfant de dix ans.','¿Y el forfait cuánto cuesta? Somos dos adultos y un niño de diez años.','"On est deux" = somos dos. "On" en vez de "nous" es lo normal hablando.',3),
('accueil-infos','you','Pour une journée, c''est cinquante-neuf francs par adulte et trente francs pour l''enfant. Ça fait cent quarante-huit francs en tout.','Para un día son cincuenta y nueve francos por adulto y treinta por el niño. En total, ciento cuarenta y ocho francos.','Dar el total ahorra la siguiente pregunta. "En tout" = en total. Precios de ejemplo.',4),
('accueil-infos','customer','Merci. Et il va faire beau, demain ?','Gracias. ¿Y mañana hará bueno?','La pregunta que te harán cada mañana: mira el parte antes de empezar el turno.',5),
('accueil-infos','you','Le matin, oui, mais il va neiger l''après-midi. Je vous conseille de skier le matin.','Por la mañana sí, pero por la tarde nevará. Le aconsejo esquiar por la mañana.','"Conseiller DE" + infinitivo: "je vous conseille de skier". Sin el "de" no funciona.',6),
('accueil-infos','customer','D''accord. Et pour souper ce soir, vous avez une bonne adresse ?','Vale. ¿Y para cenar esta noche, me recomienda algún sitio?','En Suiza "souper" = cenar; un turista de Francia dirá "dîner" para lo mismo. "Une bonne adresse" = un sitio recomendable.',7),
('accueil-infos','you','Oui, pour une fondue, il y a un très bon restaurant au village, près de l''église. C''est à cinq minutes à pied. Je vous conseille de réserver.','Sí, para una fondue hay un restaurante muy bueno en el pueblo, cerca de la iglesia. Está a cinco minutos andando. Le aconsejo reservar.','Algo concreto, a cuánto está y un consejo útil: en temporada alta, en estación, todo se llena.',8),

-- ── 17. UN CLIENTE DESCONTENTO ──────────────────────────
('client-mecontent','key','Je suis vraiment désolé, je comprends que ce soit embêtant.','Lo siento de verdad, entiendo que sea un fastidio.','"Je comprends que" + subjuntivo: "ce soit". "Embêtant" = fastidioso. Disculparse por la situación no es reconocer una culpa.',1),
('client-mecontent','key','Qu''est-ce qui s''est passé, exactement ?','¿Qué ha pasado exactamente?','Déjale contarlo entero, sin cortar: mientras habla se calma, y tú entiendes qué necesita.',2),
('client-mecontent','key','Vous avez la quittance, ou la carte avec laquelle vous avez payé ?','¿Tiene el tique, o la tarjeta con la que pagó?','Sin tique, muchas veces se encuentra la compra con la tarjeta. "La quittance" = el tique, en Suiza.',3),
('client-mecontent','key','Ce n''est pas normal, on va trouver une solution.','Esto no es normal; vamos a encontrar una solución.','Darle la razón en lo que la tiene, sin culpar a nadie: ni a la marca ni al compañero. "On" = nosotros, la tienda.',4),
('client-mecontent','key','Je peux vous proposer un échange ou un remboursement.','Le puedo ofrecer un cambio o un reembolso.','"Proposer" = ofrecer. Dos opciones le devuelven al cliente la sensación de control.',5),
('client-mecontent','key','Si vous préférez, je vous fais un bon d''achat du même montant.','Si lo prefiere, le hago un vale por el mismo importe.','"Le montant" = el importe. El vale, como opción: si le corresponde el dinero y lo quiere, no se lo cambies por un vale.',6),
('client-mecontent','key','Pour ça, je dois voir avec mon responsable. Je reviens tout de suite.','Para eso tengo que consultarlo con mi responsable. Vuelvo enseguida.','"Voir avec quelqu''un" = consultarlo con alguien. Si no está en tu mano, dilo así: no es un fracaso, es el procedimiento.',7),
('client-mecontent','key','Je vous présente nos excuses pour ce désagrément.','Le pedimos disculpas por las molestias.','"Un désagrément" = una molestia, un contratiempo. Fórmula formal para cerrar el conflicto.',8),
('client-mecontent','customer','Bonjour. J''ai acheté cette veste il y a deux semaines, et la fermeture éclair est déjà cassée !','Buenos días. Compré esta chaqueta hace dos semanas, ¡y la cremallera ya está rota!','"La fermeture éclair" = la cremallera. "Il y a deux semaines" = hace dos semanas.',1),
('client-mecontent','you','Oh, je suis vraiment désolé. Qu''est-ce qui s''est passé, exactement ?','Vaya, lo siento de verdad. ¿Qué ha pasado exactamente?','Primero la disculpa por la situación; después, que lo cuente. No defiendas el producto.',2),
('client-mecontent','customer','Rien de spécial ! Je l''ai fermée ce matin, et elle s''est cassée. Pour trois cents francs, ce n''est pas normal.','¡Nada especial! La cerré esta mañana y se rompió. Por trescientos francos, no es normal.','"Trois cents francs": la s de "cents" no suena delante de consonante; sólo se liga delante de vocal ("trois cents euros").',3),
('client-mecontent','you','Vous avez raison, ce n''est pas normal. Vous avez la quittance ?','Tiene razón, no es normal. ¿Tiene el tique?','Darle la razón en lo que la tiene calma más que cualquier explicación.',4),
('client-mecontent','customer','Oui, la voilà. Mais je pars dimanche, je n''ai pas le temps d''attendre une réparation.','Sí, aquí está. Pero me voy el domingo; no tengo tiempo de esperar a que la arreglen.','OJO: "attendre" = esperar. Y ahí está su problema real: se va el domingo.',5),
('client-mecontent','you','Je comprends. Je peux vous proposer un échange contre la même veste, ou un remboursement.','Lo entiendo. Le puedo ofrecer cambiársela por la misma chaqueta, o devolverle el dinero.','"Échanger contre" = cambiar por. Las dos opciones resuelven SU problema: se va hoy con la solución.',6),
('client-mecontent','customer','Un échange, alors. Mais je veux être sûr que la nouvelle ne va pas se casser.','Un cambio, entonces. Pero quiero estar seguro de que la nueva no se va a romper.','Desconfianza normal: no la discutas, demuéstrale que la nueva funciona.',7),
('client-mecontent','you','Bien sûr. On la vérifie ensemble, tout de suite. Et je vous présente nos excuses pour ce désagrément.','Claro. La comprobamos juntos ahora mismo. Y le pedimos disculpas por las molestias.','Comprobarla delante de él demuestra que te lo tomas en serio. La disculpa formal, al final, cierra el conflicto.',8),

-- ── 18. AL TELÉFONO DEL NEGOCIO ─────────────────────────
('telephone-client','key','Restaurant Le Chalet, bonjour, Edwin à l''appareil.','Restaurante Le Chalet, buenos días, le atiende Edwin.','Así se coge el teléfono de un negocio: nombre del sitio, saludo y tu nombre. "À l''appareil" = al habla.',1),
('telephone-client','key','C''est pour combien de personnes, et pour quel jour ?','¿Para cuántas personas y qué día?','Las dos preguntas de toda reserva. Apunta mientras te contestan.',2),
('telephone-client','key','Samedi soir, il nous reste une table à vingt heures trente.','El sábado por la noche nos queda una mesa a las ocho y media.','"Il nous reste" = nos queda. Si lo que piden está lleno, propón otra hora antes de decir que no.',3),
('telephone-client','key','C''est à quel nom ?','¿A nombre de quién?','La pregunta de toda reserva. Si no lo entiendes a la primera: "Vous pouvez épeler, s''il vous plaît ?".',4),
('telephone-client','key','Je répète : D, U, F, O, U, R. C''est bien ça ?','Repito: D, U, F, O, U, R. ¿Es correcto?','Deletrear de vuelta evita errores. La U se dice con labios de silbar y lengua de i; la R, "èr"; la E, "ë".',5),
('telephone-client','key','Vous pouvez me laisser un numéro de téléphone ?','¿Me puede dejar un número de teléfono?','Para confirmar o avisar si hay un cambio. "Laisser" = dejar.',6),
('telephone-client','key','Alors, le zéro septante-neuf, quatre cent nonante-deux, dix-huit, septante, c''est ça ?','Entonces, el 079 492 18 70, ¿es así?','Los números suizos se dicen por grupos: 079 / 492 / 18 / 70. Septante (70) y nonante (90), en toda la Romandía. Repítelo siempre en voz alta.',7),
('telephone-client','key','Il n''est pas là pour le moment. Vous voulez lui laisser un message ?','Ahora mismo no está. ¿Quiere dejarle un recado?','Para el recado: quién llama, su número y de qué se trata. "Je lui transmets" = se lo paso.',8),
('telephone-client','customer','Allô, bonjour ! C''est bien le restaurant Le Chalet ?','Hola, buenos días. ¿Es el restaurante Le Chalet?','"Allô" sólo se dice al teléfono. Si coges diciendo el nombre del sitio, te ahorras esta pregunta.',1),
('telephone-client','you','Oui, bonjour, Edwin à l''appareil. Qu''est-ce que je peux faire pour vous ?','Sí, buenos días, le atiende Edwin. ¿En qué puedo ayudarle?','"Qu''est-ce que je peux faire pour vous ?" = ¿en qué le puedo ayudar? Abierta y amable.',2),
('telephone-client','customer','Je voudrais réserver une table pour six personnes, samedi soir, vers dix-neuf heures.','Quería reservar una mesa para seis personas, el sábado por la noche, sobre las siete.','"Vers" + hora = sobre, hacia. "Dix-neuf heures": la f suena v, "diz-në-vër".',3),
('telephone-client','you','Je regarde… À dix-neuf heures, c''est complet, mais il nous reste une table à vingt heures trente. Ça vous irait ?','Miro… A las siete está completo, pero nos queda una mesa a las ocho y media. ¿Le iría bien?','"Ça vous irait ?" = ¿le iría bien? Condicional de "aller", más cortés que "ça vous va ?".',4),
('telephone-client','customer','Oui, parfait. C''est au nom de Dufour : D, U, F, O, U, R.','Sí, perfecto. Es a nombre de Dufour: D, U, F, O, U, R.','Cuando deletrean rápido, apunta letra a letra y repite el nombre entero al final.',5),
('telephone-client','you','Dufour, six personnes, samedi à vingt heures trente. Vous pouvez me laisser un numéro de téléphone ?','Dufour, seis personas, el sábado a las ocho y media. ¿Me puede dejar un número de teléfono?','Repetir la reserva entera de una vez: nombre, personas, día y hora. Así nadie se presenta el día que no es.',6),
('telephone-client','customer','Le zéro septante-neuf, quatre cent nonante-deux, dix-huit, septante. Et mon fils est allergique aux noix : je peux parler au chef ?','El 079 492 18 70. Y mi hijo es alérgico a las nueces: ¿puedo hablar con el cocinero?','"Les noix" = las nueces; los frutos secos de cáscara en general son "les fruits à coque". "Le chef" = el jefe de cocina.',7),
('telephone-client','you','Le zéro septante-neuf, quatre cent nonante-deux, dix-huit, septante. Le chef n''est pas là pour le moment, mais je lui transmets le message, et il vous rappelle cet après-midi.','El 079 492 18 70. El cocinero no está ahora mismo, pero le paso el recado y le devuelve la llamada esta tarde.','El número, siempre de vuelta en voz alta. Y con una alergia no improvises: recado al chef, por escrito.',8)

) AS v(slug, kind, en, es, note, ord) ON v.slug = s.slug;

-- ══════════════════════ PALABRAS ══════════════════════
-- En el orden de un día de mostrador: recibir, preguntar, aconsejar, objeción y
-- cierre, ofertas, almacén, esperas, caja, despedida, problemas y teléfono.
-- Van a una tabla temporal porque se usan dos veces: para insertarlas y para
-- crear SÓLO sus user_words.
CREATE TEMP TABLE m36_palabras (word text, translation text, example text, level text, ord int) ON COMMIT DROP;

INSERT INTO m36_palabras (word, translation, example, level, ord) VALUES
  -- Recibir sin agobiar.
  ('Je peux vous aider ?', '¿Le puedo ayudar? — siempre después del "bonjour", y sin abalanzarse: deja unos segundos al cliente', 'Bonjour Madame ! Je peux vous aider, ou vous préférez regarder tranquillement ?', 'A2', 1),
  ('Je vous laisse regarder.', 'Le dejo mirar tranquilo — la respuesta a "je regarde seulement": espacio, pero cerca', 'Pas de souci, je vous laisse regarder. Je suis juste à côté.', 'A2', 2),
  ('Prenez votre temps.', 'Tómese su tiempo, sin prisa', 'Prenez votre temps, je suis à la caisse si besoin.', 'A2', 3),
  ('N''hésitez pas si vous avez des questions.', 'Si tiene cualquier duda, pregúnteme — literalmente "no dude"', 'Je vous laisse essayer. N''hésitez pas si vous avez des questions.', 'A2', 4),
  ('On s''occupe de vous ?', '¿Ya le atienden? — OJO: atender a un cliente es "s''occuper de" o "servir"; "attendre" es esperar', 'Bonjour Monsieur, on s''occupe de vous ?', 'A2', 5),
  ('Je suis à vous tout de suite.', 'Enseguida le atiendo — para que quien espera sepa que le has visto', 'Bonjour ! Je termine avec Madame et je suis à vous tout de suite.', 'A2', 6),
  ('C''est à qui ?', '¿A quién le toca? — en el mostrador, cuando hay cola', 'Merci, au revoir ! C''est à qui, maintenant ?', 'A2', 7),
  -- Averiguar qué busca.
  ('Vous cherchez quelque chose de précis ?', '¿Busca algo en concreto?', 'Vous cherchez quelque chose de précis, ou vous regardez ?', 'A2', 8),
  ('C''est pour offrir ?', '¿Es para regalo? — "offrir" = regalar, y también invitar ("je t''offre un café")', 'C''est pour vous, ou c''est pour offrir ?', 'A2', 9),
  ('Vous allez l''utiliser pour quoi ?', '¿Para qué lo va a usar? — la pregunta que te deja aconsejar de verdad', 'Vous allez l''utiliser pour quoi : plutôt la piste ou la randonnée ?', 'A2', 10),
  ('Vous avez un budget ?', '¿Tiene un presupuesto pensado? — pregúntalo con naturalidad: te ahorra enseñar lo que no va a comprar', 'Vous avez un budget, à peu près ? Comme ça, je vous montre ce qui correspond.', 'A2', 11),
  ('Vous faites quelle taille ?', '¿Qué talla tiene? — de ropa; para el calzado, "vous chaussez du combien ?"', 'Vous faites quelle taille ? Cette veste taille un peu grand.', 'A2', 12),
  -- Aconsejar.
  ('Je vous conseille celui-ci.', 'Le recomiendo este — "celle-ci" si es femenino: une veste, une chaussure', 'Pour la montagne, je vous conseille celui-ci : il est plus léger.', 'A2', 13),
  ('C''est notre meilleure vente.', 'Es lo que más vendemos', 'Ce sac à dos, c''est notre meilleure vente cet hiver.', 'A2', 14),
  ('le rapport qualité-prix', 'la relación calidad-precio', 'Ce modèle a un excellent rapport qualité-prix.', 'B1', 15),
  ('À votre place, je prendrais celui-ci.', 'Yo que usted, me llevaría este — "à votre place" = en su lugar; el condicional suaviza el consejo', 'Pour débuter, à votre place, je prendrais celui-ci.', 'B1', 16),
  ('Je l''ai moi-même.', 'Yo mismo lo tengo — la recomendación personal convence más que la ficha técnica; dilo sólo si es verdad', 'Je l''ai moi-même, et après une saison, il est comme neuf.', 'A2', 17),
  ('Ça vaut la peine.', 'Merece la pena — muy usado en Suiza; en Francia también "ça vaut le coup"', 'Il coûte vingt francs de plus, mais ça vaut la peine : il est imperméable.', 'B1', 18),
  -- La objeción y el cierre.
  ('Je vais réfléchir.', 'Me lo voy a pensar — lo dice el cliente; no insistas: pregunta qué le hace dudar u ofrécete a apartárselo', 'Merci, il est très bien, mais je vais réfléchir.', 'A2', 19),
  ('Qu''est-ce qui vous fait hésiter ?', '¿Qué es lo que le hace dudar? — saca la objeción real: el precio, la talla, el color', 'Bien sûr. Qu''est-ce qui vous fait hésiter : le prix ou la taille ?', 'B1', 20),
  ('Je comprends tout à fait.', 'Lo entiendo perfectamente — primero darle la razón; después, el argumento', 'Je comprends tout à fait, c''est un investissement.', 'A2', 21),
  ('Je ne peux pas baisser le prix, mais', 'No puedo bajar el precio, pero… — y ofreces otra cosa: un modelo más barato, uno en oferta, la tarjeta de cliente', 'Je ne peux pas baisser le prix, mais l''ancien modèle est en action à cent vingt francs.', 'B1', 22),
  ('Je vous le mets de côté ?', '¿Se lo aparto? — "mettre de côté" = apartar, reservar un artículo', 'Si vous voulez réfléchir, je vous le mets de côté jusqu''à demain.', 'B1', 23),
  ('Il vous faut autre chose ?', '¿Necesita algo más?', 'Voilà vos skis. Il vous faut autre chose ? Des gants, un bonnet ?', 'A2', 24),
  ('Et avec ceci ?', '¿Algo más? — muy de panadería y de tienda en Suiza; se contesta "ce sera tout, merci"', 'Un pain complet et deux croissants. Et avec ceci ?', 'A2', 25),
  ('Ce sera tout ?', '¿Será todo?, ¿nada más? — y pasas a cobrar', 'Deux paires de chaussettes. Ce sera tout ?', 'A2', 26),
  ('Je vous fais un paquet cadeau ?', '¿Se lo envuelvo para regalo?', 'C''est pour offrir ? Je vous fais un paquet cadeau ?', 'A2', 27),
  -- Ofertas.
  ('à moitié prix', 'a mitad de precio', 'Cette semaine, la deuxième paire est à moitié prix.', 'A2', 28),
  ('moins trente pour cent', 'un 30 % de descuento — así se lee el cartel "-30 %"; el descuento en general, en Suiza, es "le rabais"', 'Toute la collection d''été est à moins trente pour cent.', 'A2', 29),
  ('Vous avez notre carte de fidélité ?', '¿Tiene nuestra tarjeta de cliente?', 'Vous avez notre carte de fidélité ? Vous avez dix pour cent sur cet article.', 'A2', 30),
  -- Cuando no está en tienda.
  ('Je vais voir en réserve.', 'Voy a mirar en el almacén — y vuelve rápido: "je reviens tout de suite"', 'Le quarante-trois ? Je vais voir en réserve, je reviens tout de suite.', 'A2', 31),
  ('On peut vous le commander.', 'Se lo podemos pedir — cuando no está en tienda', 'On ne l''a plus en bleu, mais on peut vous le commander.', 'A2', 32),
  ('Je vous appelle dès qu''il arrive.', 'Le llamo en cuanto llegue — "dès que" = en cuanto', 'Laissez-moi votre numéro, je vous appelle dès qu''il arrive.', 'B1', 33),
  ('C''est le dernier dans cette taille.', 'Es el último que queda en esta talla — un dato, no una presión: dilo sólo si es verdad', 'C''est le dernier dans cette taille, il n''y en a plus en réserve.', 'A2', 34),
  -- Hacer esperar.
  ('Un petit instant, s''il vous plaît.', 'Un momentito, por favor', 'Un petit instant, s''il vous plaît, je vérifie le prix.', 'A2', 35),
  ('Désolé pour l''attente.', 'Perdone la espera — "l''attente" = la espera', 'Désolé pour l''attente, il y avait beaucoup de monde.', 'A2', 36),
  ('Merci de votre patience.', 'Gracias por su paciencia', 'Voilà, c''est réglé. Merci de votre patience.', 'A2', 37),
  -- Cobrar.
  ('Je vous attends à la caisse.', 'Le espero en la caja — OJO: "attendre" = esperar, no atender', 'Prenez votre temps, je vous attends à la caisse.', 'A2', 38),
  ('Vous avez l''appoint ?', '¿Lo tiene justo? — "l''appoint" = el importe exacto, sin que haya que dar cambio', 'Ça fait douze francs quarante. Vous avez l''appoint ?', 'B1', 39),
  ('Tapez votre code, s''il vous plaît.', 'Marque el PIN, por favor — "le code" = el PIN de la tarjeta', 'Le montant est élevé : tapez votre code, s''il vous plaît.', 'A2', 40),
  ('C''est passé.', 'Ya está, el pago ha entrado — lo dices mirando el terminal', 'C''est passé, vous pouvez retirer votre carte.', 'A2', 41),
  -- Despedir.
  ('Merci de votre visite.', 'Gracias por su visita', 'Voici votre quittance. Merci de votre visite !', 'A2', 42),
  ('Bonne fin de journée !', '¡Que acabe bien el día! — por la tarde; por la mañana, "bonne journée"', 'Merci à vous, et bonne fin de journée !', 'A2', 43),
  ('Bonne glisse !', '¡Que disfrute esquiando! — la despedida de las tiendas y alquileres de estación', 'Vos skis sont prêts. Bonne glisse !', 'A2', 44),
  ('Je vous en prie.', 'No hay de qué — formal; "Service !" es lo suizo de todos los días. También sirve para ceder el paso: "après vous, je vous en prie"', 'Je vous en prie, Madame, et bonne journée.', 'A2', 45),
  -- Cuando algo sale mal.
  ('Je suis vraiment désolé.', 'Lo siento de verdad — "désolée" si lo dice una mujer; suena igual', 'Je suis vraiment désolé, ce n''est pas normal.', 'A2', 46),
  ('On va trouver une solution.', 'Vamos a encontrar una solución — calma al cliente sin prometer todavía nada concreto', 'Ne vous inquiétez pas, on va trouver une solution.', 'A2', 47),
  ('Je vais chercher mon responsable.', 'Voy a buscar a mi responsable — "le responsable" o "le gérant", el encargado', 'Pour un remboursement sans quittance, je vais chercher mon responsable.', 'A2', 48),
  ('Je vous présente nos excuses.', 'Le pedimos disculpas — formal, en nombre de la tienda, sin echar la culpa a nadie', 'Je vous présente nos excuses pour ce désagrément.', 'B1', 49),
  -- Al teléfono.
  ('Je vous écoute.', 'Dígame — al teléfono, después del nombre del sitio y del saludo', 'Restaurant Le Chalet, bonjour, je vous écoute.', 'A2', 50),
  ('C''est de la part de qui ?', '¿De parte de quién?', 'Monsieur Favre est en réunion. C''est de la part de qui ?', 'A2', 51),
  ('Vous pouvez épeler, s''il vous plaît ?', '¿Me lo puede deletrear, por favor? — "épeler" = deletrear', 'Votre nom de famille ? Vous pouvez épeler, s''il vous plaît ?', 'A2', 52),
  ('Vous voulez laisser un message ?', '¿Quiere dejar un recado?', 'Elle n''est pas là cet après-midi. Vous voulez laisser un message ?', 'A2', 53),
  ('Ne quittez pas.', 'No cuelgue — "quitter" = dejar, irse; nada que ver con quitar', 'Ne quittez pas, je vous passe la location de skis.', 'A2', 54);

INSERT INTO words (word, translation, example_sentence, level, category, lang)
SELECT v.word, v.translation, v.example, v.level, 'work', 'fr'
FROM m36_palabras v
WHERE NOT EXISTS (SELECT 1 FROM words w WHERE w.lang = 'fr' AND lower(w.word) = lower(v.word))
ORDER BY v.ord;

-- ── Cola: las primeras de las nuevas (10-oct, antes que restauración, 11-oct) ──
-- Sólo las de esta migración: se buscan por texto, con su categoría.
INSERT INTO user_words (profile_id, word_id, next_review_date)
SELECT 1, w.id, DATE '2026-10-10'
FROM words w
JOIN m36_palabras v ON lower(v.word) = lower(w.word)
WHERE w.lang = 'fr' AND w.category = 'work'
  AND NOT EXISTS (SELECT 1 FROM user_words uw WHERE uw.profile_id = 1 AND uw.word_id = w.id)
ORDER BY v.ord;

COMMIT;

-- Comprobación:
--   SELECT s.order_index, s.slug, s.level,
--          count(*) FILTER (WHERE l.kind = 'key')  AS keys,
--          count(*) FILTER (WHERE l.kind <> 'key') AS turnos
--     FROM situations s
--     JOIN tracks t ON t.id = s.track_id AND t.slug = 'suisse-romande'
--     LEFT JOIN situation_lines l ON l.situation_id = s.id
--    GROUP BY s.id ORDER BY 1;
--   SELECT w.category, uw.next_review_date, count(*) FROM user_words uw JOIN words w ON w.id = uw.word_id
--    WHERE w.lang = 'fr' GROUP BY 1, 2 ORDER BY 2, 1;
