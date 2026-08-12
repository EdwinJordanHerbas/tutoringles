-- TutorIngles · Migration 11 — READING C1 (partes 5 a 8)
--
-- Hasta ahora el banco solo cubría Use of English (partes 1-4). Reading son las
-- partes 5 a 8 del MISMO paper: 26 preguntas de las 56 totales.
--
--   Parte 5 · Multiple choice ............ 6 preguntas, 2 puntos cada una
--   Parte 6 · Cross-text multiple matching  4 preguntas, 2 puntos cada una
--   Parte 7 · Gapped text ................ 6 preguntas, 2 puntos cada una
--   Parte 8 · Multiple matching .......... 10 preguntas, 1 punto cada una
--
-- Los textos son originales, escritos para este proyecto con densidad léxica de
-- nivel C1. No se copia material con derechos.
--
-- Aplicar:
--   docker exec -i postgres psql -U postgres -d tutoringles -v ON_ERROR_STOP=1 < migration_11_reading.sql
--
-- Idempotente.

BEGIN;

-- ══════════════════════ ESQUEMA ══════════════════════
-- Reading necesita textos compartidos por varias preguntas.
CREATE TABLE IF NOT EXISTS exam_texts (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(60) NOT NULL UNIQUE,
  part        VARCHAR(30) NOT NULL,
  title       TEXT        NOT NULL,
  intro       TEXT,                       -- enunciado de la tarea
  body        TEXT        NOT NULL,       -- el texto; los huecos van como [1], [2]…
  extras      JSONB,                      -- párrafos sueltos (parte 7) o secciones (parte 8)
  level       VARCHAR(4)  NOT NULL DEFAULT 'C1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS text_id INTEGER REFERENCES exam_texts(id) ON DELETE CASCADE;
ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS exam_questions_text_idx ON exam_questions(text_id, order_index);

-- Ampliar los tipos de parte admitidos: antes solo los cuatro de Use of English.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_questions_part_check') THEN
    ALTER TABLE exam_questions DROP CONSTRAINT exam_questions_part_check;
  END IF;
  ALTER TABLE exam_questions ADD CONSTRAINT exam_questions_part_check CHECK (part IN (
    -- Use of English (partes 1-4)
    'mc_cloze','open_cloze','word_formation','key_word_transformation',
    -- Reading (partes 5-8)
    'reading_mc','cross_text','gapped_text','multi_match',
    -- Listening (se rellenan en la migración 12)
    'listening_mc','listening_gap','listening_match'
  ));
END $$;

-- Regenerar contenido de Reading para poder reejecutar la migración
DELETE FROM exam_questions WHERE part IN ('reading_mc','cross_text','gapped_text','multi_match');
DELETE FROM exam_texts     WHERE part IN ('reading_mc','cross_text','gapped_text','multi_match');

-- ══════════════════════ PARTE 5 · MULTIPLE CHOICE ══════════════════════
INSERT INTO exam_texts (slug, part, title, intro, body) VALUES
('p5-sleep', 'reading_mc', 'The night shift of the mind',
 'Lee el texto y elige la opción que mejor responde a cada pregunta.',
'For most of the twentieth century, sleep was regarded by researchers as an
essentially passive state: the brain, having exhausted itself, simply powered down
until morning. That assumption has been comprehensively overturned. Far from idling,
the sleeping brain turns out to be engaged in some of its most demanding work, and
the consequences of interrupting it are more far-reaching than anyone had supposed.

The revision began with a deceptively simple observation. Volunteers taught a
sequence of finger movements performed markedly better after a night''s sleep than
after an equivalent period awake — not merely because they were less tired, but
because the skill itself had improved in the interval. Something had happened during
the night that practice alone could not deliver. Subsequent work identified the
mechanism: during deep sleep the hippocampus replays the day''s experiences at
accelerated speed, transferring them to the cortex for long-term storage.

What makes this account compelling is not the replay itself so much as its
selectivity. The brain does not archive indiscriminately; it triages. Memories
tagged as significant during waking hours are preferentially consolidated, while the
rest are allowed to fade. This is not a flaw in the system but its central virtue.
A memory that retained everything would be useless, since the labour of retrieval
would swamp any benefit.

The implications for education are uncomfortable. The student who sacrifices sleep
to revise is not simply tired the following day; they have forfeited the very
process by which the revision would have been made permanent. Yet the practice
persists, sustained by the intuition that time spent awake with a textbook must
count for more than time spent unconscious. That intuition, the evidence suggests,
is precisely backwards.');

INSERT INTO exam_questions (part, level, text_id, prompt, options, answer, explanation, order_index)
SELECT 'reading_mc', 'C1', t.id, v.prompt, v.opts::jsonb, v.ans, v.expl, v.ord
FROM exam_texts t, (VALUES
('¿Qué dice el primer párrafo sobre la visión del sueño en el siglo XX?',
 '["Se consideraba un estado pasivo de recuperación","Se estudiaba poco por falta de medios","Se sabía que consolidaba la memoria","Se creía perjudicial interrumpirlo"]',
 'A', 'El texto dice "regarded as an essentially passive state: the brain simply powered down". Las otras opciones no aparecen.', 1),
('¿Por qué el experimento de los movimientos con los dedos resultó revelador?',
 '["Los voluntarios estaban menos cansados","La destreza mejoró sin práctica adicional","Demostró que dormir cansa menos","Los voluntarios practicaron mientras dormían"]',
 'B', 'Clave: "not merely because they were less tired, but because the skill itself had improved in the interval". Mejoró sin practicar.', 2),
('Según el tercer párrafo, la selectividad de la memoria es',
 '["un defecto que conviene corregir","una consecuencia de la falta de espacio","una ventaja esencial del sistema","un fenómeno aún sin explicar"]',
 'C', '"This is not a flaw in the system but its central virtue." Virtue = virtud, ventaja.', 3),
('¿Qué problema plantea una memoria que lo retuviera todo?',
 '["Ocuparía demasiado espacio físico","Recuperar información costaría más que el beneficio","Impediría dormir con normalidad","Generaría recuerdos falsos"]',
 'B', '"the labour of retrieval would swamp any benefit" — el esfuerzo de recuperar anularía el beneficio.', 4),
('¿Qué pierde el estudiante que sacrifica horas de sueño para repasar?',
 '["Solo capacidad de concentración al día siguiente","El mecanismo que fijaría lo repasado","La motivación para seguir estudiando","Los apuntes que había memorizado"]',
 'B', '"they have forfeited the very process by which the revision would have been made permanent".', 5),
('¿Qué actitud muestra el autor hacia la costumbre de trasnochar estudiando?',
 '["Comprensiva, porque a veces es inevitable","Neutral, se limita a describirla","Crítica, la considera contraproducente","Entusiasta, si se combina con siestas"]',
 'C', 'El cierre "That intuition, the evidence suggests, is precisely backwards" es un juicio claro: la intuición es justo la contraria de lo correcto.', 6)
) AS v(prompt, opts, ans, expl, ord)
WHERE t.slug = 'p5-sleep';

-- ══════════════════════ PARTE 6 · CROSS-TEXT MULTIPLE MATCHING ══════════════════════
INSERT INTO exam_texts (slug, part, title, intro, body, extras) VALUES
('p6-remote', 'cross_text', 'Four commentators on remote work',
 'Cuatro expertos opinan sobre el trabajo en remoto. Indica a qué texto se refiere cada pregunta.',
 'Lee los cuatro textos y responde comparando las opiniones.',
 '[
   {"letter":"A","text":"The debate has been framed dishonestly from the start. Employers speak of collaboration and serendipity, but what they are defending is visibility — the reassurance of seeing people at desks. The productivity data, where it exists at all, is equivocal, and yet it is invoked with a confidence the numbers do not support. Until we admit that this is a question about control rather than output, we will keep talking past one another."},
   {"letter":"B","text":"Something genuine is lost when a team never shares a room, and it is not the brainstorming session that managers tend to cite. It is the incidental repair work: the misunderstanding cleared up in a corridor before it hardens, the junior colleague who learns by overhearing. None of this appears in productivity figures, which is precisely why those figures, though frequently quoted on both sides, settle nothing."},
   {"letter":"C","text":"Most of the argument proceeds as though all work were the same. It is not. For tasks requiring sustained concentration, the office is an actively hostile environment, and remote arrangements are an unambiguous improvement. For work that is genuinely interdependent, the opposite holds. The sensible conclusion is not a policy but a judgement, made role by role — which is, of course, far more demanding than issuing a mandate."},
   {"letter":"D","text":"What strikes me is how quickly a temporary arrangement acquired the status of a right. Employees now speak of flexibility as something owed to them rather than negotiated, and any attempt to revisit the terms is met with accusations of bad faith. I say this as someone broadly sympathetic to remote work: an entitlement that cannot be discussed is not a settlement, it is a stalemate."}
 ]'::jsonb);

INSERT INTO exam_questions (part, level, text_id, prompt, options, answer, explanation, order_index)
SELECT 'cross_text', 'C1', t.id, v.prompt, '["A","B","C","D"]'::jsonb, v.ans, v.expl, v.ord
FROM exam_texts t, (VALUES
('¿Qué experto considera que los datos de productividad no resuelven el debate, coincidiendo con A?',
 'B', 'A dice que los datos son "equivocal" e invocados con excesiva confianza; B dice que "settle nothing". Coinciden en su inutilidad para zanjar el asunto.', 1),
('¿Qué experto sostiene, a diferencia de los demás, que la respuesta depende del tipo de tarea?',
 'C', 'Solo C distingue entre trabajo de concentración y trabajo interdependiente: "not a policy but a judgement, made role by role".', 2),
('¿Qué experto tiene una opinión distinta de la de A sobre las motivaciones de los empleados?',
 'D', 'A carga contra los empleadores (control); D es el único que señala críticamente la actitud de los empleados, que exigen flexibilidad como un derecho.', 3),
('¿Qué experto, como B, valora un beneficio de la oficina que no aparece en las estadísticas?',
 'C', 'B destaca la "incidental repair work" invisible en las cifras; C reconoce que para el trabajo interdependiente la oficina es superior. Ambos ven valor no cuantificado.', 4)
) AS v(prompt, ans, expl, ord)
WHERE t.slug = 'p6-remote';

-- ══════════════════════ PARTE 7 · GAPPED TEXT ══════════════════════
INSERT INTO exam_texts (slug, part, title, intro, body, extras) VALUES
('p7-restoration', 'gapped_text', 'The restorer''s dilemma',
 'Faltan seis párrafos en el texto. Elige de A a G el que encaja en cada hueco. Sobra uno.',
'When the Sistine Chapel ceiling emerged from its decade-long cleaning in 1994, the
reaction was not universal admiration. Michelangelo, it turned out, had been a
colourist of startling boldness, and a public accustomed to sombre, smoke-darkened
figures found the revelation difficult to accept.

[1]

The restorers'' answer was that the darkness had never been Michelangelo''s intention.
It was the residue of four centuries of candle smoke, animal glue and well-meant
varnish, and removing it returned the work to something closer to what its first
viewers saw.

[2]

This is the argument that has dominated conservation ever since, and on its own terms
it is difficult to fault. Yet it rests on an assumption that deserves more scrutiny
than it usually receives: that a work of art has a single authentic moment, and that
this moment is the one at which the artist put down the brush.

[3]

The alternative view holds that the centuries are not a veil over the work but part
of it. A cathedral that has been rebuilt three times is not a corrupted version of
the original; it is a building with a history, and that history is legible in the
stone.

[4]

In practice, conservators navigate between these positions rather than choosing one.
The prevailing principle is reversibility: any intervention should be undoable, so
that a future generation with better tools, or different convictions, can start again.

[5]

It is a modest principle, and deliberately so. It concedes that we do not know what
posterity will want, and it declines to decide on posterity''s behalf. Given how
confidently each previous generation of restorers acted, and how thoroughly each has
been criticised by the next, the modesty seems well earned.

[6]',
 '[
   {"letter":"A","text":"Critics complained that something had been stripped away along with the grime — a gravity, a sense of age that had come to seem inseparable from the work itself."},
   {"letter":"B","text":"Applied to painting, this suggests that a canvas which has yellowed over two hundred years is not a damaged object but an aged one, and that erasing the evidence of those years erases part of what the object has become."},
   {"letter":"C","text":"That principle rules out a great deal. It forbids the confident overpainting of earlier eras, when restorers repaired damage by simply painting over it in their own style, often improving the composition to their own taste."},
   {"letter":"D","text":"The ceiling now attracts some six million visitors a year, and the Vatican has invested heavily in climate control to manage the humidity that so many bodies generate."},
   {"letter":"E","text":"Whether that assumption holds is far from obvious. Works of art are not fixed objects but things that pass through time, acquiring meaning as they go."},
   {"letter":"F","text":"On that view the restorer is not a vandal but a translator, undoing the accidents of history to let the original speak again."},
   {"letter":"G","text":"What remains, then, is a discipline defined less by what it does than by what it refuses to foreclose — an unusual position for any profession, and an uncomfortable one."}
 ]'::jsonb);

INSERT INTO exam_questions (part, level, text_id, prompt, options, answer, explanation, order_index)
SELECT 'gapped_text', 'C1', t.id, v.prompt, '["A","B","C","D","E","F","G"]'::jsonb, v.ans, v.expl, v.ord
FROM exam_texts t, (VALUES
('Hueco 1', 'A', 'Antes se dice que al público le costó aceptar la revelación; A concreta la queja ("something had been stripped away"). Y el párrafo siguiente empieza con "The restorers'' answer", que responde justo a esa crítica.', 1),
('Hueco 2', 'F', 'Continúa la defensa de los restauradores: "On that view the restorer is not a vandal but a translator". Enlaza con "returned the work to something closer to what its first viewers saw".', 2),
('Hueco 3', 'E', 'El párrafo anterior termina cuestionando una asunción; E la retoma literalmente: "Whether that assumption holds is far from obvious".', 3),
('Hueco 4', 'B', 'Desarrolla la visión alternativa (los siglos forman parte de la obra) aplicándola a la pintura, tras el ejemplo de la catedral.', 4),
('Hueco 5', 'C', 'Sigue al principio de reversibilidad: "That principle rules out a great deal" se refiere directamente a la reversibilidad recién enunciada.', 5),
('Hueco 6', 'G', 'Cierre del texto: "What remains, then..." resume la disciplina. D es el distractor: los seis millones de visitantes no encajan en ningún hueco.', 6)
) AS v(prompt, ans, expl, ord)
WHERE t.slug = 'p7-restoration';

-- ══════════════════════ PARTE 8 · MULTIPLE MATCHING ══════════════════════
INSERT INTO exam_texts (slug, part, title, intro, body, extras) VALUES
('p8-languages', 'multi_match', 'Learning a language as an adult: five accounts',
 'Cinco adultos cuentan su experiencia aprendiendo idiomas. Indica en qué sección se menciona cada cosa.',
 'Lee las cinco secciones y localiza la información pedida.',
 '[
   {"letter":"A","text":"I had assumed my age was the obstacle, and spent a year apologising for it to anyone who would listen. What actually held me back was something duller: I had never once spoken the language outside a classroom. The week I started ordering coffee in it, badly, I improved more than in the previous six months. My accent remains dreadful and I have stopped minding."},
   {"letter":"B","text":"Grammar came easily to me — I had studied Latin at school and the machinery was familiar. Vocabulary was the wall. I could construct an immaculate subordinate clause and then fail to remember the word for spoon. I eventually accepted that there is no clever method for this, only repetition spaced out over months, and that the people selling shortcuts are selling nothing."},
   {"letter":"C","text":"My employer paid for an intensive course, which I now think was money poorly spent. Six hours a day for three weeks produced a brief euphoria and then almost total collapse; within two months I had lost most of it. A colleague who did twenty minutes every morning for a year overtook me comfortably. The lesson was not about intensity but about spacing."},
   {"letter":"D","text":"What surprised me was how much of it was emotional rather than cognitive. Speaking badly in front of strangers made me feel like a diminished version of myself, and I avoided it for far longer than I would admit. The breakthrough came when I stopped treating errors as evidence about my intelligence and started treating them as information about my next lesson."},
   {"letter":"E","text":"I learned mine for a job, which I would recommend to anyone: the deadline does more than any amount of enthusiasm. But I learned only what the job required, and it shows. I can negotiate a contract and I cannot talk about my childhood. A language learned for one room is a language that only works in that room."}
 ]'::jsonb);

INSERT INTO exam_questions (part, level, text_id, prompt, options, answer, explanation, order_index)
SELECT 'multi_match', 'C1', t.id, v.prompt, '["A","B","C","D","E"]'::jsonb, v.ans, v.expl, v.ord
FROM exam_texts t, (VALUES
('¿Quién menciona haber culpado erróneamente a su edad?', 'A', '"I had assumed my age was the obstacle... What actually held me back was something duller."', 1),
('¿Quién descubrió que el problema era emocional y no intelectual?', 'D', '"how much of it was emotional rather than cognitive".', 2),
('¿Quién considera que estudiar poco y a menudo supera a estudiar mucho de golpe?', 'C', 'El compañero con veinte minutos diarios lo adelantó: "The lesson was not about intensity but about spacing".', 3),
('¿Quién señala una limitación derivada del motivo por el que aprendió el idioma?', 'E', '"A language learned for one room is a language that only works in that room."', 4),
('¿Quién dice que no existen atajos para una parte del aprendizaje?', 'B', '"there is no clever method for this, only repetition spaced out over months".', 5),
('¿Quién menciona que sacar partido del idioma fuera del aula lo cambió todo?', 'A', '"The week I started ordering coffee in it, badly, I improved more than in the previous six months."', 6),
('¿Quién reconoce haber evitado hablar durante mucho tiempo?', 'D', '"I avoided it for far longer than I would admit."', 7),
('¿Quién se benefició de conocimientos lingüísticos previos?', 'B', '"I had studied Latin at school and the machinery was familiar."', 8),
('¿Quién valora la presión de un plazo por encima del entusiasmo?', 'E', '"the deadline does more than any amount of enthusiasm".', 9),
('¿Quién considera mal invertido el dinero de su formación?', 'C', '"My employer paid for an intensive course, which I now think was money poorly spent."', 10)
) AS v(prompt, ans, expl, ord)
WHERE t.slug = 'p8-languages';

COMMIT;
