-- TutorIngles — migración 27: gramática de francés (8 lecciones, lang = 'fr').
--
-- Idempotente. Aplicar como `postgres` (las tablas son suyas):
--   docker exec -i postgres psql -U postgres -d tutoringles -v ON_ERROR_STOP=1 < migration_27_frances_gramatica.sql
--
-- Para quién: Edwin, hispanohablante de España, francés A2. Entiende mucho y no
-- consigue EXPRESARSE, y en torno a un mes se va a trabajar a la Suiza romanda.
-- Meta final: DALF C1.
--
-- Mismo formato que las lecciones de inglés de la migración 03: párrafos cortos,
-- ejemplos en <em>, lo clave en <strong>, una "Trampa del hispanohablante", un
-- párrafo de nivel C1 cuando toca y un "Practica" final. Explicaciones en
-- español, ejemplos en francés. Gramática la justa, y siempre al servicio de una
-- frase que ibas a decir igualmente.
--
-- El orden NO es el de un manual, es el de lo que más se necesita para HABLAR:
--   1-4 (B1): contar qué pasó, y/en, preguntar, pedir con educación. Es lo que
--             hace falta la primera semana: la commune, la régie, el médico,
--             el primer día de trabajo.
--   5-7 (B2): subjuntivo, relativos, opinar y matizar. Lo de la reunión de equipo.
--   8   (C1): conectores para argumentar, pensado ya para el DALF.
--
-- Idempotencia: grammar_topics no tiene clave única por título, así que el
-- INSERT va con WHERE NOT EXISTS (título + lang) y después un UPDATE refresca
-- nivel, descripción, orden y contenido. Repetirla deja las mismas 8 filas con
-- el texto al día, y no toca las lecciones de inglés.

BEGIN;

CREATE TEMP TABLE _gram_fr ON COMMIT DROP AS
SELECT * FROM (VALUES
  ('Passé composé ou imparfait', 'B1',
   'Contar qué pasó: la acción que hace avanzar la historia frente al decorado. Y qué verbos van con être.', 1),
  ('Les pronoms y et en', 'B1',
   '«J''y vais», «j''en ai deux», «il y en a»: dos palabras que el español no tiene y que salen en cada conversación.', 2),
  ('Poser des questions (est-ce que, inversion, intonation)', 'B1',
   'Tres formas de preguntar lo mismo según con quién hablas: el colega, la ventanilla de la commune, un correo formal.', 3),
  ('Le conditionnel : politesse et hypothèses', 'B1',
   'Pedir con educación (je voudrais, pourriez-vous) y hacer hipótesis con si… sin meter nunca el condicional detrás.', 4),
  ('Le subjonctif présent', 'B2',
   'Los pocos disparadores que de verdad salen al hablar, y cuatro sitios donde te sale el subjuntivo y el francés no lo lleva.', 5),
  ('Les pronoms relatifs : qui, que, dont, où', 'B2',
   'Unir dos frases en una para no hablar a trompicones. Qui y que se aprenden en un día; dont es el que hay que trabajar.', 6),
  ('Exprimer son opinion et nuancer', 'B2',
   'Dar tu opinión en una reunión sin sonar tajante: je pense que, il me semble que, certes… mais. El idioma de la réunion d''équipe.', 7),
  ('Les connecteurs logiques pour argumenter (DALF C1)', 'C1',
   'Causa, consecuencia, oposición, concesión: los conectores que el DALF C1 puntúa en la synthèse, el essai y el débat.', 8)
) AS v(title, level, description, ord);

INSERT INTO grammar_topics (title, level, description, order_index, lang)
SELECT v.title, v.level, v.description, v.ord, 'fr'
FROM _gram_fr v
WHERE NOT EXISTS (SELECT 1 FROM grammar_topics g WHERE g.lang = 'fr' AND g.title = v.title);

UPDATE grammar_topics g
SET level = v.level, description = v.description, order_index = v.ord
FROM _gram_fr v
WHERE g.lang = 'fr' AND g.title = v.title;

-- ══════════════════════ 1 · PASSÉ COMPOSÉ OU IMPARFAIT ══════════════════════

UPDATE grammar_topics SET content_html = $html$
<p><strong>Passé composé</strong> = lo que pasó y se acabó: hace avanzar la historia. <strong>Imparfait</strong> = el decorado: cómo era, qué se hacía, qué estaba pasando.</p>
<ul>
<li><em>Hier, j'<strong>ai appelé</strong> la régie.</em> — acción → passé composé.</li>
<li><em>Il <strong>pleuvait</strong> et j'<strong>étais</strong> fatigué.</em> — decorado → imparfait.</li>
<li><em>Je <strong>cherchais</strong> un appart quand tu <strong>as appelé</strong>.</em> — lo que pasaba + lo que lo corta.</li>
</ul>
<p><strong>Atajo:</strong> donde dirías <em>llamé</em> o <em>he llamado</em> → passé composé; donde dirías <em>llamaba, estaba, había</em> → imparfait.</p>
<p><strong>Con être</strong> van los verbos de movimiento y cambio de estado —<em>aller/venir, arriver/partir, entrer/sortir, monter/descendre, naître/mourir, tomber, rester, passer, devenir, rentrer</em>— y <strong>todos los pronominales</strong>. Con être, el participio concuerda con el sujeto: <em>elle est arrivée, ils sont partis, elle s'est levée</em>. Ojo: <em>sortir, monter, descendre, rentrer, passer</em> con complemento directo van con avoir: <em>j'ai sorti la poubelle</em>.</p>
<p><strong>Trampa del hispanohablante:</strong> el español usa <em>haber</em> para todo. NO <em>j'ai allé, je m'ai levé</em>; sí <em>je <strong>suis</strong> allé, je me <strong>suis</strong> levé</em>.</p>
<p><strong>Nivel C1:</strong> con avoir, el participio concuerda con el complemento directo si va delante: <em>la lettre que j'ai <strong>écrite</strong></em>. Se oye, y el DALF lo mira.</p>
<p><strong>Practica:</strong> "Quand je ____ (arriver) à Lausanne, il ____ (faire) beau." · "Ce matin, elle ____ (se lever) à six heures." · Cuenta tu primer día de trabajo en tres frases.</p>
$html$ WHERE title = 'Passé composé ou imparfait' AND lang = 'fr';

-- ══════════════════════ 2 · LES PRONOMS Y ET EN ══════════════════════

UPDATE grammar_topics SET content_html = $html$
<p><strong>Y</strong> sustituye a un lugar o a algo con <strong>à</strong>. <strong>En</strong>, a algo con <strong>de</strong> o a una cantidad. En español muchas veces no decimos nada; en francés <strong>hay que ponerlos</strong>.</p>
<ul>
<li><em>Tu vas à la commune&nbsp;? — Oui, j'<strong>y</strong> vais demain.</em></li>
<li><em>Tu as des enfants&nbsp;? — Oui, j'<strong>en</strong> ai deux.</em></li>
<li><em>On parle du contrat&nbsp;? — Oui, parlons-<strong>en</strong>.</em> (parler <strong>de</strong>)</li>
<li><em>Il reste du café&nbsp;? — Non, il n'<strong>y en</strong> a plus.</em></li>
</ul>
<p><strong>Posición:</strong> delante del verbo conjugado, o del infinitivo si lo hay: <em>j'y vais, je vais y aller, je n'en veux pas</em>. En imperativo, detrás: <em>vas-y, prends-en</em>.</p>
<p><strong>Hechas, a diario:</strong> <em>vas-y</em> (venga) · <em>on y va</em> (vamos) · <em>ça y est</em> (ya está) · <em>je m'en vais</em> (me voy) · <em>j'en ai marre</em> (estoy harto).</p>
<p><strong>Trampa del hispanohablante:</strong> en español basta con «tengo dos» o «voy mañana». En francés, no: NO <em>j'ai deux, je vais demain</em>; sí <em>j'<strong>en</strong> ai deux, j'<strong>y</strong> vais demain</em>. Con personas, sin <em>y</em>: <em>je pense <strong>à elle</strong></em>.</p>
<p><strong>Practica:</strong> "Tu es déjà allé à Genève&nbsp;? — Oui, j'____ suis allé deux fois." · "Vous avez des questions&nbsp;? — Oui, j'____ ai une." · Contesta: "Il y a une pharmacie près d'ici&nbsp;?"</p>
$html$ WHERE title = 'Les pronoms y et en' AND lang = 'fr';

-- ══════════════════════ 3 · POSER DES QUESTIONS ══════════════════════

UPDATE grammar_topics SET content_html = $html$
<p>La misma pregunta, <strong>tres registros</strong>:</p>
<ul>
<li><strong>Entonación</strong> (hablando): <em>Tu viens ce soir&nbsp;? · Tu pars quand&nbsp;?</em></li>
<li><strong>Est-ce que</strong> (neutra, vale siempre): <em>Est-ce que vous avez un formulaire&nbsp;? · Où est-ce que je dois signer&nbsp;?</em></li>
<li><strong>Inversión</strong> (formal, correos): <em>Avez-vous reçu mon dossier&nbsp;? · Où dois-je signer&nbsp;?</em></li>
</ul>
<p>En la inversión, si el verbo acaba en vocal, <strong>-t-</strong>: <em>A-t-il appelé&nbsp;?</em> Con sustantivo, se añade el pronombre: <em>La régie a-t-elle répondu&nbsp;?</em></p>
<p><strong>En la commune, la régie o el médico</strong>, lo seguro es est-ce que + condicional: <em>Est-ce que je pourrais prendre rendez-vous&nbsp;?</em></p>
<p><strong>Trampa del hispanohablante:</strong> «¿Qué haces?» NO es <em>Que tu fais&nbsp;?</em>; sí <em>Qu'est-ce que tu fais&nbsp;?</em> o, hablando, <em>Tu fais quoi&nbsp;?</em>. Y en pregunta indirecta, sin est-ce que: <em>Je voudrais savoir <strong>ce que</strong> je dois apporter</em>.</p>
<p><strong>Nivel C1:</strong> una pregunta con inversión abre bien un párrafo o un exposé: <em>Faut-il pour autant interdire la voiture en ville&nbsp;?</em></p>
<p><strong>Practica:</strong> pasa a formal: "Vous habitez où&nbsp;?" · Corrige: "Que tu veux boire&nbsp;?" · Pregunta en la commune qué documentos hay que traer.</p>
$html$ WHERE title = 'Poser des questions (est-ce que, inversion, intonation)' AND lang = 'fr';

-- ══════════════════════ 4 · LE CONDITIONNEL ══════════════════════

UPDATE grammar_topics SET content_html = $html$
<p><strong>Conditionnel</strong> = raíz del futuro + terminaciones del imparfait: <em>je voudr<strong>ais</strong>, vous pourr<strong>iez</strong>, il faudr<strong>ait</strong></em>. Dos usos desde el primer día.</p>
<p><strong>1. Pedir con educación</strong> (<em>je veux</em> suena a exigencia):</p>
<ul>
<li><em>Je <strong>voudrais</strong> ouvrir un compte.</em></li>
<li><em><strong>Pourriez</strong>-vous parler plus lentement&nbsp;?</em></li>
<li><em>J'<strong>aimerais</strong> savoir si c'est possible.</em></li>
<li><em>Tu <strong>devrais</strong> appeler la régie.</em> (consejo)</li>
</ul>
<p><strong>2. Hipótesis:</strong> <strong>si + imparfait → conditionnel</strong>: <em>Si j'<strong>avais</strong> le temps, je <strong>viendrais</strong>.</em> En pasado: <em>Si j'<strong>avais su</strong>, je <strong>serais venu</strong>.</em> Si es real, futuro: <em>S'il pleut, on <strong>prendra</strong> le train.</em></p>
<p><strong>Trampa del hispanohablante:</strong> «si <em>tuviera</em>» lleva subjuntivo, pero en francés detrás de <em>si</em> va el imparfait normal. Nunca condicional detrás de <em>si</em>: NO <em>si j'aurais</em>; sí <em>si j'<strong>avais</strong></em>.</p>
<p><strong>Nivel C1:</strong> en la prensa, el conditionnel marca lo no confirmado: <em>le suspect <strong>aurait quitté</strong> la Suisse</em> («habría salido», según dicen). Sale en los documentos del DALF.</p>
<p><strong>Practica:</strong> suaviza: "Je veux un rendez-vous." · "Si tu ____ (habiter) à Lausanne, tu ____ (prendre) le métro." · "Si je l'____ (savoir), je ____ (rester) chez moi."</p>
$html$ WHERE title = 'Le conditionnel : politesse et hypothèses' AND lang = 'fr';

-- ══════════════════════ 5 · LE SUBJONCTIF PRÉSENT ══════════════════════

UPDATE grammar_topics SET content_html = $html$
<p>El <strong>subjonctif</strong> va detrás de ciertos verbos y conjunciones con <em>que</em>. Raíz de <em>ils</em> + <em>-e, -es, -e, -ent</em>: <em>ils prennent → que je prenn<strong>e</strong></em>. Irregulares clave: <em>sois, aie, aille, fasse, puisse, sache, veuille</em>.</p>
<ul>
<li><strong>Obligación:</strong> <em>Il faut que j'<strong>aille</strong> à la commune.</em></li>
<li><strong>Querer que otro haga algo:</strong> <em>Je veux que tu <strong>viennes</strong>.</em></li>
<li><strong>Emoción:</strong> <em>Je suis content que tu <strong>sois</strong> là.</em></li>
<li><strong>Opinión negada:</strong> <em>Je ne pense pas que ce <strong>soit</strong> possible.</em></li>
<li><strong>Conjunciones:</strong> <em>pour que, avant que, bien que, à condition que</em>: <em>Bien qu'il <strong>soit</strong> tard, on continue.</em></li>
</ul>
<p><strong>Trampa del hispanohablante:</strong> cuatro sitios donde el cuerpo te pide subjuntivo y el francés <strong>no</strong> lo lleva:</p>
<ul>
<li><strong>espérer que</strong> + indicativo: <em>j'espère que tu <strong>viendras</strong></em> («espero que vengas»).</li>
<li><strong>quand</strong> + futuro: <em>quand tu <strong>arriveras</strong>, appelle-moi</em> («cuando llegues»).</li>
<li><strong>même si</strong> + indicativo: <em>même s'il <strong>pleut</strong></em> («aunque llueva»).</li>
<li><strong>après que</strong> + indicativo: <em>après qu'il <strong>est</strong> parti</em>. Muchos nativos meten subjuntivo; la norma, no.</li>
</ul>
<p><strong>Practica:</strong> "Il faut que tu ____ (faire) une copie du bail." · "J'espère que vous ____ (passer) un bon week-end." · Traduce: «Cuando tengas un momento, llámame.»</p>
$html$ WHERE title = 'Le subjonctif présent' AND lang = 'fr';

-- ══════════════════════ 6 · LES PRONOMS RELATIFS ══════════════════════

UPDATE grammar_topics SET content_html = $html$
<p>Los relativos unen dos frases en una. Se eligen por la <strong>función</strong>, no por si es persona o cosa:</p>
<ul>
<li><strong>qui</strong> = sujeto: <em>le collègue <strong>qui</strong> m'a formé</em></li>
<li><strong>que</strong> = complemento directo: <em>le collègue <strong>que</strong> je remplace</em></li>
<li><strong>où</strong> = lugar <strong>y tiempo</strong>: <em>la ville <strong>où</strong> j'habite, le jour <strong>où</strong> je suis arrivé</em></li>
<li><strong>dont</strong> = <strong>de + algo</strong>: <em>le dossier <strong>dont</strong> je vous ai parlé</em> (parler <strong>de</strong>)</li>
</ul>
<p><strong>Dont</strong> sale con todo lo que lleva <em>de</em>: <em>avoir besoin de, se souvenir de, s'occuper de</em>. Y es el «cuyo»: <em>une entreprise <strong>dont</strong> le siège est à Genève</em>. «Lo que» = <em>ce qui / ce que / ce dont</em>: <em>Ce dont j'ai besoin, c'est de temps.</em></p>
<p><strong>Trampa del hispanohablante:</strong> el «que» español lo cubre todo, así que salen <em>le dossier que je t'ai parlé</em> y <em>le jour que je suis arrivé</em>. Lo correcto: <em>le dossier <strong>dont</strong>…</em>, <em>le jour <strong>où</strong>…</em></p>
<p><strong>Nivel C1:</strong> tras preposición, <strong>lequel</strong> (<em>laquelle, lesquels…</em>): <em>le projet <strong>sur lequel</strong> je travaille</em>. Con <em>à</em>, <strong>auquel</strong>: <em>les problèmes <strong>auxquels</strong> nous faisons face</em>. Con <em>près de, à côté de</em>, <strong>duquel</strong> (ahí <em>dont</em> no vale): <em>le lac <strong>près duquel</strong> j'habite</em>. Para personas, mejor <em>qui</em>: <em>la collègue <strong>avec qui</strong> je travaille</em>.</p>
<p><strong>Practica:</strong> "C'est le formulaire ____ il faut remplir." · "La collègue ____ je t'ai parlé arrive demain." · Une en una: "Je travaille sur un projet. Ce projet est urgent."</p>
$html$ WHERE title = 'Les pronoms relatifs : qui, que, dont, où' AND lang = 'fr';

-- ══════════════════════ 7 · EXPRIMER SON OPINION ET NUANCER ══════════════════════

UPDATE grammar_topics SET content_html = $html$
<p>En una reunión no basta con tener razón: hay que <strong>decirlo sin chocar</strong>. En Suiza, donde casi todo se decide por consenso, más todavía.</p>
<ul>
<li><strong>Opinar:</strong> <em>Je pense que… · À mon avis… · Il me semble que…</em> (la más suave)</li>
<li><strong>Matizar:</strong> <em>dans une certaine mesure · en partie · pas forcément</em></li>
<li><strong>Conceder:</strong> <em><strong>Certes</strong>, c'est plus cher, <strong>mais</strong> c'est plus fiable.</em></li>
<li><strong>Discrepar:</strong> <em>Je ne suis pas tout à fait d'accord. · Je vois les choses un peu autrement.</em></li>
</ul>
<p><strong>La gramática que esconde:</strong> afirmativo → indicativo; negativo → <strong>subjuntivo</strong>, como en español: <em>Je pense que c'<strong>est</strong> une bonne idée → Je ne pense pas que ce <strong>soit</strong> une bonne idée.</em> <em>Il me semble que</em> va con indicativo.</p>
<p><strong>Trampa del hispanohablante:</strong> el español de España es directo. <em>Tu as tort</em> o <em>ça n'a aucun sens</em> suenan duros en una reunión suiza; mejor <em>je ne suis pas sûr que ce <strong>soit</strong> la meilleure option</em>. Y «tienes razón» es <em>tu as raison</em>, sin artículo.</p>
<p><strong>Nivel C1:</strong> en el débat del DALF el jurado te lleva la contraria a propósito: <em>Je vous l'accorde, mais… · Tout dépend de ce qu'on entend par… · Il n'en reste pas moins que…</em></p>
<p><strong>Practica:</strong> pasa a negativo: "Je pense que c'est possible." · Rebaja: "Tu as tort, c'est trop cher." · Opina en tres frases (opinión, matiz, concesión) sobre el teletrabajo.</p>
$html$ WHERE title = 'Exprimer son opinion et nuancer' AND lang = 'fr';

-- ══════════════════════ 8 · CONNECTEURS LOGIQUES (DALF C1) ══════════════════════

UPDATE grammar_topics SET content_html = $html$
<p>El DALF C1 puntúa la <strong>cohérence et cohésion</strong>: que se vea cómo encadenas las ideas. Con <em>mais, donc, parce que</em> no llega.</p>
<ul>
<li><strong>Causa:</strong> <em>puisque, étant donné que, dans la mesure où</em></li>
<li><strong>Consecuencia:</strong> <em>par conséquent, si bien que, dès lors</em> (por consiguiente)</li>
<li><strong>Oposición:</strong> <em>en revanche, alors que, or</em> (ahora bien)</li>
<li><strong>Concesión:</strong> <em>certes… mais, néanmoins, toutefois</em>, <em>quand bien même</em> + condicional</li>
<li><strong>Adición:</strong> <em>de plus, en outre, par ailleurs</em></li>
</ul>
<ul>
<li><em>Le projet devait finir en mars. <strong>Or</strong>, rien n'est prêt.</em></li>
<li><em><strong>Quand bien même</strong> la mesure serait efficace, elle resterait injuste.</em> (aun cuando fuera)</li>
<li><em><strong>Force est de constater que</strong> le dispositif a échoué.</em> (no queda otra que reconocer)</li>
</ul>
<p><strong>Dónde puntúan:</strong> en la <strong>synthèse</strong> (resumir documentos sin opinar) cosen un texto con otro: <em>Si le premier document insiste sur…, le second nuance ce point.</em> En el <strong>essai argumenté</strong>, uno abre cada párrafo, sin amontonarlos. En el <strong>exposé</strong> y el <strong>débat</strong> marcan el plan en voz alta: <em>Dans un premier temps… · J'en viens à… · Pour conclure…</em></p>
<p><strong>Trampa del hispanohablante:</strong> <em>or</em> no es «o» (eso es <em>ou</em>). «A pesar de que» no es <em>malgré que</em>, que penaliza: <em>bien que</em> + subjuntivo, o <em>malgré</em> + sustantivo. Y en el escrito, <em>en revanche</em> mejor que <em>par contre</em>.</p>
<p><strong>Practica:</strong> reescribe con <em>quand bien même</em>: "Même si on baissait les prix, les clients ne reviendraient pas." · Escribe tres frases sobre la semana de cuatro días con <em>certes</em>, <em>néanmoins</em> y <em>dès lors</em>.</p>
$html$ WHERE title = 'Les connecteurs logiques pour argumenter (DALF C1)' AND lang = 'fr';

-- Las 8 tienen que existir una sola vez y con contenido; si no, rollback entero.
DO $$
DECLARE
  n INT;
BEGIN
  SELECT count(*) INTO n
  FROM grammar_topics g JOIN _gram_fr v ON v.title = g.title
  WHERE g.lang = 'fr' AND coalesce(g.content_html, '') <> '';
  IF n <> 8 THEN
    RAISE EXCEPTION 'migración 27: se esperaban 8 lecciones de francés con contenido y hay %', n;
  END IF;
END $$;

COMMIT;
