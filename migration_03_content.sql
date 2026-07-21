-- Migración 03 — CONTENIDO real de estudio
-- Rellena las 8 lecciones de gramática (antes con content_html vacío →
-- "próximamente") y amplía el banco de vocabulario. Contenido original,
-- pensado para un hispanohablante que prepara el Cambridge C1 Advanced.
-- Idempotente: los UPDATE se pueden repetir; los INSERT de words usan
-- ON CONFLICT y al final se rellena user_words.

-- ══════════════════════ GRAMÁTICA ══════════════════════

UPDATE grammar_topics SET content_html = $html$
<p><strong>Past Simple</strong> = acción terminada en un momento concreto del pasado. <strong>Present Perfect</strong> = conexión con el presente (experiencia, resultado actual, algo reciente o sin tiempo definido).</p>
<ul>
<li><em>I <strong>saw</strong> her yesterday.</em> — cuándo concreto → Past Simple.</li>
<li><em>I <strong>have seen</strong> that film.</em> — experiencia, sin cuándo → Present Perfect.</li>
</ul>
<p><strong>Marcadores.</strong> Past Simple: <em>yesterday, last week, in 2019, ago</em>. Present Perfect: <em>ever, never, already, yet, just, since, for</em>.</p>
<p><strong>Trampa del hispanohablante:</strong> "he vivido aquí 5 años (y sigo)" = <em>I <strong>have lived</strong> here for 5 years</em>, nunca "I live here for 5 years".</p>
<p><strong>Practica:</strong> "She ____ (finish) her report an hour ago." · "They ____ (not / decide) yet."</p>
$html$ WHERE title = 'Present Perfect vs Past Simple';

UPDATE grammar_topics SET content_html = $html$
<p>La pasiva se forma con <strong>be + participio</strong>, conjugando <em>be</em> en el tiempo que toque. Se usa cuando el <em>qué</em> importa más que el <em>quién</em>, o cuando el agente es obvio o desconocido.</p>
<ul>
<li>Present: <em>The reports <strong>are checked</strong> daily.</em></li>
<li>Past: <em>The bridge <strong>was built</strong> in 1890.</em></li>
<li>Present Perfect: <em>The results <strong>have been published</strong>.</em></li>
<li>Modal: <em>This <strong>must be done</strong> today.</em></li>
</ul>
<p><strong>Agente</strong> con <em>by</em> solo si aporta: <em>The novel was written <strong>by</strong> Orwell.</em></p>
<p><strong>Clave CAE:</strong> la pasiva sube el registro de un texto formal (report, proposal). Domínala para Writing.</p>
<p><strong>Practica:</strong> pasa a pasiva — "Someone has stolen my bike." · "They will announce the winner tomorrow."</p>
$html$ WHERE title = 'Passive Voice — all tenses';

UPDATE grammar_topics SET content_html = $html$
<p><strong>Zero</strong> (verdad general): <em>If you heat ice, it <strong>melts</strong>.</em><br>
<strong>1st</strong> (real futuro): <em>If it <strong>rains</strong>, we<strong>'ll stay</strong> in.</em><br>
<strong>2nd</strong> (hipotético presente): <em>If I <strong>had</strong> time, I<strong>'d help</strong>.</em><br>
<strong>3rd</strong> (pasado imposible): <em>If she <strong>had studied</strong>, she<strong>'d have passed</strong>.</em></p>
<p><strong>Mixed</strong> (condición pasada → resultado presente): <em>If I <strong>had saved</strong> money, I<strong>'d be</strong> rich now.</em></p>
<p><strong>Trampa:</strong> nunca "would" en la cláusula <em>if</em>. NO "If I would have time"; sí "If I had time".</p>
<p><strong>Nivel C1:</strong> alterna <em>if</em> con <em>unless, provided that, as long as, should you, were I to, had I known</em> (inversión). <em>Should you need help, call me.</em></p>
<p><strong>Practica:</strong> "If I ____ (know) you were coming, I ____ (cook)." (mixto/3rd)</p>
$html$ WHERE title = 'Conditionals 0, 1, 2, 3 & Mixed';

UPDATE grammar_topics SET content_html = $html$
<p>Al pasar de estilo directo a indirecto, el verbo suele <strong>retroceder un tiempo</strong> y cambian pronombres y marcadores de tiempo/lugar.</p>
<ul>
<li>"I <strong>am</strong> tired" → He said he <strong>was</strong> tired.</li>
<li>"I <strong>saw</strong> it" → She said she <strong>had seen</strong> it.</li>
<li>"I <strong>will</strong> call" → He said he <strong>would</strong> call.</li>
</ul>
<p><strong>Cambios:</strong> now→then, today→that day, tomorrow→the next day, here→there, this→that.</p>
<p><strong>Preguntas:</strong> sin inversión y con <em>if/whether</em>. <em>"Where do you live?" → She asked where I <strong>lived</strong>.</em></p>
<p><strong>Verbos de reporte (clave CAE):</strong> <em>admit, deny, suggest, warn, remind, insist, claim, point out</em> — más precisos que "say/tell".</p>
<p><strong>Practica:</strong> reporta — "I didn't take it," he said. · "Don't be late," she told me.</p>
$html$ WHERE title = 'Reported Speech';

UPDATE grammar_topics SET content_html = $html$
<p>Los modales matizan <strong>probabilidad, obligación, permiso y crítica</strong>. En C1 lo importante son los matices finos.</p>
<ul>
<li><strong>Deducción presente:</strong> <em>She <strong>must</strong> be home</em> (seguro) / <em>might/could be</em> (posible) / <em>can't be</em> (imposible).</li>
<li><strong>Deducción pasada:</strong> <em>He <strong>must have</strong> left</em> / <em>might have left</em> / <em>can't have left</em>.</li>
<li><strong>Crítica pasada:</strong> <em>You <strong>should have</strong> told me.</em> (pero no lo hiciste)</li>
<li><strong>Obligación ausente:</strong> <em>You <strong>needn't have</strong> paid</em> (pagaste sin necesidad).</li>
</ul>
<p><strong>Trampa:</strong> <em>must</em> (obligación propia) vs <em>have to</em> (externa); <em>mustn't</em> (prohibido) vs <em>don't have to</em> (opcional).</p>
<p><strong>Practica:</strong> "The lights are off — they ____ (go) to bed." · "You ____ (worry), it was already handled."</p>
$html$ WHERE title = 'Modal Verbs — advanced';

UPDATE grammar_topics SET content_html = $html$
<p>En registro formal, mover al principio una expresión negativa o restrictiva <strong>invierte sujeto y verbo</strong> (como en una pregunta). Da énfasis y sube el nivel del texto.</p>
<ul>
<li><em><strong>Never</strong> have I seen such a mess.</em></li>
<li><em><strong>Not only</strong> did he apologise, but he also paid.</em></li>
<li><em><strong>No sooner</strong> had we left <strong>than</strong> it started to rain.</em></li>
<li><em><strong>Rarely / Seldom / Little</strong> did she realise the risk.</em></li>
<li><em><strong>Only when</strong> he left <strong>did</strong> I feel calm.</em></li>
</ul>
<p><strong>Clave CAE:</strong> la inversión aparece en Key Word Transformation (Reading &amp; Use of English, Part 4) y luce muchísimo en Writing.</p>
<p><strong>Practica:</strong> reescribe con inversión — "I had never tasted anything like it." · "She not only sings but also writes."</p>
$html$ WHERE title = 'Inversion for Emphasis';

UPDATE grammar_topics SET content_html = $html$
<p>Las <strong>cleft sentences</strong> parten una idea en dos para enfatizar un elemento. Dos patrones esenciales:</p>
<ul>
<li><strong>It-cleft:</strong> <em><strong>It was</strong> John <strong>who</strong> broke it</em> (no otro). <em><strong>It wasn't</strong> until midnight <strong>that</strong> she called.</em></li>
<li><strong>Wh-cleft:</strong> <em><strong>What</strong> I need <strong>is</strong> a break.</em> <em><strong>What</strong> annoys me <strong>is</strong> the noise.</em></li>
</ul>
<p><strong>Variantes útiles:</strong> <em>The reason (why)… is that…</em> · <em>The place where… is…</em> · <em>All (that) I want is…</em></p>
<p><strong>Clave CAE:</strong> herramienta de Writing para dar relieve a un argumento sin subir la voz. Úsala con moderación: una o dos por texto.</p>
<p><strong>Practica:</strong> enfatiza — "I admire her honesty." (What…) · "The weather ruined the trip." (It…)</p>
$html$ WHERE title = 'Cleft Sentences';

UPDATE grammar_topics SET content_html = $html$
<p>Las <strong>participle clauses</strong> comprimen dos ideas en una, quitando sujeto y verbo auxiliar. Muy útiles para escribir denso y elegante.</p>
<ul>
<li><strong>-ing (activo):</strong> <em><strong>Feeling</strong> tired, she went to bed.</em> (= Because she felt tired…)</li>
<li><strong>-ed (pasivo):</strong> <em><strong>Built</strong> in 1900, the house needs work.</em> (= Which was built…)</li>
<li><strong>Perfect:</strong> <em><strong>Having finished</strong>, they left.</em> (= After they had finished…)</li>
</ul>
<p><strong>Regla de oro:</strong> el sujeto de la cláusula de participio debe ser el mismo que el de la principal. <em>Walking home, I saw…</em> (yo camino y yo veo). Evita el <em>dangling participle</em>.</p>
<p><strong>Clave CAE:</strong> suben la cohesión y la madurez del Writing; aparecen en Reading, Part 7 (gapped text).</p>
<p><strong>Practica:</strong> une con participio — "Because I didn't know the answer, I stayed quiet." · "The report, which was written in a rush, had errors."</p>
$html$ WHERE title = 'Participle Clauses';

-- ══════════════════════ VOCABULARIO (lote CAE) ══════════════════════
-- Original: palabra, traducción, ejemplo, nivel, categoría.

INSERT INTO words (word, translation, example_sentence, level, category) VALUES
  ('reliable',       'fiable, de confianza',        'She is a reliable colleague who never misses a deadline.',        'B1', 'general'),
  ('meanwhile',      'mientras tanto',              'I finished the report; meanwhile, he prepared the slides.',       'B1', 'academic'),
  ('turn down',      'rechazar (una oferta)',       'He turned down the job because of the long commute.',             'B1', 'phrasal'),
  ('look forward to','esperar con ganas',           'We look forward to hearing from you soon.',                       'B1', 'phrasal'),
  ('bring up',       'sacar un tema / criar',       'She brought up an interesting point during the meeting.',         'B1', 'phrasal'),
  ('efficient',      'eficiente',                   'The new system is far more efficient than the old one.',          'B1', 'business'),
  ('reluctant',      'reacio, poco dispuesto',      'He was reluctant to admit that he had been wrong.',               'B2', 'general'),
  ('thorough',       'minucioso, exhaustivo',       'They carried out a thorough investigation of the incident.',      'B2', 'academic'),
  ('cope with',      'lidiar con, hacer frente',    'It can be hard to cope with so much pressure at work.',           'B2', 'phrasal'),
  ('outcome',        'resultado, desenlace',        'The outcome of the negotiation surprised everyone.',              'B2', 'business'),
  ('feasible',       'viable, factible',            'The plan sounds ambitious but it is perfectly feasible.',         'B2', 'business'),
  ('undermine',      'socavar, minar',              'Constant criticism can undermine a person''s confidence.',        'B2', 'academic'),
  ('acknowledge',    'reconocer, admitir',          'The company acknowledged that mistakes had been made.',           'B2', 'academic'),
  ('a blessing in disguise','un mal que trae bien', 'Losing that job was a blessing in disguise.',                     'B2', 'idiom'),
  ('get the hang of','pillarle el truco',           'It took me a week to get the hang of the software.',              'B2', 'idiom'),
  ('resilient',      'resiliente, resistente',      'Small businesses proved remarkably resilient during the crisis.', 'C1', 'general'),
  ('meticulous',     'meticuloso',                  'Her meticulous notes made the research easy to follow.',          'C1', 'academic'),
  ('compelling',     'convincente, irresistible',   'The lawyer made a compelling argument to the jury.',              'C1', 'academic'),
  ('inadvertently',  'sin querer, inadvertidamente','He inadvertently deleted the entire folder.',                     'C1', 'academic'),
  ('discrepancy',    'discrepancia, disparidad',    'There is a clear discrepancy between the two accounts.',          'C1', 'academic'),
  ('mitigate',       'mitigar, atenuar',            'Measures were taken to mitigate the impact of the cuts.',         'C1', 'business'),
  ('albeit',         'aunque, si bien',             'It was a useful, albeit brief, discussion.',                      'C1', 'academic'),
  ('come to terms with','asumir, aceptar',          'She finally came to terms with the loss.',                        'C1', 'idiom'),
  ('bite the bullet','apechugar, dar el paso',      'We had to bite the bullet and replace the whole system.',         'C1', 'idiom')
ON CONFLICT DO NOTHING;

-- Toda palabra nueva entra en la cola de repaso.
INSERT INTO user_words (word_id)
SELECT w.id FROM words w
WHERE NOT EXISTS (SELECT 1 FROM user_words uw WHERE uw.word_id = w.id);

SELECT
  (SELECT COUNT(*) FROM words) AS palabras,
  (SELECT COUNT(*) FROM grammar_topics WHERE content_html IS NOT NULL AND content_html <> '') AS lecciones_con_contenido,
  (SELECT COUNT(*) FROM user_words) AS en_cola_repaso;
