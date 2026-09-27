-- TutorIngles — migración 25: vocabulario de francés para la Suiza romanda
--
-- Idempotente. Aplicar como `postgres` (las tablas son suyas):
--   docker exec -i postgres psql -U postgres -d tutoringles -v ON_ERROR_STOP=1 < migration_25_frances_vocabulario.sql
--
-- Para quién: Edwin, dependiente en una tienda de deporte, que en un mes se va
-- a trabajar a un cantón francófono de Suiza (todavía sin saber cuál). A2 en
-- francés: entiende mucho y consigue decir muy poco. La meta es el DALF C1,
-- pero la urgencia es el mostrador del primer día.
--
-- EL ORDEN DE LAS FILAS ES EL ORDEN DE ESTUDIO. La app presenta las palabras
-- nuevas por id ascendente, 8 por ronda de 5 minutos: lo que se inserta antes
-- es lo que aprende antes. Postgres no garantiza que un INSERT … SELECT FROM
-- (VALUES …) respete el orden del VALUES, así que cada fila lleva `ord` y el
-- SELECT ordena por él. Cada bloque numera desde su centena (1, 101, 201,
-- 301, 401) para poder intercalar filas sin renumerar las demás.
--
-- Cinco bloques, por urgencia:
--   1. chunk    — frases de rescate para PRODUCIR: pedir que repitan, comprobar
--                 que has entendido, dar un rodeo cuando no sale la palabra,
--                 ganar tiempo. Van primero porque son su hueco exacto: sin
--                 ellas, el resto del vocabulario no sale de la boca.
--   2. suisse   — lo que va a oír la primera semana y no viene en los libros
--                 de Francia: números, comidas, "Service !", permisos, seguro,
--                 piso. Entender a tu jefe el primer día depende de esto.
--   3. work     — la tienda (vender material deportivo) y el contrato suizo.
--   4. general  — el primer mes: piso, compra, transporte, médico, banco.
--   5. academic — conectores y verbos del DALF C1, al final: es la meta, no
--                 la urgencia.
--
-- Los números, con cuidado: septante y nonante se dicen en TODA la Romandía;
-- huitante SÓLO en Vaud, Valais y Friburgo. En Ginebra, Neuchâtel y el Jura
-- se dice quatre-vingts, como en Francia. Como aún no se sabe el cantón, la
-- traducción lo dice explícitamente.
--
-- Criterio de las traducciones: español de España; lo que no es de toda la
-- Romandía lleva la región entre paréntesis, y las trampas para un
-- hispanohablante (falsos amigos, registro, construcción) van tras " — ".
-- En `word` no hay barras, paréntesis ni "qqn/qqch": se lee en voz alta con la
-- voz francesa y suena de noche como pista de audio, así que tiene que ser
-- exactamente lo que se dice.
--
-- Idempotencia: una palabra ya existente (mismo texto sin distinguir
-- mayúsculas, lang = 'fr') no se vuelve a insertar, y user_words sólo recibe
-- las que le falten.

BEGIN;

INSERT INTO words (word, translation, example_sentence, level, category, lang)
SELECT v.word, v.translation, v.example, v.level, v.category, 'fr'
FROM (VALUES
  -- ── 1. FRASES DE RESCATE ─────────────────────────────────
  -- Primero, no perderse: que repitan, que lo escriban, qué significa.
  ('Pouvez-vous répéter plus lentement, s''il vous plaît ?', '¿Puede repetirlo más despacio, por favor?', 'Pardon, pouvez-vous répéter plus lentement, s''il vous plaît ? Je n''ai pas tout saisi.', 'A2', 'chunk', 1),
  ('Pardon, je n''ai pas bien compris.', 'Perdone, no lo he entendido bien', 'Pardon, je n''ai pas bien compris : c''est le rayon du haut ou celui du bas ?', 'A2', 'chunk', 2),
  ('Qu''est-ce que ça veut dire ?', '¿Qué significa eso? — "vouloir dire" = significar', 'Désolé, « une quittance », qu''est-ce que ça veut dire ?', 'A2', 'chunk', 3),
  ('Comment dit-on ça en français ?', '¿Cómo se dice esto en francés?', 'En espagnol, c''est « plantilla ». Comment dit-on ça en français ?', 'A2', 'chunk', 4),
  ('Vous pouvez me l''écrire, s''il vous plaît ?', '¿Me lo puede escribir, por favor? — salvavidas con números, direcciones y nombres', 'Vous pouvez me l''écrire, s''il vous plaît ? Les chiffres au téléphone, j''ai encore du mal.', 'A2', 'chunk', 5),
  -- Cuando la palabra no sale: rodearla en vez de callarse.
  ('Je ne trouve pas le mot.', 'No me sale la palabra — dilo y sigue describiendo: nadie espera que te las sepas todas', 'Je ne trouve pas le mot… c''est ce qu''on met dans la chaussure pour être plus confortable.', 'A2', 'chunk', 6),
  ('Comment ça s''appelle ?', '¿Cómo se llama esto?', 'Comment ça s''appelle, ce petit sac qu''on porte autour de la taille pour courir ?', 'A2', 'chunk', 7),
  ('C''est un truc qui sert à', 'Es una cosa que sirve para… — "truc" es coloquial; con un cliente o por escrito: "un objet qui sert à"', 'C''est un truc qui sert à garder l''eau au frais pendant la randonnée.', 'B1', 'chunk', 8),
  ('C''est une sorte de', 'Es una especie de…', 'C''est une sorte de veste sans manches, pour courir quand il fait frais.', 'A2', 'chunk', 9),
  -- Comprobar lo entendido antes de actuar, no después.
  ('Si j''ai bien compris', 'Si lo he entendido bien… — para comprobar antes de hacer algo, no después', 'Si j''ai bien compris, je ferme la caisse à dix-huit heures trente et ensuite je range la réserve ?', 'B1', 'chunk', 10),
  ('C''est-à-dire ?', '¿Es decir? — pide que lo aclaren sin confesar que no has entendido nada', '— Il faut faire le réassort avant l''ouverture. — C''est-à-dire ? Je remplis les rayons ?', 'A2', 'chunk', 11),
  ('Vous voulez dire que', '¿Quiere decir que…? — repite con tus palabras lo que has entendido', 'Vous voulez dire que je travaille aussi le samedi ?', 'B1', 'chunk', 12),
  -- Reformular: la segunda oportunidad de decir lo que querías.
  ('Ce que je veux dire, c''est que', 'Lo que quiero decir es que…', 'Ce que je veux dire, c''est que ce modèle est plus confortable pour les longues distances.', 'B1', 'chunk', 13),
  ('Autrement dit', 'Dicho de otro modo, o sea', 'Le client a déjà porté les chaussures. Autrement dit, on ne peut pas les reprendre.', 'B1', 'chunk', 14),
  ('Je m''explique.', 'Me explico — gana un segundo antes de dar el detalle', 'Je m''explique : le client ne veut pas de remboursement, il veut la même paire en quarante-quatre.', 'B1', 'chunk', 15),
  ('Enfin, je veux dire', 'Bueno, quiero decir… — para corregirte sobre la marcha sin empezar de cero', 'Le client est passé hier, enfin, je veux dire avant-hier.', 'B1', 'chunk', 16),
  -- Ganar tiempo: mejor una muletilla francesa que un silencio o un "eeeh" español.
  ('Alors', 'Pues…, a ver… — para arrancar la frase mientras piensas', 'Alors… les chaussures de trail, elles sont au fond du magasin, à gauche.', 'A2', 'chunk', 17),
  ('Voyons voir', 'A ver, vamos a ver — mientras buscas algo o lo piensas', 'Voyons voir… oui, il nous reste une paire en quarante-deux.', 'A2', 'chunk', 18),
  ('Laissez-moi réfléchir une seconde.', 'Déjeme pensarlo un segundo — mucho mejor que un silencio largo', 'Laissez-moi réfléchir une seconde… je crois que ce modèle existe aussi en noir.', 'A2', 'chunk', 19),
  ('En fait', 'En realidad, pues resulta que — OJO: no confundir con "en effet", que es "efectivamente, así es"', 'En fait, je cherchais plutôt une chaussure pour la route, pas pour le trail.', 'A2', 'chunk', 20),
  ('Du coup', 'Así que, entonces — muy oral y familiar: en la tienda va bien; por escrito o en el DALF, "donc" o "par conséquent"', 'Le bus avait du retard, du coup je suis arrivé à neuf heures et quart.', 'B1', 'chunk', 21),
  ('Bref', 'En fin, total, resumiendo — cierra un rodeo y vuelve al grano', 'J''ai essayé trois modèles, aucun n''allait… bref, je prends le premier.', 'B1', 'chunk', 22),
  -- Pedir ayuda en el trabajo: la primera semana todo es preguntar.
  ('Est-ce que vous pourriez m''aider ?', '¿Podría ayudarme? — el condicional lo hace educado', 'Excusez-moi, est-ce que vous pourriez m''aider ? Je ne trouve pas le code pour les bons d''achat.', 'A2', 'chunk', 23),
  ('Je peux vous poser une question ?', '¿Le puedo hacer una pregunta? — OJO: "poser une question", nunca "faire une question"', 'Je peux vous poser une question ? On accepte les échanges sans ticket ?', 'A2', 'chunk', 24),
  ('Comment je fais pour', '¿Cómo hago para…? — la pregunta más útil de la primera semana', 'Comment je fais pour annuler un article déjà scanné ?', 'A2', 'chunk', 25),
  ('Vous pouvez me montrer comment on fait ?', '¿Me enseña cómo se hace? — OJO: "montrer" es enseñar en el sentido de mostrar; "enseigner" es enseñar una materia', 'Vous pouvez me montrer comment on fait ? Je préfère le voir une fois.', 'A2', 'chunk', 26),
  ('Désolé, je suis nouveau.', 'Perdone, soy nuevo — y ofrece enseguida una salida: "je vais demander à un collègue"', 'Désolé, je suis nouveau, je vais demander à ma collègue.', 'A2', 'chunk', 27),
  ('Je m''en occupe.', 'Yo me encargo, ya lo hago yo', 'Laisse, je m''en occupe : je range les cartons et je reviens.', 'B1', 'chunk', 28),
  ('Je reviens tout de suite.', 'Vuelvo enseguida', 'Je vais voir en réserve, je reviens tout de suite.', 'A2', 'chunk', 29),
  -- Dar la razón y discrepar sin sonar brusco.
  ('Je suis d''accord avec vous.', 'Estoy de acuerdo con usted', 'Je suis d''accord avec vous, ce modèle est plus léger.', 'A2', 'chunk', 30),
  ('Vous avez raison.', 'Tiene razón — OJO: con "avoir", nunca "être raison"', 'Vous avez raison, je me suis trompé de taille.', 'A2', 'chunk', 31),
  ('Je ne suis pas tout à fait d''accord.', 'No estoy del todo de acuerdo — la forma educada de discrepar', 'Je ne suis pas tout à fait d''accord : pour un marathon, je conseillerais plus d''amorti.', 'B1', 'chunk', 32),
  ('Je vois ce que vous voulez dire, mais', 'Entiendo lo que quiere decir, pero… — primero reconoce, después discrepa', 'Je vois ce que vous voulez dire, mais sans ticket, je ne peux pas faire l''échange.', 'B1', 'chunk', 33),
  -- Disculparse y quitar hierro.
  ('Excusez-moi pour le retard.', 'Perdón por el retraso — en Suiza la puntualidad se nota: si vas a llegar tarde, avisa antes', 'Excusez-moi pour le retard, il y avait un problème sur la ligne.', 'A2', 'chunk', 34),
  ('Ce n''est pas grave.', 'No pasa nada', '— Oh, pardon, je vous ai bousculé ! — Ce n''est pas grave.', 'A2', 'chunk', 35),
  ('Pas de souci.', 'Sin problema, no hay de qué — informal, pero se oye en todas partes', '— Vous pouvez me la mettre de côté jusqu''à demain ? — Pas de souci.', 'A2', 'chunk', 36),
  ('Volontiers.', 'Sí, con mucho gusto — en Suiza se usa muchísimo para aceptar algo que te ofrecen', '— Vous voulez un café ? — Volontiers, merci !', 'A2', 'chunk', 37),
  -- Charla: la que convierte a los compañeros en gente con la que hablar.
  ('On peut se tutoyer ?', '¿Nos tuteamos? — entre compañeros en Suiza el "tu" llega enseguida; con los clientes, siempre "vous"', 'On peut se tutoyer ? Ici, entre collègues, tout le monde se tutoie.', 'B1', 'chunk', 38),
  ('Je viens d''Espagne.', 'Soy de España', 'Je viens d''Espagne et je suis arrivé en Suisse il y a deux semaines.', 'A2', 'chunk', 39),
  ('Mon français n''est pas encore parfait.', 'Mi francés todavía no es perfecto — dicho al principio, la gente habla más despacio y con más paciencia', 'Mon français n''est pas encore parfait, mais je fais des progrès chaque jour.', 'A2', 'chunk', 40),
  ('Ça fait longtemps que tu travailles ici ?', '¿Hace mucho que trabajas aquí? — "ça fait… que" + presente, como "hace… que"', 'Ça fait longtemps que tu travailles ici ? Tu connais bien le magasin.', 'A2', 'chunk', 41),
  ('Tu as passé un bon week-end ?', '¿Qué tal el fin de semana? — la pregunta del lunes con los compañeros', 'Salut ! Tu as passé un bon week-end ? Tu es allé à la montagne ?', 'A2', 'chunk', 42),

  -- ── 2. SUIZA ROMANDA ─────────────────────────────────────
  -- Los números, lo primero: en caja se oyen cien veces al día.
  ('septante', 'setenta (en toda la Suiza romanda; en Francia: soixante-dix)', 'Ça fait septante-cinq francs, s''il vous plaît.', 'A2', 'suisse', 101),
  ('nonante', 'noventa (en toda la Suiza romanda; en Francia: quatre-vingt-dix)', 'Ces chaussures sont à cent nonante-neuf francs nonante.', 'A2', 'suisse', 102),
  ('huitante', 'ochenta (Vaud, Valais y Friburgo; en Ginebra, Neuchâtel y el Jura: quatre-vingts) — "octante" sale en algunos libros, pero ya casi no se oye', 'Au total, ça fait huitante-quatre francs.', 'A2', 'suisse', 103),
  -- Cortesía suiza: lo que se dice en la puerta y en la caja.
  ('Service !', 'De nada — la respuesta típica suiza a "merci"', '— Merci pour votre aide ! — Service ! Bonne journée.', 'A2', 'suisse', 104),
  ('Ça joue ?', '¿Qué tal?, ¿todo bien?, ¿te va bien? — coloquial suizo', 'Salut Edwin, ça joue ? Tu t''en sors avec la caisse ?', 'A2', 'suisse', 105),
  ('Ça joue.', 'Vale, me va bien, perfecto — coloquial suizo; "ça ne joue pas" = no funciona, no cuadra', '— Je te mets en pause à midi et quart ? — Oui, ça joue.', 'A2', 'suisse', 106),
  ('Adieu !', 'Hola (y también adiós) — saludo familiar regional, sobre todo en Vaud, Valais y Friburgo — OJO: en Francia es un adiós para siempre', 'Adieu Marcel ! Tu viens chercher tes chaussures de ski ?', 'B1', 'suisse', 107),
  ('À tout bientôt !', 'Hasta muy pronto — muy suizo (y belga)', 'Merci pour votre visite, à tout bientôt !', 'A2', 'suisse', 108),
  ('Tout de bon !', '¡Que vaya bien!, ¡suerte! — despedida suiza', 'Merci, et tout de bon pour votre course de samedi !', 'B1', 'suisse', 109),
  ('Je me réjouis !', 'Tengo muchas ganas, me hace ilusión — en Suiza se dice a diario ("je me réjouis de te voir"); en Francia suena formal', 'Je me réjouis de commencer lundi avec toute l''équipe !', 'B1', 'suisse', 110),
  -- Las comidas: el mismo nombre que en Francia, a otra hora.
  ('le déjeuner', 'el desayuno (en Suiza; en Francia "le déjeuner" es la comida) — mucha gente mezcla ya los dos sistemas: ante la duda, pregunta la hora', 'Le matin, je prends mon déjeuner à six heures et demie avant de partir.', 'A2', 'suisse', 111),
  ('le dîner', 'la comida del mediodía (en Suiza; en Francia "le dîner" es la cena)', 'On dîne ensemble à midi ? Il y a un bon petit resto à côté du magasin.', 'A2', 'suisse', 112),
  ('le souper', 'la cena (en Suiza; en Francia: le dîner)', 'Tu viens souper à la maison vendredi soir ?', 'A2', 'suisse', 113),
  -- Objetos de todos los días con nombre suizo.
  ('le natel', 'el móvil (Suiza; en Francia: le portable) — los jóvenes dicen cada vez más "le portable"', 'Tu peux me donner ton numéro de natel pour le groupe de l''équipe ?', 'A2', 'suisse', 114),
  ('le cornet', 'la bolsa, de plástico o de papel (Suiza; en Francia: le sac) — también el cucurucho de helado', 'Vous voulez un cornet pour vos achats ?', 'A2', 'suisse', 115),
  ('le linge', 'la toalla (Suiza; en Francia: la serviette) — también la ropa para lavar, como en Francia', 'N''oublie pas ton linge et ton maillot pour la piscine.', 'A2', 'suisse', 116),
  ('la panosse', 'la fregona (Suiza romanda; en Francia: la serpillière)', 'Quelqu''un a renversé de l''eau à l''entrée, tu peux passer la panosse ?', 'A2', 'suisse', 117),
  ('le foehn', 'el secador de pelo (Suiza; en Francia: le sèche-cheveux) — también el viento cálido que baja de los Alpes', 'Il y a un foehn dans la salle de bain de l''appartement ?', 'B1', 'suisse', 118),
  -- Dinero y compras.
  ('le bancomat', 'el cajero automático (Suiza; en Francia: le distributeur)', 'Il y a un bancomat près de la gare ?', 'A2', 'suisse', 119),
  ('payer avec Twint', 'pagar con Twint, la app suiza de pago con el móvil — sirve en tiendas y para pasarse dinero entre amigos', '— Je peux payer avec Twint ? — Bien sûr, scannez le code QR ici.', 'A2', 'suisse', 120),
  ('en action', 'de oferta (en el súper y en tiendas, Suiza; en Francia: en promotion) — OJO: aquí "une action" no tiene nada que ver con la bolsa', 'Cette semaine, les pâtes et le café sont en action à la Migros.', 'A2', 'suisse', 121),
  ('le rabais', 'el descuento — en Suiza es la palabra de todos los días (en Francia se oye más "la remise" o "la réduction")', 'On vous fait dix pour cent de rabais sur la deuxième paire.', 'A2', 'suisse', 122),
  ('la quittance', 'el recibo, el justificante de pago (Suiza; en Francia: le reçu)', 'Gardez bien la quittance, sans elle on ne peut pas faire d''échange.', 'A2', 'suisse', 123),
  -- Transporte.
  ('les CFF', 'los ferrocarriles federales suizos (Chemins de fer fédéraux; en alemán, SBB) — su app tiene los horarios de todo: tren, bus y barco', 'Je regarde l''horaire sur l''application des CFF.', 'A2', 'suisse', 124),
  ('le demi-tarif', 'el abono medio precio: tarjeta anual que rebaja a la mitad casi todos los billetes de tren, bus y barco — muy extendido', 'Avec le demi-tarif, l''aller-retour pour Genève coûte beaucoup moins cher.', 'A2', 'suisse', 125),
  ('l''abonnement général', 'el abono general, "l''AG": viajes ilimitados en casi todo el transporte público suizo — caro, compensa si coges el tren a diario', 'Je fais le trajet en train tous les jours, alors j''ai pris l''abonnement général.', 'B1', 'suisse', 126),
  -- Papeles de la llegada: municipio, permiso, seguridad social, impuestos.
  ('s''annoncer', 'darse de alta, registrarse (en el municipio, en el paro…) (Suiza; en Francia: se déclarer, s''inscrire)', 'Dès votre arrivée, vous devez vous annoncer au contrôle des habitants de votre commune.', 'B1', 'suisse', 127),
  ('la commune', 'el municipio, el ayuntamiento — en Suiza pesa mucho: allí te empadronas y de ella depende parte de tus impuestos', 'Pour l''attestation de domicile, il faut passer à la commune.', 'A2', 'suisse', 128),
  ('le contrôle des habitants', 'la oficina de empadronamiento del municipio (Vaud, Friburgo, Neuchâtel, Valais, Jura; en Ginebra se hace en la OCPM, l''Office cantonal de la population et des migrations)', 'Le contrôle des habitants est ouvert le matin, de huit heures à midi.', 'B1', 'suisse', 129),
  ('le permis B', 'el permiso B, de residencia: con un contrato de un año o más (o indefinido), a un ciudadano de la UE se le da para 5 años', 'Avec un contrat à durée indéterminée, vous recevez un permis B.', 'B1', 'suisse', 130),
  ('le permis L', 'el permiso L, de corta duración: para contratos de menos de un año', 'Mon contrat est de six mois, donc j''ai un permis L.', 'B1', 'suisse', 131),
  ('le permis C', 'el permiso C, de establecimiento (residencia permanente) — a los españoles se les suele conceder tras 5 años seguidos en Suiza', 'Après cinq ans en Suisse, j''aimerais demander le permis C.', 'B1', 'suisse', 132),
  ('le numéro AVS', 'el número de la seguridad social suiza (13 cifras, empieza por 756) — la AVS es la pensión pública: se cotiza en cada nómina, a medias con la empresa', 'Pour votre contrat, on a besoin de votre numéro AVS.', 'B1', 'suisse', 133),
  ('l''impôt à la source', 'el impuesto retenido en nómina: con permiso B o L, la empresa te lo descuenta cada mes', 'Comme j''ai un permis B, l''impôt à la source est déduit de mon salaire.', 'B1', 'suisse', 136),
  -- Seguro médico: obligatorio, privado y con plazo.
  ('la LAMal', 'la ley del seguro de enfermedad: el seguro básico es obligatorio para todo residente y hay que contratarlo en los 3 primeros meses', 'Vous avez trois mois pour vous affilier à une assurance de base LAMal.', 'B1', 'suisse', 137),
  ('la caisse maladie', 'la aseguradora de salud (privada, pero el seguro básico es obligatorio); la cuota mensual es "la prime" — OJO: aquí "caisse" no es la caja de la tienda', 'J''ai comparé les primes de trois caisses maladie avant de choisir.', 'B1', 'suisse', 138),
  ('la franchise', 'la franquicia del seguro médico: lo que pagas de tu bolsillo cada año antes de que el seguro pague nada (de 300 a 2500 francos, la eliges tú; más franquicia, menos cuota) — OJO: "en toute franchise" es "con toda franqueza"', 'Avec une franchise de deux mille cinq cents francs, la prime est plus basse, mais je paie presque tout le médecin.', 'B1', 'suisse', 139),
  ('le cent quarante-quatre', 'el 144, el teléfono de ambulancias en Suiza (policía: 117; bomberos: 118; el 112 también funciona)', 'Il ne respire plus bien, appelle le cent quarante-quatre !', 'A2', 'suisse', 140),
  -- El piso: en Suiza alquilar es un trámite serio.
  ('la régie', 'la inmobiliaria que gestiona el piso en nombre del dueño (sobre todo en Ginebra y Vaud; también se dice "la gérance") — con ella se trata todo, no con el propietario', 'Le chauffage ne marche pas, il faut appeler la régie.', 'B1', 'suisse', 141),
  ('l''extrait du registre des poursuites', 'el certificado de que no tienes deudas en Suiza — lo piden casi todas las régies para alquilar; se pide en l''office des poursuites', 'Pour louer l''appartement, la régie veut un extrait du registre des poursuites.', 'B1', 'suisse', 142),
  ('un deux pièces et demie', 'un piso de salón más un dormitorio: en Suiza se cuentan las habitaciones y la «media» suele ser la cocina o el recibidor; el baño no cuenta', 'Je cherche un deux pièces et demie pas trop loin de la gare.', 'B1', 'suisse', 143),
  ('le bail à loyer', 'el contrato de alquiler (término suizo; también "le bail" a secas)', 'J''ai signé le bail à loyer, j''emménage le premier du mois.', 'B1', 'suisse', 144),
  ('la garantie de loyer', 'la fianza del alquiler: como máximo 3 meses, en una cuenta bloqueada a tu nombre, no en manos del casero', 'Pour la garantie de loyer, j''ai dû bloquer trois mois de loyer sur un compte à la banque.', 'B1', 'suisse', 145),
  ('l''état des lieux', 'la inspección del piso, con acta, al entrar y al salir — OJO: apunta y fotografía cada desperfecto al entrar, o te lo cobrarán al irte', 'À l''état des lieux d''entrée, j''ai fait noter toutes les rayures du parquet.', 'B1', 'suisse', 146),
  ('la buanderie', 'el cuarto de lavadoras comunitario del edificio — en Suiza va por turnos: respeta tu día y deja la máquina limpia', 'Mon jour de buanderie, c''est le mardi.', 'B1', 'suisse', 147),
  ('le sac taxé', 'la bolsa de basura oficial, de pago: la basura en otra bolsa no se recoge y te pueden multar (en toda la Romandía salvo Ginebra)', 'Les sacs taxés s''achètent au supermarché, près des caisses.', 'B1', 'suisse', 148),
  -- En el trabajo y en la tienda de deporte.
  ('timbrer', 'fichar al entrar y al salir del trabajo (Suiza; en Francia: pointer)', 'N''oublie pas de timbrer en arrivant, sinon tes heures ne comptent pas.', 'A2', 'suisse', 149),
  ('le fitness', 'el gimnasio (Suiza) — OJO: "le gymnase" es el instituto de bachillerato (en Vaud)', 'Après le travail, je vais au fitness trois fois par semaine.', 'A2', 'suisse', 150),
  -- Coloquial: lo que dicen los compañeros.
  ('tip-top', 'perfecto, impecable — coloquial suizo', 'Le vélo est réglé, tout est tip-top !', 'A2', 'suisse', 152),
  ('s''encoubler', 'tropezar (Suiza romanda; en Francia: trébucher)', 'Attention à ne pas t''encoubler dans les cartons de la livraison.', 'B1', 'suisse', 153),
  ('poutzer', 'limpiar a fondo — familiar suizo, del alemán "putzen"', 'Samedi après la fermeture, on poutze tout le magasin.', 'B1', 'suisse', 154),
  ('le cheni', 'el desorden, el lío; también trastos o porquería — familiar suizo', 'Quel cheni dans la réserve ! Il faut tout ranger avant l''inventaire.', 'B1', 'suisse', 155),
  -- Vida cívica: se oye en las noticias y en el café.
  ('la votation', 'la votación popular, el referéndum — en Suiza hay varias al año, sobre temas muy concretos', 'Dimanche, il y a une votation sur les horaires d''ouverture des magasins.', 'B1', 'suisse', 156),
  ('le syndic', 'el alcalde (Vaud y Friburgo; en Ginebra y el Jura: le maire; en Valais: le président de commune) — OJO: en Francia un "syndic" administra una comunidad de vecinos', 'Le syndic a inauguré la nouvelle piste d''athlétisme de la commune.', 'B1', 'suisse', 157),

  -- ── 3. TRABAJO: LA TIENDA Y EL CONTRATO ──────────────────
  -- Atender: las frases del primer contacto con el cliente.
  ('le vendeur', 'el dependiente (ella: la vendeuse)', 'Le vendeur m''a conseillé une chaussure plus stable.', 'A2', 'work', 201),
  ('Je peux vous renseigner ?', '¿Le puedo ayudar en algo? — la fórmula de tienda; "renseigner" = informar, orientar', 'Bonjour, je peux vous renseigner ? Vous cherchez pour la course ou pour la marche ?', 'A2', 'work', 202),
  ('conseiller un client', 'asesorar a un cliente — "un conseil" es un consejo', 'Mon travail, c''est surtout de conseiller les clients sur les chaussures de course.', 'B1', 'work', 204),
  -- Tallas y probador.
  ('la taille', 'la talla (de ropa) — "la taille au-dessus": la talla de arriba; "en dessous": la de abajo', 'Ce t-shirt est un peu serré, vous voulez la taille au-dessus ?', 'A2', 'work', 205),
  ('la pointure', 'el número (de calzado) — OJO: para zapatos no se dice "taille"', 'Quelle est votre pointure ? — Du quarante-trois.', 'A2', 'work', 206),
  ('essayer', 'probarse (ropa, zapatos) — OJO: no es "ensayar"', 'Vous voulez les essayer ? Asseyez-vous, je vais chercher votre pointure en réserve.', 'A2', 'work', 207),
  ('la cabine d''essayage', 'el probador', 'Les cabines d''essayage sont au fond, à droite.', 'A2', 'work', 208),
  ('Ça vous va très bien.', 'Le queda muy bien — en francés la ropa "va": "ça me va" = me queda bien', 'Cette veste, ça vous va très bien, et la couleur aussi.', 'A2', 'work', 209),
  -- La tienda por dentro.
  ('le rayon', 'la sección de la tienda; también el estante — "au rayon tennis": en la sección de tenis', 'Les raquettes sont au rayon tennis, au premier étage.', 'A2', 'work', 210),
  ('la réserve', 'el almacén de la tienda — OJO: una reserva de hotel es "une réservation"', 'Je vais voir en réserve si on l''a en quarante-deux.', 'A2', 'work', 211),
  ('être en rupture de stock', 'estar agotado', 'Ce modèle est en rupture de stock, mais on peut vous le commander.', 'B1', 'work', 212),
  ('l''étiquette', 'la etiqueta (y el precio que lleva)', 'Il n''y a pas d''étiquette sur ce sac, je vérifie le prix.', 'A2', 'work', 214),
  ('l''antivol', 'la alarma antirrobo, la pinza que se quita en caja', 'N''oublie pas d''enlever l''antivol avant de mettre la veste dans le cornet.', 'B1', 'work', 215),
  -- La caja.
  ('la caisse', 'la caja (registradora)', 'Vous pouvez passer à la caisse, ma collègue va vous encaisser.', 'A2', 'work', 216),
  ('tenir la caisse', 'estar en caja, llevar la caja', 'Cet après-midi, c''est toi qui tiens la caisse.', 'B1', 'work', 217),
  ('encaisser', 'cobrar (en caja)', 'Je vous encaisse ici, ce sera plus rapide.', 'B1', 'work', 218),
  ('Vous payez par carte ?', '¿Paga con tarjeta?', 'Ça fait cent vingt francs. Vous payez par carte ?', 'A2', 'work', 219),
  ('rendre la monnaie', 'dar el cambio — OJO: "la monnaie" es el cambio o las monedas; la moneda de un país es "la devise"', 'Attendez, je vous rends la monnaie : trente francs cinquante.', 'A2', 'work', 220),
  ('le ticket de caisse', 'el tique de compra (en Suiza también "la quittance")', 'Voici votre ticket de caisse, vous avez trente jours pour échanger.', 'A2', 'work', 221),
  ('les soldes', 'las rebajas — OJO: masculino y plural: "les soldes d''été"', 'Les soldes commencent la semaine prochaine, on va avoir beaucoup de monde.', 'A2', 'work', 222),
  -- Cambios, devoluciones y quejas.
  ('l''échange', 'el cambio de un artículo por otro', 'Pour un échange, il faut le ticket et l''article dans son emballage.', 'A2', 'work', 223),
  ('le remboursement', 'el reembolso, la devolución del dinero', 'On ne fait pas de remboursement, mais un échange ou un bon d''achat.', 'B1', 'work', 224),
  ('le bon d''achat', 'el vale de compra', 'Je vous fais un bon d''achat de cinquante francs, valable un an.', 'A2', 'work', 225),
  ('une réclamation', 'una reclamación, una queja de cliente', 'Un client a fait une réclamation : la semelle s''est décollée après deux semaines.', 'B1', 'work', 226),
  ('être sous garantie', 'estar en garantía', 'La montre est encore sous garantie, on l''envoie en réparation.', 'B1', 'work', 227),
  -- Las tareas de trastienda.
  ('faire l''inventaire', 'hacer el inventario', 'Dimanche prochain, on fait l''inventaire, tout le monde doit venir.', 'B1', 'work', 228),
  ('réassortir', 'reponer, volver a llenar la sección — también se oye "faire le réassort"', 'Le matin, avant l''ouverture, on réassortit le rayon chaussettes.', 'B1', 'work', 229),
  ('la livraison', 'la entrega, el pedido de mercancía que llega', 'La livraison arrive le mardi matin, il faut tout déballer avant l''ouverture.', 'A2', 'work', 230),
  ('faire la fermeture', 'hacer el cierre de la tienda (y "faire l''ouverture", la apertura)', 'Cette semaine, je fais la fermeture jeudi et vendredi.', 'B1', 'work', 231),
  -- El material: lo que vende.
  ('les chaussures de course', 'las zapatillas de correr (también "de running")', 'Pour vos chaussures de course, vous courez plutôt sur route ou en forêt ?', 'A2', 'work', 232),
  ('la foulée', 'la pisada, la zancada al correr — "analyser la foulée": estudiar la pisada; pronador: "pronateur"', 'On peut analyser votre foulée sur le tapis avant de choisir la chaussure.', 'B1', 'work', 233),
  ('l''amorti', 'la amortiguación (de una zapatilla)', 'Ce modèle a beaucoup d''amorti, il est idéal pour les longues sorties.', 'B1', 'work', 234),
  ('les chaussures de randonnée', 'las botas de montaña, de senderismo — en Suiza, de lo más vendido', 'Pour la montagne, prenez des chaussures de randonnée montantes.', 'A2', 'work', 235),
  ('la doudoune', 'el plumífero, el abrigo acolchado', 'Il commence à faire froid, les doudounes partent très vite.', 'A2', 'work', 236),
  ('la location de skis', 'el alquiler de esquís — OJO: "la location" es alquiler, no "localización"', 'La location de skis commence en décembre, il faut réserver à l''avance.', 'B1', 'work', 237),
  -- El contrato suizo.
  ('le contrat de travail', 'el contrato de trabajo', 'Lisez bien votre contrat de travail avant de le signer.', 'A2', 'work', 238),
  ('la période d''essai', 'el período de prueba (en Suiza, de 1 a 3 meses)', 'Pendant la période d''essai, le délai de congé est de sept jours.', 'B1', 'work', 239),
  ('le délai de congé', 'el plazo de preaviso para despedir o para irse (término suizo; en Francia: le préavis) — OJO: aquí "congé" no son vacaciones', 'Après la période d''essai, le délai de congé est d''un mois.', 'B1', 'work', 240),
  ('un poste à cent pour cent', 'un puesto a jornada completa — en Suiza la jornada se dice en porcentaje: "à quatre-vingts pour cent" (en Vaud, "huitante") es trabajar cuatro días', 'On cherche un vendeur pour un poste à cent pour cent.', 'B1', 'work', 241),
  ('la fiche de salaire', 'la nómina (Suiza; en Francia: la fiche de paie)', 'Sur ma fiche de salaire, je ne comprends pas toutes les déductions.', 'B1', 'work', 242),
  ('le salaire brut', 'el sueldo bruto — "le salaire net" es lo que llega a la cuenta, tras AVS, plan de pensiones (LPP) e impuesto en la fuente', 'Le salaire brut est de quatre mille cinq cents francs, mais le net est plus bas.', 'B1', 'work', 243),
  ('le treizième salaire', 'la paga extra, el decimotercer sueldo (se suele cobrar en diciembre) — no lo exige la ley: depende del contrato', 'Le treizième salaire est versé avec le salaire de décembre.', 'B1', 'work', 244),
  ('les heures supplémentaires', 'las horas extra', 'Pendant les soldes, on fait souvent des heures supplémentaires.', 'B1', 'work', 245),
  ('l''horaire', 'el horario; en la tienda, el cuadrante de turnos', 'Tu as vu ton horaire pour la semaine prochaine ?', 'A2', 'work', 246),
  ('la pause', 'el descanso, la pausa', 'Je prends ma pause à dix heures, un quart d''heure.', 'A2', 'work', 247),
  ('le jour de congé', 'el día libre — "être en congé": librar, estar de vacaciones', 'Mercredi, c''est mon jour de congé.', 'A2', 'work', 248),
  ('les vacances', 'las vacaciones — en Suiza el mínimo legal son 4 semanas al año (5 hasta los 20 años)', 'Il faut demander ses vacances d''été avant la fin du mois de mars.', 'A2', 'work', 249),
  ('le gérant', 'el encargado de la tienda (ella: la gérante) — la jefa en Suiza se escribe "la cheffe"', 'Pour les congés, il faut voir avec le gérant.', 'A2', 'work', 250),
  ('le cahier des charges', 'la descripción del puesto: tareas y responsabilidades — OJO: no es ningún cuaderno', 'Le rangement de la réserve fait partie de votre cahier des charges.', 'B1', 'work', 251),
  ('l''entretien d''embauche', 'la entrevista de trabajo', 'L''entretien d''embauche a duré une demi-heure, en français.', 'B1', 'work', 252),
  -- Si te pones malo.
  ('Je suis malade, je ne peux pas venir aujourd''hui.', 'Estoy enfermo, hoy no puedo ir — llama antes de la hora de entrada, no mandes solo un mensaje', 'Bonjour, c''est Edwin. Je suis malade, je ne peux pas venir aujourd''hui.', 'A2', 'work', 253),
  ('être en arrêt maladie', 'estar de baja por enfermedad', 'Ma collègue est en arrêt maladie jusqu''à vendredi.', 'B1', 'work', 254),
  ('le certificat médical', 'el justificante médico — muchos contratos suizos lo piden a partir del tercer día de baja', 'Si vous êtes absent plus de trois jours, il faut un certificat médical.', 'B1', 'work', 255),
  ('Tu peux me remplacer samedi ?', '¿Me puedes cubrir el sábado?', 'J''ai un rendez-vous important, tu peux me remplacer samedi ? Je te remplace le suivant.', 'A2', 'work', 256),

  -- ── 4. VIDA DIARIA: EL PRIMER MES ────────────────────────
  -- Vivienda.
  ('chercher un appartement', 'buscar piso', 'Je cherche un appartement, mais sans permis ce n''est pas facile.', 'A2', 'general', 301),
  ('le loyer', 'el alquiler, la cuota mensual — "louer" es alquilar', 'Le loyer est de mille six cents francs, charges comprises.', 'A2', 'general', 302),
  ('les charges', 'los gastos que se pagan aparte del alquiler: calefacción, agua caliente, comunidad', 'Les charges sont de cent cinquante francs par mois, en plus du loyer.', 'A2', 'general', 303),
  ('déménager', 'mudarse, hacer la mudanza — y "emménager": entrar a vivir en la casa nueva', 'Je déménage samedi, tu peux m''aider à porter les cartons ?', 'A2', 'general', 304),
  ('le propriétaire', 'el dueño, el casero', 'Le propriétaire habite au rez-de-chaussée.', 'A2', 'general', 305),
  ('tomber en panne', 'averiarse, estropearse', 'La machine à laver est tombée en panne, j''ai appelé la régie.', 'B1', 'general', 306),
  -- La compra.
  ('faire les courses', 'hacer la compra — OJO: no es hacer carreras', 'Je fais les courses le samedi, après le travail.', 'A2', 'general', 307),
  ('peser les fruits et légumes', 'pesar la fruta y la verdura — en muchos súper suizos la pesas tú antes de ir a caja', 'N''oublie pas de peser les fruits et légumes avant de passer à la caisse.', 'A2', 'general', 308),
  -- Transporte.
  ('le billet aller-retour', 'el billete de ida y vuelta — "un aller simple": sólo ida', 'Un billet aller-retour pour Lausanne, avec le demi-tarif, s''il vous plaît.', 'A2', 'general', 309),
  ('la voie', 'la vía (en la estación: "voie 7") — el andén es "le quai"', 'Le train pour Genève part de la voie quatre.', 'A2', 'general', 310),
  ('la correspondance', 'el transbordo, el enlace — OJO: no es "correo"', 'J''ai raté ma correspondance, le prochain train est dans une demi-heure.', 'B1', 'general', 311),
  ('avoir du retard', 'llevar retraso, llegar tarde', 'Le bus a du retard, je vais arriver cinq minutes après l''ouverture.', 'A2', 'general', 312),
  ('descendre au prochain arrêt', 'bajarse en la próxima parada', 'Pour le magasin, vous descendez au prochain arrêt.', 'A2', 'general', 313),
  ('une amende', 'una multa — en el tren suizo el billete se compra antes de subir: a bordo ya no se vende', 'Sans billet valable, tu risques une amende.', 'B1', 'general', 314),
  -- Salud.
  ('prendre rendez-vous', 'pedir cita', 'Je voudrais prendre rendez-vous avec le docteur, c''est possible cette semaine ?', 'A2', 'general', 315),
  ('le médecin de famille', 'el médico de cabecera — con el modelo "médecin de famille" del seguro vas siempre primero a él, y la cuota baja', 'Avant d''aller chez un spécialiste, je dois passer par mon médecin de famille.', 'B1', 'general', 316),
  ('J''ai mal à la gorge.', 'Me duele la garganta — "j''ai mal au dos, à la tête, aux pieds"', 'J''ai mal à la gorge depuis trois jours et je tousse beaucoup.', 'A2', 'general', 317),
  ('avoir de la fièvre', 'tener fiebre', 'Mon fils a de la fièvre, il ne va pas à l''école aujourd''hui.', 'A2', 'general', 318),
  ('l''ordonnance', 'la receta médica — OJO: no es una "ordenanza"', 'Pour ce médicament, il faut une ordonnance du médecin.', 'B1', 'general', 319),
  ('les urgences', 'urgencias — para algo leve, mejor el médico o la farmacia: hasta cubrir la franquicia lo pagas tú', 'Il s''est tordu la cheville, on l''a emmené aux urgences.', 'A2', 'general', 320),
  ('la pharmacie de garde', 'la farmacia de guardia', 'Le dimanche, il faut aller à la pharmacie de garde.', 'B1', 'general', 321),
  -- Banco y dinero.
  ('ouvrir un compte bancaire', 'abrir una cuenta en el banco — te pedirán el permiso o el contrato', 'Pour recevoir mon salaire, je dois ouvrir un compte bancaire en Suisse.', 'A2', 'general', 322),
  ('le virement', 'la transferencia (bancaria)', 'Le salaire arrive par virement le vingt-cinq du mois.', 'B1', 'general', 323),
  ('retirer de l''argent', 'sacar dinero', 'Je dois retirer de l''argent au bancomat avant le marché.', 'A2', 'general', 324),
  ('les frais', 'las comisiones, los gastos', 'Il y a des frais si je retire de l''argent avec une carte étrangère ?', 'B1', 'general', 325),
  -- Teléfono y papeles.
  ('la carte SIM prépayée', 'la tarjeta SIM de prepago — en Suiza, para activarla te piden el pasaporte o el DNI', 'En attendant mon abonnement, j''ai acheté une carte SIM prépayée.', 'A2', 'general', 326),
  ('remplir un formulaire', 'rellenar un formulario', 'Il faut remplir ce formulaire et joindre une copie du passeport.', 'A2', 'general', 327),
  ('une pièce d''identité', 'un documento de identidad (DNI, pasaporte)', 'Vous avez une pièce d''identité, s''il vous plaît ?', 'A2', 'general', 328),
  ('l''attestation de domicile', 'el certificado de empadronamiento (lo da el municipio; en Ginebra, la OCPM) — en Francia se dice "justificatif de domicile"', 'La banque me demande une attestation de domicile.', 'B1', 'general', 329),
  -- La basura: en Suiza se separa en serio.
  ('sortir les poubelles', 'sacar la basura', 'Le ramassage, c''est le jeudi : il faut sortir les poubelles le matin.', 'A2', 'general', 330),
  ('trier les déchets', 'separar la basura para reciclar', 'Ici, on trie les déchets : papier, verre, PET, compost.', 'B1', 'general', 331),

  -- ── 5. DALF C1: ARGUMENTAR ───────────────────────────────
  -- Conectores para estructurar, del más frecuente al más fino.
  ('d''une part… d''autre part', 'por una parte… por otra — la estructura básica de cualquier ensayo', 'D''une part, le télétravail réduit les trajets ; d''autre part, il isole les salariés.', 'B2', 'academic', 401),
  ('en revanche', 'en cambio, por el contrario — OJO: nada que ver con "revancha" o "venganza"', 'Le train est cher en Suisse ; en revanche, il est d''une ponctualité remarquable.', 'B2', 'academic', 402),
  ('toutefois', 'sin embargo, no obstante — algo más suave que "néanmoins"; ideal para matizar', 'Cette mesure est utile ; toutefois, elle ne règle pas le fond du problème.', 'B2', 'academic', 403),
  ('néanmoins', 'no obstante, aun así — registro culto', 'Le projet a été très critiqué ; il a néanmoins été accepté en votation.', 'B2', 'academic', 404),
  ('par conséquent', 'por consiguiente, por lo tanto — el "du coup" del escrito formal', 'Les loyers augmentent ; par conséquent, de nombreux jeunes restent chez leurs parents.', 'B2', 'academic', 405),
  ('certes… mais', 'es cierto que… pero — concede primero para rebatir después: la jugada clásica del DALF', 'Certes, les salaires sont plus élevés en Suisse, mais le coût de la vie l''est aussi.', 'B2', 'academic', 406),
  ('en effet', 'efectivamente, en efecto — justifica lo que acabas de decir — OJO: "en fait" es "en realidad"', 'Le multilinguisme est un atout ; en effet, il facilite l''accès à l''emploi.', 'B2', 'academic', 407),
  ('pourtant', 'sin embargo, y eso que — subraya una contradicción', 'Il avait tout préparé ; pourtant, l''entretien s''est mal passé.', 'B2', 'academic', 408),
  ('bien que', 'aunque — OJO: siempre con subjuntivo', 'Bien que la mesure soit coûteuse, elle semble nécessaire.', 'B2', 'academic', 409),
  ('tandis que', 'mientras que (contraste)', 'Les jeunes s''informent en ligne, tandis que leurs parents privilégient la presse écrite.', 'B2', 'academic', 410),
  ('en outre', 'además — registro culto; en la conversación basta "en plus"', 'Ce dispositif est coûteux ; en outre, son efficacité n''a jamais été démontrée.', 'B2', 'academic', 411),
  ('de surcroît', 'además, por añadidura — muy culto, sube el nivel del texto', 'Le logement est rare et, de surcroît, très cher.', 'C1', 'academic', 412),
  ('étant donné que', 'dado que, puesto que', 'Étant donné que les ressources sont limitées, il faut fixer des priorités.', 'B2', 'academic', 413),
  ('or', 'ahora bien — introduce el dato que cambia el razonamiento — OJO: no es "o" (eso es "ou")', 'On affirme que la voiture est indispensable. Or, la plupart des trajets font moins de cinq kilomètres.', 'C1', 'academic', 414),
  ('dès lors', 'por consiguiente, a partir de ahí — culto', 'Le nombre de lecteurs a chuté ; dès lors, le journal a dû réduire ses effectifs.', 'C1', 'academic', 415),
  ('dans la mesure où', 'en la medida en que, puesto que', 'Cette réforme est juste dans la mesure où elle protège les plus fragiles.', 'C1', 'academic', 416),
  ('compte tenu de', 'teniendo en cuenta, habida cuenta de', 'Compte tenu de la pénurie de logements, cette décision paraît urgente.', 'C1', 'academic', 417),
  ('quand bien même', 'aun cuando, aunque — OJO: va con condicional, no con subjuntivo', 'Quand bien même la loi serait adoptée, son application prendrait des années.', 'C1', 'academic', 418),
  ('à l''instar de', 'a ejemplo de, al igual que — culto', 'À l''instar de la Suisse, plusieurs pays européens ont adopté ce système.', 'C1', 'academic', 419),
  ('en somme', 'en suma, en resumen — para abrir la conclusión', 'En somme, les avantages l''emportent sur les inconvénients.', 'B2', 'academic', 420),
  -- Fórmulas impersonales: las que dan tono de C1 a un escrito.
  ('il convient de', 'conviene, procede (+ infinitivo) — fórmula impersonal, muy de escrito', 'Il convient de distinguer deux aspects du problème.', 'C1', 'academic', 421),
  ('force est de constater que', 'hay que reconocer que, no queda más remedio que admitir que — muy culto, ideal para el DALF', 'Force est de constater que les mesures prises n''ont pas suffi.', 'C1', 'academic', 422),
  ('il n''en demeure pas moins que', 'no deja de ser cierto que, aun así — matiza tras conceder algo', 'Le bilan est positif ; il n''en demeure pas moins que des efforts restent à faire.', 'C1', 'academic', 423),
  ('il s''avère que', 'resulta que, se comprueba que — culto', 'Il s''avère que les chiffres avancés étaient largement surestimés.', 'C1', 'academic', 424),
  ('en l''occurrence', 'en este caso, en concreto', 'Certains secteurs, en l''occurrence le commerce de détail, souffrent particulièrement.', 'C1', 'academic', 425),
  ('le cas échéant', 'llegado el caso, si procede', 'Le candidat devra fournir, le cas échéant, un permis de travail.', 'C1', 'academic', 426),
  ('au détriment de', 'en detrimento de, a costa de', 'La rentabilité ne doit pas se faire au détriment de la santé des employés.', 'C1', 'academic', 427),
  ('être en mesure de', 'estar en condiciones de, ser capaz de', 'Les petites entreprises ne sont pas toujours en mesure de former des apprentis.', 'B2', 'academic', 428),
  -- Vocabulario del argumento.
  ('un enjeu', 'lo que está en juego, un reto — palabra estrella del DALF, sin traducción exacta', 'La transition énergétique constitue un enjeu majeur pour les prochaines décennies.', 'B2', 'academic', 429),
  ('nuancer', 'matizar — en el DALF se premia no ser tajante', 'Il faut nuancer ce constat : la situation varie beaucoup selon les régions.', 'C1', 'academic', 430),
  ('remettre en question', 'cuestionar, poner en tela de juicio', 'Cette étude remet en question l''idée selon laquelle le sport suffit à rester en bonne santé.', 'B2', 'academic', 431),
  ('susciter', 'suscitar, provocar (un debate, interés, una polémica)', 'Ce projet de loi a suscité un vif débat dans l''opinion publique.', 'B2', 'academic', 432),
  ('mettre en évidence', 'poner de manifiesto, sacar a la luz', 'Cette enquête met en évidence les inégalités salariales entre hommes et femmes.', 'B2', 'academic', 433),
  ('soulever une question', 'plantear una cuestión — OJO: nada que ver con "sublevar"', 'Le recours à l''intelligence artificielle soulève de nombreuses questions éthiques.', 'C1', 'academic', 434),
  ('se pencher sur', 'examinar, estudiar a fondo (un tema)', 'Nous nous pencherons d''abord sur les causes, puis sur les solutions.', 'C1', 'academic', 435),
  ('la mise en œuvre', 'la puesta en marcha, la aplicación (de un plan, una ley)', 'La mise en œuvre de cette réforme s''annonce complexe.', 'C1', 'academic', 436)
) AS v(word, translation, example, level, category, ord)
WHERE NOT EXISTS (SELECT 1 FROM words w WHERE w.lang = 'fr' AND lower(w.word) = lower(v.word))
ORDER BY v.ord;

-- Sin fila en user_words una palabra no entra nunca en la cola del SRS.
INSERT INTO user_words (profile_id, word_id)
SELECT 1, w.id FROM words w
WHERE w.lang = 'fr'
  AND NOT EXISTS (SELECT 1 FROM user_words uw WHERE uw.profile_id = 1 AND uw.word_id = w.id);

COMMIT;

-- Comprobación:
--   SELECT category, count(*) FROM words WHERE lang='fr' GROUP BY category;
--   SELECT id, word FROM words WHERE lang='fr' ORDER BY id LIMIT 16;   -- las dos primeras rondas
