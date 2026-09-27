-- TutorIngles — migración 28: más inglés camino del C1 (Cambridge C1 Advanced).
--
-- Idempotente. Aplicar como `postgres` (las tablas son suyas):
--   docker exec -i postgres psql -U postgres -d tutoringles -v ON_ERROR_STOP=1 < migration_28_ingles_c1.sql
--
-- Por qué (27-sep-2026): Edwin está en B1 de inglés y se va a trabajar a Suiza,
-- donde el francés pasa a ser lo primero. El tiempo de inglés baja, así que cada
-- tarjeta nueva tiene que rendir DOS veces: en el examen (Use of English 1-4,
-- Writing, Speaking) y en el trabajo de verdad. Nada de vocabulario bonito que
-- no se vaya a usar.
--
-- Qué: 116 entradas en inglés británico, sin repetir ninguna de las 209 que ya
-- había (se compara en minúsculas):
--   · 30 phrasal verbs B2/C1 de oficina y de examen (turn out, bring about,
--     fall through, stem from, live up to…).
--   · 31 familias de palabras para la Parte 3 (word formation). En `word` va la
--     base y la familia en la traducción tras " — familia: ". Se han elegido las
--     que además esconden un falso amigo (sensible, invaluable, comprehensive,
--     considerate, economical, assist, attend…), que es donde un hispanohablante
--     pierde puntos sin darse cuenta.
--   · 27 colocaciones y preposiciones dependientes (take into account, be
--     entitled to, at short notice, object to + -ing…): las partes 1 y 4 viven de
--     esto.
--   · 28 idioms y chunks para hablar y escribir (the thing is, to a large extent,
--     that said, let alone, learn the ropes, a steep learning curve…).
--
-- `audio_hint` sólo donde hay una trampa de pronunciación real para un español
-- (la gh muda de weigh, la w muda de sword, la tónica que salta en
-- prefer/preferable…); el resto va a NULL.
--
-- El ORDEN importa: la app presenta las palabras nuevas por orden de inserción
-- (user_words.id), así que van de más a menos rentables y mezclando tipos, para
-- que las 8 del día no sean ocho phrasal verbs seguidos. Por eso el `ord` y el
-- ORDER BY, también en el INSERT de user_words.

BEGIN;

INSERT INTO words (word, translation, example_sentence, level, category, audio_hint, lang)
SELECT v.word, v.translation, v.example, v.level, v.category, v.hint, 'en'
FROM (VALUES
  ('actually', 'en realidad, de hecho — ojo: NO es "actualmente" (eso es currently, at the moment)', 'I thought the meeting was on Tuesday, but it''s actually on Wednesday.', 'B2', 'chunk', NULL::text, 1),
  ('turn out', 'resultar (que), acabar siendo', 'The problem turned out to be much simpler than we expected.', 'B2', 'phrasal', NULL, 2),
  ('take into account', 'tener en cuenta — con objeto largo va al final; con uno corto, en medio: take it into account', 'The report fails to take into account the needs of part-time staff.', 'B2', 'general', NULL, 3),
  ('aware', 'consciente (de), al tanto — familia: awareness, unaware, self-aware · ojo: be aware OF', 'Staff should be aware of the new safety procedures before the store opens.', 'B2', 'academic', NULL, 4),
  ('eventually', 'al final, finalmente (tras mucho tiempo) — ojo: NO es "eventualmente" (eso es possibly, if necessary)', 'After months of negotiations, they eventually reached an agreement.', 'B2', 'general', NULL, 5),
  ('come up', 'surgir (un imprevisto, un problema); salir (un tema) — ≠ come up with (idear)', 'Sorry, something urgent has come up and I can''t make the meeting.', 'B2', 'phrasal', NULL, 6),
  ('the thing is', 'lo que pasa es que… — para explicar un problema o justificarte hablando', 'I''d love to come. The thing is, I''m working until eight.', 'B2', 'chunk', NULL, 7),
  ('in terms of', 'en cuanto a, en lo que respecta a', 'In terms of salary, the Swiss offer is much better.', 'B2', 'general', NULL, 8),
  ('follow up on', 'hacer seguimiento de, retomar — follow-up (sustantivo): seguimiento', 'I''ll follow up on your request with the supplier tomorrow.', 'B2', 'phrasal', NULL, 9),
  ('commit', 'comprometerse (commit to + -ing); cometer (un delito) — familia: commitment, committed, noncommittal, committee (comité) · ojo: compromise NO es compromiso, es ceder o llegar a un acuerdo', 'The company has committed to cutting its emissions by half.', 'B2', 'academic', NULL, 10),
  ('as far as I''m concerned', 'en lo que a mí respecta, para mí', 'As far as I''m concerned, the new schedule is a big improvement.', 'B2', 'chunk', NULL, 11),
  ('put forward', 'proponer, presentar (una idea, un plan, una candidatura)', 'She put forward a proposal to reduce overtime.', 'B2', 'phrasal', NULL, 12),
  ('despite', 'a pesar de — ¡nunca "despite of"! Va con sustantivo o -ing: despite being tired', 'Despite having little experience, he got the job.', 'B2', 'general', NULL, 13),
  ('sense', 'sentido — familia: sensible (SENSATO), sensitive (sensible), senseless, nonsense · ojo: el falso amigo más famoso', 'It would be sensible to get a second opinion before signing.', 'B2', 'academic', NULL, 14),
  ('be entitled to', 'tener derecho a — entitlement: derecho (a vacaciones, a una prestación)', 'Full-time employees are entitled to 25 days of paid holiday.', 'B2', 'business', NULL, 15),
  ('bring about', 'provocar, ocasionar (un cambio) — no es "traer"', 'The new manager brought about a real change in the team''s attitude.', 'C1', 'phrasal', NULL, 16),
  ('when it comes to', 'en lo que se refiere a, a la hora de (+ sustantivo o -ing)', 'When it comes to dealing with complaints, she''s the best on the team.', 'B2', 'chunk', NULL, 17),
  ('succeed', 'tener éxito, conseguir (succeed IN + -ing); suceder a (en un cargo) — familia: success, successful, unsuccessful, succession, successive (consecutivo) · ojo: "suceso" es event', 'She succeeded in getting her contract renewed.', 'B2', 'academic', 'səkˈsiːd — la cc suena "ks", como en "acción"', 18),
  ('learn the ropes', 'aprender cómo funciona todo (en un trabajo o sitio nuevo)', 'It took me a couple of weeks to learn the ropes in the new job.', 'B2', 'idiom', NULL, 19),
  ('take on', 'asumir (trabajo, responsabilidad); contratar (personal)', 'We''re taking on three new staff for the Christmas period.', 'B2', 'phrasal', NULL, 20),
  ('at short notice', 'con poca antelación, a última hora', 'Thanks for covering my shift at such short notice.', 'C1', 'business', NULL, 21),
  ('consider', 'considerar — familia: consideration, considerable (bastante grande), considerate (atento con los demás), inconsiderate · ojo: considerable ≠ considerate', 'It was very considerate of you to call; it saved us a considerable amount of time.', 'B2', 'academic', NULL, 22),
  ('to a large extent', 'en gran medida — to some extent: hasta cierto punto', 'To a large extent, success depends on how well you communicate.', 'C1', 'chunk', NULL, 23),
  ('run into', 'toparse con (problemas); encontrarse con alguien por casualidad', 'We ran into a few problems with the new booking system.', 'B2', 'phrasal', NULL, 24),
  ('meet a deadline', 'cumplir un plazo — también meet requirements / expectations / needs', 'We worked all weekend to meet the deadline.', 'B2', 'business', NULL, 25),
  ('relevant', 'pertinente, que viene al caso — familia: relevance, irrelevant · ojo: "relevante" (importante) suele ser significant o important', 'Please attach any relevant documents to your application.', 'B2', 'academic', NULL, 26),
  ('on the whole', 'en general, en conjunto', 'On the whole, the feedback from customers has been positive.', 'B2', 'chunk', NULL, 27),
  ('draw up', 'redactar, elaborar (un contrato, una lista, un plan)', 'Our lawyer will draw up a new contract.', 'B2', 'phrasal', 'drɔː — "dro" larga: la w no suena, nada de "drau"', 28),
  ('take advantage of', 'aprovechar (una oportunidad); aprovecharse de (alguien)', 'You should take advantage of the free language courses the company offers.', 'B2', 'general', NULL, 29),
  ('assume', 'suponer, dar por hecho; asumir (un cargo, una responsabilidad) — familia: assumption (suposición) · ojo: "asumir un error" es accept o admit', 'I assumed the shops would be open on Sunday, but in Switzerland they weren''t.', 'B2', 'academic', NULL, 30),
  ('that said', 'dicho esto, aun así — igual que "having said that"', 'The job is demanding. That said, the salary is excellent.', 'C1', 'chunk', NULL, 31),
  ('go through', 'revisar a fondo; pasar por (algo difícil)', 'Let''s go through the figures before the meeting.', 'B2', 'phrasal', NULL, 32),
  ('on behalf of', 'en nombre de, de parte de', 'I''m writing on behalf of the whole team to thank you.', 'B2', 'business', NULL, 33),
  ('value', 'valor; valorar — familia: valuable (valioso), invaluable (INESTIMABLE, valiosísimo), valueless, undervalue · ojo: invaluable NO es "sin valor"', 'Her experience in retail has been invaluable to the team.', 'C1', 'academic', NULL, 34),
  ('it''s worth', 'merece la pena (+ -ing) — it''s worth checking, nunca "worth to check"', 'It''s worth asking whether the price includes delivery.', 'B2', 'chunk', NULL, 35),
  ('catch up on', 'ponerse al día con (trabajo, correos) — catch up with sb: ponerse al día con alguien', 'I need a quiet morning to catch up on my emails.', 'B2', 'phrasal', NULL, 36),
  ('get used to', 'acostumbrarse a (+ -ing) — I''m used to working; "I used to work" es otra cosa: "solía trabajar"', 'It took me a while to get used to working weekends.', 'B2', 'general', NULL, 37),
  ('a steep learning curve', 'mucho que aprender en poco tiempo (una curva de aprendizaje empinada)', 'Moving to a new country and a new job is a steep learning curve.', 'C1', 'idiom', NULL, 38),
  ('comprehend', 'comprender (formal) — familia: comprehension, comprehensible, incomprehensible, comprehensive (COMPLETO, exhaustivo) · ojo: comprensivo es understanding', 'The manual gives a comprehensive overview of the system.', 'C1', 'academic', NULL, 39),
  ('there''s no point in', 'no tiene sentido, no vale la pena (+ -ing)', 'There''s no point in complaining now; the decision has already been made.', 'B2', 'chunk', NULL, 40),
  ('back up', 'respaldar, apoyar (con datos); hacer copia de seguridad', 'Can you back up that claim with some figures?', 'B2', 'phrasal', NULL, 41),
  ('have an impact on', 'tener impacto en, afectar a — impact ON, no "in"', 'The new rules will have a huge impact on small businesses.', 'B2', 'general', NULL, 42),
  ('likely', 'probable — familia: likelihood (probabilidad), unlikely · con persona de sujeto: She''s likely to win (es probable que gane)', 'In all likelihood, the meeting will be postponed again.', 'B2', 'academic', NULL, 43),
  ('get to grips with', 'hacerse con, llegar a dominar (algo difícil)', 'I''m still getting to grips with the new software.', 'C1', 'idiom', NULL, 44),
  ('come across', 'encontrarse con por casualidad; dar la impresión de, parecer (come across as)', 'He comes across as a bit cold, but he''s actually very friendly.', 'B2', 'phrasal', NULL, 45),
  ('raise concerns', 'plantear dudas o inquietudes (sobre algo) — ojo: raise (levantar algo) ≠ rise (subir solo)', 'Several employees raised concerns about the new shift patterns.', 'C1', 'business', NULL, 46),
  ('effect', 'efecto (sustantivo) — familia: effective (eficaz), ineffective, effectiveness · ojo: affect es el verbo (afectar); y effective ≠ efficient', 'The new policy has had a positive effect on staff morale.', 'B2', 'academic', NULL, 47),
  ('I see your point, but', 'entiendo lo que dices, pero… — para discrepar con educación', 'I see your point, but I think we should wait until January.', 'B2', 'chunk', NULL, 48),
  ('fall through', 'irse al traste, no llegar a concretarse (un plan, un acuerdo)', 'The deal fell through at the last minute.', 'B2', 'phrasal', NULL, 49),
  ('play a key role in', 'desempeñar un papel clave en', 'Good customer service plays a key role in building loyalty.', 'B2', 'general', NULL, 50),
  ('decide', 'decidir — familia: decision, decisive (resolutivo, decisivo), indecisive, indecision', 'We need a more decisive response to the staff shortage.', 'B2', 'academic', NULL, 51),
  ('in the long run', 'a la larga', 'Investing in training saves money in the long run.', 'B2', 'idiom', NULL, 52),
  ('stem from', 'derivar de, tener su origen en', 'Most of these problems stem from poor communication.', 'C1', 'phrasal', NULL, 53),
  ('with regard to', 'con respecto a, en relación con (formal: cartas y correos)', 'With regard to your complaint, we have issued a full refund.', 'B2', 'general', NULL, 54),
  ('attend', 'asistir a (una reunión, un curso) — familia: attendance (asistencia), attendee, attendant · ojo: "atender" a un cliente es serve o deal with', 'All staff are expected to attend the training session on Monday.', 'B2', 'academic', NULL, 55),
  ('arguably', 'posiblemente, se podría decir que (para opinar con cautela)', 'This is arguably the most important decision we''ll make this year.', 'C1', 'chunk', NULL, 56),
  ('live up to', 'estar a la altura de (expectativas, una reputación)', 'The new product didn''t live up to our expectations.', 'B2', 'phrasal', NULL, 57),
  ('make progress', 'avanzar, hacer progresos — make, no do; incontable: nunca "a progress"', 'You''ve made real progress with your English this month.', 'B2', 'general', NULL, 58),
  ('assist', 'ayudar (formal) — familia: assistance, assistant · ojo: NO es "asistir a" (eso es attend)', 'Our staff will be happy to assist you with your enquiry.', 'B2', 'academic', NULL, 59),
  ('by and large', 'en general, en líneas generales', 'By and large, the move has gone better than expected.', 'C1', 'idiom', NULL, 60),
  ('get round to', 'sacar tiempo para algo pendiente, llegar a hacerlo — en EE. UU.: get around to', 'I finally got round to updating my CV.', 'B2', 'phrasal', NULL, 61),
  ('draw a conclusion', 'sacar una conclusión — draw, no "take out"', 'It''s too early to draw any conclusions from the data.', 'B2', 'general', NULL, 62),
  ('apply', 'aplicarse (a), afectar (a); solicitar (apply for) — familia: application (solicitud), applicant (candidato), applicable, appliance (ELECTRODOMÉSTICO)', 'The new rule doesn''t apply to part-time staff.', 'B2', 'academic', NULL, 63),
  ('the bottom line is', 'lo fundamental es, en resumidas cuentas — the bottom line: también el resultado final (el beneficio)', 'The bottom line is that we can''t afford to lose this client.', 'C1', 'idiom', NULL, 64),
  ('bring forward', 'adelantar (una fecha, una reunión) — lo contrario: put back o postpone', 'The meeting has been brought forward to Monday morning.', 'C1', 'phrasal', NULL, 65),
  ('reach a consensus', 'llegar a un consenso — también reach an agreement / a decision', 'After a long discussion, the committee reached a consensus.', 'C1', 'business', NULL, 66),
  ('compete', 'competir — familia: competition (competencia entre rivales), competitor, competitive · ojo: competence (competencia = capacidad) es otra familia: competent', 'Small shops find it hard to compete with online retailers.', 'B2', 'academic', NULL, 67),
  ('let alone', 'y mucho menos, ni hablar de (tras una negativa)', 'I can barely order a coffee in French, let alone negotiate a contract.', 'C1', 'chunk', NULL, 68),
  ('call off', 'cancelar, suspender', 'They called off the meeting because half the team was ill.', 'B2', 'phrasal', NULL, 69),
  ('regardless of', 'independientemente de, sin tener en cuenta', 'Everyone gets the same bonus, regardless of their position.', 'C1', 'general', NULL, 70),
  ('economy', 'economía — familia: economic (económico, de la economía), economical (que ahorra, barato de usar), economist, economise · ojo: economic ≠ economical', 'The new van is far more economical to run.', 'B2', 'academic', 'ɪˈkɒnəmi — pero economic: ˌiːkəˈnɒmɪk; la tónica cambia de sitio', 71),
  ('not to mention', 'por no hablar de, sin contar', 'The flat is tiny, not to mention expensive.', 'B2', 'chunk', NULL, 72),
  ('cut back on', 'recortar, reducir (gastos, consumo)', 'We need to cut back on travel expenses this year.', 'B2', 'phrasal', NULL, 73),
  ('in the light of', 'a la luz de, teniendo en cuenta (lo que se ha sabido) — en EE. UU.: in light of', 'In the light of recent events, we have decided to review our security procedures.', 'C1', 'general', NULL, 74),
  ('respect', 'respeto; respetar — familia: respectful (respetuoso), respectable (respetable), respective (respectivo), respectively (respectivamente)', 'Sales rose by 5% and 8% in March and April respectively.', 'C1', 'academic', NULL, 75),
  ('up to speed', 'al día, puesto al corriente — bring sb up to speed: poner a alguien al día', 'Can you bring me up to speed on the project before the meeting?', 'C1', 'idiom', NULL, 76),
  ('make up for', 'compensar (algo malo o perdido)', 'The bonus doesn''t make up for all the extra hours.', 'B2', 'phrasal', NULL, 77),
  ('on the grounds that', 'alegando que, por el motivo de que — on the grounds of + sustantivo', 'He refused to sign on the grounds that the contract was unfair.', 'C1', 'general', NULL, 78),
  ('prefer', 'preferir — familia: preference, preferable, preferably, preferential · preferable TO: anything is preferable to waiting', 'Please contact me by email, preferably before Friday.', 'B2', 'academic', 'prɪˈfɜː — pero ˈprefrəbl y ˈprefərəns: la tónica salta a la primera sílaba', 79),
  ('it goes without saying that', 'ni que decir tiene que, huelga decir que', 'It goes without saying that all customer data must be kept confidential.', 'C1', 'chunk', NULL, 80),
  ('weigh up', 'sopesar (pros y contras, opciones)', 'You need to weigh up the pros and cons before accepting the offer.', 'C1', 'phrasal', 'weɪ — la gh es muda: suena como "way"', 81),
  ('give rise to', 'dar lugar a, provocar (formal)', 'The new rules have given rise to a great deal of confusion.', 'C1', 'general', NULL, 82),
  ('pronounce', 'pronunciar — familia: pronunciation (¡sin "ou"!), pronounced (marcado, notable), mispronounce', 'There has been a pronounced improvement in her pronunciation.', 'B2', 'academic', 'prəˌnʌnsiˈeɪʃn — pronunciation suena "nun", no "noun"', 83),
  ('on the same page', 'en sintonía, de acuerdo (sobre cómo hacer algo)', 'Let''s have a quick meeting to make sure we''re all on the same page.', 'B2', 'idiom', NULL, 84),
  ('sum up', 'resumir — to sum up: en resumen (para cerrar un texto o una intervención)', 'To sum up, the benefits clearly outweigh the costs.', 'B2', 'phrasal', NULL, 85),
  ('comply with', 'cumplir (una norma, una ley, un requisito) — compliance: cumplimiento normativo', 'All products must comply with Swiss safety regulations.', 'C1', 'business', NULL, 86),
  ('maintain', 'mantener; sostener (una opinión) — familia: maintenance (mantenimiento: se escribe "ten", no "tain")', 'She maintains that nobody told her about the change.', 'B2', 'academic', 'meɪnˈteɪn — pero maintenance: ˈmeɪntənəns, tónica en MAIN', 87),
  ('all things considered', 'bien mirado, teniendo todo en cuenta (para cerrar una conclusión)', 'All things considered, moving to Switzerland was the right decision.', 'C1', 'chunk', NULL, 88),
  ('get across', 'transmitir, hacer entender (una idea)', 'I found it hard to get my point across in the meeting.', 'C1', 'phrasal', NULL, 89),
  ('object to', 'oponerse a, poner objeciones a (+ -ing) — I object to working, no "to work"', 'Many staff objected to working on public holidays.', 'C1', 'general', NULL, 90),
  ('strength', 'fuerza, punto fuerte — familia: strong, strengthen (reforzar); igual: long → length → lengthen, wide → width → widen, deep → depth → deepen', 'Her greatest strength is her ability to stay calm under pressure.', 'B2', 'academic', 'streŋθ — acaba en "ng" + la z de "zapato"', 91),
  ('a double-edged sword', 'un arma de doble filo', 'Social media is a double-edged sword for small businesses.', 'C1', 'idiom', 'sɔːd — la W de sword es muda', 92),
  ('set out', 'exponer, presentar (por escrito); proponerse (set out to + infinitivo)', 'The report sets out three possible solutions.', 'C1', 'phrasal', NULL, 93),
  ('at the expense of', 'a costa de', 'The company grew quickly, but at the expense of quality.', 'C1', 'general', NULL, 94),
  ('deny', 'negar — familia: denial, undeniable, undeniably (innegablemente) · deny + -ing: he denied taking the money', 'It is undeniable that remote work has changed the way we communicate.', 'B2', 'academic', NULL, 95),
  ('by no means', 'en absoluto, de ninguna manera — al principio de frase lleva inversión: By no means is it easy', 'The results are by no means perfect, but they''re a good start.', 'C1', 'chunk', NULL, 96),
  ('come down to', 'reducirse a, depender en el fondo de', 'In the end, it all comes down to money.', 'C1', 'phrasal', NULL, 97),
  ('in accordance with', 'de acuerdo con, conforme a (normas, instrucciones)', 'Refunds are given in accordance with our returns policy.', 'C1', 'business', NULL, 98),
  ('conscious', 'consciente — familia: consciousness (consciencia), unconscious, subconscious · ojo: conscience = conciencia moral; conscientious = concienzudo', 'She''s a conscientious worker who never leaves anything unfinished.', 'C1', 'academic', 'ˈkɒnʃəs — la sc suena "sh"', 99),
  ('could you run that by me again', '¿me lo puedes repetir o explicar otra vez? — para pedir que te repitan algo sin perder la cara', 'Sorry, could you run that by me again? I didn''t catch the last part.', 'C1', 'chunk', NULL, 100),
  ('lay off', 'despedir (por falta de trabajo, no por culpa del empleado) — ≠ fire o sack (por culpa suya)', 'The factory laid off 200 workers after the merger.', 'B2', 'phrasal', NULL, 101),
  ('pose a threat', 'suponer una amenaza (to: para) — también pose a risk / a problem / a challenge', 'Online shopping poses a serious threat to small retailers.', 'C1', 'general', 'θret — rima con "set": la ea suena e', 102),
  ('convenient', 'que va bien, práctico (de hora, de sitio) — familia: convenience, inconvenience, inconvenient · ojo: "conveniente" (aconsejable) suele ser advisable', 'Would Thursday morning be convenient for you?', 'B2', 'academic', NULL, 103),
  ('draw on', 'recurrir a, aprovechar (experiencia, conocimientos, recursos)', 'In the interview, I drew on my years of experience in retail.', 'C1', 'phrasal', NULL, 104),
  ('it is widely believed that', 'se cree (en general) que — también: He is believed to have left (típico de la Parte 4)', 'It is widely believed that the economy will recover next year.', 'C1', 'chunk', NULL, 105),
  ('depend', 'depender (depend ON) — familia: dependent (dependiente de), independent, independence, dependable (fiable), dependant (BrE: persona a tu cargo)', 'The final price is dependent on the number of people attending.', 'B2', 'academic', NULL, 106),
  ('play down', 'restar importancia a, minimizar', 'The company played down the risks of the new product.', 'C1', 'phrasal', NULL, 107),
  ('prior to', 'antes de (formal) — prior to + sustantivo o -ing', 'Please read the instructions prior to using the machine.', 'C1', 'general', NULL, 108),
  ('occur', 'ocurrir; ocurrírsele a uno (it occurred to me that…) — familia: occurrence (¡dos r!), recur, recurrent', 'It never occurred to me that the shop might be closed.', 'C1', 'academic', 'əˈkɜː — aquí la cc suena sólo "k"', 109),
  ('no sooner', 'nada más… (No sooner had I… than…) — inversión típica del C1', 'No sooner had I arrived than the phone started ringing.', 'C1', 'chunk', NULL, 110),
  ('hold back', 'frenar, contener(se); ocultar (información)', 'Don''t let the fear of making mistakes hold you back.', 'C1', 'phrasal', NULL, 111),
  ('vary', 'variar — familia: variety, various, variation, variable, invariably (siempre, sin excepción)', 'The quality of the service varies from branch to branch.', 'B2', 'academic', 'ˈveəri — pero variety: vəˈraɪəti; la tónica cambia', 112),
  ('step down', 'dimitir, dejar el cargo', 'The director stepped down after twenty years in the role.', 'C1', 'phrasal', NULL, 113),
  ('sufficient', 'suficiente (formal) — familia: insufficient, sufficiently, suffice (bastar), self-sufficient', 'There is not sufficient evidence to prove that the policy has failed.', 'C1', 'academic', 'səˈfɪʃnt — la ci suena "sh"', 114),
  ('emphasis', 'énfasis — familia: emphasise (en BrE con s), emphatic, emphatically · put emphasis ON', 'The course puts a strong emphasis on speaking skills.', 'C1', 'academic', 'ˈemfəsɪs — tónica en EM; emphasise igual: ˈemfəsaɪz', 115),
  ('controversy', 'polémica — familia: controversial (polémico), uncontroversial', 'The decision to close the branch caused a great deal of controversy.', 'C1', 'academic', 'ˈkɒntrəvɜːsi — tónica en la primera sílaba (UK)', 116)
) AS v(word, translation, example, level, category, hint, ord)
WHERE NOT EXISTS (SELECT 1 FROM words w WHERE w.lang = 'en' AND lower(w.word) = lower(v.word))
ORDER BY v.ord;

-- Al SRS, en el mismo orden (el repaso ordena por next_review_date, uw.id).
INSERT INTO user_words (profile_id, word_id)
SELECT 1, w.id
FROM words w
WHERE w.lang = 'en'
  AND NOT EXISTS (SELECT 1 FROM user_words uw WHERE uw.profile_id = 1 AND uw.word_id = w.id)
ORDER BY w.id
ON CONFLICT (profile_id, word_id) DO NOTHING;

COMMIT;
