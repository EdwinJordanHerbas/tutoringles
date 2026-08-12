-- TutorIngles · Migration 13 — WRITING Y SPEAKING C1
--
-- Las dos destrezas que no se pueden autocorregir con una clave de respuestas.
-- El enfoque es el mismo que usa un examinador: una rúbrica con los cuatro
-- criterios oficiales de Cambridge, y el alumno se puntúa contra ella.
--
--   Writing  · Part 1 obligatoria (essay) + Part 2 a elegir. 220-260 palabras.
--   Speaking · 4 partes. En C1 la Part 2 son TRES fotos, se eligen dos.
--
-- Criterios de Cambridge para Writing (cada uno de 0 a 5):
--   Content · Communicative Achievement · Organisation · Language
--
-- Aplicar:
--   docker exec -i postgres psql -U postgres -d tutoringles -v ON_ERROR_STOP=1 < migration_13_writing_speaking.sql
--
-- Idempotente.

BEGIN;

-- ══════════════════════ WRITING ══════════════════════
CREATE TABLE IF NOT EXISTS writing_tasks (
  id           SERIAL PRIMARY KEY,
  slug         VARCHAR(60) NOT NULL UNIQUE,
  part         SMALLINT    NOT NULL CHECK (part IN (1, 2)),
  kind         VARCHAR(20) NOT NULL CHECK (kind IN ('essay','letter','proposal','report','review')),
  title        TEXT        NOT NULL,
  instructions TEXT        NOT NULL,     -- el enunciado tal cual lo daría Cambridge
  input_text   TEXT,                     -- texto de partida (obligatorio en Part 1)
  word_min     INTEGER     NOT NULL DEFAULT 220,
  word_max     INTEGER     NOT NULL DEFAULT 260,
  guidance     JSONB,                    -- qué se espera, para autoevaluarse
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS writing_submissions (
  id         SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(id) ON DELETE CASCADE,
  task_id    INTEGER NOT NULL REFERENCES writing_tasks(id) ON DELETE CASCADE,
  body       TEXT    NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  -- Puntuación 0-5 en cada criterio oficial
  content       SMALLINT CHECK (content       BETWEEN 0 AND 5),
  achievement   SMALLINT CHECK (achievement   BETWEEN 0 AND 5),
  organisation  SMALLINT CHECK (organisation  BETWEEN 0 AND 5),
  language      SMALLINT CHECK (language      BETWEEN 0 AND 5),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS writing_subs_profile_idx ON writing_submissions(profile_id, created_at DESC);

DELETE FROM writing_tasks;

INSERT INTO writing_tasks (slug, part, kind, title, instructions, input_text, guidance) VALUES

('w1-museums', 1, 'essay', 'Essay: ¿deben ser gratuitos los museos?',
 'Your class has attended a panel discussion on how museums should be funded. You have made the notes below. Write an essay discussing TWO of the points in your notes. You should explain which way of funding museums you think is more important, giving reasons.',
 'Ways of funding museums:
  · government money
  · entrance fees
  · private sponsorship

Some opinions expressed in the discussion:
  "If people pay to get in, only the wealthy will ever go."
  "Sponsors always want something in return, and that something is influence."
  "Taxpayers should not have to fund a hobby they do not share."',
 '["Elige SOLO DOS puntos: escribir de los tres es el error más común y cuesta nota en Content.",
   "Hay que posicionarse: la tarea pide explícitamente cuál te parece más importante.",
   "Registro formal, pero sin fórmulas huecas. Nada de -In this essay I will talk about-.",
   "Integra las opiniones dadas con tus propias palabras; no las copies literalmente.",
   "Estructura: introducción, un párrafo por punto, conclusión con tu postura."]'),

('w1-ai-work', 1, 'essay', 'Essay: la automatización y el empleo',
 'Your class has watched a documentary about automation in the workplace. You have made the notes below. Write an essay discussing TWO of the points in your notes. You should explain which consequence you consider most significant, giving reasons.',
 'Consequences of workplace automation:
  · job losses in routine work
  · new kinds of skilled employment
  · greater inequality between regions

Some opinions expressed in the documentary:
  "Every previous wave of automation eventually created more work than it destroyed."
  "The new jobs appear in different places, and often to different people."
  "Retraining sounds simple until you are forty-eight and have a mortgage."',
 '["Dos puntos, no tres. Desarróllalos en profundidad en vez de tocarlos todos por encima.",
   "El razonamiento importa más que la postura: se puntúa cómo argumentas.",
   "Usa lenguaje de matiz: -arguably-, -to a large extent-, -it is worth noting that-.",
   "Cuidado con generalizar sin apoyo. Una afirmación rotunda sin matiz baja la nota.",
   "Cierra con una conclusión que responda a la pregunta, no con un resumen."]'),

('w2-letter', 2, 'letter', 'Carta: queja sobre un curso',
 'You recently completed a language course that did not meet the standard advertised. Write a letter to the director of the school explaining what the problems were, how they affected you, and what you would like the school to do about it.',
 NULL,
 '["Registro formal pero firme: te quejas, no suplicas ni insultas.",
   "Estructura clara: motivo de la carta, hechos, consecuencia, petición concreta.",
   "Pide algo específico y realista. Una queja sin petición pierde puntos en Content.",
   "Fórmulas útiles: -I am writing to express my dissatisfaction with...-, -I would be grateful if...-",
   "Evita el sarcasmo. En el examen se penaliza el registro inadecuado."]'),

('w2-proposal', 2, 'proposal', 'Propuesta: mejorar un espacio público',
 'The local council has money available to improve one public space in your town. Write a proposal for the council recommending which space should be improved, describing the improvements you suggest, and explaining how the town would benefit.',
 NULL,
 '["Usa ENCABEZADOS. Una propuesta sin secciones pierde puntos en Organisation.",
   "Secciones típicas: Introduction · Current situation · Suggested improvements · Benefits.",
   "Mira al futuro: la propuesta recomienda algo que aún no se ha hecho.",
   "Lenguaje de recomendación: -I would strongly recommend-, -It would be advisable to-.",
   "El destinatario es institucional: registro formal e impersonal."]'),

('w2-report', 2, 'report', 'Informe: hábitos de estudio en tu centro',
 'Your college principal has asked you to write a report on how students in your college prepare for exams. Your report should describe the most common study habits, assess how effective they are, and recommend one change the college could make.',
 NULL,
 '["Informe = mirar atrás y describir lo que hay; propuesta = mirar adelante. No los confundas.",
   "Encabezados obligatorios. Introduction · Findings · Assessment · Recommendation.",
   "Tono neutro e impersonal: -It was found that-, -The majority of students report-.",
   "Solo UNA recomendación, como pide el enunciado. Dar tres es no leer la tarea.",
   "Nada de opiniones personales en la sección de hallazgos."]'),

('w2-review', 2, 'review', 'Reseña: una aplicación que usas a diario',
 'An international magazine is running a series on technology that has changed the way we live. Write a review of an app or digital tool you use regularly, describing what it does, evaluating how well it works, and saying who you would recommend it to.',
 NULL,
 '["La reseña permite registro más personal y hasta algo de humor: es la tarea más libre.",
   "Evaluar no es solo describir: hay que juzgar, con argumentos.",
   "Menciona también algo negativo. Una reseña sin peros no resulta creíble.",
   "Termina con una recomendación clara y dirigida a alguien concreto.",
   "Lenguaje valorativo variado: -a standout feature-, -somewhat clunky-, -falls short of-."]');

-- ══════════════════════ SPEAKING ══════════════════════
CREATE TABLE IF NOT EXISTS speaking_tasks (
  id           SERIAL PRIMARY KEY,
  slug         VARCHAR(60) NOT NULL UNIQUE,
  part         SMALLINT    NOT NULL CHECK (part BETWEEN 1 AND 4),
  title        TEXT        NOT NULL,
  instructions TEXT        NOT NULL,
  prompts      JSONB       NOT NULL,   -- preguntas, temas o descripción de las fotos
  seconds      INTEGER     NOT NULL DEFAULT 60,
  tips         JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DELETE FROM speaking_tasks;

INSERT INTO speaking_tasks (slug, part, title, instructions, prompts, seconds, tips) VALUES

('sp1-interview', 1, 'Parte 1 · Entrevista',
 'El examinador te hace preguntas personales para romper el hielo. Responde con naturalidad, ampliando un poco cada respuesta: dos o tres frases, nunca monosílabos.',
 '["Where are you from, and what is it like living there?",
   "What do you enjoy most about your job or your studies?",
   "Do you prefer spending your free time indoors or outdoors? Why?",
   "Has the way you use technology changed much in the last few years?",
   "What would you like to be doing five years from now?"]',
 120,
 '["Dos o tres frases por respuesta. Ni una palabra ni un discurso.",
   "Amplía siempre con un porqué o un ejemplo, aunque no te lo pidan.",
   "Es la parte que menos puntúa pero la que fija la primera impresión.",
   "Si no entiendes, pide que te repitan: -Sorry, could you repeat that?- no penaliza."]'),

('sp2-photos-work', 2, 'Parte 2 · Long turn (tres fotos)',
 'En C1 te dan TRES fotografías y eliges DOS para comparar. Hablas tú solo un minuto seguido. No describas: compara y responde a la pregunta.',
 '{"question": "Compare two of these situations and say why the people might have chosen to work in these ways, and how they might be feeling.",
   "photos": [
     "Una persona sola trabajando de noche en la mesa de su cocina, con el portátil y una taza.",
     "Un equipo de seis personas de pie alrededor de una pizarra llena de notas adhesivas.",
     "Alguien trabajando desde una cafetería concurrida, con auriculares puestos."
   ],
   "follow_up": "Which of these ways of working would suit you best?"}',
 60,
 '["Un minuto SEGUIDO. Cronométralo: se hace más largo de lo que parece.",
   "Compara, no describas. -Whereas in the first picture..., in the second...-",
   "Especula, que es lo que se pide: -they might be-, -it could well be that-.",
   "No te quedes callado buscando la palabra exacta: rodéala y sigue.",
   "Deja algo sin decir para la pregunta de seguimiento."]'),

('sp2-photos-learning', 2, 'Parte 2 · Long turn (aprender algo nuevo)',
 'Tres fotografías, eliges dos. Un minuto hablando solo, comparando y especulando.',
 '{"question": "Compare two of these situations and say what the people might be finding difficult, and why they decided to learn these skills.",
   "photos": [
     "Un adulto mayor en una clase de informática, mirando la pantalla con gesto de concentración.",
     "Una persona joven practicando un instrumento en una habitación pequeña.",
     "Un grupo aprendiendo a cocinar en un taller, siguiendo a un instructor."
   ],
   "follow_up": "Is it harder to learn something new as an adult?"}',
 60,
 '["Elige las dos fotos que te den más que decir, no las más fáciles de describir.",
   "El examinador no busca la respuesta correcta: busca lenguaje.",
   "Frases de especulación: -I imagine-, -presumably-, -what strikes me is-.",
   "Si te sobra tiempo, vuelve a la pregunta y remátala."]'),

('sp3-collaborative', 3, 'Parte 3 · Tarea colaborativa',
 'Con tu compañero: primero comentáis las opciones (unos 2 minutos) y después tenéis que DECIDIR juntos (1 minuto). Practica en alto los dos papeles si estás solo.',
 '{"question": "Here are some things that can help someone become fluent in a foreign language. Talk to each other about how effective each one is.",
   "options": [
     "living in the country where it is spoken",
     "watching films and series without subtitles",
     "having a private tutor",
     "studying grammar systematically",
     "making friends who speak it"
   ],
   "decision": "Now decide which two are the most effective for an adult learner with a full-time job."}',
 180,
 '["No es un debate: hay que COLABORAR y llegar a un acuerdo.",
   "Invita a tu compañero: -What do you make of this one?-, -Would you agree?-",
   "No hace falta comentar las cinco opciones. Mejor tres bien que cinco de pasada.",
   "Reserva tiempo para decidir: si suena el final sin decisión, baja la nota.",
   "Se puede discrepar: -I see your point, though I would argue that...-"]'),

('sp4-discussion', 4, 'Parte 4 · Discusión',
 'Preguntas más abstractas relacionadas con la Parte 3. Aquí se demuestra el nivel real: opiniones desarrolladas y matizadas.',
 '["Some people say you never really master a language you learn as an adult. What do you think?",
   "Should schools spend more time on speaking and less on grammar?",
   "Is it a problem that English has become the default international language?",
   "How much does knowing a language help you understand the culture behind it?",
   "Will translation technology make language learning unnecessary?"]',
 300,
 '["Es la parte que más pesa: aquí se ve si eres C1 o B2.",
   "Desarrolla: postura, razón, ejemplo, matiz. Cuatro pasos por respuesta.",
   "Matiza siempre: -It depends largely on-, -That said-, -Up to a point-.",
   "Se vale discrepar del examinador. Lo que se puntúa es cómo lo argumentas.",
   "No memorices discursos: se nota, y la pregunta nunca es la que esperabas."]');

COMMIT;
