-- Migración 04 — motor: banco de preguntas de examen + plan de 30 días

-- ══════════════════════ EXAM QUESTIONS ══════════════════════
-- Banco de ítems auto-corregibles del "Reading & Use of English" del CAE.
CREATE TABLE IF NOT EXISTS exam_questions (
  id          SERIAL PRIMARY KEY,
  part        TEXT NOT NULL CHECK (part IN
                ('mc_cloze','open_cloze','word_formation','key_word_transformation')),
  level       VARCHAR(4) NOT NULL DEFAULT 'C1',
  prompt      TEXT NOT NULL,             -- frase con hueco ____ (o setup de transformación)
  options     JSONB,                     -- solo mc_cloze: ["a","b","c","d"]
  answer      TEXT NOT NULL,             -- respuesta correcta
  given_word  TEXT,                      -- word_formation (base) / key_word_transformation (clave)
  explanation TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS exam_questions_part_idx ON exam_questions(part);

-- ══════════════════════ CURRICULUM (plan 30 días) ══════════════════════
CREATE TABLE IF NOT EXISTS curriculum (
  day              INT PRIMARY KEY CHECK (day BETWEEN 1 AND 60),
  title            TEXT NOT NULL,
  focus            TEXT,                 -- qué se trabaja hoy (español)
  grammar_topic_id INT REFERENCES grammar_topics(id) ON DELETE SET NULL,
  speaking_task    TEXT,                 -- prompt de speaking del día (inglés)
  vocab_target     INT NOT NULL DEFAULT 15,
  is_mock          BOOLEAN NOT NULL DEFAULT FALSE
);

-- Semilla del plan. grammar_topic_id se resuelve por título para no depender
-- de los ids. Progresión A2→C1 con mini-simulacro cada 6 días.
INSERT INTO curriculum (day, title, focus, grammar_topic_id, speaking_task, vocab_target, is_mock) VALUES
  (1,  'Arranque',                'Vocabulario base y presentarte con soltura.',                     (SELECT id FROM grammar_topics WHERE title='Present Perfect vs Past Simple'), 'Talk for one minute: introduce yourself and your goals in English.', 15, false),
  (2,  'Rutinas y pasado',        'Hablar de tu día a día y experiencias pasadas.',                  (SELECT id FROM grammar_topics WHERE title='Present Perfect vs Past Simple'), 'Describe what you did last weekend in 60 seconds.', 15, false),
  (3,  'Describir con precisión', 'Adjetivos y colocaciones frecuentes.',                            NULL, 'Describe your hometown: what it is like and why.', 15, false),
  (4,  'La voz pasiva',           'Subir el registro con estructuras pasivas.',                      (SELECT id FROM grammar_topics WHERE title='Passive Voice — all tenses'), 'Explain how a dish from your country is made (use passives).', 18, false),
  (5,  'Opiniones',              'Expresar acuerdo y desacuerdo con matices.',                       NULL, 'Give your opinion: is social media good or bad? 90 seconds.', 18, false),
  (6,  'Simulacro 1',            'Mini-test de Use of English para medir el arranque.',              NULL, 'Summarise what you have learned this week out loud.', 10, true),
  (7,  'Condicionales I',        'Hipótesis reales y probables.',                                    (SELECT id FROM grammar_topics WHERE title='Conditionals 0, 1, 2, 3 & Mixed'), 'What will you do if you pass the exam? And if you fail?', 18, false),
  (8,  'Condicionales II',       'Hipótesis imposibles y mixtas.',                                   (SELECT id FROM grammar_topics WHERE title='Conditionals 0, 1, 2, 3 & Mixed'), 'If you could change one decision in your life, what would it be?', 18, false),
  (9,  'Phrasal verbs clave',    'Verbos compuestos de alta frecuencia.',                            NULL, 'Tell a short story using at least three phrasal verbs.', 20, false),
  (10, 'Estilo indirecto',       'Reportar lo que otros dicen.',                                     (SELECT id FROM grammar_topics WHERE title='Reported Speech'), 'Report a conversation you had recently.', 18, false),
  (11, 'Vocabulario académico',  'Léxico para Reading y Writing formales.',                          NULL, 'Explain a topic you know well as if teaching it.', 20, false),
  (12, 'Simulacro 2',            'Use of English + repaso acumulado.',                               NULL, 'Argue for and against remote work for two minutes.', 10, true),
  (13, 'Modales avanzados',      'Deducción, crítica y probabilidad.',                               (SELECT id FROM grammar_topics WHERE title='Modal Verbs — advanced'), 'Speculate: where do you think you will be in five years?', 18, false),
  (14, 'Collocations business',  'Colocaciones del inglés profesional.',                             NULL, 'Describe your ideal job and why it suits you.', 20, false),
  (15, 'Word formation',         'Formar sustantivos, adjetivos y adverbios.',                       NULL, 'Talk about a technology that changed society.', 18, false),
  (16, 'Idioms I',               'Expresiones idiomáticas naturales.',                               NULL, 'Use two idioms to describe a challenge you overcame.', 18, false),
  (17, 'Inversión',              'Énfasis formal con inversión.',                                    (SELECT id FROM grammar_topics WHERE title='Inversion for Emphasis'), 'Give a mini-speech starting with "Never have I...".', 18, false),
  (18, 'Simulacro 3',            'Test de medio recorrido.',                                         NULL, 'Reflect: what has improved most in your English?', 10, true),
  (19, 'Cleft sentences',        'Reformular para enfatizar.',                                       (SELECT id FROM grammar_topics WHERE title='Cleft Sentences'), 'Explain what matters most to you, using cleft sentences.', 18, false),
  (20, 'Linking & cohesión',     'Conectores para textos avanzados.',                                NULL, 'Describe a process step by step with clear linkers.', 20, false),
  (21, 'Participle clauses',     'Comprimir ideas con elegancia.',                                   (SELECT id FROM grammar_topics WHERE title='Participle Clauses'), 'Narrate an event using participle clauses.', 18, false),
  (22, 'Key word transformation','La parte 4 del Use of English.',                                   NULL, 'Paraphrase three sentences aloud without changing meaning.', 18, false),
  (23, 'Vocabulario C1',         'Léxico de alto nivel para el CAE.',                                NULL, 'Discuss an abstract topic: what is success?', 22, false),
  (24, 'Simulacro 4',            'Test avanzado, formato completo.',                                 NULL, 'Deliver a two-minute opinion on a topic of your choice.', 10, true),
  (25, 'Writing: essay',         'Estructura del essay CAE (220-260).',                              NULL, 'Speak your essay plan aloud before writing it.', 18, false),
  (26, 'Writing: report/proposal','Registro formal y organización.',                                 NULL, 'Present a proposal to improve your town in 90 seconds.', 18, false),
  (27, 'Listening strategy',     'Técnicas para la parte de Listening.',                             NULL, 'Shadow a short English clip: repeat what you hear.', 18, false),
  (28, 'Speaking parts 1-4',     'Simular la prueba oral del CAE.',                                  NULL, 'Do a full mock: describe, compare two photos, discuss.', 18, false),
  (29, 'Repaso intensivo',       'Consolidar lo más flojo.',                                         NULL, 'Free talk: five minutes on anything, no pauses.', 22, false),
  (30, 'Simulacro final',        'Test completo y evaluación del sprint.',                           NULL, 'Reflect on your 30-day progress and next steps.', 10, true)
ON CONFLICT (day) DO NOTHING;

SELECT
  (SELECT COUNT(*) FROM curriculum) AS dias_plan,
  (SELECT COUNT(*) FROM curriculum WHERE is_mock) AS simulacros;
