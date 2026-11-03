-- TutorIngles — migración 37: alemán e inglés para trabajar (3-nov-2026)
--
-- GENERADA de una sola vez y revisada a mano; idempotente.
--
-- Contexto: Edwin deja de ir a Suiza. Busca trabajo con contrato y alojamiento
-- en cualquier país: tiene candidaturas en Austria, Noruega, Irlanda, Finlandia
-- e Islandia, y una entrevista en alemán (Forster's Naturresort, friegaplatos).
-- Inglés real: A2 tirando a B1. Alemán: principiante. Francés: en pausa.
--
-- Qué hace:
--   1. Admite `lang = 'de'` en todas las tablas que filtran por idioma.
--   2. Sector de alemán `hotel-oesterreich` y sector de inglés `trabajo-fuera`,
--      con 6 situaciones cada uno (8 frases clave + role-play de 8 turnos). En
--      alemán la columna `note` lleva la pronunciación figurada, con la notación
--      de la chuleta de la entrevista (mayúsculas = golpe de voz).
--   3. Palabras: alemán con `audio_hint` = figurada; inglés de trabajo A2-B1.
--      Las de inglés van las primeras entre las nuevas (fecha de cola antigua).
--   4. Cinco lecciones de gramática de alemán.
--   5. El perfil pasa al sector `trabajo-fuera` y el inglés a idioma activo. El
--      sector de tienda, el francés y todo el progreso se quedan como estaban.

BEGIN;

-- ══════════════════════ 1. EL IDIOMA ══════════════════════
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['words','tracks','grammar_topics','writing_tasks','speaking_tasks',
                           'exam_attempts','exam_texts','listening_tasks','ia_errores','speaking_submissions'] LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', t, t || '_lang_check');
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (lang IN (''en'',''fr'',''de''))', t, t || '_lang_check');
  END LOOP;
END $$;

-- La gramática empezaba en B1: el alemán empieza más abajo.
ALTER TABLE grammar_topics DROP CONSTRAINT IF EXISTS grammar_topics_level_check;
ALTER TABLE grammar_topics ADD CONSTRAINT grammar_topics_level_check CHECK (level IN ('A2','B1','B2','C1'));

-- ══════════════════════ 2. SECTORES ══════════════════════
INSERT INTO tracks (slug, name, icon, description, order_index, lang) VALUES
  ('hotel-oesterreich', 'Hotel en Austria', 'work', 'Entrevista y primeras semanas en la cocina de un hotel austriaco.', 30, 'de'),
  ('trabajo-fuera', 'Hotel, cocina y fábrica', 'work', 'Inglés A2-B1 para entrevistas y trabajo en hoteles, cocinas y fábricas.', 0, 'en')
ON CONFLICT (slug) DO NOTHING;


-- ── Situaciones de hotel-oesterreich ──
INSERT INTO situations (track_id, slug, title_es, title_en, context_es, level, order_index)
SELECT t.id, 'vorstellung', 'Presentarte en la entrevista', 'Sich im Gespräch vorstellen', 'Lo primero que dirás en la videollamada. Aprende estas frases de memoria: te dan seguridad para todo lo demás.', 'A2', 1 FROM tracks t WHERE t.slug = 'hotel-oesterreich'
ON CONFLICT (track_id, slug) DO NOTHING;
DELETE FROM situation_lines WHERE situation_id = (SELECT s.id FROM situations s JOIN tracks t ON t.id = s.track_id WHERE t.slug = 'hotel-oesterreich' AND s.slug = 'vorstellung');
INSERT INTO situation_lines (situation_id, kind, en, es, note, order_index)
SELECT s.id, v.kind, v.en, v.es, v.note, v.ord
FROM situations s JOIN tracks t ON t.id = s.track_id,
 (VALUES
  ('key', 'Grüß Gott, Herr Gleirscher.', 'Buenos días, señor Gleirscher.', 'grüs got, her GLAIR-sha · Así se saluda en Austria.', 1),
  ('key', 'Danke für das Gespräch.', 'Gracias por la entrevista.', 'DAN-ke für das ge-SHPREJ', 2),
  ('key', 'Ich heiße Edwin Jordan Herbas.', 'Me llamo Edwin Jordan Herbas.', 'ij JAI-se Edwin Jordan Herbas', 3),
  ('key', 'Ich bin dreiundzwanzig Jahre alt.', 'Tengo 23 años.', 'ij bin DRAI-unt-tsvan-tsij YA-re alt', 4),
  ('key', 'Ich komme aus Sevilla, in Spanien.', 'Soy de Sevilla, en España.', 'ij KO-me aus Sevilla, in SHPA-ni-en', 5),
  ('key', 'Seit fünf Jahren arbeite ich in den zwei Restaurants meiner Familie.', 'Desde hace cinco años trabajo en los dos restaurantes de mi familia.', 'sait fünf YA-ren AR-bai-te ij in den tsvai res-to-RANS MAI-na fa-MI-li-e', 6),
  ('key', 'Ich spüle Geschirr, putze die Küche und bereite Essen vor.', 'Friego la vajilla, limpio la cocina y preparo comida.', 'ij SHPÜ-le ge-SHIR, PU-tse di KÜ-je unt be-RAI-te E-sen for', 7),
  ('key', 'Ich kann sofort anfangen.', 'Puedo empezar de inmediato.', 'ij kan so-FORT AN-fan-guen', 8),
  ('customer', 'Guten Tag, Herr Herbas. Können Sie mich gut hören?', 'Buenos días, señor Herbas. ¿Me oye bien?', NULL, 9),
  ('you', 'Ja, ich höre Sie gut. Danke für das Gespräch.', 'Sí, le oigo bien. Gracias por la entrevista.', 'ya, ij HÖ-re si gut. DAN-ke für das ge-SHPREJ', 10),
  ('customer', 'Erzählen Sie etwas über sich.', 'Cuénteme algo sobre usted.', NULL, 11),
  ('you', 'Ich heiße Edwin. Ich bin dreiundzwanzig Jahre alt und komme aus Sevilla.', 'Me llamo Edwin. Tengo 23 años y soy de Sevilla.', NULL, 12),
  ('customer', 'Was machen Sie in den Restaurants?', '¿Qué hace en los restaurantes?', NULL, 13),
  ('you', 'Ich spüle Geschirr, putze die Küche und bereite Essen vor.', 'Friego la vajilla, limpio la cocina y preparo comida.', NULL, 14),
  ('customer', 'Sehr gut. Wann können Sie anfangen?', 'Muy bien. ¿Cuándo puede empezar?', NULL, 15),
  ('you', 'Ich kann sofort anfangen.', 'Puedo empezar de inmediato.', NULL, 16)
 ) AS v(kind, en, es, note, ord)
WHERE t.slug = 'hotel-oesterreich' AND s.slug = 'vorstellung';
INSERT INTO situations (track_id, slug, title_es, title_en, context_es, level, order_index)
SELECT t.id, 'fragen-chef', 'Responder a las preguntas del jefe', 'Fragen im Vorstellungsgespräch', 'Son preguntas típicas de una entrevista de cocina. Respuestas cortas: con tu nivel, una frase corta y segura vale más que una larga con fallos.', 'A2', 2 FROM tracks t WHERE t.slug = 'hotel-oesterreich'
ON CONFLICT (track_id, slug) DO NOTHING;
DELETE FROM situation_lines WHERE situation_id = (SELECT s.id FROM situations s JOIN tracks t ON t.id = s.track_id WHERE t.slug = 'hotel-oesterreich' AND s.slug = 'fragen-chef');
INSERT INTO situation_lines (situation_id, kind, en, es, note, order_index)
SELECT s.id, v.kind, v.en, v.es, v.note, v.ord
FROM situations s JOIN tracks t ON t.id = s.track_id,
 (VALUES
  ('key', 'Ja, seit fünf Jahren, in den Restaurants meiner Familie.', 'Sí, desde hace cinco años, en los restaurantes de mi familia.', 'ya, sait fünf YA-ren, in den res-to-RANS MAI-na fa-MI-li-e', 1),
  ('key', 'Ich möchte in Österreich arbeiten und Deutsch lernen.', 'Quiero trabajar en Austria y aprender alemán.', 'ij MÖJ-te in ÖS-te-raij AR-bai-ten unt doich LER-nen', 2),
  ('key', 'Die ganze Wintersaison.', 'Toda la temporada de invierno.', 'di GAN-tse VIN-ter-se-son', 3),
  ('key', 'Ja, kein Problem.', 'Sí, sin problema.', 'ya, kain pro-BLEM', 4),
  ('key', 'Ich bin Anfänger, aber ich lerne jeden Tag.', 'Soy principiante, pero aprendo cada día.', 'ij bin AN-fen-ga, A-ba ij LER-ne YE-den tak', 5),
  ('key', 'Ja, ich komme allein.', 'Sí, vengo solo.', 'ya, ij KO-me a-LAIN', 6),
  ('key', 'Nein, aber ich habe einen Führerschein.', 'No, pero tengo carné de conducir.', 'nain, A-ba ij HA-be AI-nen FÜ-rer-shain', 7),
  ('key', 'Ja, ich habe ein paar Fragen.', 'Sí, tengo unas preguntas.', 'ya, ij HA-be ain par FRA-guen', 8),
  ('customer', 'Haben Sie schon in der Küche gearbeitet?', '¿Ha trabajado ya en cocina?', NULL, 9),
  ('you', 'Ja, seit fünf Jahren, in den Restaurants meiner Familie.', 'Sí, desde hace cinco años, en los restaurantes de mi familia.', NULL, 10),
  ('customer', 'Warum möchten Sie bei uns arbeiten?', '¿Por qué quiere trabajar con nosotros?', NULL, 11),
  ('you', 'Ich möchte in Österreich arbeiten und Deutsch lernen.', 'Quiero trabajar en Austria y aprender alemán.', NULL, 12),
  ('customer', 'Wie lange möchten Sie bleiben?', '¿Cuánto tiempo quiere quedarse?', NULL, 13),
  ('you', 'Die ganze Wintersaison.', 'Toda la temporada de invierno.', NULL, 14),
  ('customer', 'Können Sie auch am Wochenende arbeiten?', '¿Puede trabajar también los fines de semana?', NULL, 15),
  ('you', 'Ja, kein Problem.', 'Sí, sin problema.', NULL, 16)
 ) AS v(kind, en, es, note, ord)
WHERE t.slug = 'hotel-oesterreich' AND s.slug = 'fragen-chef';
INSERT INTO situations (track_id, slug, title_es, title_en, context_es, level, order_index)
SELECT t.id, 'bedingungen', 'Preguntar por habitación, comida y contrato', 'Nach den Bedingungen fragen', 'No cierres la llamada sin saber esto. Sobre todo: habitación, comida y contrato antes de viajar. Los datos del diálogo son de práctica.', 'A2', 3 FROM tracks t WHERE t.slug = 'hotel-oesterreich'
ON CONFLICT (track_id, slug) DO NOTHING;
DELETE FROM situation_lines WHERE situation_id = (SELECT s.id FROM situations s JOIN tracks t ON t.id = s.track_id WHERE t.slug = 'hotel-oesterreich' AND s.slug = 'bedingungen');
INSERT INTO situation_lines (situation_id, kind, en, es, note, order_index)
SELECT s.id, v.kind, v.en, v.es, v.note, v.ord
FROM situations s JOIN tracks t ON t.id = s.track_id,
 (VALUES
  ('key', 'Gibt es ein Zimmer für Mitarbeiter?', '¿Hay habitación para empleados?', 'guipt es ain TSI-ma für MIT-ar-bai-ta', 1),
  ('key', 'Was kostet das Zimmer im Monat?', '¿Cuánto cuesta la habitación al mes?', 'vas KOS-tet das TSI-ma im MO-nat', 2),
  ('key', 'Ist das Essen inklusive?', '¿La comida está incluida?', 'ist das E-sen in-klu-SI-ve', 3),
  ('key', 'Sind es zweitausendvierhundert Euro netto im Monat?', '¿Son 2.400 euros netos al mes?', 'sint es TSVAI-tau-sent-FIR-hun-dert OI-ro NE-to im MO-nat', 4),
  ('key', 'Wie viele Stunden arbeite ich pro Woche?', '¿Cuántas horas trabajo a la semana?', 'vi FI-le SHTUN-den AR-bai-te ij pro VO-je', 5),
  ('key', 'Wie viele freie Tage habe ich pro Woche?', '¿Cuántos días libres tengo a la semana?', 'vi FI-le FRAI-e TA-gue HA-be ij pro VO-je', 6),
  ('key', 'Wann ist mein erster Arbeitstag?', '¿Cuándo es mi primer día?', 'van ist main ERS-ta AR-baits-tak', 7),
  ('key', 'Bekomme ich den Vertrag vor der Reise?', '¿Recibo el contrato antes de viajar?', 'be-KO-me ij den fer-TRAK for der RAI-se', 8),
  ('customer', 'Haben Sie noch Fragen?', '¿Tiene alguna pregunta?', NULL, 9),
  ('you', 'Ja. Gibt es ein Zimmer für Mitarbeiter?', 'Sí. ¿Hay habitación para empleados?', NULL, 10),
  ('customer', 'Ja, Sie bekommen ein Zimmer im Personalhaus.', 'Sí, tendrá una habitación en la casa del personal.', NULL, 11),
  ('you', 'Was kostet das Zimmer im Monat?', '¿Cuánto cuesta la habitación al mes?', NULL, 12),
  ('customer', 'Zimmer und Essen sind frei.', 'La habitación y la comida son gratis.', '«frei» aquí significa gratis.', 13),
  ('you', 'Danke. Bekomme ich den Vertrag vor der Reise?', 'Gracias. ¿Recibo el contrato antes de viajar?', NULL, 14),
  ('customer', 'Ja, wir schicken Ihnen den Vertrag per E-Mail.', 'Sí, le enviamos el contrato por correo.', NULL, 15),
  ('you', 'Sehr gut. Vielen Dank für das Gespräch.', 'Muy bien. Muchas gracias por la entrevista.', 'FI-len dank für das ge-SHPREJ', 16)
 ) AS v(kind, en, es, note, ord)
WHERE t.slug = 'hotel-oesterreich' AND s.slug = 'bedingungen';
INSERT INTO situations (track_id, slug, title_es, title_en, context_es, level, order_index)
SELECT t.id, 'nicht-verstanden', 'Cuando no entiendes', 'Wenn man nichts versteht', 'Te va a pasar, y no pasa nada. Lo malo es decir que sí sin haber entendido. Estas frases te sacan de cualquier apuro.', 'A2', 4 FROM tracks t WHERE t.slug = 'hotel-oesterreich'
ON CONFLICT (track_id, slug) DO NOTHING;
DELETE FROM situation_lines WHERE situation_id = (SELECT s.id FROM situations s JOIN tracks t ON t.id = s.track_id WHERE t.slug = 'hotel-oesterreich' AND s.slug = 'nicht-verstanden');
INSERT INTO situation_lines (situation_id, kind, en, es, note, order_index)
SELECT s.id, v.kind, v.en, v.es, v.note, v.ord
FROM situations s JOIN tracks t ON t.id = s.track_id,
 (VALUES
  ('key', 'Können Sie das bitte wiederholen?', '¿Puede repetirlo, por favor?', 'KÖ-nen si das BI-te vi-da-HO-len', 1),
  ('key', 'Bitte langsam.', 'Despacio, por favor.', 'BI-te LANG-sam', 2),
  ('key', 'Das habe ich nicht verstanden.', 'No lo he entendido.', 'das HA-be ij nijt fer-SHTAN-den', 3),
  ('key', 'Können wir auf Englisch sprechen?', '¿Podemos hablar en inglés?', 'KÖ-nen vir auf ENG-lish SHPRE-jen', 4),
  ('key', 'Einen Moment, bitte.', 'Un momento, por favor.', 'AI-nen mo-MENT, BI-te', 5),
  ('key', 'Wie sagt man das auf Deutsch?', '¿Cómo se dice eso en alemán?', 'vi sakt man das auf doich', 6),
  ('key', 'Was bedeutet das?', '¿Qué significa eso?', 'vas be-DOI-tet das', 7),
  ('key', 'Entschuldigung.', 'Perdón.', 'ent-SHUL-di-gung', 8),
  ('customer', 'Wir suchen jemanden für die ganze Saison, der auch am Abend arbeiten kann.', 'Buscamos a alguien para toda la temporada que también pueda trabajar por la noche.', NULL, 9),
  ('you', 'Entschuldigung. Das habe ich nicht verstanden.', 'Perdón. No lo he entendido.', NULL, 10),
  ('customer', 'Können Sie am Abend arbeiten?', '¿Puede trabajar por la noche?', NULL, 11),
  ('you', 'Ja, kein Problem.', 'Sí, sin problema.', NULL, 12),
  ('customer', 'Die Unterkunft ist im Nebenhaus, gleich neben dem Hotel.', 'El alojamiento está en la casa de al lado, junto al hotel.', NULL, 13),
  ('you', 'Können Sie das bitte wiederholen? Bitte langsam.', '¿Puede repetirlo, por favor? Despacio, por favor.', NULL, 14),
  ('customer', 'Ihr Zimmer ist neben dem Hotel.', 'Su habitación está al lado del hotel.', NULL, 15),
  ('you', 'Ah, danke. Jetzt verstehe ich.', 'Ah, gracias. Ahora lo entiendo.', 'yetst fer-SHTE-e ij', 16)
 ) AS v(kind, en, es, note, ord)
WHERE t.slug = 'hotel-oesterreich' AND s.slug = 'nicht-verstanden';
INSERT INTO situations (track_id, slug, title_es, title_en, context_es, level, order_index)
SELECT t.id, 'erster-tag-kueche', 'Tu primer día en la cocina', 'Der erste Tag in der Küche', 'El jefe de cocina va con prisa y te tutea. Son órdenes cortas: dónde va cada cosa, qué limpiar y cuándo es la pausa.', 'A2', 5 FROM tracks t WHERE t.slug = 'hotel-oesterreich'
ON CONFLICT (track_id, slug) DO NOTHING;
DELETE FROM situation_lines WHERE situation_id = (SELECT s.id FROM situations s JOIN tracks t ON t.id = s.track_id WHERE t.slug = 'hotel-oesterreich' AND s.slug = 'erster-tag-kueche');
INSERT INTO situation_lines (situation_id, kind, en, es, note, order_index)
SELECT s.id, v.kind, v.en, v.es, v.note, v.ord
FROM situations s JOIN tracks t ON t.id = s.track_id,
 (VALUES
  ('key', 'Wo soll ich die Teller hinstellen?', '¿Dónde pongo los platos?', 'vo sol ij di TE-la HIN-shte-len', 1),
  ('key', 'Ich bin fertig. Was soll ich jetzt machen?', 'He terminado. ¿Qué hago ahora?', 'ij bin FER-tij. vas sol ij yetst MA-jen', 2),
  ('key', 'Wo ist das Spülmittel?', '¿Dónde está el lavavajillas?', 'vo ist das SHPÜL-mi-tel · el líquido, no la máquina', 3),
  ('key', 'Die Spülmaschine ist voll.', 'El lavavajillas está lleno.', 'di SHPÜL-ma-shi-ne ist fol', 4),
  ('key', 'Soll ich den Boden putzen?', '¿Friego el suelo?', 'sol ij den BO-den PU-tsen', 5),
  ('key', 'Wann habe ich Pause?', '¿Cuándo tengo la pausa?', 'van HA-be ij PAU-se', 6),
  ('key', 'Ja, mache ich.', 'Sí, lo hago.', 'ya, MA-je ij', 7),
  ('key', 'Kannst du mir das zeigen?', '¿Me lo puedes enseñar?', 'kanst du mir das TSAI-guen', 8),
  ('customer', 'Servus! Du bist der Neue, oder? Stell die Teller bitte da hin.', '¡Hola! Eres el nuevo, ¿no? Pon los platos ahí, por favor.', '«Servus» es el hola informal en Austria.', 9),
  ('you', 'Ja, mache ich. Wo ist das Spülmittel?', 'Sí, lo hago. ¿Dónde está el líquido para fregar?', NULL, 10),
  ('customer', 'Unter der Spüle. Mach zuerst die Töpfe.', 'Debajo del fregadero. Haz primero las ollas.', NULL, 11),
  ('you', 'Ja, mache ich.', 'Sí, lo hago.', NULL, 12),
  ('customer', 'Und dann den Boden, bitte.', 'Y después el suelo, por favor.', NULL, 13),
  ('you', 'Ich bin fertig. Was soll ich jetzt machen?', 'He terminado. ¿Qué hago ahora?', NULL, 14),
  ('customer', 'Super. Jetzt hast du Pause, eine halbe Stunde.', 'Genial. Ahora tienes la pausa, media hora.', NULL, 15),
  ('you', 'Danke, bis gleich.', 'Gracias, hasta ahora.', 'DAN-ke, bis glaij', 16)
 ) AS v(kind, en, es, note, ord)
WHERE t.slug = 'hotel-oesterreich' AND s.slug = 'erster-tag-kueche';
INSERT INTO situations (track_id, slug, title_es, title_en, context_es, level, order_index)
SELECT t.id, 'kollegen', 'Horarios y compañeros', 'Dienstplan und Kollegen', 'Con los compañeros se tutea. Aquí se habla de turnos, días libres y comida del personal.', 'A2', 6 FROM tracks t WHERE t.slug = 'hotel-oesterreich'
ON CONFLICT (track_id, slug) DO NOTHING;
DELETE FROM situation_lines WHERE situation_id = (SELECT s.id FROM situations s JOIN tracks t ON t.id = s.track_id WHERE t.slug = 'hotel-oesterreich' AND s.slug = 'kollegen');
INSERT INTO situation_lines (situation_id, kind, en, es, note, order_index)
SELECT s.id, v.kind, v.en, v.es, v.note, v.ord
FROM situations s JOIN tracks t ON t.id = s.track_id,
 (VALUES
  ('key', 'Wann beginnt mein Dienst?', '¿Cuándo empieza mi turno?', 'van be-GUINT main dinst', 1),
  ('key', 'Wann habe ich frei?', '¿Cuándo libro?', 'van HA-be ij frai', 2),
  ('key', 'Wo ist der Dienstplan?', '¿Dónde está el cuadrante?', 'vo ist der DINST-plan', 3),
  ('key', 'Wo essen wir?', '¿Dónde comemos?', 'vo E-sen vir', 4),
  ('key', 'Woher kommst du?', '¿De dónde eres?', 'vo-HER komst du', 5),
  ('key', 'Ich komme aus Spanien.', 'Soy de España.', 'ij KO-me aus SHPA-ni-en', 6),
  ('key', 'Wie lange arbeitest du schon hier?', '¿Cuánto llevas trabajando aquí?', 'vi LAN-gue AR-bai-test du shon hir', 7),
  ('key', 'Danke für deine Hilfe.', 'Gracias por tu ayuda.', 'DAN-ke für DAI-ne HIL-fe', 8),
  ('customer', 'Hallo! Ich bin Lukas. Woher kommst du?', '¡Hola! Soy Lukas. ¿De dónde eres?', NULL, 9),
  ('you', 'Ich komme aus Spanien. Ich heiße Edwin.', 'Soy de España. Me llamo Edwin.', NULL, 10),
  ('customer', 'Freut mich. Hast du den Dienstplan gesehen?', 'Encantado. ¿Has visto el cuadrante?', NULL, 11),
  ('you', 'Nein. Wo ist der Dienstplan?', 'No. ¿Dónde está el cuadrante?', NULL, 12),
  ('customer', 'In der Küche, neben der Tür. Du arbeitest morgen um acht.', 'En la cocina, junto a la puerta. Mañana trabajas a las ocho.', NULL, 13),
  ('you', 'Danke. Wann habe ich frei?', 'Gracias. ¿Cuándo libro?', NULL, 14),
  ('customer', 'Am Mittwoch. Komm, wir essen jetzt.', 'El miércoles. Ven, ahora comemos.', NULL, 15),
  ('you', 'Danke für deine Hilfe.', 'Gracias por tu ayuda.', NULL, 16)
 ) AS v(kind, en, es, note, ord)
WHERE t.slug = 'hotel-oesterreich' AND s.slug = 'kollegen';

-- ── Situaciones de trabajo-fuera ──
INSERT INTO situations (track_id, slug, title_es, title_en, context_es, level, order_index)
SELECT t.id, 'phone-interview', 'Entrevista por teléfono', 'A phone interview', 'Agencias y hoteles te llamarán en inglés. Di poco y claro: quién eres, qué has hecho y cuándo puedes empezar.', 'A2', 1 FROM tracks t WHERE t.slug = 'trabajo-fuera'
ON CONFLICT (track_id, slug) DO NOTHING;
DELETE FROM situation_lines WHERE situation_id = (SELECT s.id FROM situations s JOIN tracks t ON t.id = s.track_id WHERE t.slug = 'trabajo-fuera' AND s.slug = 'phone-interview');
INSERT INTO situation_lines (situation_id, kind, en, es, note, order_index)
SELECT s.id, v.kind, v.en, v.es, v.note, v.ord
FROM situations s JOIN tracks t ON t.id = s.track_id,
 (VALUES
  ('key', 'Hello, this is Edwin speaking.', 'Hola, soy Edwin.', 'Así se contesta al teléfono en inglés.', 1),
  ('key', 'Thank you for calling.', 'Gracias por llamar.', NULL, 2),
  ('key', 'I have worked in my family''s two restaurants since 2021.', 'Trabajo en los dos restaurantes de mi familia desde 2021.', 'Since + año lleva «have worked», no «I work since».', 3),
  ('key', 'I wash dishes, clean the kitchen and prepare food.', 'Friego, limpio la cocina y preparo comida.', NULL, 4),
  ('key', 'I don''t have experience with fish, but I learn fast.', 'No tengo experiencia con pescado, pero aprendo rápido.', NULL, 5),
  ('key', 'I can start immediately.', 'Puedo empezar de inmediato.', NULL, 6),
  ('key', 'I can travel as soon as I have a contract.', 'Puedo viajar en cuanto tenga un contrato.', 'Después de «as soon as» va presente, no «will have».', 7),
  ('key', 'Sorry, could you repeat that, please?', 'Perdona, ¿puedes repetirlo, por favor?', NULL, 8),
  ('customer', 'Hi, is this Edwin? I''m calling about your application.', 'Hola, ¿eres Edwin? Te llamo por tu candidatura.', NULL, 9),
  ('you', 'Yes, this is Edwin. Thank you for calling.', 'Sí, soy Edwin. Gracias por llamar.', NULL, 10),
  ('customer', 'Have you worked in a factory before?', '¿Has trabajado antes en una fábrica?', NULL, 11),
  ('you', 'No, but I have worked in restaurant kitchens since 2021.', 'No, pero trabajo en cocinas de restaurante desde 2021.', NULL, 12),
  ('customer', 'Can you work nights and weekends?', '¿Puedes trabajar de noche y los fines de semana?', NULL, 13),
  ('you', 'Yes, no problem.', 'Sí, sin problema.', NULL, 14),
  ('customer', 'When can you start?', '¿Cuándo puedes empezar?', NULL, 15),
  ('you', 'I can start immediately. I can travel as soon as I have a contract.', 'Puedo empezar de inmediato. Puedo viajar en cuanto tenga un contrato.', NULL, 16)
 ) AS v(kind, en, es, note, ord)
WHERE t.slug = 'trabajo-fuera' AND s.slug = 'phone-interview';
INSERT INTO situations (track_id, slug, title_es, title_en, context_es, level, order_index)
SELECT t.id, 'job-conditions', 'Preguntar por las condiciones', 'Asking about the conditions', 'Antes de aceptar, pregunta por habitación, comida, sueldo y contrato. Y pide que te lo envíen por escrito.', 'A2', 2 FROM tracks t WHERE t.slug = 'trabajo-fuera'
ON CONFLICT (track_id, slug) DO NOTHING;
DELETE FROM situation_lines WHERE situation_id = (SELECT s.id FROM situations s JOIN tracks t ON t.id = s.track_id WHERE t.slug = 'trabajo-fuera' AND s.slug = 'job-conditions');
INSERT INTO situation_lines (situation_id, kind, en, es, note, order_index)
SELECT s.id, v.kind, v.en, v.es, v.note, v.ord
FROM situations s JOIN tracks t ON t.id = s.track_id,
 (VALUES
  ('key', 'Is there a room for staff?', '¿Hay habitación para el personal?', NULL, 1),
  ('key', 'How much is the room per month?', '¿Cuánto cuesta la habitación al mes?', NULL, 2),
  ('key', 'Are meals included?', '¿Está incluida la comida?', NULL, 3),
  ('key', 'How much is the salary after tax?', '¿Cuánto es el sueldo neto?', '«after tax» es más claro que «net» por teléfono.', 4),
  ('key', 'How many hours do I work per week?', '¿Cuántas horas trabajo a la semana?', NULL, 5),
  ('key', 'How many days off do I have?', '¿Cuántos días libres tengo?', NULL, 6),
  ('key', 'When does the contract end?', '¿Cuándo termina el contrato?', NULL, 7),
  ('key', 'Can you send me the contract before I travel?', '¿Me puedes enviar el contrato antes de viajar?', NULL, 8),
  ('customer', 'Do you have any questions?', '¿Tienes alguna pregunta?', NULL, 9),
  ('you', 'Yes. Is there a room for staff?', 'Sí. ¿Hay habitación para el personal?', NULL, 10),
  ('customer', 'Yes, you share a flat with two colleagues.', 'Sí, compartes piso con dos compañeros.', NULL, 11),
  ('you', 'How much is the room per month?', '¿Cuánto cuesta la habitación al mes?', NULL, 12),
  ('customer', 'It''s taken from your salary. About 400 euros.', 'Se descuenta del sueldo. Unos 400 euros.', NULL, 13),
  ('you', 'OK. Can you send me the contract before I travel?', 'Vale. ¿Me puedes enviar el contrato antes de viajar?', NULL, 14),
  ('customer', 'Of course. I''ll email it to you this week.', 'Claro. Te lo mando por correo esta semana.', NULL, 15),
  ('you', 'Great. Thank you very much.', 'Genial. Muchas gracias.', NULL, 16)
 ) AS v(kind, en, es, note, ord)
WHERE t.slug = 'trabajo-fuera' AND s.slug = 'job-conditions';
INSERT INTO situations (track_id, slug, title_es, title_en, context_es, level, order_index)
SELECT t.id, 'kitchen-first-shift', 'Primer turno en la cocina', 'Your first shift in the kitchen', 'Órdenes cortas y con prisa. Lo importante es saber preguntar dónde va cada cosa y qué hacer después.', 'A2', 3 FROM tracks t WHERE t.slug = 'trabajo-fuera'
ON CONFLICT (track_id, slug) DO NOTHING;
DELETE FROM situation_lines WHERE situation_id = (SELECT s.id FROM situations s JOIN tracks t ON t.id = s.track_id WHERE t.slug = 'trabajo-fuera' AND s.slug = 'kitchen-first-shift');
INSERT INTO situation_lines (situation_id, kind, en, es, note, order_index)
SELECT s.id, v.kind, v.en, v.es, v.note, v.ord
FROM situations s JOIN tracks t ON t.id = s.track_id,
 (VALUES
  ('key', 'Where do these plates go?', '¿Dónde van estos platos?', NULL, 1),
  ('key', 'I''ve finished. What should I do next?', 'He terminado. ¿Qué hago ahora?', NULL, 2),
  ('key', 'Where is the washing-up liquid?', '¿Dónde está el lavavajillas?', 'El líquido. La máquina es «dishwasher».', 3),
  ('key', 'The dishwasher is full.', 'El lavavajillas está lleno.', NULL, 4),
  ('key', 'Should I clean the floor?', '¿Limpio el suelo?', NULL, 5),
  ('key', 'Careful, the floor is wet.', 'Cuidado, el suelo está mojado.', NULL, 6),
  ('key', 'When is my break?', '¿Cuándo es mi descanso?', NULL, 7),
  ('key', 'Can you show me, please?', '¿Me lo enseñas, por favor?', NULL, 8),
  ('customer', 'You must be the new guy. Put the pans over there.', 'Tú debes de ser el nuevo. Pon las sartenes ahí.', NULL, 9),
  ('you', 'OK. Where is the washing-up liquid?', 'Vale. ¿Dónde está el líquido de fregar?', NULL, 10),
  ('customer', 'Under the sink. Do the pots first.', 'Debajo del fregadero. Haz primero las ollas.', NULL, 11),
  ('you', 'Sure. Can you show me the dishwasher, please?', 'Claro. ¿Me enseñas el lavavajillas, por favor?', NULL, 12),
  ('customer', 'Just press the green button.', 'Solo pulsa el botón verde.', NULL, 13),
  ('you', 'I''ve finished. What should I do next?', 'He terminado. ¿Qué hago ahora?', NULL, 14),
  ('customer', 'Clean the floor, then take your break.', 'Limpia el suelo y luego tómate el descanso.', NULL, 15),
  ('you', 'OK. When do I come back?', 'Vale. ¿Cuándo vuelvo?', NULL, 16)
 ) AS v(kind, en, es, note, ord)
WHERE t.slug = 'trabajo-fuera' AND s.slug = 'kitchen-first-shift';
INSERT INTO situations (track_id, slug, title_es, title_en, context_es, level, order_index)
SELECT t.id, 'housekeeping-room', 'Limpiar habitaciones de hotel', 'Cleaning hotel rooms', 'Si hay un huésped, se llama a la puerta y se pregunta antes de entrar.', 'A2', 4 FROM tracks t WHERE t.slug = 'trabajo-fuera'
ON CONFLICT (track_id, slug) DO NOTHING;
DELETE FROM situation_lines WHERE situation_id = (SELECT s.id FROM situations s JOIN tracks t ON t.id = s.track_id WHERE t.slug = 'trabajo-fuera' AND s.slug = 'housekeeping-room');
INSERT INTO situation_lines (situation_id, kind, en, es, note, order_index)
SELECT s.id, v.kind, v.en, v.es, v.note, v.ord
FROM situations s JOIN tracks t ON t.id = s.track_id,
 (VALUES
  ('key', 'Housekeeping! May I come in?', '¡Limpieza! ¿Puedo pasar?', 'Se dice llamando a la puerta.', 1),
  ('key', 'I''m sorry, I''ll come back later.', 'Perdone, vuelvo más tarde.', NULL, 2),
  ('key', 'Would you like clean towels?', '¿Quiere toallas limpias?', NULL, 3),
  ('key', 'I change the sheets and make the bed.', 'Cambio las sábanas y hago la cama.', NULL, 4),
  ('key', 'I clean the bathroom.', 'Limpio el baño.', NULL, 5),
  ('key', 'We need more toilet paper on this floor.', 'Hace falta más papel higiénico en esta planta.', NULL, 6),
  ('key', 'Room 204 is ready.', 'La habitación 204 está lista.', NULL, 7),
  ('key', 'Something is broken in this room.', 'Hay algo roto en esta habitación.', NULL, 8),
  ('customer', 'Start with room 204, please. The guest has left.', 'Empieza por la 204, por favor. El huésped se ha ido.', NULL, 9),
  ('you', 'OK. Do I change the sheets?', 'Vale. ¿Cambio las sábanas?', NULL, 10),
  ('customer', 'Yes, and put out clean towels.', 'Sí, y pon toallas limpias.', NULL, 11),
  ('you', 'Sure. We need more toilet paper on this floor.', 'Claro. Hace falta más papel higiénico en esta planta.', NULL, 12),
  ('customer', 'It''s in the cupboard by the lift.', 'Está en el armario junto al ascensor.', NULL, 13),
  ('you', 'Thanks. Room 204 is ready.', 'Gracias. La 204 está lista.', NULL, 14),
  ('customer', 'Great. Now room 206, but knock first.', 'Genial. Ahora la 206, pero llama primero.', NULL, 15),
  ('you', 'Housekeeping! May I come in?', '¡Limpieza! ¿Puedo pasar?', NULL, 16)
 ) AS v(kind, en, es, note, ord)
WHERE t.slug = 'trabajo-fuera' AND s.slug = 'housekeeping-room';
INSERT INTO situations (track_id, slug, title_es, title_en, context_es, level, order_index)
SELECT t.id, 'factory-safety', 'Primer día en la fábrica', 'Your first day at the factory', 'En una fábrica de salmón lo primero es la seguridad. Si no entiendes una norma, pregunta: es lo que esperan de ti.', 'A2', 5 FROM tracks t WHERE t.slug = 'trabajo-fuera'
ON CONFLICT (track_id, slug) DO NOTHING;
DELETE FROM situation_lines WHERE situation_id = (SELECT s.id FROM situations s JOIN tracks t ON t.id = s.track_id WHERE t.slug = 'trabajo-fuera' AND s.slug = 'factory-safety');
INSERT INTO situation_lines (situation_id, kind, en, es, note, order_index)
SELECT s.id, v.kind, v.en, v.es, v.note, v.ord
FROM situations s JOIN tracks t ON t.id = s.track_id,
 (VALUES
  ('key', 'Where do I put on my work clothes?', '¿Dónde me pongo la ropa de trabajo?', NULL, 1),
  ('key', 'Do I need gloves here?', '¿Necesito guantes aquí?', NULL, 2),
  ('key', 'I wash my hands before I start.', 'Me lavo las manos antes de empezar.', NULL, 3),
  ('key', 'It''s very cold in here.', 'Hace mucho frío aquí dentro.', NULL, 4),
  ('key', 'The line has stopped.', 'La línea se ha parado.', NULL, 5),
  ('key', 'I have cut my finger.', 'Me he cortado el dedo.', 'Avísalo siempre, por pequeño que sea.', 6),
  ('key', 'Could you explain that again, please?', '¿Puedes explicarlo otra vez, por favor?', NULL, 7),
  ('key', 'What time does the shift finish?', '¿A qué hora termina el turno?', NULL, 8),
  ('customer', 'Welcome. First, wash your hands and put on your gloves.', 'Bienvenido. Primero, lávate las manos y ponte los guantes.', NULL, 9),
  ('you', 'OK. Do I need a hat too?', 'Vale. ¿Necesito gorro también?', NULL, 10),
  ('customer', 'Yes, a hat and boots. Always.', 'Sí, gorro y botas. Siempre.', NULL, 11),
  ('you', 'Could you explain the line again, please?', '¿Puedes explicar otra vez la línea, por favor?', NULL, 12),
  ('customer', 'You take the fish and put it in the box. Keep the speed.', 'Coges el pescado y lo pones en la caja. Mantén el ritmo.', NULL, 13),
  ('you', 'I understand. What time is the break?', 'Entendido. ¿A qué hora es el descanso?', NULL, 14),
  ('customer', 'At ten. If you get hurt, tell me immediately.', 'A las diez. Si te haces daño, dímelo enseguida.', NULL, 15),
  ('you', 'OK, I will. Thank you.', 'Vale, lo haré. Gracias.', NULL, 16)
 ) AS v(kind, en, es, note, ord)
WHERE t.slug = 'trabajo-fuera' AND s.slug = 'factory-safety';
INSERT INTO situations (track_id, slug, title_es, title_en, context_es, level, order_index)
SELECT t.id, 'staff-life', 'Turnos, días libres y compañeros', 'Shifts and colleagues', 'Lo que hablarás con los compañeros: horarios, cambios de turno y un poco de ti.', 'A2', 6 FROM tracks t WHERE t.slug = 'trabajo-fuera'
ON CONFLICT (track_id, slug) DO NOTHING;
DELETE FROM situation_lines WHERE situation_id = (SELECT s.id FROM situations s JOIN tracks t ON t.id = s.track_id WHERE t.slug = 'trabajo-fuera' AND s.slug = 'staff-life');
INSERT INTO situation_lines (situation_id, kind, en, es, note, order_index)
SELECT s.id, v.kind, v.en, v.es, v.note, v.ord
FROM situations s JOIN tracks t ON t.id = s.track_id,
 (VALUES
  ('key', 'What time do I start tomorrow?', '¿A qué hora empiezo mañana?', NULL, 1),
  ('key', 'Which days do I have off?', '¿Qué días libro?', NULL, 2),
  ('key', 'Can I change my shift?', '¿Puedo cambiar mi turno?', NULL, 3),
  ('key', 'I''m from Spain. I''ve been here for two weeks.', 'Soy de España. Llevo aquí dos semanas.', '«Llevo dos semanas» = have been ... for.', 4),
  ('key', 'How long have you worked here?', '¿Cuánto llevas trabajando aquí?', NULL, 5),
  ('key', 'I''m learning English.', 'Estoy aprendiendo inglés.', NULL, 6),
  ('key', 'Can you speak more slowly, please?', '¿Puedes hablar más despacio, por favor?', NULL, 7),
  ('key', 'Thanks for your help.', 'Gracias por tu ayuda.', NULL, 8),
  ('customer', 'Hi, I''m Anna. Where are you from?', 'Hola, soy Anna. ¿De dónde eres?', NULL, 9),
  ('you', 'I''m from Spain. I''ve been here for two weeks.', 'Soy de España. Llevo aquí dos semanas.', NULL, 10),
  ('customer', 'Nice! Have you seen the new rota?', '¡Qué bien! ¿Has visto el nuevo cuadrante?', '«rota» es el cuadrante de turnos.', 11),
  ('you', 'No. What time do I start tomorrow?', 'No. ¿A qué hora empiezo mañana?', NULL, 12),
  ('customer', 'At seven, I think. It''s on the wall.', 'A las siete, creo. Está en la pared.', NULL, 13),
  ('you', 'Thanks. Which days do I have off?', 'Gracias. ¿Qué días libro?', NULL, 14),
  ('customer', 'Tuesday and Wednesday.', 'Martes y miércoles.', NULL, 15),
  ('you', 'Great. Thanks for your help.', 'Genial. Gracias por tu ayuda.', NULL, 16)
 ) AS v(kind, en, es, note, ord)
WHERE t.slug = 'trabajo-fuera' AND s.slug = 'staff-life';

-- ══════════════════════ 3. PALABRAS ══════════════════════
CREATE TEMP TABLE m37_de (word TEXT, translation TEXT, example TEXT, hint TEXT, category TEXT, ord INT) ON COMMIT DROP;
INSERT INTO m37_de VALUES
  ('der Abwäscher', 'el friegaplatos (persona)', 'Ich suche eine Stelle als Abwäscher.', 'der AP-ve-sha', 'work', 1),
  ('die Küche', 'la cocina', 'Ich putze die Küche.', 'di KÜ-je', 'work', 2),
  ('das Geschirr', 'la vajilla', 'Ich spüle das Geschirr.', 'das ge-SHIR', 'work', 3),
  ('spülen', 'fregar', 'Ich spüle jeden Tag.', 'SHPÜ-len', 'work', 4),
  ('putzen', 'limpiar', 'Ich putze den Boden.', 'PU-tsen', 'work', 5),
  ('der Teller', 'el plato', 'Die Teller sind sauber.', 'der TE-la', 'work', 6),
  ('das Glas', 'el vaso', 'Das Glas ist kaputt.', 'das glas', 'work', 7),
  ('die Gläser', 'los vasos', 'Wo sind die Gläser?', 'di GLE-sa', 'work', 8),
  ('das Besteck', 'los cubiertos', 'Das Besteck ist in der Spülmaschine.', 'das be-SHTEK', 'work', 9),
  ('der Topf', 'la olla', 'Der Topf ist heiß.', 'der topf', 'work', 10),
  ('die Töpfe', 'las ollas', 'Ich spüle die Töpfe.', 'di TÖP-fe', 'work', 11),
  ('die Pfanne', 'la sartén', 'Die Pfanne ist schmutzig.', 'di PFA-ne', 'work', 12),
  ('die Spülmaschine', 'el lavavajillas (máquina)', 'Die Spülmaschine ist voll.', 'di SHPÜL-ma-shi-ne', 'work', 13),
  ('das Spülmittel', 'el lavavajillas (líquido)', 'Wo ist das Spülmittel?', 'das SHPÜL-mi-tel', 'work', 14),
  ('der Boden', 'el suelo', 'Der Boden ist nass.', 'der BO-den', 'work', 15),
  ('sauber', 'limpio', 'Die Küche ist sauber.', 'SAU-ba', 'work', 16),
  ('schmutzig', 'sucio', 'Die Teller sind schmutzig.', 'SHMU-tsij', 'work', 17),
  ('heiß', 'caliente', 'Vorsicht, das ist heiß!', 'hais', 'work', 18),
  ('nass', 'mojado', 'Der Boden ist nass.', 'nas', 'work', 19),
  ('der Küchenchef', 'el jefe de cocina', 'Der Küchenchef ist nett.', 'der KÜ-jen-shef', 'work', 20),
  ('der Koch', 'el cocinero', 'Der Koch braucht die Pfanne.', 'der koj', 'work', 21),
  ('die Küchenhilfe', 'el ayudante de cocina', 'Ich arbeite als Küchenhilfe.', 'di KÜ-jen-hil-fe', 'work', 22),
  ('die Schicht', 'el turno', 'Meine Schicht beginnt um acht.', 'di shijt', 'work', 23),
  ('der Dienst', 'el turno de trabajo', 'Wann beginnt mein Dienst?', 'der dinst', 'work', 24),
  ('der Dienstplan', 'el cuadrante', 'Der Dienstplan ist in der Küche.', 'der DINST-plan', 'work', 25),
  ('die Pause', 'la pausa', 'Wann habe ich Pause?', 'di PAU-se', 'work', 26),
  ('frei', 'libre, gratis', 'Ich habe morgen frei.', 'frai', 'work', 27),
  ('Vorsicht!', '¡Cuidado!', 'Vorsicht, der Boden ist nass!', 'FOR-sijt', 'chunk', 28),
  ('die Unterkunft', 'el alojamiento', 'Die Unterkunft ist im Hotel.', 'di UN-ter-kunft', 'work', 29),
  ('die Verpflegung', 'las comidas (del personal)', 'Unterkunft und Verpflegung sind frei.', 'di fer-PFLE-gung', 'work', 30),
  ('das Zimmer', 'la habitación', 'Gibt es ein Zimmer für Mitarbeiter?', 'das TSI-ma', 'work', 31),
  ('das Personalhaus', 'la casa del personal', 'Mein Zimmer ist im Personalhaus.', 'das per-so-NAL-haus', 'work', 32),
  ('das Gehalt', 'el sueldo', 'Wie hoch ist das Gehalt?', 'das ge-HALT', 'work', 33),
  ('der Lohn', 'el sueldo', 'Der Lohn kommt am Monatsende.', 'der lon', 'work', 34),
  ('netto', 'neto', 'Zweitausend Euro netto im Monat.', 'NE-to', 'work', 35),
  ('brutto', 'bruto', 'Das Gehalt ist brutto.', 'BRU-to', 'work', 36),
  ('die Überstunden', 'las horas extra', 'Überstunden werden bezahlt.', 'di Ü-ber-shtun-den', 'work', 37),
  ('das Trinkgeld', 'las propinas', 'Das Trinkgeld teilen wir.', 'das TRINK-guelt', 'work', 38),
  ('der Vertrag', 'el contrato', 'Bekomme ich den Vertrag vor der Reise?', 'der fer-TRAK', 'work', 39),
  ('die Probezeit', 'el periodo de prueba', 'Die Probezeit ist ein Monat.', 'di PRO-be-tsait', 'work', 40),
  ('die Saison', 'la temporada', 'Die Saison beginnt im Dezember.', 'di se-SON', 'work', 41),
  ('die Stelle', 'el puesto', 'Die Stelle ist noch frei.', 'di SHTE-le', 'work', 42),
  ('der Mitarbeiter', 'el empleado', 'Das Zimmer ist für Mitarbeiter.', 'der MIT-ar-bai-ta', 'work', 43),
  ('der Führerschein', 'el carné de conducir', 'Ich habe einen Führerschein.', 'der FÜ-rer-shain', 'work', 44),
  ('die Erfahrung', 'la experiencia', 'Ich habe fünf Jahre Erfahrung.', 'di er-FA-rung', 'work', 45),
  ('Grüß Gott', 'buenos días (Austria)', 'Grüß Gott, Herr Gleirscher.', 'grüs got', 'chunk', 46),
  ('Servus', 'hola, adiós (informal, Austria)', 'Servus, ich bin Lukas.', 'SER-vus', 'chunk', 47),
  ('Guten Tag', 'buenos días', 'Guten Tag, Herr Herbas.', 'GU-ten tak', 'chunk', 48),
  ('Auf Wiedersehen', 'adiós', 'Danke und auf Wiedersehen.', 'auf VI-da-se-en', 'chunk', 49),
  ('bitte', 'por favor', 'Bitte langsam.', 'BI-te', 'chunk', 50),
  ('danke', 'gracias', 'Danke für das Gespräch.', 'DAN-ke', 'chunk', 51),
  ('Vielen Dank', 'muchas gracias', 'Vielen Dank für das Gespräch.', 'FI-len dank', 'chunk', 52),
  ('Entschuldigung', 'perdón', 'Entschuldigung, wo ist die Küche?', 'ent-SHUL-di-gung', 'chunk', 53),
  ('Kein Problem', 'sin problema', 'Ja, kein Problem.', 'kain pro-BLEM', 'chunk', 54),
  ('Ich verstehe', 'entiendo', 'Ah, jetzt verstehe ich.', 'ij fer-SHTE-e', 'chunk', 55),
  ('Ich weiß nicht', 'no lo sé', 'Das weiß ich nicht.', 'ij vais nijt', 'chunk', 56),
  ('sofort', 'enseguida', 'Ich kann sofort anfangen.', 'so-FORT', 'general', 57),
  ('anfangen', 'empezar', 'Wann kann ich anfangen?', 'AN-fan-guen', 'general', 58),
  ('arbeiten', 'trabajar', 'Ich arbeite gern.', 'AR-bai-ten', 'general', 59),
  ('lernen', 'aprender', 'Ich lerne Deutsch.', 'LER-nen', 'general', 60),
  ('verstehen', 'entender', 'Ich verstehe das nicht.', 'fer-SHTE-en', 'general', 61),
  ('sprechen', 'hablar', 'Ich spreche Spanisch.', 'SHPRE-jen', 'general', 62),
  ('bleiben', 'quedarse', 'Ich bleibe die ganze Saison.', 'BLAI-ben', 'general', 63),
  ('kommen', 'venir', 'Ich komme aus Spanien.', 'KO-men', 'general', 64),
  ('fahren', 'ir (en vehículo)', 'Ich fahre nach Innsbruck.', 'FA-ren', 'general', 65),
  ('heute', 'hoy', 'Heute arbeite ich.', 'HOI-te', 'general', 66),
  ('morgen', 'mañana', 'Ich habe morgen frei.', 'MOR-guen', 'general', 67),
  ('jetzt', 'ahora', 'Was soll ich jetzt machen?', 'yetst', 'general', 68),
  ('die Woche', 'la semana', 'Ich arbeite fünf Tage pro Woche.', 'di VO-je', 'general', 69),
  ('der Monat', 'el mes', 'Was kostet das Zimmer im Monat?', 'der MO-nat', 'general', 70),
  ('das Jahr', 'el año', 'Ich bin dreiundzwanzig Jahre alt.', 'das yar', 'general', 71),
  ('das Wochenende', 'el fin de semana', 'Ich arbeite am Wochenende.', 'das VO-jen-en-de', 'general', 72),
  ('die Stunde', 'la hora', 'Eine halbe Stunde Pause.', 'di SHTUN-de', 'general', 73),
  ('wann', 'cuándo', 'Wann beginnt mein Dienst?', 'van', 'general', 74),
  ('wo', 'dónde', 'Wo ist die Küche?', 'vo', 'general', 75),
  ('was', 'qué', 'Was soll ich machen?', 'vas', 'general', 76),
  ('wie viel', 'cuánto', 'Wie viel kostet das?', 'vi fil', 'general', 77),
  ('warum', 'por qué', 'Warum möchten Sie bei uns arbeiten?', 'va-RUM', 'general', 78),
  ('und', 'y', 'Ich spüle und putze.', 'unt', 'general', 79),
  ('aber', 'pero', 'Ich lerne Deutsch, aber ich bin Anfänger.', 'A-ba', 'general', 80),
  ('ein', 'uno', 'Ein Zimmer, bitte.', 'ain', 'general', 81),
  ('zwei', 'dos', 'Zwei Restaurants.', 'tsvai', 'general', 82),
  ('drei', 'tres', 'Drei Tage.', 'drai', 'general', 83),
  ('vier', 'cuatro', 'Vier Teller.', 'fir', 'general', 84),
  ('fünf', 'cinco', 'Fünf Jahre.', 'fünf', 'general', 85),
  ('sechs', 'seis', 'Sechs Tage pro Woche.', 'seks', 'general', 86),
  ('sieben', 'siete', 'Um sieben Uhr.', 'SI-ben', 'general', 87),
  ('acht', 'ocho', 'Um acht Uhr.', 'ajt', 'general', 88),
  ('neun', 'nueve', 'Um neun Uhr.', 'noin', 'general', 89),
  ('zehn', 'diez', 'Um zehn Uhr.', 'tsen', 'general', 90);
INSERT INTO words (word, translation, example_sentence, level, category, audio_hint, lang)
SELECT v.word, v.translation, v.example, 'A2', v.category, v.hint, 'de'
FROM m37_de v
WHERE NOT EXISTS (SELECT 1 FROM words w WHERE w.lang = 'de' AND lower(w.word) = lower(v.word))
ORDER BY v.ord;

INSERT INTO user_words (profile_id, word_id, next_review_date)
SELECT 1, w.id, DATE '2026-11-03'
FROM words w JOIN m37_de v ON lower(v.word) = lower(w.word)
WHERE w.lang = 'de'
  AND NOT EXISTS (SELECT 1 FROM user_words uw WHERE uw.profile_id = 1 AND uw.word_id = w.id)
ORDER BY v.ord;

CREATE TEMP TABLE m37_en (word TEXT, translation TEXT, example TEXT, ord INT) ON COMMIT DROP;
INSERT INTO m37_en VALUES
  ('dishwasher', 'friegaplatos; lavavajillas', 'I''m applying for the dishwasher job.', 1),
  ('kitchen assistant', 'ayudante de cocina', 'I work as a kitchen assistant.', 2),
  ('washing-up liquid', 'líquido de fregar', 'We need more washing-up liquid.', 3),
  ('sink', 'fregadero', 'The pots are in the sink.', 4),
  ('pot', 'olla', 'Wash the big pots first.', 5),
  ('pan', 'sartén', 'This pan is very hot.', 6),
  ('tray', 'bandeja', 'Put the glasses on the tray.', 7),
  ('cutlery', 'cubiertos', 'The cutlery is clean.', 8),
  ('rubbish bin', 'cubo de basura', 'The rubbish bin is full.', 9),
  ('mop', 'fregona; fregar el suelo', 'Please mop the floor.', 10),
  ('wet floor', 'suelo mojado', 'Careful, wet floor.', 11),
  ('towel', 'toalla', 'Would you like clean towels?', 12),
  ('sheet', 'sábana', 'I change the sheets every day.', 13),
  ('pillow', 'almohada', 'There are two pillows on the bed.', 14),
  ('housekeeping', 'limpieza de habitaciones', 'I work in housekeeping.', 15),
  ('guest', 'huésped', 'The guest has left the room.', 16),
  ('shift', 'turno', 'My shift starts at seven.', 17),
  ('night shift', 'turno de noche', 'Can you work the night shift?', 18),
  ('rota', 'cuadrante de turnos', 'The rota is on the wall.', 19),
  ('day off', 'día libre', 'Tuesday is my day off.', 20),
  ('break', 'descanso', 'I have a thirty-minute break.', 21),
  ('overtime', 'horas extra', 'Is overtime paid?', 22),
  ('wage', 'sueldo por horas', 'The wage is paid every month.', 23),
  ('salary', 'sueldo', 'How much is the salary after tax?', 24),
  ('after tax', 'neto, después de impuestos', 'It''s 2,000 euros after tax.', 25),
  ('contract', 'contrato', 'Can you send me the contract?', 26),
  ('accommodation', 'alojamiento', 'Is accommodation included?', 27),
  ('staff room', 'sala de personal', 'Lunch is in the staff room.', 28),
  ('staff meal', 'comida del personal', 'There is a staff meal at noon.', 29),
  ('colleague', 'compañero de trabajo', 'My colleague is from Poland.', 30),
  ('supervisor', 'encargado', 'Ask your supervisor.', 31),
  ('team leader', 'jefe de equipo', 'The team leader explains the rules.', 32),
  ('factory', 'fábrica', 'I work in a fish factory.', 33),
  ('production line', 'línea de producción', 'The production line has stopped.', 34),
  ('gloves', 'guantes', 'Always wear gloves here.', 35),
  ('boots', 'botas', 'You need rubber boots.', 36),
  ('hairnet', 'redecilla para el pelo', 'Put on your hairnet before you go in.', 37),
  ('safety', 'seguridad', 'Safety comes first.', 38),
  ('cold store', 'cámara frigorífica', 'The boxes are in the cold store.', 39),
  ('to pack', 'empaquetar', 'I pack the fish in boxes.', 40),
  ('to lift', 'levantar', 'Don''t lift that alone.', 41),
  ('to apply for', 'solicitar (un puesto)', 'I''m applying for this job.', 42),
  ('to start', 'empezar', 'When can you start?', 43),
  ('to hurt', 'hacer(se) daño', 'I''ve hurt my hand.', 44),
  ('experience', 'experiencia', 'I have five years of experience in restaurants.', 45),
  ('reference', 'referencia', 'I can give you a reference.', 46),
  ('available', 'disponible', 'I''m available immediately.', 47),
  ('flexible', 'flexible', 'I''m flexible with my hours.', 48),
  ('reliable', 'de confianza, cumplidor', 'I''m reliable and I learn fast.', 49),
  ('to learn fast', 'aprender rápido', 'I don''t know it yet, but I learn fast.', 50);
INSERT INTO words (word, translation, example_sentence, level, category, lang)
SELECT v.word, v.translation, v.example, 'B1', 'work', 'en'
FROM m37_en v
WHERE NOT EXISTS (SELECT 1 FROM words w WHERE w.lang = 'en' AND lower(w.word) = lower(v.word))
ORDER BY v.ord;

-- Las primeras entre las nuevas: la cola va por fecha.
INSERT INTO user_words (profile_id, word_id, next_review_date)
SELECT 1, w.id, DATE '2026-01-01'
FROM words w JOIN m37_en v ON lower(v.word) = lower(w.word)
WHERE w.lang = 'en'
  AND NOT EXISTS (SELECT 1 FROM user_words uw WHERE uw.profile_id = 1 AND uw.word_id = w.id)
ORDER BY v.ord;

-- ══════════════════════ 4. GRAMÁTICA ══════════════════════
INSERT INTO grammar_topics (title, level, description, order_index, content_html, lang)
SELECT 'Sie y du: cuándo usar cada uno', 'A2', 'Con el jefe, Sie; con los compañeros, du.', 1, '<p><strong>Sie</strong> es «usted» y va siempre con mayúscula: <em>Können <strong>Sie</strong> anfangen?</em> <strong>du</strong> es «tú»: <em>Woher kommst <strong>du</strong>?</em></p><p>En la entrevista, <strong>Sie</strong>. En la cocina, los compañeros te tutearán enseguida; si el jefe te tutea, tutéale tú también.</p><p><strong>Trampa del hispanohablante:</strong> si dudas, usa Sie. Pasarse de educado no molesta a nadie.</p><p><strong>Practica:</strong> pregunta «¿De dónde eres?» a un compañero y «¿De dónde es usted?» al jefe.</p>', 'de'
WHERE NOT EXISTS (SELECT 1 FROM grammar_topics g WHERE g.lang = 'de' AND g.title = 'Sie y du: cuándo usar cada uno');
INSERT INTO grammar_topics (title, level, description, order_index, content_html, lang)
SELECT 'El verbo va en segundo lugar', 'A2', 'La regla que ordena casi todas las frases.', 2, '<p>En una frase normal, el verbo va <strong>en la segunda posición</strong>, aunque la frase empiece por otra cosa:</p><ul><li><em>Ich <strong>arbeite</strong> heute.</em></li><li><em>Heute <strong>arbeite</strong> ich.</em></li><li><em>Seit fünf Jahren <strong>arbeite</strong> ich in Restaurants.</em></li></ul><p><strong>Trampa del hispanohablante:</strong> «Heute ich arbeite» está mal. Si pones algo delante, el verbo va justo después.</p><p><strong>Practica:</strong> ordena: <em>morgen / ich / arbeite</em>.</p>', 'de'
WHERE NOT EXISTS (SELECT 1 FROM grammar_topics g WHERE g.lang = 'de' AND g.title = 'El verbo va en segundo lugar');
INSERT INTO grammar_topics (title, level, description, order_index, content_html, lang)
SELECT 'Ich kann, ich möchte, ich soll', 'A2', 'Con estos tres verbos dices casi todo.', 3, '<p><strong>ich kann</strong> = puedo. <strong>ich möchte</strong> = quisiera. <strong>soll ich…?</strong> = ¿debo…?, ¿hago…?</p><p>El segundo verbo se queda sin conjugar y va <strong>al final</strong>:</p><ul><li><em>Ich <strong>kann</strong> sofort <strong>anfangen</strong>.</em></li><li><em>Ich <strong>möchte</strong> Deutsch <strong>lernen</strong>.</em></li><li><em><strong>Soll</strong> ich den Boden <strong>putzen</strong>?</em></li></ul><p><strong>Practica:</strong> di «Puedo trabajar el fin de semana» y «¿Limpio la cocina?».</p>', 'de'
WHERE NOT EXISTS (SELECT 1 FROM grammar_topics g WHERE g.lang = 'de' AND g.title = 'Ich kann, ich möchte, ich soll');
INSERT INTO grammar_topics (title, level, description, order_index, content_html, lang)
SELECT 'der, die, das', 'A2', 'Cada palabra lleva su artículo. Apréndelos juntos.', 4, '<p>El alemán tiene tres artículos: <strong>der</strong> (masculino), <strong>die</strong> (femenino) y <strong>das</strong> (neutro). En plural siempre es <strong>die</strong>.</p><ul><li><em>der Teller, die Küche, das Zimmer</em></li><li><em>die Teller</em> (los platos)</li></ul><p><strong>Trampa del hispanohablante:</strong> no van como en español: «der Tisch» es masculino pero «das Mädchen» es neutro. Aprende cada palabra con su artículo.</p><p>Cuando la palabra es lo que recibe la acción, <em>der</em> cambia a <strong>den</strong>: <em>Der Boden ist nass</em>, pero <em>Ich putze <strong>den</strong> Boden.</em></p><p><strong>Practica:</strong> di el artículo de Küche, Zimmer y Teller.</p>', 'de'
WHERE NOT EXISTS (SELECT 1 FROM grammar_topics g WHERE g.lang = 'de' AND g.title = 'der, die, das');
INSERT INTO grammar_topics (title, level, description, order_index, content_html, lang)
SELECT 'Preguntar: wo, wann, was', 'A2', 'Las preguntas empiezan por la palabra interrogativa y luego el verbo.', 5, '<p>Con palabra interrogativa, el verbo va justo después:</p><ul><li><em><strong>Wo</strong> ist die Küche?</em> — ¿Dónde?</li><li><em><strong>Wann</strong> beginnt mein Dienst?</em> — ¿Cuándo?</li><li><em><strong>Was</strong> soll ich machen?</em> — ¿Qué?</li></ul><p>Sin palabra interrogativa, el verbo va <strong>el primero</strong>: <em><strong>Ist</strong> das Essen inklusive?</em></p><p><strong>Trampa del hispanohablante:</strong> <em>wer</em> es «quién», no «dónde», y <em>wo</em> es «dónde».</p><p><strong>Practica:</strong> pregunta dónde está el cuadrante y cuándo tienes la pausa.</p>', 'de'
WHERE NOT EXISTS (SELECT 1 FROM grammar_topics g WHERE g.lang = 'de' AND g.title = 'Preguntar: wo, wann, was');

-- ══════════════════════ 5. EL PLAN NUEVO ══════════════════════
UPDATE profiles SET track_id = (SELECT id FROM tracks WHERE slug = 'trabajo-fuera') WHERE id = 1;
INSERT INTO config (key, value) VALUES ('idioma_activo', 'en')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

COMMIT;
