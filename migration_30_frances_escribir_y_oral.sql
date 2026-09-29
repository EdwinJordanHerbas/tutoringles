-- TutorIngles · Migration 30 — ESCRIBIR Y EL ORAL EN FRANCÉS (del correo a la régie al DALF C1)
--
-- Para quién: Edwin, hispanohablante de España, dependiente en una cadena de
-- tiendas de deporte. En torno a un mes se va a trabajar a la Suiza romanda (el
-- cantón aún no se sabe). Francés A2: entiende mucho y no consigue expresarse.
-- Meta final: el DALF C1.
--
-- Por qué: la migración 29 dejó las tablas listas para el francés (lang, nivel y
-- los géneros email/synthese/essai), pero sin una sola tarea. ESCRIBIR y el oral
-- de HABLAR seguían siendo sólo del Cambridge.
--
-- Mismo molde que la migración 13: el enunciado en el idioma del examen, tal cual
-- lo daría el examinador, y las claves en español, cortas y sobre los errores
-- reales de un hispanohablante.
--
--   Writing · Part 1 = lo práctico del primer mes (B1-B2): la régie, la
--             responsable, el equipo, el contrôle des habitants y una
--             reclamación a la caisse maladie.
--           · Part 2 = DALF C1: dos dossiers (el teletrabajo; el multilingüismo
--             en Suiza), cada uno con su synthèse (~220 palabras) y su essai
--             (250 como mínimo). Sólo estas cuatro (nivel = 'C1') cuentan como
--             intento de examen: un buen correo de B1 no dice que escribas en C1.
--   Oral    · Parte 1 (B1): presentarse, contar qué pasó, opinar. Es lo que hace
--             falta la primera semana.
--           · Parte 2 (C1): dos exposés del DALF. prompts es un objeto:
--             question (la problématique), documents (el dossier resumido) y
--             follow_up (la primera pregunta del debate).
--           · Parte 3 (C1): el débat con el jury, que contradice a propósito.
--
-- Los documentos de los dossiers son inventados, con una fuente genérica
-- ("extrait d'un article de presse"): ninguna cita atribuida a personas ni a
-- periódicos reales, y ninguna cifra que no se pueda sostener. Cada documento
-- tiene entre 250 y 320 palabras; en el DALF real el dossier ronda las 1.000
-- entre todos, y la guía de la synthèse lo avisa.
--
-- Tipografía: espacio de no separación (U+00A0) antes de ? ! : ; y dentro de
-- « », como en la migración 26.
--
-- Aplicar (como postgres, las tablas son suyas):
--   docker exec -i postgres psql -U postgres -d tutoringles -v ON_ERROR_STOP=1 < migration_30_frances_escribir_y_oral.sql
--
-- Idempotente: ON CONFLICT (slug) DO UPDATE. Todos los slugs empiezan por fr-,
-- así que no toca las tareas inglesas (w1-…, w2-…, sp1-…). Requiere la 29.

BEGIN;

-- ══════════════════════ WRITING ══════════════════════
-- Part 1: correos y cartas del día a día en Suiza (B1-B2).
-- Part 2: el formato del DALF C1, un dossier = una synthèse + un essai.
INSERT INTO writing_tasks (slug, part, kind, title, instructions, input_text, word_min, word_max, guidance, lang, nivel) VALUES

('fr-w-regie-panne', 1, 'email', 'Correo a la régie: la lavadora de la buanderie',
 'Vous êtes locataire d''un appartement en Suisse romande. Depuis lundi, la machine à laver de la buanderie de votre immeuble ne fonctionne plus : elle affiche un message d''erreur et l''eau ne s''évacue pas. Le concierge est absent cette semaine. Écrivez un e-mail à la régie pour signaler la panne, expliquer ce qui ne marche pas et depuis quand, et demander l''intervention d''un technicien. Indiquez aussi vos disponibilités. (80 à 130 mots)',
 NULL,
 80, 130,
 '[
   "Asunto que se entienda sin abrir el correo: «Panne de la machine à laver – buanderie», y tu dirección.",
   "Registro formal: «Madame, Monsieur,» si no sabes quién lo va a leer, y vous en todo el correo.",
   "Lo que la régie necesita para actuar: dirección y piso, qué falla exactamente, desde cuándo, que afecta a todos los inquilinos y cuándo estás en casa.",
   "Pide en condicional: «Pourriez-vous envoyer un technicien ?», «Je vous serais reconnaissant de…». «Je veux un technicien» suena a exigencia.",
   "Aquí «estar roto» es «être en panne» o «ne plus fonctionner»; «cassé» es roto de romperse. Para cerrar, «Meilleures salutations», muy habitual en los correos en Suiza."]'::jsonb,
 'fr', 'B1'),

('fr-w-responsable-conge', 1, 'email', 'Correo a tu responsable: cambiar un turno',
 'Votre responsable de magasin, Nadia, vous a proposé de vous tutoyer dès votre premier jour, comme au reste de l''équipe. Samedi prochain, vous avez rendez-vous pour visiter un appartement, et ce rendez-vous ne peut pas être déplacé. Votre collègue Luca est d''accord pour échanger avec vous : il vous remplacerait samedi et vous le remplaceriez mardi. Écrivez un e-mail à Nadia pour lui expliquer la situation et lui demander si elle est d''accord. (80 à 130 mots)',
 NULL,
 80, 130,
 '[
   "Tu, no vous: ella te lo propuso y todo el equipo se tutea, algo frecuente en muchas tiendas de la Suiza romanda. Pasar al vous por escrito sonaría frío, casi a queja formal. Si nadie te lo ha propuesto, empieza de vous y espera a que te lo ofrezcan.",
   "Ve al grano en las dos primeras frases: el motivo, la solución ya pactada con Luca y la pregunta. Tu responsable lee muchos mensajes al día.",
   "Deja claro que no le das trabajo: «Luca est d''accord pour échanger», «il n''y aurait pas de trou dans le planning». Y es «échanger» (intercambiar con alguien), no «changer».",
   "Tutear no quita educación: pide en condicional, «Est-ce que ce serait possible ?», «Tu serais d''accord ?». «Je veux changer mon samedi» suena a exigencia.",
   "Cierre de tú: «Merci d''avance !», «Belle journée», y tu nombre. Nada de «salutations distinguées» con alguien a quien tuteas."]'::jsonb,
 'fr', 'B1'),

('fr-w-presentation-equipe', 1, 'email', 'Correo de presentación al nuevo equipo',
 'Vous commencez lundi comme vendeur dans un magasin de sport en Suisse romande. Votre responsable vous demande de vous présenter à toute l''équipe par e-mail avant votre arrivée. Dites qui vous êtes et d''où vous venez, parlez de votre expérience dans la vente et expliquez ce qui vous motive dans ce nouveau poste. (100 à 150 mots)',
 NULL,
 100, 150,
 '[
   "Saludo a todo el equipo: «Bonjour à toutes et à tous,» y vous de plural, que no es ni formal ni informal: vale tanto si luego os tuteáis como si no.",
   "Tres bloques cortos: quién eres y de dónde vienes, tu experiencia, qué te motiva. Es un correo, no un currículum: nada de fechas ni listas de empleos.",
   "Géneros al revés que en español: «l''équipe» es femenino (toute l''équipe, ma nouvelle équipe) y «le magasin» masculino (un grand magasin).",
   "«Llevo cinco años en la venta» = «je travaille dans la vente depuis cinq ans», en presente. «Hace cinco años» (algo ya terminado) = «il y a cinq ans». No los mezcles.",
   "Cierra invitando al trato: «Je me réjouis de vous rencontrer lundi !» (se oye muchísimo en Suiza) y, si quieres, «N''hésitez pas à me corriger quand je me trompe en français»: pedirlo de entrada quita mucha presión."]'::jsonb,
 'fr', 'B1'),

('fr-w-commune-documents', 1, 'email', 'Correo a la commune: qué llevar para anunciarte',
 'Vous venez d''arriver en Suisse romande pour travailler et vous devez vous annoncer au contrôle des habitants de votre commune. Écrivez un e-mail à ce service pour vous présenter en quelques mots et demander quels documents vous devez apporter, s''il faut prendre rendez-vous ou si vous pouvez passer pendant les heures d''ouverture, et si une partie des démarches peut se faire en ligne. (80 à 130 mots)',
 NULL,
 80, 130,
 '[
   "Formal completo: «Madame, Monsieur,» y vous. Es una administración: frases cortas, una idea por frase.",
   "En una sola frase, lo que necesitan para contestarte bien: nacionalidad, fecha de llegada, dirección en la commune y que vienes con contrato de trabajo.",
   "Separa las preguntas, una por línea o numeradas. Si van todas en el mismo párrafo, te contestarán solo una.",
   "En la pregunta indirecta no hay inversión: «Pourriez-vous m''indiquer quels documents je dois apporter ?» (no «dois-je»). Y «si» + «il» se escribe «s''il»: «Je voudrais savoir s''il faut prendre rendez-vous.»",
   "No afirmes plazos ni precios que no conoces: pregúntalos. «S''annoncer» es el verbo que se usa en Suiza para darse de alta en la commune. Cierra con «Meilleures salutations» y tu nombre completo."]'::jsonb,
 'fr', 'B1'),

('fr-w-reclamation', 1, 'letter', 'Carta de reclamación: la caisse maladie te cobra dos veces',
 'Votre caisse maladie vous a facturé deux fois la prime du mois d''octobre, et les deux montants ont été prélevés sur votre compte bancaire. Votre compte s''est retrouvé à découvert et votre banque vous a facturé des frais. Il y a trois semaines, vous avez appelé le service clientèle, qui vous a promis de corriger l''erreur, mais rien n''a changé depuis. Écrivez une lettre de réclamation à votre caisse maladie : exposez les faits, expliquez les conséquences de cette erreur et formulez une demande précise. (150 à 200 mots)',
 NULL,
 150, 200,
 '[
   "Estructura de carta formal: tus datos y tu número de assuré arriba, «Objet : Double facturation de la prime d''octobre», y un párrafo para cada cosa: hechos, consecuencias, petición.",
   "Hechos con fechas e importes, en passé composé y sin adjetivos: «Le 3 octobre, j''ai constaté que…». Una queja precisa pesa más que una indignada.",
   "Petición concreta: que te reembolsen lo cobrado de más y los gastos bancarios, y que te lo confirmen por escrito. Para el dinero es «rembourser», no «rendre».",
   "Firme y cortés a la vez: «Je vous prie de bien vouloir…», «Je me vois contraint de…». Nada de ironía ni de amenazas vagas.",
   "Cierre formal completo: «Je vous prie d''agréer, Madame, Monsieur, mes salutations distinguées.» Y menciona los anexos: «Vous trouverez ci-joint une copie de mon relevé bancaire.»"]'::jsonb,
 'fr', 'B2'),

-- ── DALF C1 · dossier A: el teletrabajo ──
('fr-w-dalf-synthese-teletravail', 2, 'synthese', 'DALF · Synthèse: el teletrabajo',
 'Vous ferez une synthèse des documents proposés, en 220 mots environ. Pour cela, vous dégagerez les idées et les informations essentielles qu''ils contiennent, vous les regrouperez et les classerez en fonction du thème commun à ces documents, et vous les présenterez avec vos propres mots, sans ajouter d''éléments ni de commentaires personnels. Vous pourrez réutiliser les mots clés des documents, mais pas des phrases ou des passages entiers. Votre synthèse devra comporter un titre. Indiquez le nombre de mots à la fin de votre texte.',
 'Document 1 — Le télétravail : un acquis qui ne fait pas l''unanimité
(Extrait d''un article de presse, 2025)

Depuis la pandémie, le télétravail s''est installé durablement dans les habitudes de nombreux salariés. Dans les services, la banque ou l''administration, travailler un ou deux jours par semaine depuis chez soi est devenu presque banal. Les avantages sont connus : moins de temps perdu dans les transports, des trains et des routes moins chargés aux heures de pointe, et une plus grande liberté pour organiser sa journée. Beaucoup de salariés affirment d''ailleurs être plus concentrés à la maison, loin du bruit des bureaux ouverts.

Le tableau n''est pourtant pas aussi idyllique qu''il y paraît. Plusieurs enquêtes montrent que la frontière entre vie professionnelle et vie privée tend à s''effacer : on consulte ses courriels le soir, on répond au téléphone pendant le repas. L''isolement pèse aussi sur certains employés, en particulier les plus jeunes, qui apprennent leur métier en observant des collègues plus expérimentés. Un apprenti seul devant son écran progresse moins vite qu''au milieu d''une équipe.

Les employeurs, de leur côté, restent partagés. Certains y voient l''occasion de réduire la surface de leurs bureaux, et donc leurs coûts. D''autres craignent que la cohésion des équipes ne s''effrite et réclament un retour sur site. La plupart ont fini par adopter un modèle hybride, qui combine jours de présence et travail à distance.

Enfin, la question se complique pour les frontaliers : le nombre de jours qu''ils peuvent passer en télétravail dépend d''accords fiscaux et sociaux conclus entre les pays concernés. Un détail administratif en apparence, mais qui pèse lourd dans la décision de rester à la maison ou de prendre la route.


Document 2 — Le télétravail, un privilège qui ne dit pas son nom
(Tribune publiée dans un quotidien romand, 2024)

On présente souvent le télétravail comme une révolution du monde du travail. Mais de quel monde parle-t-on ? La vendeuse d''un magasin de sport, l''infirmière, le chauffeur de bus ou le maçon n''ont jamais eu le choix : leur métier ne s''exerce pas derrière un écran. Ils représentent pourtant une part considérable des actifs, et ils occupent souvent des emplois parmi les moins bien rémunérés.

Pendant la pandémie, on les a applaudis. Quelques années plus tard, le débat sur l''organisation du travail les a presque oubliés. Les uns économisent chaque semaine plusieurs heures de trajet et des frais de transport ; les autres continuent de se lever tôt, de travailler le samedi et de s''adapter à des plannings qui changent d''une semaine à l''autre. Au sein d''une même entreprise, cette différence crée des tensions : les employés du siège restent chez eux le vendredi, pendant que ceux des magasins assurent l''ouverture.

Le télétravail a aussi des effets moins visibles. Quand les bureaux se vident, les cafés, les restaurants et les commerces des centres-villes perdent une partie de leur clientèle. Ce qui arrange les uns fragilise l''emploi des autres.

Il ne s''agit pas de supprimer le télétravail, qui rend de réels services. Il s''agit de reconnaître que la flexibilité ne doit pas être réservée à ceux dont le métier s''y prête. Pour les autres, elle peut prendre d''autres formes : des horaires connus longtemps à l''avance, la possibilité d''échanger facilement ses services avec un collègue, ou quelques jours de congé supplémentaires. Une entreprise qui se veut juste ne peut pas offrir la liberté à une partie de son personnel et demander de la patience à l''autre.',
 200, 240,
 '[
   "Cero opinión: ni «je», ni «à mon avis», ni una idea que no esté en los documentos. Es lo que más nota quita. El documento 2 es una tribuna con opinión: la resumes («pour certains, le télétravail est un privilège»), no la haces tuya.",
   "Organiza por ideas, no por documento: nada de «le document 1 dit…, le document 2 dit…». Aquí el hilo es lo que el teletrabajo aporta, lo que cuesta a quien lo practica y lo que supone para quien no puede practicarlo.",
   "Reformula: puedes reutilizar las palabras clave (télétravail, frontaliers, modèle hybride), pero copiar frases enteras está prohibido. Cambia la estructura de la frase, no solo una palabra.",
   "Título obligatorio, corto y neutro, sin tomar partido. Una o dos frases de introducción con el tema común, y nada de conclusión personal al final.",
   "Cuenta las palabras: 220 aproximadamente. El DALF las cuenta y penaliza desviarse mucho; aquí la zona segura es 200–240. Cuenta como palabra todo lo que va entre dos espacios («c''est-à-dire» es una, «l''entreprise» también) y escribe el total al final."]'::jsonb,
 'fr', 'C1'),

('fr-w-dalf-essai-teletravail', 2, 'essai', 'DALF · Essai: teletrabajo para unos, tienda para otros',
 'Le journal interne de votre entreprise, une chaîne de magasins de sport, prépare un numéro consacré à l''organisation du travail. La direction envisage d''accorder un jour de télétravail par semaine au personnel des bureaux ; les équipes de vente, elles, n''en bénéficieraient pas. Vous rédigez pour ce journal un article argumenté de 250 mots minimum : cette mesure vous paraît-elle juste ? Quelles solutions proposeriez-vous pour que l''organisation du travail soit plus équitable ? Vous pouvez vous appuyer sur les idées du dossier, mais votre texte doit défendre un point de vue personnel.',
 'Dossier : le télétravail. Les deux documents se trouvent dans la synthèse du même dossier ; vous pouvez reprendre leurs idées, jamais leurs phrases.',
 250, 320,
 '[
   "Posición clara desde la introducción: ¿es justa la medida o no? Un essai que da la razón a todos no es un essai. «Oui, à condition que…» vale si lo defiendes hasta el final.",
   "Plan: introducción que plantea la problématique en forma de pregunta, dos o tres partes argumentadas (un párrafo por argumento, cada uno con su ejemplo) y una conclusión que responde y propone.",
   "Conectores que el DALF puntúa: «en effet», «certes… mais», «néanmoins», «or», «dès lors», «c''est pourquoi». Ojo: «or» no es «o»; significa «ahora bien» e introduce el dato que cambia el razonamiento.",
   "Registro: te leen tus compañeros y la dirección. Tono cuidado, sin atacar a nadie, y propuestas concretas (horarios conocidos con antelación, cambios de turno más fáciles…).",
   "Aquí sí va «je», y tu experiencia en tienda es tu mejor argumento; pero un ejemplo no es un argumento: di qué demuestra. Mínimo 250 palabras; por debajo se penaliza."]'::jsonb,
 'fr', 'C1'),

-- ── DALF C1 · dossier B: el multilingüismo en Suiza ──
('fr-w-dalf-synthese-multilinguisme', 2, 'synthese', 'DALF · Synthèse: el multilingüismo en Suiza',
 'Vous ferez une synthèse des documents proposés, en 220 mots environ. Pour cela, vous dégagerez les idées et les informations essentielles qu''ils contiennent, vous les regrouperez et les classerez en fonction du thème commun à ces documents, et vous les présenterez avec vos propres mots, sans ajouter d''éléments ni de commentaires personnels. Vous pourrez réutiliser les mots clés des documents, mais pas des phrases ou des passages entiers. Votre synthèse devra comporter un titre. Indiquez le nombre de mots à la fin de votre texte.',
 'Document 1 — Quatre langues nationales, mais combien de Suisses bilingues ?
(Extrait d''un article de presse, 2025)

La Suisse aime se présenter comme un modèle de coexistence entre les langues. Le pays compte quatre langues nationales — l''allemand, le français, l''italien et le romanche — et les textes officiels de la Confédération sont publiés en plusieurs langues. Pour un visiteur étranger, ce plurilinguisme a quelque chose d''impressionnant.

La réalité quotidienne est plus nuancée. La plupart des Suisses vivent dans une région où une seule langue domine, et beaucoup n''utilisent que rarement celle de leurs voisins. Entre la Suisse alémanique et la Suisse romande, on parle même du « Röstigraben », une frontière invisible qui apparaît lors de certaines votations, dans les médias ou dans les habitudes de consommation. On vit côte à côte plus qu''ensemble.

L''école est au cœur du débat. Dans plusieurs cantons alémaniques, la question revient régulièrement : faut-il enseigner d''abord l''anglais ou le français à l''école primaire ? Les partisans de l''anglais invoquent son utilité dans le monde professionnel ; leurs adversaires répondent qu''une langue nationale est le ciment du pays.

Dans les entreprises, la tendance est déjà visible. Lors des réunions qui rassemblent des collaborateurs de Zurich, de Lausanne et de Lugano, il n''est pas rare que l''on passe à l''anglais, jugé plus neutre. C''est une solution pratique, qui dispense chacun de faire l''effort de parler la langue de l''autre.

À cette mosaïque officielle s''ajoutent enfin les langues de la migration. Le portugais, l''albanais, l''espagnol ou le serbe se parlent chaque jour dans les rues, sur les chantiers et dans les magasins. Le multilinguisme suisse est donc bien réel, mais il ne correspond pas toujours à l''image de carte postale que l''on en donne.


Document 2 — Parler la langue de l''autre, un investissement rentable
(Extrait d''une tribune publiée dans un magazine économique, 2024)

Dans le débat sur les langues, on oublie souvent un argument très concret : parler la langue de l''autre rapporte. Les entreprises suisses travaillent rarement pour une seule région. Une PME vaudoise vend ses produits à Berne, un service clientèle installé à Zurich répond à des appels venus de Genève. Les collaborateurs capables de passer d''une langue nationale à l''autre sont recherchés, et pas seulement aux postes de direction : dans la vente, la logistique ou les soins, ils font gagner du temps et évitent bien des malentendus.

L''anglais, bien sûr, ouvre des portes. Mais il ne suffit pas pour conseiller une cliente à Fribourg, rassurer un patient à Sion ou négocier avec un fournisseur tessinois. Dans ces situations, c''est la langue locale qui crée la confiance.

C''est encore plus vrai pour ceux qui s''installent en Suisse. Les nouveaux arrivants qui ne parlent qu''anglais peuvent vivre des années dans une bulle d''expatriés, sans jamais vraiment comprendre leurs voisins, l''école de leurs enfants ou leur médecin. Apprendre le français ou l''allemand n''est pas seulement une question d''emploi : c''est la condition d''une véritable intégration.

Encore faut-il s''en donner les moyens. Apprendre une langue à l''âge adulte, avec un emploi à plein temps, demande une énergie considérable. Les cours du soir ne suffisent pas toujours, et les spécialistes le répètent : rien ne remplace l''immersion. Les échanges entre régions linguistiques, pour les apprentis comme pour les salariés, restent pourtant trop rares. Les employeurs ont ici un rôle à jouer, en finançant des cours ou en accordant du temps de formation.

On résume parfois le problème ainsi : l''anglais ouvre des portes, mais c''est la langue locale qui ouvre les maisons.',
 200, 240,
 '[
   "Tú vives este tema en primera persona, y precisamente por eso: ni una línea de tu experiencia. Tu opinión va en el essai; aquí, solo lo que dicen los documentos.",
   "Busca el hilo común y haz el plan con él: un país oficialmente plurilingüe donde se convive más de lo que se mezcla, el inglés como atajo, y aprender la lengua del otro como inversión y como integración.",
   "Cruza los documentos en vez de resumirlos por turnos: «alors que», «en revanche», «de même», «de plus». Evita «le premier document affirme…»: presenta las ideas como información, agrupadas por tema.",
   "Reformula sobre todo la frase final del documento 2: es la más tentadora de copiar del dossier. Las palabras clave (Röstigraben, immersion) sí se pueden reutilizar.",
   "Unas 220 palabras (zona segura en la app: 200–240), título obligatorio y el total escrito al final. En el examen real el dossier es más largo, unas 1.000 palabras entre todos los documentos: entrena a leer rápido y a subrayar."]'::jsonb,
 'fr', 'C1'),

('fr-w-dalf-essai-multilinguisme', 2, 'essai', 'DALF · Essai: ¿basta el inglés en la Suiza romanda?',
 'Le bulletin d''information de votre commune ouvre ses pages aux habitants. Le prochain numéro pose la question suivante : « L''anglais suffit-il pour vivre et travailler en Suisse romande ? » Nouvel habitant de la région, vous apprenez vous-même le français. Vous rédigez pour ce bulletin un article argumenté de 250 mots minimum dans lequel vous prenez clairement position, en vous appuyant sur des exemples concrets.',
 'Dossier : le multilinguisme en Suisse. Les deux documents se trouvent dans la synthèse du même dossier ; vous pouvez reprendre leurs idées, jamais leurs phrases.',
 250, 320,
 '[
   "Toma partido: «non, l''anglais ne suffit pas», o «oui pour travailler, mais pas pour vivre»… Cualquiera vale si la defiendes con argumentos; lo que no vale es quedarse en «ça dépend» sin concluir.",
   "Plan dialéctico, el más seguro: «certes», lo que el inglés sí permite; «mais», donde no alcanza; y tu respuesta. Tu caso (llegar entendiendo mucho y sin poder explicarte) es un buen ejemplo, pero di qué demuestra.",
   "Registro: escribes a tus vecinos en el boletín de la commune. Tono cuidado pero cercano, con un título que dé ganas de leer. Un «nous» que incluya al lector («nous, les nouveaux arrivants…») funciona bien.",
   "Trampas del hispanohablante: «bien que» lleva siempre subjuntivo (bien que ce soit difficile), aunque en español digas «aunque es difícil»; «les gens» va en plural (les gens pensent); y «apprendre» lleva dos p.",
   "Conectores de C1: «d''une part… d''autre part», «en outre», «pourtant», «dès lors», «en somme». La conclusión tiene que responder a la pregunta del título. Mínimo 250 palabras."]'::jsonb,
 'fr', 'C1')
ON CONFLICT (slug) DO UPDATE SET
  part         = EXCLUDED.part,
  kind         = EXCLUDED.kind,
  title        = EXCLUDED.title,
  instructions = EXCLUDED.instructions,
  input_text   = EXCLUDED.input_text,
  word_min     = EXCLUDED.word_min,
  word_max     = EXCLUDED.word_max,
  guidance     = EXCLUDED.guidance,
  lang         = EXCLUDED.lang,
  nivel        = EXCLUDED.nivel;

-- ══════════════════════ SPEAKING ══════════════════════
-- Parte 1 (B1): lista de preguntas. Parte 2 (C1): objeto con la problématique,
-- el dossier resumido y la pregunta de debate. Parte 3 (C1): las objeciones del jury.
INSERT INTO speaking_tasks (slug, part, title, instructions, prompts, seconds, tips, lang, nivel) VALUES

('fr-s-se-presenter', 1, 'B1 · Presentarte a tu responsable y al equipo',
 'Vous faites connaissance avec votre nouvelle responsable et vos collègues. Répondez à chaque question en trois ou quatre phrases : une réponse, un détail, un exemple. Attention au registre : la responsable vous vouvoie, la collègue vous tutoie. Ne lisez rien.',
 '[
   "La responsable : « Alors, présentez-vous en quelques mots. D''où venez-vous ? »",
   "La responsable : « Qu''est-ce que vous faisiez avant de venir en Suisse ? »",
   "La responsable : « Vous travaillez dans la vente depuis longtemps ? Qu''est-ce qui vous plaît dans ce métier ? »",
   "Une collègue : « Et pourquoi tu as choisi la Suisse ? Ça n''a pas été trop dur de tout quitter ? »",
   "Une collègue : « Tu fais du sport, toi ? Qu''est-ce que tu aimes faire le week-end ? »",
   "La responsable : « Pour l''instant, qu''est-ce qui est le plus difficile pour vous avec le français ? »"]'::jsonb,
 150,
 '[
   "Cada respuesta: dato, detalle y ejemplo. «Je viens d''Espagne. J''ai travaillé plusieurs années dans un magasin de sport. Là-bas, je m''occupais surtout des chaussures de running.»",
   "«Depuis» + presente para lo que sigue: «je travaille dans la vente depuis…». «Il y a» + pasado para lo terminado: «je suis arrivé il y a deux semaines».",
   "Con la responsable, vous; si la compañera te tutea, tutéala tú también. Devuelve la pregunta con «Et toi ?»: así es una conversación y no un interrogatorio.",
   "No memorices frases enteras: memoriza los tres o cuatro datos que siempre vas a dar y dilos cada vez de otra manera. Un texto aprendido se nota a la primera pregunta imprevista.",
   "Si no entiendes, pide que repitan en vez de adivinar: «Pardon, vous pouvez répéter ?», «Plus lentement, s''il vous plaît.» Nadie lo penaliza."]'::jsonb,
 'fr', 'B1'),

('fr-s-raconter', 1, 'B1 · Contar algo que pasó',
 'Choisissez une ou deux questions et racontez l''histoire du début à la fin. Posez d''abord le décor (où, quand, comment c''était), puis racontez ce qui s''est passé et comment ça s''est terminé.',
 '[
   "Racontez votre premier jour dans votre ancien travail. Comment ça s''est passé ?",
   "Racontez votre voyage jusqu''en Suisse : le départ, le trajet, l''arrivée.",
   "Racontez un problème que vous avez eu avec un client et comment vous l''avez réglé.",
   "Racontez une fois où vous n''avez rien compris dans une langue étrangère. Qu''est-ce que vous avez fait ?",
   "Racontez votre meilleur souvenir de vacances. Où étiez-vous, avec qui, et que s''est-il passé ?"]'::jsonb,
 180,
 '[
   "Imparfait para el decorado (il faisait froid, j''étais nerveux, il y avait du monde) y passé composé para lo que hace avanzar la historia (je suis arrivé, elle m''a dit, j''ai compris). Si cabe preguntar «¿y entonces qué pasó?», es passé composé.",
   "Los verbos de movimiento van con être: «je suis allé», «je suis arrivé», «je suis resté», «je suis tombé». «J''ai allé» es el error típico.",
   "Conectores para que se siga la historia: «d''abord», «ensuite», «tout à coup», «à ce moment-là», «finalement». Y «du coup», muy oral, para «así que».",
   "«Hace dos años» = «il y a deux ans». «Acababa de» = «je venais de»: «je venais d''arriver quand…».",
   "Termina diciendo cómo acabó o qué aprendiste: «Au final, ça s''est bien passé», «Depuis, je…». Una historia sin final deja al que escucha esperando."]'::jsonb,
 'fr', 'B1'),

('fr-s-avis-travail', 1, 'B1 · Opinar sobre el trabajo',
 'Donnez votre avis sur chaque question : prenez position, justifiez avec une raison et un exemple tiré de votre expérience, puis nuancez. Deux ou trois questions bien développées valent mieux que six réponses d''une phrase.',
 '[
   "Travailler le samedi, c''est un problème pour vous ? Pourquoi ?",
   "Vous préférez des horaires fixes ou des horaires qui changent chaque semaine ?",
   "Est-ce que les magasins devraient pouvoir ouvrir le dimanche ?",
   "Le télétravail n''existe pas dans la vente. Est-ce injuste, selon vous ?",
   "Qu''est-ce qui fait un bon responsable d''équipe ?",
   "Vous préférez gagner plus ou avoir plus de temps libre ?"]'::jsonb,
 180,
 '[
   "Postura en la primera frase: «Pour moi, travailler le samedi, ce n''est pas un problème, parce que…». Después, la razón y un ejemplo de tu tienda.",
   "«En mi opinión» es «à mon avis» o «selon moi», nunca «dans mon opinion», que es un calco del español.",
   "«Je pense que» + indicativo (je pense que c''est juste); «je ne pense pas que» + subjuntivo (je ne pense pas que ce soit juste). Es igual que en español; lo difícil son las formas: soit, fasse, puisse, aille.",
   "Matiza para no sonar tajante: «ça dépend», «d''un côté… de l''autre», «c''est vrai que…, mais…».",
   "Si no sale una palabra, rodéala: «le truc qui sert à…», «comment dire…». Callarse es peor que dar un rodeo."]'::jsonb,
 'fr', 'B1'),

('fr-s-dalf-expose-commerce', 2, 'DALF C1 · Exposé: ¿tienen futuro las tiendas?',
 'Vous disposez d''un dossier de trois documents sur le thème ci-dessous. Reformulez la problématique avec vos propres mots, puis présentez un exposé structuré de 8 à 10 minutes : une introduction qui pose la problématique et annonce votre plan, deux ou trois parties argumentées, une conclusion. Appuyez-vous sur les documents sans vous contenter de les résumer, et défendez un point de vue personnel.',
 '{"question": "Les magasins physiques ont-ils encore un avenir face au commerce en ligne ?",
   "documents": [
     "Document 1 (article de presse) : les achats en ligne progressent chaque année et de nombreux commerces ferment dans les centres-villes, en particulier dans l''habillement et l''électronique.",
     "Document 2 (enquête auprès de consommateurs) : beaucoup de clients veulent encore essayer, toucher et être conseillés avant d''acheter, surtout pour des produits techniques comme les chaussures de course.",
     "Document 3 (tribune) : certains magasins se réinventent en lieux d''expérience, avec des ateliers, des tests de matériel et le retrait des commandes en ligne ; la livraison à domicile, elle, pose la question des conditions de travail dans la logistique."
   ],
   "follow_up": "Faudrait-il taxer davantage le commerce en ligne pour protéger les commerces de proximité ?"}'::jsonb,
 600,
 '[
   "Abre con la problématique y anuncia el plan: «Pour commencer, je voudrais…», «J''aborderai d''abord…, puis…, enfin…». Al jury le basta con saber adónde vas.",
   "En el examen real la problématique la formulas tú a partir del dossier; aquí te la damos para que trabajes el plan. Reformúlala con tus palabras, no la leas.",
   "No leas el guion: en la hora de preparación escribe solo el plan y palabras clave. Un exposé leído se nota enseguida y hunde la nota de fluidez.",
   "Usa los documentos para apoyarte, no para resumirlos: «Comme le souligne le deuxième document…». Y aporta ejemplos tuyos: trabajas en una tienda, es tu terreno.",
   "«Je pense que» + indicativo y «je ne pense pas que» + subjuntivo, como en español: ahí tu instinto acierta. Donde falla: «j''espère que» va con indicativo (j''espère que c''est clair) y «quand» con futuro (quand les magasins seront…), nunca con subjuntivo."]'::jsonb,
 'fr', 'C1'),

('fr-s-dalf-expose-montagne', 2, 'DALF C1 · Exposé: turismo en los Alpes',
 'Vous disposez d''un dossier de trois documents sur le thème ci-dessous. Reformulez la problématique avec vos propres mots, puis présentez un exposé structuré de 8 à 10 minutes : une introduction qui pose la problématique et annonce votre plan, deux ou trois parties argumentées, une conclusion. Appuyez-vous sur les documents sans vous contenter de les résumer, et défendez un point de vue personnel.',
 '{"question": "Faut-il limiter l''accès aux sites naturels les plus fréquentés des Alpes ?",
   "documents": [
     "Document 1 (reportage) : chaque été, certains lacs, cols et villages de montagne voient affluer des milliers de visiteurs ; parkings saturés, déchets et habitants excédés se multiplient.",
     "Document 2 (article économique) : dans de nombreuses vallées, le tourisme fait vivre les hôtels, les remontées mécaniques et les commerces ; le limiter, c''est aussi menacer des emplois.",
     "Document 3 (étude) : avec le réchauffement climatique, l''enneigement devient moins fiable à basse altitude, et les stations cherchent à attirer des visiteurs toute l''année."
   ],
   "follow_up": "Faire payer l''accès aux sites les plus célèbres, est-ce une solution juste ou une façon de réserver la montagne à ceux qui en ont les moyens ?"}'::jsonb,
 600,
 '[
   "Introducción en tres pasos: un gancho (un hecho del dossier), la problématique en forma de pregunta y el plan anunciado: «Dans un premier temps…, dans un second temps…, enfin…».",
   "Si dudas, plan dialéctico: «certes», el turismo da de comer a los valles; «mais», hay sitios que no aguantan más; y tu solución. Es el plan más seguro para diez minutos.",
   "Transiciones que se oigan: «J''en viens maintenant à…», «Passons à…». Hablando, el jury necesita oír dónde empieza cada parte.",
   "Gana tiempo sin callarte y sin español: «Comment dire…», «C''est-à-dire que…», «Autrement dit…». Ni un «pues» ni un «bueno»: en francés se dice «euh», «bon», «alors».",
   "Una conclusión que responda de verdad: «Pour conclure, il me semble que…», y abre una pista: «Reste à savoir si…». Es el puente perfecto hacia el débat."]'::jsonb,
 'fr', 'C1'),

('fr-s-dalf-debat', 3, 'DALF C1 · Débat con el jury',
 'Après l''exposé, le jury vous pose des questions : il vous demande de préciser, de justifier, et parfois il vous contredit exprès. Reprenez le thème de votre dernier exposé et répondez à chaque objection : reconnaissez ce qui est juste, nuancez, mais défendez votre position jusqu''au bout.',
 '[
   "Vous avez défendu votre position avec beaucoup d''assurance. Mais ne pensez-vous pas que vous avez négligé l''argument économique ?",
   "Votre exemple personnel est intéressant, mais une expérience individuelle suffit-elle à prouver quelque chose ?",
   "Si je vous ai bien compris, il faudrait tout réglementer. N''est-ce pas un peu excessif ?",
   "Certains soutiennent exactement le contraire de ce que vous avez dit. Que leur répondriez-vous ?",
   "Vous parlez beaucoup de la Suisse. La situation serait-elle la même en Espagne ?",
   "Si vous étiez responsable politique, quelle mesure prendriez-vous en premier, et pourquoi celle-là plutôt qu''une autre ?"]'::jsonb,
 300,
 '[
   "Reconoce y contraataca: «Vous avez raison sur ce point, mais…», «C''est un argument que je comprends ; cela dit…». Ceder en un detalle te hace más creíble, no más débil.",
   "Si la objeción no está clara, reformúlala: «Si je comprends bien, vous voulez dire que… ?». Ganas tiempo y demuestras que has entendido.",
   "Gana tiempo sin callarte: «C''est une question délicate…», «Laissez-moi réfléchir un instant». Diez segundos de silencio penalizan más que una frase de relleno bien dicha.",
   "Discrepar con cortesía: «Si je puis me permettre…», «Je ne suis pas tout à fait d''accord». Y «je ne pense pas que» + subjuntivo: «je ne pense pas que ce soit la solution».",
   "El jury contradice a propósito: no busca que le des la razón ni que te enroques, busca ver cómo matizas. Cierra cada respuesta volviendo a tu postura."]'::jsonb,
 'fr', 'C1')
ON CONFLICT (slug) DO UPDATE SET
  part         = EXCLUDED.part,
  title        = EXCLUDED.title,
  instructions = EXCLUDED.instructions,
  prompts      = EXCLUDED.prompts,
  seconds      = EXCLUDED.seconds,
  tips         = EXCLUDED.tips,
  lang         = EXCLUDED.lang,
  nivel        = EXCLUDED.nivel;

COMMIT;

-- Comprobación:
--   SELECT lang, nivel, part, count(*) FROM writing_tasks  GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;
--   SELECT lang, nivel, part, count(*) FROM speaking_tasks GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;
