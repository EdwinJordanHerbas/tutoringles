-- TutorIngles · Migration 14 — LISTENING C1
--
-- Cuatro partes, 30 preguntas. Cada grabación se escucha DOS VECES.
--
--   Parte 1 · Tres extractos breves, 2 preguntas cada uno ....... 6
--   Parte 2 · Monólogo con huecos que se completan ............... 8
--   Parte 3 · Conversación larga, opción múltiple ................ 6
--   Parte 4 · Cinco monólogos con DOS tareas simultáneas ........ 10
--
-- El audio: de momento se locuta con la voz del navegador a partir del guion
-- guardado en `script`. Es una solución de paso — suena sintético y no da la
-- variedad de acentos del examen real. Cuando haya audio grabado se rellena
-- `audio_url` y la interfaz lo prefiere automáticamente.
--
-- Aplicar:
--   docker exec -i postgres psql -U postgres -d tutoringles -v ON_ERROR_STOP=1 < migration_14_listening.sql
--
-- Idempotente.

BEGIN;

CREATE TABLE IF NOT EXISTS listening_tasks (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(60) NOT NULL UNIQUE,
  part        SMALLINT    NOT NULL CHECK (part BETWEEN 1 AND 4),
  title       TEXT        NOT NULL,
  intro       TEXT,
  script      TEXT        NOT NULL,   -- guion; se locuta si no hay audio grabado
  audio_url   TEXT,                   -- audio real, cuando exista
  speaker     VARCHAR(30) DEFAULT 'en-GB',
  extras      JSONB,                  -- opciones comunes (parte 4)
  level       VARCHAR(4)  NOT NULL DEFAULT 'C1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE exam_questions
  ADD COLUMN IF NOT EXISTS listening_id INTEGER REFERENCES listening_tasks(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS exam_questions_listening_idx ON exam_questions(listening_id, order_index);

DELETE FROM exam_questions WHERE part IN ('listening_mc','listening_gap','listening_match');
DELETE FROM listening_tasks;

-- ══════════════════════ PARTE 1 · EXTRACTOS BREVES ══════════════════════
INSERT INTO listening_tasks (slug, part, title, intro, script) VALUES
('l1-extracts', 1, 'Parte 1 · Tres extractos breves',
 'Oirás tres extractos. Hay dos preguntas por extracto. Escucha cada uno dos veces.',
'Extract one. You hear two colleagues discussing a training course.

Woman: So, was it worth the three days?
Man: Honestly? The content was fine. Nothing I could not have got from a book, but fine. What surprised me was the other people there.
Woman: In a good way?
Man: In a very good way. Half of them had the same problem I have been banging my head against for a year, and two of them had already solved it. I came back with three phone numbers and a shortcut.
Woman: So you would go again.
Man: I would go again for the coffee breaks. The sessions themselves I could take or leave.

Extract two. You hear a woman talking about moving to a different city.

Woman: Everyone warned me about the weather, and the weather turned out to be the least of it. What nobody mentioned was how long it takes to build the sort of friendship where you can turn up without ringing first. I had colleagues within a week and acquaintances within a month, and then absolutely nothing for about a year and a half. It is not that people were unfriendly. They already had their lives arranged. I do not regret it, but I would tell anyone considering the same thing to budget two years, not two months.

Extract three. You hear a chef talking about running a restaurant.

Man: People imagine the hard part is the cooking. The cooking is the part I would happily do for nothing. The hard part is that you are running a small factory with a rota, a supply chain and a wage bill, and the food is maybe a fifth of it. I have watched brilliant cooks open places and close them within the year, not because the food was wrong but because nobody told them they were about to become an administrator who occasionally gets to hold a knife.');

INSERT INTO exam_questions (part, level, listening_id, prompt, options, answer, explanation, order_index)
SELECT 'listening_mc', 'C1', t.id, v.prompt, v.opts::jsonb, v.ans, v.expl, v.ord
FROM listening_tasks t, (VALUES
('Extracto 1: ¿Qué opina el hombre del contenido del curso?',
 '["Le pareció excelente","Le pareció correcto pero poco original","Le pareció demasiado teórico","No llegó a evaluarlo"]',
 'B', 'Dice "The content was fine. Nothing I could not have got from a book, but fine": correcto, pero nada que no estuviera ya en un libro.', 1),
('Extracto 1: ¿Qué fue lo más valioso del curso para él?',
 '["Los contactos que hizo","El material entregado","La calidad de los ponentes","El certificado obtenido"]',
 'A', 'Volvió con "three phone numbers and a shortcut" y bromea con que volvería "for the coffee breaks".', 2),
('Extracto 2: ¿Qué le resultó más difícil de la mudanza?',
 '["Adaptarse al clima","Encontrar trabajo","Hacer amistades de verdad","Aprender el idioma local"]',
 'C', 'El clima fue "the least of it". Lo duro fue la amistad de confianza: colegas y conocidos sí, amigos no.', 3),
('Extracto 2: ¿Qué consejo daría a quien vaya a hacer lo mismo?',
 '["Que no lo haga","Que cuente con dos años de adaptación","Que se mude con alguien conocido","Que elija una ciudad más pequeña"]',
 'B', '"I would tell anyone considering the same thing to budget two years, not two months."', 4),
('Extracto 3: ¿Qué idea quiere desmontar el chef?',
 '["Que cocinar sea sencillo","Que un restaurante dé mucho dinero","Que lo difícil de un restaurante sea cocinar","Que haga falta formación para cocinar"]',
 'C', '"People imagine the hard part is the cooking" — y él sostiene que no, que lo duro es la gestión.', 5),
('Extracto 3: ¿Por qué dice que cierran cocineros brillantes?',
 '["Porque su comida no gusta","Porque no esperaban tener que gestionar","Porque eligen mal la ubicación","Porque no soportan los horarios"]',
 'B', '"nobody told them they were about to become an administrator who occasionally gets to hold a knife".', 6)
) AS v(prompt, opts, ans, expl, ord)
WHERE t.slug = 'l1-extracts';

-- ══════════════════════ PARTE 2 · SENTENCE COMPLETION ══════════════════════
INSERT INTO listening_tasks (slug, part, title, intro, script) VALUES
('l2-lighthouse', 2, 'Parte 2 · Completar frases',
 'Oirás a una persona hablando de su trabajo como farera. Completa cada frase con UNA o DOS palabras. Copia las palabras exactas que oigas.',
'My name is Eleanor Vance, and for eleven years I was a lighthouse keeper on the north-west coast.

People always ask about the loneliness, and I understand why, but they ask the wrong question. The isolation was never the difficulty. What took adjusting to was the noise. A lighthouse in a storm is not a peaceful place: the whole structure hums, and after a while you stop hearing it as sound and start feeling it in your teeth.

The work itself was mostly maintenance. In the popular imagination the keeper spends the night staring out to sea, but by my time the light was entirely automatic. My real job was preventing rust. Salt gets into everything, and if you leave it a fortnight you have a problem that takes a month to fix.

I kept a garden, which everyone found funny. Nothing tall survived the wind, so it was all herbs and root vegetables, and the soil I brought over myself in sacks, a bit at a time, for two summers.

The hardest part was the ending. The station was automated in my ninth year, and for two more years I was there in what they called a monitoring capacity, which meant watching a machine do competently what I had done by hand. When they finally closed the post, I was almost relieved.

What I miss is not the view, though the view was extraordinary. It is the certainty. Every single day I knew exactly what needed doing and whether I had done it. I have never had that in any job since.');

INSERT INTO exam_questions (part, level, listening_id, prompt, answer, explanation, order_index)
SELECT 'listening_gap', 'C1', t.id, v.prompt, v.ans, v.expl, v.ord
FROM listening_tasks t, (VALUES
('Eleanor trabajó como farera durante ______ años.', 'eleven', 'Literal: "for eleven years I was a lighthouse keeper".', 1),
('Lo que más le costó acostumbrarse no fue la soledad, sino el ______.', 'noise', '"The isolation was never the difficulty. What took adjusting to was the noise."', 2),
('Durante la tormenta, la vibración acababa sintiéndola en los ______.', 'teeth', '"you stop hearing it as sound and start feeling it in your teeth".', 3),
('En su época, la luz del faro era totalmente ______.', 'automatic', '"by my time the light was entirely automatic".', 4),
('Su verdadero trabajo consistía en evitar el ______.', 'rust', '"My real job was preventing rust."', 5),
('En el jardín solo sobrevivían hierbas y ______.', 'root vegetables', '"it was all herbs and root vegetables" — nada alto aguantaba el viento.', 6),
('El faro se automatizó en su ______ año.', 'ninth', '"The station was automated in my ninth year."', 7),
('De aquel trabajo echa de menos sobre todo la ______.', 'certainty', '"What I miss is not the view... It is the certainty."', 8)
) AS v(prompt, ans, expl, ord)
WHERE t.slug = 'l2-lighthouse';

-- ══════════════════════ PARTE 3 · CONVERSACIÓN LARGA ══════════════════════
INSERT INTO listening_tasks (slug, part, title, intro, script) VALUES
('l3-interview', 3, 'Parte 3 · Entrevista',
 'Oirás una entrevista a una investigadora sobre la memoria. Elige la mejor opción para cada pregunta.',
'Interviewer: Doctor Ferreira, your book argues that we have been thinking about memory the wrong way round. What do you mean by that?

Ferreira: We tend to treat forgetting as a failure — as the system breaking down. My argument is that forgetting is the system working. A memory that kept everything would be unusable, because you would have to search through everything to find anything.

Interviewer: But surely people who forget appointments would disagree.

Ferreira: They would, and they would be right about the inconvenience. What I am disputing is the framing. The brain is not trying to store your life; it is trying to predict what you will need. Sometimes it predicts badly. That is a calibration problem, not a design flaw.

Interviewer: You are quite critical in the book of the memory-training industry.

Ferreira: I am critical of the promises, not the techniques. The techniques mostly work — for the narrow thing they train. Someone who spends six months on a memory palace will get very good at remembering long lists in order. What they will not get is a better memory in general, and that is what is being sold.

Interviewer: Is there anything that does improve memory in general?

Ferreira: Sleep. Consistently, boringly, sleep. It is the only intervention with an effect size that would impress you, and it is the one nobody wants to hear about, because it cannot be packaged and sold at a weekend course.

Interviewer: That sounds rather bleak for your readers.

Ferreira: I would say the opposite. It means the thing that works is free and available to everybody. What is bleak about that? The problem is not access, it is that we have organised our lives as though sleep were optional.');

INSERT INTO exam_questions (part, level, listening_id, prompt, options, answer, explanation, order_index)
SELECT 'listening_mc', 'C1', t.id, v.prompt, v.opts::jsonb, v.ans, v.expl, v.ord
FROM listening_tasks t, (VALUES
('Según Ferreira, olvidar es',
 '["un fallo del sistema","una señal de envejecimiento","el sistema funcionando bien","un problema aún sin explicar"]',
 'C', '"forgetting is the system working". Una memoria que lo guardara todo sería inservible.', 1),
('¿Cómo responde a quien olvida sus citas?',
 '["Que exageran la molestia","Que tienen razón en la molestia pero no en el planteamiento","Que deberían entrenar más la memoria","Que es un fallo de diseño del cerebro"]',
 'B', '"they would be right about the inconvenience. What I am disputing is the framing."', 2),
('¿Qué dice el cerebro que intenta hacer?',
 '["Almacenar tu vida entera","Predecir lo que vas a necesitar","Priorizar lo emotivo","Descartar lo repetido"]',
 'B', '"it is trying to predict what you will need". Fallar en eso es un problema de calibración, no de diseño.', 3),
('¿Qué critica exactamente de la industria del entrenamiento de memoria?',
 '["Que sus técnicas no funcionan","Que son demasiado caras","Lo que prometen, no las técnicas","Que no tienen base científica"]',
 'C', '"I am critical of the promises, not the techniques." Las técnicas sirven para lo estrecho que entrenan.', 4),
('¿Qué mejora la memoria de forma general?',
 '["Los palacios de la memoria","La dieta","El sueño","La repetición espaciada"]',
 'C', '"Sleep. Consistently, boringly, sleep." Es la única intervención con un efecto notable.', 5),
('¿Por qué dice que su conclusión no es desalentadora?',
 '["Porque hay nuevos tratamientos en camino","Porque lo que funciona es gratis y está al alcance de todos","Porque la memoria mejora con la edad","Porque el problema no tiene solución"]',
 'B', '"the thing that works is free and available to everybody. What is bleak about that?"', 6)
) AS v(prompt, opts, ans, expl, ord)
WHERE t.slug = 'l3-interview';

-- ══════════════════════ PARTE 4 · MULTIPLE MATCHING ══════════════════════
INSERT INTO listening_tasks (slug, part, title, intro, script, extras) VALUES
('l4-careers', 4, 'Parte 4 · Cinco monólogos, dos tareas',
 'Oirás a cinco personas hablando de un cambio de profesión. Hay DOS tareas: por qué cambiaron (1-5) y qué aprendieron (6-10). Escucha las dos veces atendiendo a una tarea cada vez.',
'Speaker one: I was good at it, that was the trap. Being good at something is not the same as wanting to do it, and it took me until my late thirties to notice the difference. Nobody pushed me out. I walked. What I would say now is that I badly underestimated how much of my confidence came from being the person who knew things, and starting again meant being the person who did not.

Speaker two: There was no dramatic moment. The company restructured, my department went, and at forty-three I had a decision to make that I had been avoiding for a decade. I retrained. The surprise was not how hard it was — I expected hard. The surprise was that all those years I thought I was wasting were the reason anyone hired me. Nobody wants a beginner. They want a beginner who has run a team.

Speaker three: My health made it for me. I could not keep the hours, and once that was clear the rest followed quickly. I will admit I was angry for about a year. What I have come round to is that the job was never going to give me back what it took, and I would not have seen that if I had been given the choice.

Speaker four: I wanted more money, plainly. I get tired of people dressing these things up as a search for meaning. I moved into a field that pays roughly double for work I find no more interesting than what I did before, and I have never once regretted it. What I did not anticipate was that the new place would be run so much better. It turns out being well managed is worth more to me than the money was.

Speaker five: I followed my partner abroad and could not practise my profession there, so the choice was made for me by paperwork. I resented it enormously at the time. Five years on, I am doing something I would never have chosen and would not now give up. I have stopped believing that people know what suits them. Mostly we find out by accident.',
 '{"task1": {
     "title": "¿Por qué cambiaron de profesión?",
     "options": [
       {"letter":"A","text":"Perdió su puesto en una reestructuración"},
       {"letter":"B","text":"Se dio cuenta de que se le daba bien pero no le gustaba"},
       {"letter":"C","text":"Buscaba un salario mayor"},
       {"letter":"D","text":"Se mudó a otro país"},
       {"letter":"E","text":"No podía sostener el ritmo por salud"},
       {"letter":"F","text":"Quería más tiempo con su familia"}
     ]},
   "task2": {
     "title": "¿Qué aprendieron del cambio?",
     "options": [
       {"letter":"A","text":"Que la experiencia previa era su mejor baza"},
       {"letter":"B","text":"Que estar bien dirigido importa más que el sueldo"},
       {"letter":"C","text":"Que uno no sabe lo que le conviene hasta que lo prueba"},
       {"letter":"D","text":"Que su seguridad dependía de ser quien sabía"},
       {"letter":"E","text":"Que aquel trabajo nunca le iba a compensar"},
       {"letter":"F","text":"Que conviene ahorrar antes de dar el paso"}
     ]}}'::jsonb);

INSERT INTO exam_questions (part, level, listening_id, prompt, options, answer, explanation, order_index)
SELECT 'listening_match', 'C1', t.id, v.prompt, '["A","B","C","D","E","F"]'::jsonb, v.ans, v.expl, v.ord
FROM listening_tasks t, (VALUES
('Tarea 1 · Persona 1: motivo del cambio', 'B', '"I was good at it, that was the trap. Being good at something is not the same as wanting to do it."', 1),
('Tarea 1 · Persona 2: motivo del cambio', 'A', '"The company restructured, my department went."', 2),
('Tarea 1 · Persona 3: motivo del cambio', 'E', '"My health made it for me. I could not keep the hours."', 3),
('Tarea 1 · Persona 4: motivo del cambio', 'C', '"I wanted more money, plainly."', 4),
('Tarea 1 · Persona 5: motivo del cambio', 'D', '"I followed my partner abroad and could not practise my profession there."', 5),
('Tarea 2 · Persona 1: qué aprendió', 'D', '"how much of my confidence came from being the person who knew things".', 6),
('Tarea 2 · Persona 2: qué aprendió', 'A', '"all those years I thought I was wasting were the reason anyone hired me".', 7),
('Tarea 2 · Persona 3: qué aprendió', 'E', '"the job was never going to give me back what it took".', 8),
('Tarea 2 · Persona 4: qué aprendió', 'B', '"being well managed is worth more to me than the money was".', 9),
('Tarea 2 · Persona 5: qué aprendió', 'C', '"I have stopped believing that people know what suits them. Mostly we find out by accident."', 10)
) AS v(prompt, ans, expl, ord)
WHERE t.slug = 'l4-careers';

COMMIT;
