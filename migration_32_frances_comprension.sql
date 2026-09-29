-- TutorIngles · Migration 32 — COMPRENSIÓN ORAL Y ESCRITA EN FRANCÉS (B1 → B2 → C1)
--
-- Para quién: Edwin, hispanohablante de España, dependiente en una cadena de
-- tiendas de deporte. En torno a un mes se va a trabajar a la Suiza romanda.
-- Francés A2 medido: entiende bastante más de lo que consigue decir. Meta final:
-- el DALF C1.
--
-- Por qué: la migración 31 dio idioma a exam_texts y listening_tasks, pero el
-- francés seguía sin un solo texto ni audio. Aquí van seis, corregidos solos,
-- en tres escalones:
--
--   Oral    · fr-l-b1-messages  B1  tres documentos cortos (andén CFF, contestador
--                                   del médico, anuncio en tienda) · 6 preguntas
--           · fr-l-b2-radio     B2  entrevista de radio: la semana de cuatro días
--                                   en una tienda de deporte ........ 7 preguntas
--           · fr-l-c1-debat     C1  extracto de conferencia: hablar inglés entre
--                                   suizos ........................... 8 preguntas
--   Escrita · fr-r-b1-reglement B1  reglamento de un edificio (buanderie, ruido,
--                                   sacs taxés) ...................... 6 preguntas
--           · fr-r-b2-article   B2  artículo: el material de deporte de segunda
--                                   mano ............................. 7 preguntas
--           · fr-r-c1-essai     C1  tribuna: la manía de puntuarlo todo 8 preguntas
--
-- LOS DOS B1 SON LA PRUEBA INICIAL de comprensión, así que son B1 de verdad
-- (tipo DELF B1), no un B2 disfrazado: si se hicieran más difíciles, el
-- resultado diría "no entiendes" a alguien que entiende, que es justo lo
-- contrario de su perfil.
--
-- Mismo molde que las migraciones 11 (Reading) y 14 (Listening): opciones con
-- el texto entero, `answer` = letra por posición, y una explicación en español
-- que cita la parte del texto que da la respuesta. Preguntas y opciones en
-- francés, como en el DELF/DALF; una sola opción defendible por pregunta.
--
-- El audio: no hay grabación (audio_url NULL). El guion lo lee la voz francesa
-- del móvil (speaker = 'fr-FR'), de un tirón y con UNA voz. Por eso los guiones
-- son prosa sin acotaciones, los hablantes se presentan en el propio texto y
-- las cifras que importan van en letra, a la suiza («septante francs»), para
-- que una voz de Francia las lea como se oyen en Lausana.
--
-- Textos originales. Las fuentes son genéricas («extrait d'un article de
-- presse») y ninguna cita se atribuye a personas ni a medios reales; las
-- personas que aparecen son inventadas. Sin cifras legales suizas.
--
-- Tipografía: espacio de no separación (U+00A0) antes de ? ! : ; y dentro de
-- « », como en las migraciones 26 y 30.
--
-- Aplicar (como postgres, las tablas son suyas):
--   docker exec -i postgres psql -U postgres -d tutoringles -v ON_ERROR_STOP=1 < migration_32_frances_comprension.sql
--
-- Idempotente: upsert por slug y, para las preguntas, borrar y reinsertar las
-- de las tareas fr-r-… / fr-l-…. No toca el contenido del Cambridge. Requiere
-- la 31 (columna lang).
--
-- Las migraciones 11 y 14 empezaban borrando TODO Reading/Listening, sin
-- filtro de idioma, y reaplicarlas se habría llevado esto. Desde el 28-sep sus
-- DELETE dejan en paz los slugs 'fr-…', así que ya se pueden reejecutar solas.

BEGIN;

-- ══════════════════════ COMPRENSIÓN ORAL ══════════════════════
INSERT INTO listening_tasks (slug, part, title, intro, script, audio_url, speaker, extras, level, lang) VALUES
('fr-l-b1-messages', 1, 'B1 · Tres mensajes del día a día',
 'Tres documentos cortos: un aviso en la estación, un mensaje en el contestador y un anuncio en una tienda. Escucha cada uno dos veces: la grabación los lee seguidos, así que pulsa ESCUCHAR dos veces. Lee antes las preguntas, como en el DELF: hay dos por documento. Es la prueba inicial de comprensión oral (B1).',
'Document un. Une annonce en gare de Lausanne.

Mesdames et Messieurs, votre attention, s''il vous plaît. L''InterRegio de dix heures douze à destination de Genève-Aéroport partira aujourd''hui de la voie sept, et non de la voie trois. En raison d''un dérangement technique près de Morges, ce train aura environ quinze minutes de retard. Exceptionnellement, il ne s''arrêtera pas à Nyon. Les voyageurs pour Nyon sont priés de prendre le train régional de dix heures vingt, voie cinq. Nous vous remercions de votre compréhension.

Document deux. Un message sur un répondeur.

Bonjour, c''est un message pour Monsieur Ortega. Ici Sandrine, du cabinet de la doctoresse Favre. Je vous appelle pour votre rendez-vous de jeudi, à quatorze heures. Malheureusement, la doctoresse ne sera pas là jeudi après-midi : elle doit remplacer un collègue à l''hôpital. Nous pouvons vous proposer vendredi matin à neuf heures et demie, ou lundi prochain à seize heures. Est-ce que vous pouvez nous rappeler avant mercredi soir pour nous dire ce qui vous convient le mieux ? Le secrétariat répond tous les matins, de huit heures à midi. Et pensez à apporter votre carte d''assurance maladie, s''il vous plaît. Merci, et bonne journée.

Document trois. Une annonce dans un magasin de sport.

Chers clients, bonjour et bienvenue. Cette semaine, profitez de notre action sur les chaussures de course : moins trente pour cent sur tous les modèles de la saison passée. Attention, les nouveaux modèles ne sont pas concernés. Et pour tout achat de plus de septante francs, nous vous offrons une paire de chaussettes de sport. Nous vous rappelons aussi que samedi, le magasin fermera exceptionnellement à dix-sept heures, et non à dix-huit heures, à cause de l''inventaire. Nos conseillers vous attendent au rayon course, au premier étage. Merci de votre visite !',
 NULL, 'fr-FR', NULL, 'B1', 'fr'),

('fr-l-b2-radio', 2, 'B2 · Entrevista en la radio: la semana de cuatro días',
 'Una entrevista de radio a la encargada de una tienda de deporte en Friburgo, que ha probado un año la semana de cuatro días. Escúchala dos veces y elige la respuesta correcta. Las preguntas siguen el orden de la entrevista.',
'Journaliste : Bonjour et bienvenue dans notre émission sur le monde du travail. Aujourd''hui, la semaine de quatre jours. Une chaîne de magasins de sport l''a testée pendant un an dans trois de ses magasins romands. Claire Monnier dirige celui de Fribourg. Claire Monnier, de quoi s''agit-il exactement ?

Claire Monnier : Je veux d''abord corriger un malentendu, parce qu''on l''entend tout le temps : nous n''avons pas réduit le temps de travail. Mes collaborateurs font le même nombre d''heures qu''avant, avec le même salaire, mais sur quatre jours au lieu de cinq. Les journées sont donc plus longues, une dizaine d''heures, et en échange, chacun a un jour de congé de plus par semaine.

Journaliste : Qu''est-ce qui vous inquiétait le plus, au départ ?

Claire Monnier : Pas les clients, honnêtement. Ma vraie crainte, c''était le samedi. C''est notre plus grosse journée, et je me demandais comment j''allais avoir assez de monde en magasin si tout le monde voulait son samedi. Finalement, la solution a été simple : le jour de congé tourne, et chacun a au moins un samedi libre par mois.

Journaliste : Et après un an, quel bilan ?

Claire Monnier : Le chiffre le plus net, ce sont les absences pour maladie. Elles ont nettement diminué, surtout les absences courtes, d''un ou deux jours. Pour le recrutement aussi, ça a changé : pour un poste de vendeur, j''ai reçu cette année presque deux fois plus de candidatures. Les ventes, elles, n''ont pas bougé. Ni mieux, ni moins bien.

Journaliste : Tout le monde est content, alors ?

Claire Monnier : Non, et je préfère le dire. Dix heures debout, c''est long. Ce que je n''avais pas prévu, c''est la fatigue en fin de journée : à dix-huit heures, on conseille moins bien qu''à dix heures du matin. Et pour les parents, quand la crèche ferme avant le magasin, une longue journée, ça ne marche pas. Sur mes onze collaborateurs, deux ont demandé à revenir à cinq jours, et on a accepté sans discuter.

Journaliste : Et les clients, ils ont remarqué quelque chose ?

Claire Monnier : Presque rien. La seule remarque vient des clients fidèles. Certains viennent depuis des années et veulent être conseillés par la même personne. Avec les rotations, ils ne la trouvent pas toujours, et ils nous le disent.

Journaliste : La direction a décidé d''étendre le modèle à tous ses magasins. Vous le recommandez ?

Claire Monnier : Oui, mais à une condition : que ça reste un choix. La semaine de quatre jours, ce n''est pas un cadeau qu''on fait aux employés, c''est une autre façon d''organiser le travail. Pour certains, c''est une vraie amélioration ; pour d''autres, c''est une contrainte. Si on l''impose à tout le monde, on perdra exactement ce qu''on a gagné.

Journaliste : Claire Monnier, merci.',
 NULL, 'fr-FR', NULL, 'B2', 'fr'),

('fr-l-c1-debat', 3, 'C1 · Conferencia: ¿hablar inglés entre suizos?',
 'Extracto de una conferencia sobre las lenguas en el trabajo en Suiza. Escúchalo dos veces. Como en el DALF, las preguntas no piden sólo datos: la postura de la conferenciante, lo que concede, lo que da a entender y el sentido de algunas expresiones.',
'Mesdames et Messieurs, bonsoir. On m''a demandé de vous parler d''un phénomène que vous avez sans doute déjà observé : dans de plus en plus d''entreprises suisses, quand un Romand et un Alémanique doivent travailler ensemble, ils finissent par se parler en anglais. Certains y voient la preuve que notre plurilinguisme n''est plus qu''un décor pour brochures touristiques. D''autres, au contraire, y voient une solution pleine de bon sens. Je voudrais vous montrer que les deux camps ont raison sur un point, et tort sur l''essentiel.

Commençons par rendre justice à l''anglais. Il n''est pas arrivé par hasard. Le Romand a appris à l''école l''allemand standard, mais ses collègues de Zurich ou de Berne parlent entre eux le suisse allemand, qu''il ne comprend pas. L''Alémanique, lui, a souvent gardé de ses années de français le souvenir de dictées plus que de conversations. Dans ces conditions, l''anglais a un avantage considérable : il n''est la langue maternelle de personne. Personne ne joue à domicile. Je comprends très bien qu''on trouve cela reposant.

Mais cette égalité mérite qu''on la regarde de plus près. Elle suppose que tout le monde parle l''anglais aussi bien. Or, dans une réunion, ce n''est jamais le cas. Celui qui a fait ses études à l''étranger, souvent un cadre, s''exprime avec aisance, avec nuance, avec humour. Le technicien ou la vendeuse, qui connaît pourtant le dossier mieux que personne, cherche ses mots, puis se tait. On croyait avoir choisi une langue neutre ; on a surtout installé une nouvelle hiérarchie, simplement moins visible que l''ancienne.

Il y a un second coût, plus discret. Quand on travaille dans une langue qu''on maîtrise à moitié, on dit ce qu''on peut, et plus tout à fait ce qu''on veut. Une ingénieure me racontait récemment : « En anglais, je suis d''accord avec tout le monde. C''est la seule phrase que je sais dire vite. » Les décisions passent, mais les réserves, les doutes, les « oui, mais », restent au vestiaire. On gagne du temps en réunion, et on le reperd ensuite dans les couloirs, à rattraper les malentendus.

Faut-il alors obliger chacun à parler la langue de l''autre ? Je ne le crois pas non plus. Exiger d''un Romand qu''il mène une négociation en allemand, c''est souvent le condamner au rôle du plus faible. Il existe pourtant une troisième voie, pratiquée depuis longtemps dans certaines administrations, et qui a le défaut de ne pas faire rêver : chacun parle sa propre langue, et chacun comprend celle de l''autre. Le Romand parle français, l''Alémanique répond en allemand, et personne ne traduit. On parle un peu plus lentement, on vérifie davantage, et, curieusement, on se comprend mieux.

Je vois quelques sourires dans la salle. Cela paraît lent, un peu artisanal, et j''admets volontiers que cela ne fonctionne pas du premier coup. Mais cela repose sur un constat que l''école a longtemps ignoré : comprendre une langue est beaucoup plus facile que la parler. En quelques mois, on peut comprendre solidement une langue qu''on mettra des années à parler correctement. Nous avons pris l''habitude de voir dans cette compétence un échec, la preuve qu''on n''a pas vraiment appris. C''est une erreur. Pour travailler ensemble, c''est souvent la plus utile.

Je ne prétends pas que cette solution convienne partout. Dans une entreprise où l''on parle dix langues, l''anglais restera indispensable, et c''est très bien ainsi. Ce que je conteste, c''est l''idée qu''il soit la solution naturelle, celle qu''on n''a même plus besoin de discuter. Une langue commune n''est jamais neutre : elle décide qui parle, et qui se tait.',
 NULL, 'fr-FR', NULL, 'C1', 'fr')
ON CONFLICT (slug) DO UPDATE SET
  part = EXCLUDED.part, title = EXCLUDED.title, intro = EXCLUDED.intro,
  script = EXCLUDED.script, audio_url = EXCLUDED.audio_url, speaker = EXCLUDED.speaker,
  extras = EXCLUDED.extras, level = EXCLUDED.level, lang = EXCLUDED.lang;

-- ══════════════════════ COMPRENSIÓN ESCRITA ══════════════════════
INSERT INTO exam_texts (slug, part, title, intro, body, extras, level, lang) VALUES
('fr-r-b1-reglement', 'reading_mc', 'B1 · El reglamento del edificio',
 'El reglamento de un edificio, como el que da la régie al firmar el contrato de alquiler. Lee el texto y elige la respuesta correcta. Es la prueba inicial de comprensión escrita (B1).',
'IMMEUBLE LES TILLEULS, RENENS
Règlement de maison

Chers locataires,

Pour que la vie dans l''immeuble reste agréable pour tout le monde, merci de respecter les règles suivantes.

Buanderie
Chaque appartement a son jour de lessive. Le planning est affiché à l''entrée de la buanderie. Les machines peuvent être utilisées de 7 h à 21 h. La buanderie est fermée le dimanche. Si vous souhaitez échanger votre jour avec un voisin, c''est possible : mettez-vous d''accord avec lui et notez le changement sur le planning. Après chaque lessive, nettoyez le filtre du séchoir et retirez votre linge de l''étendage le jour même.

Tranquillité
De 22 h à 7 h, ainsi que toute la journée le dimanche et les jours fériés, merci d''éviter les bruits gênants : aspirateur, perceuse, musique forte. Si vous organisez une fête, prévenez vos voisins quelques jours avant, par un petit mot dans l''entrée.

Déchets
Les ordures ménagères doivent être mises uniquement dans les sacs taxés officiels de la commune, puis déposées dans le conteneur de la cour. Les autres sacs ne sont pas ramassés. Le verre, l''aluminium et les piles vont à la déchetterie communale. Les bouteilles en PET se rapportent dans les points de collecte des magasins. Le papier et le carton sont ramassés le mercredi matin : déposez-les en paquets ficelés devant l''entrée, au plus tôt le mardi soir.

Vélos et poussettes
Les vélos se rangent dans le local à vélos, au sous-sol. Pour des raisons de sécurité, rien ne doit rester dans la cage d''escalier.

Contact
Votre concierge, M. Rossier, est présent du lundi au vendredi, de 8 h à 11 h (loge au rez-de-chaussée). En dehors de ces horaires, et seulement en cas d''urgence (fuite d''eau, panne de chauffage), appelez le service de piquet de la régie : le numéro est affiché à côté des boîtes aux lettres.

Merci de votre collaboration.
La régie',
 NULL, 'B1', 'fr'),

('fr-r-b2-article', 'reading_mc', 'B2 · Artículo: el deporte de segunda mano',
 'Un artículo de prensa sobre las tiendas de deporte que recompran y revenden material usado. Lee el texto y elige la respuesta correcta. Las preguntas siguen el orden del texto.',
'Le sport d''occasion sort de la cave

Chaque automne, c''est le même rituel. Dans les salles communales de Suisse romande, les ski-clubs organisent leur bourse aux skis : les parents y déposent les skis et les chaussures devenus trop petits, et en achètent d''autres, une taille au-dessus. Pendant des décennies, le matériel de sport d''occasion a vécu ainsi, en marge des magasins, entre bénévoles, petites annonces et greniers de famille.

Les choses sont en train de changer. Depuis deux ou trois saisons, plusieurs enseignes de sport reprennent le matériel usagé de leurs clients et le revendent dans un coin « seconde main ». Le principe est simple : le client rapporte une paire de skis, un vélo ou une tente ; le magasin l''examine, en fixe la valeur et lui remet un bon d''achat. Les vélos d''enfants et le matériel de randonnée sont ceux qui repartent le plus vite.

« Au début, on avait peur de se faire concurrence à nous-mêmes », reconnaît le responsable d''un magasin lausannois. « On se disait : chaque paire d''occasion vendue, c''est une paire neuve qu''on ne vendra pas. » L''expérience l''a en partie rassuré. Le bon d''achat, en effet, ne se dépense que dans le magasin, et le client qui rapporte ses vieux skis repart souvent avec autre chose : un casque, des lunettes, parfois une paire neuve.

Les arguments en faveur de l''occasion sont connus. Le prix, bien sûr : pour une famille dont les enfants grandissent, l''équipement de ski coûte vite plusieurs centaines de francs par hiver. Et l''environnement. Une chercheuse en économie de la consommation invite pourtant à ne pas crier victoire trop vite. « L''occasion n''est écologique que si elle prolonge la vie d''un objet. Si elle sert surtout à renouveler son équipement plus souvent, parce qu''on sait qu''on pourra le revendre, le bénéfice disparaît. » Autrement dit, tout dépend de ce que le client fait de l''argent économisé.

Pour les magasins, l''activité est aussi moins simple qu''il n''y paraît. Chaque article doit être contrôlé : l''état des carres, les fixations, l''usure d''une chaîne de vélo. Cela prend du temps et demande un vrai savoir-faire technique, alors que la marge sur un produit d''occasion reste faible. Certains articles sont d''ailleurs refusés d''office, comme les casques : impossible de savoir s''ils ont déjà subi un choc. Et un vélo mal contrôlé qui lâche, c''est toute la réputation du magasin qui en souffre.

Du côté des vendeurs, les avis sont partagés. Certains apprécient de retrouver un rôle de conseil et de réparation, plus proche du métier d''artisan que de la caisse. « J''ai appris à régler une fixation, ce que je ne savais pas faire en arrivant », raconte un jeune vendeur. D''autres y voient surtout une tâche de plus, qui s''ajoute aux autres sans que les effectifs ni les salaires aient suivi.

Faut-il y voir l''avenir du commerce de sport, ou une mode passagère ? L''occasion n''a plus rien de marginal, mais elle ne remplacera pas le neuf de sitôt. Le vrai test sera de voir si les clients continuent de la choisir quand leur budget ne les y oblige plus : par conviction, et non par nécessité.

Extrait d''un article de presse, 2025',
 NULL, 'B2', 'fr'),

('fr-r-c1-essai', 'reading_mc', 'C1 · Tribuna: cinco estrellas para todos',
 'Una tribuna de opinión sobre la costumbre de puntuarlo todo, como en la compréhension écrite del DALF C1. Lee el texto y elige la respuesta correcta. Las preguntas van sobre la postura del autor, el tono, el sentido de algunas expresiones y para qué sirve cada párrafo.',
'Cinq étoiles, ou l''art de ne plus juger

Il est devenu impossible d''acheter une paire de chaussettes sans être invité, dans l''heure qui suit, à « partager son expérience ». Le livreur attend sa note, le chauffeur la sienne, et la vendeuse espère que vous toucherez le visage souriant sur la tablette posée près de la caisse. Votre avis compte, nous assure-t-on. À en juger par le nombre de courriels de relance, il compte même énormément.

Soyons justes : la notation généralisée n''est pas née d''un caprice. Pendant longtemps, le client mécontent n''avait guère d''autre recours que de ne plus revenir, ce qui ne punissait que les commerces ayant des concurrents. L''hôtel qui promettait la vue sur le lac et offrait la vue sur le parking pouvait compter sur l''ignorance du voyageur suivant. Les étoiles ont mis fin à cette impunité, et il serait malhonnête de le regretter.

Mais un outil qui corrige un abus peut en créer d''autres, et c''est précisément ce qui s''est produit. Le premier est bien connu : l''inflation. Dès lors que chacun sait qu''une note inférieure à cinq peut coûter une prime, voire un emploi, plus personne n''ose mettre quatre. Un quatre sur cinq, qui voulait dire « très bien », se lit désormais comme un avertissement. Le client bienveillant met cinq par charité, le client exigeant met cinq par habitude, et la note, à force d''être la même pour tous, finit par ne plus rien dire. On a inventé un thermomètre qui affiche en permanence trente-sept degrés : il rassure tout le monde et ne mesure plus rien.

Le deuxième abus est plus sournois. La note s''adresse à une personne, mais elle juge un système. Le livreur est tenu pour responsable du colis arrivé en retard parce que l''entrepôt manquait de personnel ; la vendeuse est pénalisée parce que la taille demandée n''était plus en stock. Celui qui note croit évaluer un service ; il évalue en réalité celui ou celle qui se trouvait, par malchance, au bout de la chaîne. La note est anonyme, rapide, sans appel ; la personne notée n''a ni visage à qui répondre ni moyen de s''expliquer.

Le troisième, enfin, est le plus discret, et peut-être le plus grave. Noter, c''est répondre à une question que quelqu''un d''autre a posée. On ne nous demande pas ce que nous avons pensé, mais combien d''étoiles nous accordons, sur une échelle que nous n''avons pas choisie. Peu à peu, le jugement, cette opération lente, nuancée, parfois contradictoire, cède la place au réflexe. On ne se demande plus si le conseil était juste, mais s''il était agréable. Le vendeur qui vous a déconseillé un achat inutile vous a rendu service ; c''est pourtant souvent celui qui vous l''a vendu avec le sourire qui obtient la meilleure note.

Ces trois abus ont un effet commun sur ceux qui les subissent. Le vendeur qui sait que chaque client peut devenir son juge finit par travailler pour la note plutôt que pour le client : il évite de contredire, il promet ce qu''il ne pourra pas tenir, il sourit par précaution. On voulait des employés attentifs ; on obtient des employés prudents, ce qui n''est pas du tout la même chose.

Faut-il pour autant supprimer les étoiles ? Ce serait jeter l''outil avec ses défauts, et revenir à l''époque où le client n''avait que son silence pour se faire entendre. Personne ne le souhaite sérieusement. Mais entre tout noter et ne rien noter, il existe un espace considérable, que les entreprises n''ont aucun intérêt à explorer : elles ont besoin de chiffres, et les chiffres ont besoin de volume.

C''est donc au client de reprendre la main. Noter moins souvent, et seulement quand on a quelque chose à dire. Préférer, quand c''est possible, trois phrases à cinq étoiles. Et accepter l''idée, un peu démodée, qu''une expérience ordinaire n''appelle pas d''évaluation : on peut avoir été bien servi sans que cela mérite un formulaire. Et, lorsqu''on tient vraiment à remercier quelqu''un, le lui dire, à lui ou à son responsable, plutôt qu''à un algorithme. Il y a là une forme de politesse qui s''est perdue, celle qui consiste à ne pas transformer chaque échange en examen.

On objectera que c''est bien peu de chose, et que le système ne s''effondrera pas parce que quelques clients auront cessé de cocher des cases. Sans doute. Mais un système qui vit de chiffres n''a pas besoin d''une révolution pour changer : il suffit que ces chiffres deviennent un peu moins nombreux, un peu moins flatteurs, un peu moins faciles à exploiter. Votre avis compte, nous répètent les entreprises. Il serait temps de les prendre au mot.

Extrait d''une tribune parue dans la presse, 2025',
 NULL, 'C1', 'fr')
ON CONFLICT (slug) DO UPDATE SET
  part = EXCLUDED.part, title = EXCLUDED.title, intro = EXCLUDED.intro,
  body = EXCLUDED.body, extras = EXCLUDED.extras, level = EXCLUDED.level, lang = EXCLUDED.lang;

-- ══════════════════════ PREGUNTAS ══════════════════════
-- Se borran y se vuelven a crear las de las tareas francesas (y sólo esas).
DELETE FROM exam_questions
 WHERE text_id      IN (SELECT id FROM exam_texts      WHERE slug LIKE 'fr-r-%')
    OR listening_id IN (SELECT id FROM listening_tasks WHERE slug LIKE 'fr-l-%');

-- fr-l-b1-messages · B1 · Tres mensajes del día a día
INSERT INTO exam_questions (part, level, listening_id, prompt, options, answer, explanation, order_index)
SELECT 'listening_mc', t.level, t.id, v.prompt, v.opts::jsonb, v.ans, v.expl, v.ord
FROM listening_tasks t, (VALUES
('Document 1. De quelle voie partira le train pour Genève-Aéroport ?',
 '["De la voie trois", "De la voie cinq", "De la voie sept", "De la voie douze"]',
 'C', 'Dice "partira aujourd''hui de la voie sept, et non de la voie trois". La tres es la de siempre; la cinco, la del tren regional.', 1),
('Document 1. Pourquoi les voyageurs pour Nyon doivent-ils prendre un autre train ?',
 '["Parce que l''InterRegio est supprimé aujourd''hui", "Parce que l''InterRegio est complet", "Parce que la voie trois est fermée", "Parce que l''InterRegio ne s''arrêtera pas à Nyon"]',
 'D', '"Exceptionnellement, il ne s''arrêtera pas à Nyon." El InterRegio no está suprimido: sale, con unos quince minutos de retraso.', 2),
('Document 2. Pourquoi le rendez-vous de jeudi est-il déplacé ?',
 '["Parce que Monsieur Ortega a demandé un autre jour", "Parce que la doctoresse doit travailler à l''hôpital", "Parce que la doctoresse est malade", "Parce que la doctoresse part en vacances"]',
 'B', '"elle doit remplacer un collègue à l''hôpital". No dice que esté enferma: "ne sera pas là" es sólo "no estará".', 3),
('Document 2. Qu''est-ce que la secrétaire demande à Monsieur Ortega ?',
 '["De rappeler le cabinet pour choisir une nouvelle date", "De venir vendredi matin à neuf heures et demie", "D''envoyer une copie de sa carte d''assurance", "De prendre rendez-vous avec un autre médecin"]',
 'A', '"Est-ce que vous pouvez nous rappeler avant mercredi soir pour nous dire ce qui vous convient". El viernes a las nueve y media es sólo una de las dos propuestas; la tarjeta hay que traerla a la consulta, no enviarla.', 4),
('Document 3. Quels articles ont une réduction de trente pour cent ?',
 '["Toutes les chaussures de course du magasin", "Les chaussures de course de la saison passée", "Les nouveaux modèles de chaussures de course", "Les chaussettes de sport"]',
 'B', '"moins trente pour cent sur tous les modèles de la saison passée. Attention, les nouveaux modèles ne sont pas concernés." Los calcetines son el regalo por compras de más de "septante" (70) francos.', 5),
('Document 3. Que se passe-t-il samedi ?',
 '["Le magasin ouvre une heure plus tard que d''habitude", "L''action sur les chaussures de course commence", "Le magasin ferme une heure plus tôt que d''habitude", "Le rayon course est fermé toute la journée"]',
 'C', '"le magasin fermera exceptionnellement à dix-sept heures, et non à dix-huit heures": una hora antes, por el inventario. La oferta ya está en marcha ("Cette semaine, profitez…").', 6)
) AS v(prompt, opts, ans, expl, ord)
WHERE t.slug = 'fr-l-b1-messages';

-- fr-l-b2-radio · B2 · Entrevista en la radio: la semana de cuatro días
INSERT INTO exam_questions (part, level, listening_id, prompt, options, answer, explanation, order_index)
SELECT 'listening_mc', t.level, t.id, v.prompt, v.opts::jsonb, v.ans, v.expl, v.ord
FROM listening_tasks t, (VALUES
('En quoi consiste la semaine de quatre jours testée dans ce magasin ?',
 '["Les employés travaillent moins d''heures pour le même salaire", "Le magasin est fermé un jour de plus par semaine", "Les employés font les mêmes heures, réparties sur quatre jours", "Les employés travaillent quatre jours et gagnent un peu moins"]',
 'C', '"nous n''avons pas réduit le temps de travail… le même nombre d''heures qu''avant, avec le même salaire, mais sur quatre jours au lieu de cinq". La trampa es A: es el modelo del que más se habla, y ella lo descarta nada más empezar.', 1),
('Au départ, qu''est-ce qui inquiétait le plus Claire Monnier ?',
 '["D''avoir assez de personnel le jour le plus chargé", "La réaction des clients à ce changement", "La fatigue des vendeurs en fin de journée", "Une baisse possible des ventes"]',
 'A', '"Pas les clients, honnêtement. Ma vraie crainte, c''était le samedi. C''est notre plus grosse journée…" El cansancio aparece después, y dice que no lo había previsto.', 2),
('Comment ce problème a-t-il été résolu ?',
 '["Personne ne peut être en congé le samedi", "Le magasin engage des étudiants le samedi", "Le samedi, les journées de travail sont plus courtes", "Le jour de congé n''est pas toujours le même"]',
 'D', '"le jour de congé tourne, et chacun a au moins un samedi libre par mois". "Tourner" es rotar: el día libre va cambiando. Por eso A es falsa: cada uno libra al menos un sábado al mes.', 3),
('Selon elle, quel est le résultat le plus net de l''essai ?',
 '["Les ventes ont nettement augmenté", "Il y a moins d''absences pour maladie", "Le magasin a engagé plus de vendeurs", "Les clients sont plus satisfaits"]',
 'B', '"Le chiffre le plus net, ce sont les absences pour maladie. Elles ont nettement diminué". Las ventas "n''ont pas bougé", y de contratar más no dice nada: sólo que recibe casi el doble de candidaturas.', 4),
('Quelle difficulté Claire Monnier n''avait-elle pas prévue ?',
 '["Les vendeurs conseillent moins bien en fin de journée", "Le magasin reçoit moins de candidatures", "Les clients se plaignent des nouveaux horaires", "Les heures supplémentaires coûtent trop cher"]',
 'A', '"Ce que je n''avais pas prévu, c''est la fatigue en fin de journée : à dix-huit heures, on conseille moins bien". Candidaturas recibe más, no menos.', 5),
('Que reprochent certains clients fidèles ?',
 '["Que le magasin ferme plus tôt le soir", "Que les prix aient augmenté depuis l''essai", "Qu''il y ait moins de vendeurs le samedi", "De ne pas toujours retrouver leur vendeur habituel"]',
 'D', '"veulent être conseillés par la même personne. Avec les rotations, ils ne la trouvent pas toujours, et ils nous le disent."', 6),
('Que pense Claire Monnier de l''extension du modèle à tous les magasins ?',
 '["Elle y est opposée, car les clients n''aiment pas le changement", "Elle y est favorable, si chaque employé peut choisir", "Elle y est favorable, car c''est une récompense méritée", "Elle hésite, car les ventes n''ont pas augmenté"]',
 'B', '"Oui, mais à une condition : que ça reste un choix." C es la trampa: dice justo que "ce n''est pas un cadeau qu''on fait aux employés".', 7)
) AS v(prompt, opts, ans, expl, ord)
WHERE t.slug = 'fr-l-b2-radio';

-- fr-l-c1-debat · C1 · Conferencia: ¿hablar inglés entre suizos?
INSERT INTO exam_questions (part, level, listening_id, prompt, options, answer, explanation, order_index)
SELECT 'listening_mc', t.level, t.id, v.prompt, v.opts::jsonb, v.ans, v.expl, v.ord
FROM listening_tasks t, (VALUES
('Comment la conférencière présente-t-elle le débat dans son introduction ?',
 '["Elle affirme que le plurilinguisme suisse n''est plus qu''un décor", "Elle annonce qu''aucun des deux camps n''a entièrement raison", "Elle prend d''emblée le parti de ceux qui défendent l''anglais", "Elle déclare qu''elle ne prendra pas position sur la question"]',
 'B', '"les deux camps ont raison sur un point, et tort sur l''essentiel". Lo del "décor pour brochures touristiques" es la opinión de uno de los bandos, no la suya.', 1),
('Que veut dire « Personne ne joue à domicile », dans ce contexte ?',
 '["Personne ne travaille dans sa ville d''origine", "Les réunions se tiennent dans un lieu neutre", "Aucun participant ne connaît mieux le dossier que les autres", "Aucun participant ne s''exprime dans sa langue maternelle"]',
 'D', 'Justo antes: "il n''est la langue maternelle de personne". Es una metáfora del fútbol: nadie juega en casa, es decir, nadie habla en su propia lengua.', 2),
('Selon la conférencière, qu''a produit en réalité l''anglais dans les réunions ?',
 '["Une hiérarchie moins visible, fondée sur l''aisance en anglais", "Une vraie égalité entre les cadres et les employés", "Une meilleure écoute des techniciens et des vendeurs", "Des réunions plus longues qu''avant, mais plus claires"]',
 'A', '"On croyait avoir choisi une langue neutre ; on a surtout installé une nouvelle hiérarchie, simplement moins visible que l''ancienne." Quien domina el inglés, a menudo el cuadro, se impone; el técnico "se tait".', 3),
('Que suggère la phrase « les réserves, les doutes, les « oui, mais », restent au vestiaire » ?',
 '["Les participants sont trop fatigués pour discuter jusqu''au bout", "Les décisions importantes sont repoussées à une autre réunion", "Les participants n''expriment pas leurs nuances ni leurs objections", "Les participants refusent de prendre des décisions en anglais"]',
 'C', '"on dit ce qu''on peut, et plus tout à fait ce qu''on veut": las reservas se quedan fuera, sin decirse. Las decisiones sí se toman ("Les décisions passent"), por eso B y D no valen.', 4),
('Que pense-t-elle de l''idée d''obliger chacun à parler la langue de l''autre ?',
 '["Que c''est la meilleure solution, malgré sa lenteur évidente", "Que l''école devrait l''imposer dès le plus jeune âge", "Qu''elle ne pose vraiment de problème qu''aux Alémaniques", "Qu''elle désavantage celui qui négocie dans la langue de l''autre"]',
 'D', '"Exiger d''un Romand qu''il mène une négociation en allemand, c''est souvent le condamner au rôle du plus faible." La lentitud de A es la de la tercera vía, no la de esta.', 5),
('Quelle attitude adopte-t-elle envers la « troisième voie » ?',
 '["Elle la défend, tout en reconnaissant ses limites", "Elle la présente comme une solution idéale et sans défaut", "Elle s''en amuse, comme une partie du public", "Elle la juge dépassée, parce qu''elle vient de l''administration"]',
 'A', 'La defiende con reservas: "a le défaut de ne pas faire rêver", "j''admets volontiers que cela ne fonctionne pas du premier coup", "Je ne prétends pas que cette solution convienne partout". Quien sonríe es el público, no ella.', 6),
('Selon elle, comprendre une langue sans bien la parler, c''est…',
 '["un apprentissage inachevé, la preuve qu''on n''a pas vraiment appris", "une étape qui demande des années d''efforts avant d''être utile", "une compétence précieuse pour travailler ensemble, qu''on sous-estime", "un défaut qu''il faut corriger avant de travailler en équipe"]',
 'C', '"Nous avons pris l''habitude de voir dans cette compétence un échec… C''est une erreur. Pour travailler ensemble, c''est souvent la plus utile." A es la idea que ella rechaza; y la comprensión se alcanza "en quelques mois", no en años.', 7),
('Quelle idée résume sa conclusion ?',
 '["L''anglais devrait disparaître des entreprises suisses", "Choisir une langue commune n''est jamais un choix neutre", "L''anglais est la solution naturelle dans les entreprises", "Chaque entreprise devrait choisir une seule langue nationale"]',
 'B', '"Une langue commune n''est jamais neutre : elle décide qui parle, et qui se tait." No pide quitar el inglés: con diez lenguas "restera indispensable". Y C es exactamente lo que ella "conteste".', 8)
) AS v(prompt, opts, ans, expl, ord)
WHERE t.slug = 'fr-l-c1-debat';

-- fr-r-b1-reglement · B1 · El reglamento del edificio
INSERT INTO exam_questions (part, level, text_id, prompt, options, answer, explanation, order_index)
SELECT 'reading_mc', t.level, t.id, v.prompt, v.opts::jsonb, v.ans, v.expl, v.ord
FROM exam_texts t, (VALUES
('Quand pouvez-vous faire votre lessive ?',
 '["Tous les jours de 7 h à 21 h, sauf le dimanche", "Le dimanche, si la buanderie est libre", "Quand vous voulez, si vous prévenez le concierge", "Le jour prévu pour votre appartement sur le planning"]',
 'D', '"Chaque appartement a son jour de lessive. Le planning est affiché…" El horario de 7 h a 21 h es el de las máquinas, pero sólo vale en tu día: por eso A es la trampa.', 1),
('Vous voulez faire votre lessive un autre jour. Que devez-vous faire ?',
 '["S''arranger avec un voisin et l''écrire sur le planning", "Demander l''autorisation au concierge, dans sa loge", "Écrire à la régie au moins une semaine avant", "Laisser un petit mot dans l''entrée de l''immeuble"]',
 'A', '"mettez-vous d''accord avec lui et notez le changement sur le planning". No hay que pedir permiso a nadie. La nota en la entrada es para avisar de una fiesta.', 2),
('Que dit le règlement sur le bruit ?',
 '["Les bruits gênants sont interdits seulement la nuit, de 22 h à 7 h", "Les fêtes sont interdites dans l''immeuble, même le samedi", "Il faut éviter le bruit la nuit, le dimanche et les jours fériés", "Il faut demander l''autorisation de la régie pour faire une fête"]',
 'C', '"De 22 h à 7 h, ainsi que toute la journée le dimanche et les jours fériés, merci d''éviter les bruits gênants". Las fiestas no están prohibidas: basta con avisar a los vecinos unos días antes.', 3),
('Où faut-il mettre les ordures ménagères ?',
 '["Dans n''importe quel sac fermé, dans le conteneur de la cour", "Dans un sac taxé officiel, dans le conteneur de la cour", "Dans un sac taxé, devant l''entrée le mardi soir", "Dans un sac taxé, à la déchetterie communale"]',
 'B', '"uniquement dans les sacs taxés officiels de la commune, puis déposées dans le conteneur de la cour. Les autres sacs ne sont pas ramassés." El martes por la noche es para el papel y el cartón.', 4),
('Que faut-il faire des bouteilles en PET ?',
 '["Les mettre dans un sac taxé, dans le conteneur de la cour", "Les déposer avec le papier devant l''entrée le mardi soir", "Les apporter à la loge du concierge le matin", "Les rapporter dans un point de collecte d''un magasin"]',
 'D', '"Les bouteilles en PET se rapportent dans les points de collecte des magasins." A la déchetterie van el vidrio, el aluminio y las pilas.', 5),
('Samedi soir, il y a une fuite d''eau dans votre salle de bains. Que faites-vous ?',
 '["Vous appelez le service de piquet de la régie", "Vous attendez lundi matin pour prévenir le concierge", "Vous laissez un mot dans la loge du concierge", "Vous écrivez un e-mail à la régie"]',
 'A', '"En dehors de ces horaires, et seulement en cas d''urgence (fuite d''eau…), appelez le service de piquet de la régie". "Service de piquet" es el servicio de guardia. El sábado el concierge no está: sólo de lunes a viernes por la mañana.', 6)
) AS v(prompt, opts, ans, expl, ord)
WHERE t.slug = 'fr-r-b1-reglement';

-- fr-r-b2-article · B2 · Artículo: el deporte de segunda mano
INSERT INTO exam_questions (part, level, text_id, prompt, options, answer, explanation, order_index)
SELECT 'reading_mc', t.level, t.id, v.prompt, v.opts::jsonb, v.ans, v.expl, v.ord
FROM exam_texts t, (VALUES
('D''après le premier paragraphe, comment fonctionnait traditionnellement le marché du sport d''occasion ?',
 '["En dehors des magasins, grâce aux clubs et aux particuliers", "Surtout grâce aux grandes enseignes de sport", "Uniquement dans des magasins spécialisés pour enfants", "Principalement par les ventes sur internet"]',
 'A', '"en marge des magasins, entre bénévoles, petites annonces et greniers de famille". "En marge de" = al margen, fuera de.', 1),
('Que craignaient au départ les magasins qui ont lancé la seconde main ?',
 '["Que les clients rapportent du matériel en mauvais état", "Que les bourses aux skis leur fassent concurrence", "Que l''occasion prenne la place des ventes de neuf", "Que les vendeurs refusent ce travail supplémentaire"]',
 'C', '"on avait peur de se faire concurrence à nous-mêmes… chaque paire d''occasion vendue, c''est une paire neuve qu''on ne vendra pas."', 2),
('Pourquoi le bon d''achat rassure-t-il en partie le responsable du magasin ?',
 '["Parce que l''occasion rapporte davantage au magasin que le neuf", "Parce que les clients le dépensent chez lui, souvent pour autre chose", "Parce que beaucoup de clients oublient tout simplement de l''utiliser", "Parce qu''il ne peut servir qu''à acheter du matériel neuf"]',
 'B', '"Le bon d''achat… ne se dépense que dans le magasin, et le client… repart souvent avec autre chose". Del margen se dice lo contrario ("reste faible"); y el vale sirve para cualquier cosa de la tienda, no sólo para material nuevo.', 3),
('Quelle nuance apporte la chercheuse ?',
 '["L''occasion est toujours meilleure pour l''environnement que le neuf", "Le prix n''est pas une vraie motivation pour les clients", "Le matériel d''occasion s''use beaucoup plus vite que le neuf", "L''avantage écologique disparaît si l''on renouvelle son matériel plus souvent"]',
 'D', '"L''occasion n''est écologique que si elle prolonge la vie d''un objet. Si elle sert surtout à renouveler son équipement plus souvent… le bénéfice disparaît."', 4),
('Pourquoi l''occasion est-elle difficile à rentabiliser pour les magasins ?',
 '["Chaque contrôle demande du temps et du savoir-faire, pour une faible marge", "Les clients rapportent surtout des casques qui ont subi un choc", "Les bons d''achat coûtent plus cher que les articles repris", "Il faut louer des locaux supplémentaires pour stocker le matériel"]',
 'A', '"Chaque article doit être contrôlé… Cela prend du temps et demande un vrai savoir-faire technique, alors que la marge… reste faible." Los cascos se rechazan de entrada ("refusés d''office"), así que no son el problema.', 5),
('Comment les vendeurs perçoivent-ils cette nouvelle activité ?',
 '["Tous l''apprécient, car elle les éloigne enfin de la caisse", "Ils la refusent, parce qu''elle n''est pas payée en plus", "Les uns y voient un enrichissement, les autres une charge de plus", "Ils demandent tous à suivre une formation d''artisan"]',
 'C', '"les avis sont partagés. Certains apprécient… D''autres y voient surtout une tâche de plus". A generaliza ("tous") lo que sólo dicen algunos.', 6),
('Selon l''auteur, qu''est-ce qui montrera si l''occasion a vraiment de l''avenir ?',
 '["L''évolution des marges que font les magasins sur l''occasion", "Le choix des clients lorsque leur budget ne les contraindra plus", "Le nombre de bourses aux skis organisées chaque automne", "L''avis des chercheurs sur les effets pour l''environnement"]',
 'B', '"Le vrai test sera de voir si les clients continuent de la choisir quand leur budget ne les y oblige plus : par conviction, et non par nécessité."', 7)
) AS v(prompt, opts, ans, expl, ord)
WHERE t.slug = 'fr-r-b2-article';

-- fr-r-c1-essai · C1 · Tribuna: cinco estrellas para todos
INSERT INTO exam_questions (part, level, text_id, prompt, options, answer, explanation, order_index)
SELECT 'reading_mc', t.level, t.id, v.prompt, v.opts::jsonb, v.ans, v.expl, v.ord
FROM exam_texts t, (VALUES
('Quel est le ton du premier paragraphe ?',
 '["Enthousiaste : l''auteur se réjouit que le client puisse enfin s''exprimer", "Neutre : l''auteur décrit une pratique sans porter de jugement", "Ironique : l''auteur se moque de l''insistance avec laquelle on sollicite notre avis", "Indigné : l''auteur accuse les vendeurs de harceler leurs clients"]',
 'C', '"Votre avis compte, nous assure-t-on. À en juger par le nombre de courriels de relance, il compte même énormément." Es ironía: no se lo cree. D no vale: a la vendedora no la acusa de nada, sólo "espère".', 1),
('Quel est le rôle du deuxième paragraphe dans l''argumentation ?',
 '["L''auteur reconnaît que la notation a répondu à un vrai problème", "L''auteur montre que les clients mécontents avaient autrefois de nombreux recours", "L''auteur regrette l''époque où les hôtels étaient moins surveillés", "L''auteur explique pourquoi les commerces sans concurrents ont disparu"]',
 'A', '"Soyons justes : la notation généralisée n''est pas née d''un caprice… Les étoiles ont mis fin à cette impunité, et il serait malhonnête de le regretter." Es la concesión antes de la crítica. B dice lo contrario del texto: el cliente "n''avait guère d''autre recours que de ne plus revenir".', 2),
('Que veut montrer l''image du « thermomètre qui affiche en permanence trente-sept degrés » ?',
 '["Les clients sont devenus trop sévères avec les employés", "Les entreprises modifient les notes pour se rassurer", "Les notes varient trop d''un client à l''autre pour être fiables", "Une note que tout le monde obtient ne distingue plus rien"]',
 'D', 'El termómetro que marca siempre 37 grados "rassure tout le monde et ne mesure plus rien": si todos ponen cinco, la nota "finit par ne plus rien dire". C dice justo lo contrario: no varían, son todas iguales.', 3),
('En quoi consiste le « deuxième abus » ?',
 '["Les employés peuvent à leur tour noter les clients", "On rend un employé responsable de défauts qui viennent de l''organisation", "Les clients utilisent la note pour obtenir des rabais", "Les entreprises ne lisent jamais les notes de leurs clients"]',
 'B', '"La note s''adresse à une personne, mais elle juge un système": el repartidor paga el retraso del almacén y la vendedora, la talla que ya no había.', 4),
('Que montre l''exemple des deux vendeurs, à la fin du cinquième paragraphe ?',
 '["Les vendeurs honnêtes finissent toujours par être reconnus", "Les clients préfèrent qu''on leur déconseille les achats inutiles", "La note récompense parfois l''amabilité plutôt que la justesse du conseil", "Le sourire est la qualité la plus importante d''un vendeur"]',
 'C', '"On ne se demande plus si le conseil était juste, mais s''il était agréable… c''est pourtant souvent celui qui vous l''a vendu avec le sourire qui obtient la meilleure note." D es lo que premia la nota, no lo que piensa el autor.', 5),
('Selon l''auteur, pourquoi les entreprises ne chercheront-elles pas à faire noter moins ?',
 '["Parce qu''elles craignent de mécontenter leurs clients", "Parce que la loi les oblige à publier des évaluations", "Parce que leurs employés demandent à être évalués", "Parce qu''il leur faut un grand nombre de données chiffrées"]',
 'D', '"que les entreprises n''ont aucun intérêt à explorer : elles ont besoin de chiffres, et les chiffres ont besoin de volume."', 6),
('Que propose l''auteur ?',
 '["Que les clients notent moins, et avec des mots plutôt qu''en étoiles", "Que l''on supprime purement et simplement toutes les étoiles", "Que les entreprises rémunèrent les clients qui donnent leur avis", "Que chaque employé puisse répondre publiquement à sa note"]',
 'A', '"Noter moins souvent, et seulement quand on a quelque chose à dire. Préférer, quand c''est possible, trois phrases à cinq étoiles." Suprimir las estrellas lo descarta él mismo: "Ce serait jeter l''outil avec ses défauts".', 7),
('Que signifie, à la fin, « Il serait temps de les prendre au mot » ?',
 '["Il faut croire sans réserve les entreprises quand elles disent nous écouter", "Si notre avis compte vraiment, servons-nous-en : notons moins, et plus sincèrement", "Il faut noter plus souvent pour que notre avis pèse davantage", "Il faut exiger que les entreprises publient toutes les notes reçues"]',
 'B', '"Prendre quelqu''un au mot" es tomarle la palabra: si nos dicen que nuestra opinión cuenta, usémosla de verdad. Justo antes lo concreta: basta con que las cifras sean "un peu moins nombreux, un peu moins flatteurs". A es la lectura ingenua de un eslogan que el autor ironiza desde la primera línea.', 8)
) AS v(prompt, opts, ans, expl, ord)
WHERE t.slug = 'fr-r-c1-essai';

COMMIT;

-- Comprobación:
--   SELECT t.slug, t.level, count(q.id) FROM exam_texts t
--     LEFT JOIN exam_questions q ON q.text_id = t.id WHERE t.lang = 'fr' GROUP BY 1, 2 ORDER BY 2;
--   SELECT t.slug, t.level, count(q.id) FROM listening_tasks t
--     LEFT JOIN exam_questions q ON q.listening_id = t.id WHERE t.lang = 'fr' GROUP BY 1, 2 ORDER BY 2;
