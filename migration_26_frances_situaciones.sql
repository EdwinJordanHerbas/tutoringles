-- TutorIngles · Migration 26 — CONTENIDO EN FRANCÉS: VIVIR Y TRABAJAR EN LA SUIZA ROMANDA
--
-- Para quién: Edwin se va en torno a un mes a un cantón francófono de Suiza (la
-- Romandía; el cantón aún no se sabe). Francés A2: entiende mucho y no consigue
-- decirlo. Meta final, el DALF C1. Viene de dependiente en una tienda de deporte,
-- así que hay dos situaciones de mostrador, pero la mayoría son de llegar e
-- instalarse: el equipo, la comuna, el piso, el médico, el tren.
--
-- Mismo molde que la migración 08 (el sector 'retail' en inglés):
--   · frases clave ('key')              → lo que tienes que saber DECIR (micrófono,
--                                          tandas de 4; también alimentan la sesión
--                                          de 5 minutos). Ocho por situación = dos
--                                          tandas exactas.
--   · un role-play ('customer'/'you')   → la conversación entera, turno a turno.
--
-- Nombres heredados del inglés, ojo:
--   · situations.title_en      → aquí lleva el título en FRANCÉS.
--   · situation_lines.en       → aquí lleva la frase en FRANCÉS.
--   · kind = 'customer'        → "la otra persona": jefa, compañero, funcionario,
--                                la régie, la farmacéutica… no sólo clientes.
--
-- Las notas avisan de lo que falla un hispanohablante: falsos amigos (location,
-- attendre, constipé, large…), el registro tu/vous, la pronunciación (u/ou,
-- nasales, consonantes finales mudas, e muda, ligaduras) y lo que en Suiza se
-- dice distinto que en Francia (septante, nonante, natel, quittance, dîner…).
--
-- Tipografía: antes de ? ! : ; va un espacio de no separación (U+00A0), como
-- manda la norma francesa. Así el signo nunca se queda solo en otra línea de la
-- burbuja del chat.
--
-- Aplicar (como postgres, las tablas son suyas):
--   docker exec -i postgres psql -U postgres -d tutoringles -v ON_ERROR_STOP=1 < migration_26_frances_situaciones.sql
--
-- Idempotente: reejecutable (refresca el sector y las situaciones y regenera las
-- líneas). No toca el sector inglés 'retail' ni el perfil.

BEGIN;

-- ══════════════════════ SECTOR ══════════════════════
INSERT INTO tracks (slug, name, icon, description, order_index, lang) VALUES
  ('suisse-romande', 'Vivir y trabajar en la Suiza romanda', 'work',
   'Llegar, instalarte y trabajar en francés en Suiza: el equipo, la comuna, el piso, la tienda y el día a día.',
   2, 'fr')
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon,
      order_index = EXCLUDED.order_index, lang = EXCLUDED.lang;

-- ══════════════════════ SITUACIONES ══════════════════════
-- Orden de "primera semana primero". El nivel sube de A2 a B2, con las de
-- mostrador y trámite sencillo en A2 aunque vayan más tarde.
INSERT INTO situations (track_id, slug, title_es, title_en, context_es, level, order_index)
SELECT t.id, v.slug, v.title_es, v.title_en, v.context_es, v.level, v.ord
FROM tracks t, (VALUES
  ('premier-jour', 'Presentarte el primer día',                    'Se présenter à l''équipe',
   'El primer día la encargada te presenta al equipo. Quién eres, de dónde vienes y qué sabes hacer, en tres frases y sin leerlas.', 'A2', 1),
  ('survie',       'No entiendo: que repitan y explicarte sin la palabra', 'Stratégies de survie : faire répéter, reformuler',
   'Tu hueco exacto: entiendes casi todo, pero cuando falta una palabra te callas. Aquí aprendes a pedir que repitan, a confirmar y a rodear la palabra que no sale.', 'A2', 2),
  ('commune',      'Anunciarte en la comuna',                      'S''annoncer au contrôle des habitants',
   'Al llegar tienes que anunciarte en tu comuna, normalmente en los 14 días siguientes: el "contrôle des habitants" (en Ginebra, la OCPM). De ahí sale tu permiso de residencia.', 'A2', 3),
  ('logement',     'Buscar piso: régie, visita y contrato',        'Chercher un appartement : régie, visite et bail',
   'En Lausana o Ginebra encontrar piso es difícil y en cada visita compites con otros candidatos. Llamar, visitar y entregar el dossier rápido marca la diferencia.', 'B1', 4),
  ('conseil',      'En la tienda: aconsejar al cliente',           'Conseiller un client au rayon running',
   'Lo que ya haces en Sprinter, en francés: preguntar, escuchar y recomendar. Número de calzado, amortiguación y el falso amigo "large".', 'B1', 5),
  ('caisse',       'En la caja: cobrar, Twint y cambios',          'À la caisse : encaisser, Twint et échanges',
   'Precios con septante y nonante, Twint, la "quittance" y los cambios de talla. Números claros y sin titubear: en caja no hay tiempo para pensar.', 'A2', 6),
  ('pause-cafe',   'La pausa del café con los compañeros',         'La pause café entre collègues',
   'Donde se hacen los amigos y donde más cuesta seguir: se habla rápido, de "tu" y con expresiones suizas. Reaccionar ya es participar.', 'B1', 7),
  ('telephone',    'Al teléfono: pedir cita y dejar un mensaje',   'Au téléphone : prendre rendez-vous, laisser un message',
   'Sin cara ni gestos. El mismo guion te sirve para el médico, el banco o la régie: pedir cita, cambiarla y dejar un mensaje en el contestador.', 'B1', 8),
  ('transports',   'En la estación: billetes, demi-tarif y retrasos', 'À la gare CFF : billets, demi-tarif et retards',
   'Los CFF (Chemins de fer fédéraux, los trenes suizos) son puntuales, pero hay cambios de vía y obras. Comprar el billete, preguntar y entender el aviso a tiempo.', 'A2', 9),
  ('sante',        'Salud: farmacia, médico y seguro',             'Santé : pharmacie, médecin et caisse maladie',
   'El seguro médico ("caisse maladie") es obligatorio y privado, y tiene franquicia: hasta esa cifra, pagas tú. Explicar qué te pasa y entender qué te cubren.', 'B1', 10),
  ('reunion',      'Reunión de equipo: opinar y matizar',          'Réunion d''équipe : donner son avis et nuancer',
   'Dar tu opinión, estar de acuerdo o no, y matizar sin sonar brusco. Aquí ya no basta con entender: te van a preguntar "Et toi, t''en penses quoi ?".', 'B2', 11),
  ('horaires',     'Horario, horas extra y vacaciones con el jefe', 'Horaires, heures sup et vacances : parler à son chef',
   'Pedir días, hablar de horas extra y plantear un problema sin quemar la relación. Aquí, de "vous": con un jefe que no te ha propuesto el "tu", y en una conversación delicada, es lo prudente.', 'B2', 12)
) AS v(slug, title_es, title_en, context_es, level, ord)
WHERE t.slug = 'suisse-romande'
ON CONFLICT (track_id, slug) DO UPDATE
  SET title_es = EXCLUDED.title_es, title_en = EXCLUDED.title_en,
      context_es = EXCLUDED.context_es, level = EXCLUDED.level,
      order_index = EXCLUDED.order_index;

-- Regenerar las líneas (permite reejecutar la migración con contenido corregido)
DELETE FROM situation_lines
 WHERE situation_id IN (
   SELECT s.id FROM situations s JOIN tracks t ON t.id = s.track_id WHERE t.slug = 'suisse-romande'
 );

-- ══════════════════════ LÍNEAS ══════════════════════
-- Las 'key' van 1..8. El role-play va 1..8 en una sola serie que alterna
-- 'customer' y 'you' (la app lo ordena por order_index, igual que en la 08).
INSERT INTO situation_lines (situation_id, kind, en, es, note, order_index)
SELECT s.id, v.kind, v.en, v.es, v.note, v.ord
FROM situations s
JOIN tracks t ON t.id = s.track_id AND t.slug = 'suisse-romande'
JOIN (VALUES

-- ── 1. PRIMER DÍA ───────────────────────────────────────
('premier-jour','key','Bonjour à tous, je m''appelle Edwin, je suis le nouveau vendeur.','Hola a todos, me llamo Edwin, soy el nuevo vendedor.','"Bonjour" SIEMPRE al llegar, y a todos. En Suiza no saludar al entrar se nota muchísimo.',1),
('premier-jour','key','Je viens d''Espagne et je suis arrivé il y a une semaine.','Vengo de España y llegué hace una semana.','"Il y a" + tiempo = hace. Y "arriver" va con ÊTRE: "je suis arrivé", nunca "j''ai arrivé".',2),
('premier-jour','key','J''ai déjà travaillé dans un magasin de sport en Espagne.','Ya he trabajado en una tienda de deporte en España.','"Magasin" = tienda. El almacén de la tienda es "la réserve".',3),
('premier-jour','key','Je suis très content d''être ici.','Estoy muy contento de estar aquí.','OJO: "je suis excité" suena a excitación física. Para "emocionado", di "content" o "motivé".',4),
('premier-jour','key','Mon français n''est pas encore parfait, alors n''hésitez pas à me corriger.','Mi francés todavía no es perfecto, así que no dudéis en corregirme.','La frase que te compra paciencia. Y te corrigen gratis.',5),
('premier-jour','key','On peut se tutoyer ?','¿Nos podemos tutear?','Entre compañeros se tutea casi siempre en Suiza. Con la jefa, espera a que te lo proponga ella.',6),
('premier-jour','key','Où est-ce que je peux poser mes affaires ?','¿Dónde puedo dejar mis cosas?','"Mes affaires" se liga: suena "me-za-fèr", y la s final no suena.',7),
('premier-jour','key','Si j''ai une question, je m''adresse à qui ?','Si tengo alguna pregunta, ¿a quién me dirijo?','"S''adresser à" = dirigirse a. Te sirve en cualquier oficina.',8),
('premier-jour','customer','Bonjour Edwin, bienvenue ! Je suis Nathalie, la gérante du magasin.','Hola, Edwin, ¡bienvenido! Soy Nathalie, la encargada de la tienda.','"Le gérant / la gérante" = el encargado / la encargada.',1),
('premier-jour','you','Enchanté, et merci. Je suis très content d''être ici.','Encantado, y gracias. Estoy muy contento de estar aquí.','"Enchanté" lo dices tú; ella diría "enchantée" (suena igual). Primer día, apretón de manos: los besos (en Suiza son tres) llegan con la confianza.',2),
('premier-jour','customer','Alors, vous avez fait bon voyage ? Vous êtes bien installé ?','Bueno, ¿qué tal el viaje? ¿Ya se ha instalado bien?',NULL,3),
('premier-jour','you','Oui, merci. Je suis arrivé il y a une semaine, je commence à m''habituer.','Sí, gracias. Llegué hace una semana, me estoy empezando a acostumbrar.','"S''habituer À": je m''habitue à la Suisse.',4),
('premier-jour','customer','Très bien. Ici, tout le monde se tutoie, moi aussi. Ça vous va ?','Muy bien. Aquí todo el mundo se tutea, yo también. ¿Le parece bien?','Muy suizo: es la jefa quien propone el "tu".',5),
('premier-jour','you','Avec plaisir. Alors, qu''est-ce que je fais en premier ?','Con mucho gusto. Entonces, ¿qué hago primero?','En cuanto te lo proponen, pasa al "tu" sin miedo: seguir con "vous" suena distante.',6),
('premier-jour','customer','Aujourd''hui, tu observes. Tu restes avec Luca, à la caisse et au rayon running.','Hoy observas. Te quedas con Luca, en la caja y en la sección de running.','"Rester" = quedarse, NO restar. "Le rayon" = la sección de la tienda.',7),
('premier-jour','you','Parfait. Et si j''ai une question, je m''adresse à Luca ou à toi ?','Perfecto. Y si tengo alguna pregunta, ¿me dirijo a Luca o a ti?','Ya tuteas: "à toi". "Toi" suena "tuá".',8),

-- ── 2. NO ENTIENDO: ESTRATEGIAS DE SUPERVIVENCIA ────────
('survie','key','Pardon, je n''ai pas bien compris.','Perdón, no lo he entendido bien.','Mucho mejor que "Quoi ?", que suena brusco. "Comment ?" también vale.',1),
('survie','key','Vous pouvez répéter plus lentement, s''il vous plaît ?','¿Puede repetirlo más despacio, por favor?','Con un compañero: "Tu peux répéter ?". En "lentement" la e del medio no suena, y ni la n ni la t finales.',2),
('survie','key','Qu''est-ce que ça veut dire, ce mot ?','¿Qué significa esta palabra?','"Vouloir dire" = significar. Se usa mucho más que "signifier".',3),
('survie','key','Comment on dit ça en français ?','¿Cómo se dice esto en francés?','Señalando algo. Pregunta, apunta y úsalo esa misma tarde.',4),
('survie','key','Je ne trouve pas le mot : c''est comme une cuillère, mais pour mettre les chaussures.','No me sale la palabra: es como una cuchara, pero para ponerse los zapatos.','Describir por comparación, "c''est comme…, mais…", y nunca te quedas mudo. (Era "un chausse-pied", el calzador.)',5),
('survie','key','Si je comprends bien, vous voulez dire que je dois revenir demain ?','Si lo entiendo bien, ¿quiere decir que tengo que volver mañana?','Repetirlo con tus palabras demuestra que has entendido y evita errores. Lo agradecen.',6),
('survie','key','Vous pouvez me l''écrire, s''il vous plaît ?','¿Me lo puede escribir, por favor?','Para nombres, direcciones y cifras. Nadie se ofende.',7),
('survie','key','Attendez, je cherche mes mots.','Espere, que busco las palabras.','OJO: "attendre" = ESPERAR, no atender (eso es "s''occuper de" o "servir"). Ganas tiempo sin cortar la conversación.',8),
('survie','customer','Edwin, tu peux aller chercher les cartons à la réserve et faire l''étiquetage avant l''ouverture ?','Edwin, ¿puedes ir a por las cajas al almacén y etiquetar antes de abrir?','"Le carton" = caja de cartón. "La caisse" es la caja registradora.',1),
('survie','you','Pardon, je n''ai pas tout compris. Tu peux répéter plus lentement ?','Perdona, no lo he entendido todo. ¿Puedes repetir más despacio?','Con un compañero, "tu peux…". Nada de "vous".',2),
('survie','customer','Pas de souci. Les cartons, à la réserve. Et tu mets les étiquettes avec les prix.','No te preocupes. Las cajas, en el almacén. Y pones las etiquetas con los precios.','"Pas de souci" = no pasa nada. Lo oirás veinte veces al día.',3),
('survie','you','D''accord. Et pour les étiquettes, j''utilise le… le truc pour mettre les prix ?','Vale. Y para las etiquetas, ¿uso el… el chisme para poner los precios?','"Un truc" = una cosa, un chisme. Tu comodín cuando no sale la palabra: "le truc pour…".',4),
('survie','customer','L''étiqueteuse, oui. Elle est dans le tiroir, sous la caisse.','La etiquetadora, sí. Está en el cajón, debajo de la caja.','Te acaba de regalar la palabra: "étiqueteuse". Repítela en voz alta.',5),
('survie','you','L''étiqueteuse, merci. Si je comprends bien, je dois finir avant neuf heures ?','La etiquetadora, gracias. Si lo entiendo bien, ¿tengo que acabar antes de las nueve?','Repetir la palabra nueva la fija. "Neuf heures": la f suena v, "neu-veur".',6),
('survie','customer','Exactement, on ouvre à neuf heures. Ça joue ?','Exacto, abrimos a las nueve. ¿Te va bien?','"Ça joue ?" es MUY suizo: ¿vale?, ¿funciona?, ¿te va bien? Se contesta "Ça joue !".',7),
('survie','you','Ça joue, merci Luca !','¡Vale, gracias, Luca!','Contestar con la misma expresión suiza cae muy bien.',8),

-- ── 3. ANUNCIARSE EN LA COMUNA ──────────────────────────
('commune','key','Bonjour, je viens m''annoncer : je viens d''arriver en Suisse.','Buenos días, vengo a darme de alta: acabo de llegar a Suiza.','"S''annoncer" es el verbo suizo para registrarte. "Venir de" + infinitivo = acabar de.',1),
('commune','key','J''ai un contrat de travail à durée indéterminée.','Tengo un contrato de trabajo indefinido.','También se dice "un CDI". Con un contrato así, a un ciudadano de la UE le suele corresponder el permiso B.',2),
('commune','key','Voici mon passeport, mon contrat et mon bail.','Aquí tiene mi pasaporte, mi contrato y mi contrato de alquiler.','"Le bail" (suena "bai") = contrato de alquiler. Nada que ver con bailar.',3),
('commune','key','Il me manque un document ?','¿Me falta algún documento?','Empieza por "il": "il me manque…", nunca "me manque un document".',4),
('commune','key','Pour l''instant, j''habite chez un ami.','De momento vivo en casa de un amigo.','"Chez" + persona = en casa de. Si te aloja alguien, suelen pedirte un papel firmado por él.',5),
('commune','key','Combien de temps faut-il pour recevoir le permis ?','¿Cuánto se tarda en recibir el permiso?','Depende del cantón y de la época: pregúntalo siempre, y guarda el justificante que te den.',6),
('commune','key','Est-ce que je peux avoir une attestation de domicile ?','¿Me pueden dar un certificado de residencia?','Te la pueden pedir en el banco y en otros trámites. Puede tener un pequeño coste.',7),
('commune','key','Est-ce que je dois faire autre chose après ?','¿Tengo que hacer algo más después?','Pregunta clave. Por ejemplo: el seguro médico es obligatorio y tienes tres meses para contratarlo.',8),
('commune','customer','Bonjour Monsieur, c''est pour quoi ?','Buenos días, señor, ¿qué desea?','Así abren muchas ventanillas: "c''est pour quoi ?". No es borde, es directo.',1),
('commune','you','Bonjour. Je viens d''arriver en Suisse et je viens m''annoncer.','Buenos días. Acabo de llegar a Suiza y vengo a darme de alta.','"Je viens d''arriver" (acabo de) y "je viens m''annoncer" (vengo a): el mismo verbo, dos sentidos.',2),
('commune','customer','Très bien. Vous êtes de quelle nationalité ? Vous avez un contrat de travail ?','Muy bien. ¿De qué nacionalidad es? ¿Tiene contrato de trabajo?',NULL,3),
('commune','you','Je suis espagnol. Oui, voici mon passeport, mon contrat et mon bail.','Soy español. Sí, aquí tiene mi pasaporte, mi contrato y mi contrato de alquiler.','Nacionalidad en minúscula: "je suis espagnol". La "gn" suena como la ñ.',4),
('commune','customer','Merci. En principe, avec ce contrat, ce sera un permis B. Il faut aussi remplir ce formulaire.','Gracias. En principio, con este contrato, será un permiso B. También hay que rellenar este formulario.','"Remplir" = rellenar. "Il faut" = hay que.',5),
('commune','you','D''accord. Pardon, je ne comprends pas cette case. Vous pouvez m''expliquer ?','Vale. Perdone, no entiendo esta casilla. ¿Me lo puede explicar?','"Une case" = una casilla. La casa es "la maison".',6),
('commune','customer','Ici, c''est votre ancienne adresse, en Espagne. Et n''oubliez pas la caisse maladie : vous avez trois mois.','Aquí va su dirección anterior, en España. Y no olvide el seguro médico: tiene tres meses.','"Ancien" DELANTE = anterior ("mon ancienne adresse"). Detrás = antiguo, viejo ("une maison ancienne").',7),
('commune','you','Merci beaucoup pour votre aide. Bonne journée !','Muchas gracias por su ayuda. ¡Que tenga buen día!','"Bonne journée" al irte, siempre. Te contestarán "Merci, pareillement" (igualmente).',8),

-- ── 4. BUSCAR PISO ──────────────────────────────────────
('logement','key','Bonjour, je vous appelle au sujet de l''annonce pour le trois-pièces.','Buenos días, le llamo por el anuncio del piso de tres piezas.','En Suiza cuentan el salón y no la cocina ni el baño: un "3 pièces" es salón + 2 dormitorios. Verás también "3,5 pièces".',1),
('logement','key','Est-ce qu''il est toujours disponible ?','¿Sigue disponible?','"Toujours" aquí = todavía, no "siempre".',2),
('logement','key','Le loyer, c''est charges comprises ?','¿El alquiler es con gastos incluidos?','"Le loyer" = lo que pagas al mes. FALSO AMIGO: "la location" = el alquiler (la acción), no una localización.',3),
('logement','key','Quand est-ce que je pourrais le visiter ?','¿Cuándo podría visitarlo?','El condicional ("pourrais") suaviza. "Visiter" es para pisos y museos; a una persona se le "rend visite".',4),
('logement','key','Quels documents faut-il pour le dossier ?','¿Qué documentos hacen falta para la solicitud?','Casi siempre piden el permiso, las nóminas y el "extrait des poursuites" (certificado de que no tienes deudas).',5),
('logement','key','La garantie de loyer, c''est combien de mois ?','¿La fianza son cuántos meses?','La ley suiza pone un máximo de tres meses de alquiler, depositados en una cuenta bloqueada a tu nombre.',6),
('logement','key','On fait l''état des lieux quand ?','¿Cuándo hacemos la revisión del piso?','"L''état des lieux" = la revisión al entrar y al salir. Apunta TODO desperfecto: lo que no esté escrito, lo pagas al irte.',7),
('logement','key','Il y a une buanderie dans l''immeuble ?','¿Hay lavandería en el edificio?','Muy suizo: la lavadora suele ser común, en el sótano, con turnos ("le tournus"). Respétalo: es sagrado.',8),
('logement','customer','Bonjour, vous venez pour la visite du trois-pièces ?','Buenos días, ¿viene a ver el piso de tres piezas?',NULL,1),
('logement','you','Oui, bonjour. Je suis Edwin, c''est moi qui vous ai appelée hier.','Sí, buenos días. Soy Edwin, fui yo quien la llamó ayer.','"Appelée" con -e porque llamaste a una mujer. Se escribe, pero no se oye.',2),
('logement','customer','Ah oui. Alors, voilà le séjour. La cuisine est agencée, et les deux chambres sont au fond.','Ah, sí. Pues aquí está el salón. La cocina está equipada y los dos dormitorios están al fondo.','"Cuisine agencée" = cocina amueblada, sale en todos los anuncios suizos. "La chambre" = el dormitorio.',3),
('logement','you','C''est très lumineux. Le loyer, c''est charges comprises ?','Es muy luminoso. ¿El alquiler es con gastos incluidos?',NULL,4),
('logement','customer','Non : mille six cents francs, plus cent cinquante de charges.','No: mil seiscientos francos, más ciento cincuenta de gastos.','"Six cents francs" sin ninguna consonante final: "si-san-fran", con vocales nasales.',5),
('logement','you','D''accord, je suis intéressé. Qu''est-ce qu''il faut pour le dossier ?','De acuerdo, me interesa. ¿Qué hace falta para la solicitud?','Frase corta y directa: la régie ve muchas visitas al día.',6),
('logement','customer','Le formulaire, une copie du permis, les trois dernières fiches de salaire et un extrait des poursuites.','El formulario, una copia del permiso, las tres últimas nóminas y un certificado de deudas.','"Fiche de salaire" = nómina (en Francia, "fiche de paie"). "La régie" = la inmobiliaria que gestiona el piso.',7),
('logement','you','Je viens d''arriver, mais j''ai un contrat fixe. Je peux vous envoyer tout ça ce soir.','Acabo de llegar, pero tengo un contrato fijo. Se lo puedo mandar todo esta noche.','Si aún no tienes nóminas suizas, el contrato estable es lo que más tranquiliza. Y rápido: si tardas, el piso es de otro.',8),

-- ── 5. ACONSEJAR AL CLIENTE ─────────────────────────────
('conseil','key','Bonjour, je peux vous aider ?','Hola, ¿le puedo ayudar?','Al cliente, siempre "vous". Y siempre "bonjour" antes que nada.',1),
('conseil','key','Vous chaussez du combien ?','¿Qué número calza?','"La pointure" = número de calzado; "la taille" = talla de ropa. "Chausser du 43" = calzar un 43.',2),
('conseil','key','Celle-ci a plus d''amorti, elle est idéale pour les longues distances.','Esta tiene más amortiguación, es ideal para largas distancias.','"Chaussure" es femenino: "celle-ci", "elle". Zapatilla de correr = "chaussure de course" o "de running".',3),
('conseil','key','Elle taille un peu petit : prenez une demi-pointure au-dessus.','Talla un poco pequeño: coja medio número más.','"Tailler petit/grand" = tallar pequeño/grande. "Au-dessus" = uno más; "en dessous" = uno menos.',4),
('conseil','key','Vous voulez l''essayer ?','¿Se la quiere probar?','"Essayer" = probar(se) ropa o calzado. "Prouver" es demostrar.',5),
('conseil','key','Elle n''est pas trop large ?','¿No le queda demasiado ancha?','FALSO AMIGO: "large" = ANCHO. Largo se dice "long".',6),
('conseil','key','Pour la randonnée, je vous conseille plutôt une chaussure imperméable.','Para senderismo, le recomiendo más bien un calzado impermeable.','"Plutôt" = más bien. Aquí la montaña está a la vuelta de la esquina: te lo pedirán mucho.',7),
('conseil','key','Je vous laisse réfléchir, je suis juste à côté.','Le dejo pensarlo, estoy aquí al lado.','La frase de oro: le das espacio sin abandonarle.',8),
('conseil','customer','Bonjour, je cherche des chaussures pour courir, mais je n''y connais rien.','Hola, busco zapatillas para correr, pero no entiendo nada de esto.','"Je n''y connais rien" = no tengo ni idea (del tema).',1),
('conseil','you','Bonjour ! Pas de problème. Vous courez souvent ? Et sur quel terrain ?','¡Hola! No hay problema. ¿Corre a menudo? ¿Y por qué terreno?','Antes de recomendar, pregunta: vendes mejor.',2),
('conseil','customer','Deux ou trois fois par semaine, surtout au bord du lac.','Dos o tres veces por semana, sobre todo junto al lago.','En la Romandía casi todo el mundo corre "au bord du lac".',3),
('conseil','you','Alors je vous conseille celle-ci : elle a beaucoup d''amorti. Vous chaussez du combien ?','Entonces le recomiendo esta: tiene mucha amortiguación. ¿Qué número calza?','"Conseiller" = aconsejar; "un conseil" = un consejo.',4),
('conseil','customer','Du quarante-deux, normalement.','Un cuarenta y dos, normalmente.','Número de calzado con "du": "du 42".',5),
('conseil','you','Ce modèle taille un peu petit. Essayez aussi une demi-pointure au-dessus, pour comparer.','Este modelo talla un poco pequeño. Pruébese también medio número más, para comparar.','"Demi" delante no concuerda y lleva guion: "une demi-pointure", "une demi-heure".',6),
('conseil','customer','Oui, celle-là est plus confortable. Elle coûte combien ?','Sí, esa es más cómoda. ¿Cuánto cuesta?',NULL,7),
('conseil','you','Cent quarante-neuf francs. C''est un très bon modèle pour débuter.','Ciento cuarenta y nueve francos. Es un modelo muy bueno para empezar.','"Débuter" = empezar en algo. "Un débutant" = un principiante.',8),

-- ── 6. EN LA CAJA ───────────────────────────────────────
('caisse','key','Ça fait septante-neuf francs cinquante, s''il vous plaît.','Son setenta y nueve francos con cincuenta, por favor.','En toda la Suiza romanda: septante (70) y nonante (90). "Soixante-dix" se entiende, pero suena a Francia.',1),
('caisse','key','Vous payez comment ? Par carte ou avec Twint ?','¿Cómo paga? ¿Con tarjeta o con Twint?','Twint es la app de pago suiza: el cliente escanea un código QR. Se dice "tuint".',2),
('caisse','key','Vous pouvez approcher la carte, c''est sans contact.','Puede acercar la tarjeta, es sin contacto.','Si pide el PIN: "Tapez votre code, s''il vous plaît".',3),
('caisse','key','Vous voulez un cornet ?','¿Quiere una bolsa?','Suizo: "un cornet" = una bolsa (de plástico o de papel). En Francia, "un sac".',4),
('caisse','key','Voici votre monnaie et votre quittance.','Aquí tiene su cambio y su tique.','"La monnaie" = el cambio. "La quittance" = el tique, en Suiza; en Francia, "le ticket de caisse".',5),
('caisse','key','Vous pouvez l''échanger dans les trente jours, avec la quittance.','Puede cambiarlo en un plazo de treinta días, con el tique.','El plazo real es el de tu tienda. "Échanger" = cambiar por otra cosa; "rembourser" = devolver el dinero.',6),
('caisse','key','Vous n''auriez pas plus petit, par hasard ?','¿No tendría un billete más pequeño, por casualidad?','El condicional ("auriez") suaviza la petición. En "hasard" la h no suena.',7),
('caisse','key','Je suis désolé, la carte est refusée. Vous voulez réessayer ?','Lo siento, la tarjeta ha sido rechazada. ¿Quiere volver a intentarlo?','Dilo bajito y sin dramatizar. "Réessayer" = volver a intentarlo.',8),
('caisse','customer','Bonjour, c''est pour échanger ce t-shirt, il est trop petit.','Buenos días, es para cambiar esta camiseta, me queda pequeña.','"C''est pour…" = vengo a… / es para…',1),
('caisse','you','Bien sûr. Vous avez la quittance ?','Claro. ¿Tiene el tique?',NULL,2),
('caisse','customer','Oui, la voilà. Je peux prendre un M à la place ?','Sí, aquí está. ¿Puedo coger una M en su lugar?','"À la place" = en su lugar. Las tallas con letra: "un M" suena "un èm".',3),
('caisse','you','Oui, pas de souci. Et pour le short, ça fait huitante-neuf francs nonante.','Sí, sin problema. Y el pantalón corto son ochenta y nueve francos con noventa.','"Huitante" (80) sólo en Vaud, Valais y Friburgo; en Ginebra, Neuchâtel y el Jura, "quatre-vingts". Septante y nonante, en toda la Romandía.',4),
('caisse','customer','Je peux payer avec Twint ?','¿Puedo pagar con Twint?',NULL,5),
('caisse','you','Bien sûr, scannez le code QR ici.','Claro, escanee el código QR aquí.','"QR" se dice "ku-èr", con la u francesa: labios de silbar y lengua de decir i.',6),
('caisse','customer','Voilà, c''est payé. Merci beaucoup !','Listo, pagado. ¡Muchas gracias!',NULL,7),
('caisse','you','Service ! Voici votre quittance. Belle journée !','¡De nada! Aquí tiene su tique. ¡Que tenga buen día!','"Service !" = de nada, muy de la Suiza romanda. En Francia dirían "Je vous en prie".',8),

-- ── 7. LA PAUSA DEL CAFÉ ────────────────────────────────
('pause-cafe','key','Tu as fait quoi ce week-end ?','¿Qué hiciste el fin de semana?','La pregunta del lunes. Hablado se come la u: "T''as fait quoi ?".',1),
('pause-cafe','key','Dimanche, j''ai fait une rando en montagne.','El domingo hice una ruta por la montaña.','"Une rando" = une randonnée, senderismo. "Dimanche" sin artículo = este domingo (el pasado o el que viene).',2),
('pause-cafe','key','Tu viens d''où, toi ?','¿Y tú de dónde eres?','El "toi" final es muy oral: "¿y tú?". Contesta y devuelve: "Et toi ?".',3),
('pause-cafe','key','Ça te dit de venir boire un verre après le boulot ?','¿Te apetece venir a tomar algo después del curro?','"Ça te dit ?" = ¿te apetece? "Le boulot" = el curro. Registro de pausa, no de reunión.',4),
('pause-cafe','key','Volontiers, avec plaisir !','¡Con mucho gusto!','En Suiza "volontiers" se oye muchísimo más que en Francia. Úsalo: suena natural y amable.',5),
('pause-cafe','key','Tu dînes où, à midi ?','¿Dónde comes a mediodía?','En Suiza "le dîner" es la COMIDA de mediodía y "le souper", la cena. En Francia "dîner" es cenar: si quedas con alguien de allí, confirma la hora.',6),
('pause-cafe','key','Je t''offre un café ?','¿Te invito a un café?','"Offrir" = invitar (pagas tú). Es lo más natural.',7),
('pause-cafe','key','Ah bon ? Raconte !','¿Ah, sí? ¡Cuenta!','Reaccionar vale tanto como hablar: "Ah bon ?", "C''est vrai ?", "Trop bien !". Con tres palabras sigues dentro de la conversación.',8),
('pause-cafe','customer','Salut Edwin ! Alors, ça joue, ta première semaine ?','¡Hola, Edwin! Qué, ¿qué tal tu primera semana?','"Ça joue ?" aquí = ¿va bien? Contesta "Ça joue !" o "Ça va bien".',1),
('pause-cafe','you','Ça joue, merci ! Il y a beaucoup de nouveautés, mais l''équipe est super.','¡Bien, gracias! Hay muchas cosas nuevas, pero el equipo es genial.','"Une nouveauté" = una novedad. "Super" no cambia: "l''équipe est super".',2),
('pause-cafe','customer','Tant mieux ! Et tu as fait quoi ce week-end ? Tu es allé en montagne ?','¡Me alegro! ¿Y qué hiciste el fin de semana? ¿Fuiste a la montaña?','"Tant mieux" = me alegro, mejor. Lo contrario: "tant pis" (qué le vamos a hacer).',3),
('pause-cafe','you','Non, pas encore. Je me suis baladé au bord du lac, c''est magnifique.','No, todavía no. Di un paseo junto al lago, es precioso.','"Se balader" = dar un paseo. Con "se", el pasado va con être: "je me suis baladé".',4),
('pause-cafe','customer','Il faut absolument que tu montes à la montagne ! On y va dimanche, tu veux venir ?','¡Tienes que subir a la montaña sí o sí! Vamos el domingo, ¿quieres venir?','"Il faut que" + subjuntivo ("que tu montes"). Domingo, porque el sábado se trabaja: en Suiza casi todo cierra el domingo.',5),
('pause-cafe','you','Volontiers, c''est gentil ! Je dois apporter quelque chose ?','¡Con mucho gusto, qué amable! ¿Tengo que llevar algo?','"Apporter" = llevar una cosa a donde vas. Para personas, "amener".',6),
('pause-cafe','customer','Juste de bonnes chaussures et ton pique-nique. On part à huit heures, de la gare.','Solo unas buenas botas y tu picnic. Salimos a las ocho, de la estación.','"Huit heures": la t de "huit" se une a "heures": "ui-teur".',7),
('pause-cafe','you','Parfait. Tu me donnes ton numéro de natel ?','Perfecto. ¿Me das tu número de móvil?','"Le natel" = el móvil, en Suiza. En Francia, "le portable". Aquí lo dice todo el mundo.',8),

-- ── 8. AL TELÉFONO ──────────────────────────────────────
('telephone','key','Bonjour, je voudrais prendre rendez-vous, s''il vous plaît.','Buenos días, quería pedir cita, por favor.','"Prendre rendez-vous" = pedir cita. "Rendez-vous" suena "randevú": ni la z ni la s suenan.',1),
('telephone','key','Est-ce que le docteur prend encore de nouveaux patients ?','¿El doctor sigue aceptando pacientes nuevos?','En Suiza muchos médicos de cabecera no aceptan pacientes nuevos: pregúntalo lo primero.',2),
('telephone','key','Je suis disponible le matin avant neuf heures, ou le lundi.','Estoy disponible por la mañana antes de las nueve, o los lunes.','"Le lundi" con artículo = los lunes (siempre). "Lundi" sin artículo = este lunes.',3),
('telephone','key','Je vous épelle mon prénom : E, D, double V, I, N.','Le deletreo mi nombre: E, D, uve doble, I, N.','"Prénom" = nombre; "nom" = apellido. La E francesa suena "ë" y la I, "i". Ojo: la G es "jé" y la J es "ji" (j francesa, como la ll argentina).',4),
('telephone','key','Ne quittez pas, je vous passe ma collègue.','No cuelgue, le paso con mi compañera.','"Ne quittez pas" = no cuelgue. "Quitter" es dejar, irse; nada que ver con quitar.',5),
('telephone','key','Vous pouvez me rappeler au zéro septante-neuf, cent vingt-trois, quarante-cinq, soixante-sept ?','¿Me puede devolver la llamada al 079 123 45 67?','Los móviles suizos empiezan por 07x y se dicen por grupos: "zéro septante-neuf". "Rappeler" = devolver la llamada.',6),
('telephone','key','Bonjour, c''est Edwin, je vous appelle au sujet de mon rendez-vous de jeudi.','Buenos días, soy Edwin, le llamo por mi cita del jueves.','Para el contestador ("le répondeur"): quién eres, por qué llamas y cómo te localizan.',7),
('telephone','key','Je dois annuler mon rendez-vous. Est-ce qu''on peut le déplacer à la semaine prochaine ?','Tengo que anular la cita. ¿Se puede pasar a la semana que viene?','Avisa con tiempo: muchas consultas cobran la cita si se anula con menos de 24 horas.',8),
('telephone','customer','Cabinet médical du docteur Rochat, bonjour.','Consulta del doctor Rochat, buenos días.','"Le cabinet" = la consulta del médico (o el despacho de un abogado).',1),
('telephone','you','Bonjour, je voudrais prendre rendez-vous. Je viens d''arriver en Suisse et je cherche un médecin de famille.','Buenos días, quería pedir cita. Acabo de llegar a Suiza y busco un médico de cabecera.','"Médecin de famille" o "généraliste" = médico de cabecera.',2),
('telephone','customer','Je suis désolée, le docteur ne prend plus de nouveaux patients pour le moment.','Lo siento, el doctor no acepta pacientes nuevos por el momento.','"Ne… plus" = ya no. La vas a oír más de una vez: no es personal.',3),
('telephone','you','Ah, dommage. Est-ce que vous pourriez me conseiller un autre cabinet ?','Vaya, qué pena. ¿Me podría recomendar otra consulta?','"Dommage" = qué pena. Nunca cuelgues sin pedir una alternativa.',4),
('telephone','customer','Essayez le cabinet de groupe près de la gare. Sinon, il y a la permanence.','Pruebe en el centro médico de al lado de la estación. Si no, está la consulta sin cita.','"La permanence" = centro médico sin cita, para lo que no puede esperar. No es urgencias.',5),
('telephone','you','D''accord. Vous pouvez me répéter le nom, s''il vous plaît ? Je le note.','De acuerdo. ¿Me puede repetir el nombre, por favor? Lo apunto.','"Noter" = apuntar. Pedir que repitan un nombre es normal, no un fallo.',6),
('telephone','customer','Bien sûr : le Centre médical de la Gare. Je vous l''épelle ?','Claro: el Centro Médico de la Estación. ¿Se lo deletreo?',NULL,7),
('telephone','you','Non merci, c''est bon. Merci beaucoup, au revoir.','No, gracias, ya lo tengo. Muchas gracias, adiós.','"C''est bon" = ya está, vale. "Au revoir" suena "o-rvuar": la e casi desaparece.',8),

-- ── 9. LA ESTACIÓN ──────────────────────────────────────
('transports','key','Un billet pour Lausanne, s''il vous plaît. Aller simple.','Un billete para Lausana, por favor. Solo ida.','"Aller simple" = ida; "aller-retour" = ida y vuelta. "Lausanne" suena "lo-sán".',1),
('transports','key','J''ai le demi-tarif.','Tengo el abono de medio precio.','El "demi-tarif" es un abono anual que da la mitad de precio en casi todo el transporte público suizo. Está muy extendido.',2),
('transports','key','Le train pour Genève part de quelle voie ?','¿De qué vía sale el tren para Ginebra?','"La voie" = la vía donde para el tren. En el panel verás "voie 7".',3),
('transports','key','Le train a combien de minutes de retard ?','¿Cuántos minutos de retraso lleva el tren?','"Avoir du retard" = llevar retraso (el tren). "Être en retard" = llegar tarde (tú).',4),
('transports','key','Où est-ce que je dois changer ?','¿Dónde tengo que hacer transbordo?','"Changer" = hacer transbordo. "La correspondance" = el enlace con el otro tren.',5),
('transports','key','La deuxième classe, c''est dans quel secteur ?','¿La segunda clase en qué sector está?','Muy suizo: los andenes van por sectores (A, B, C, D) y el panel dice dónde para cada vagón. "Deuxième" suena "deu-ziém".',6),
('transports','key','Excusez-moi, c''est bien le train pour Fribourg ?','Perdone, ¿es este el tren para Friburgo?','"C''est bien…?" = confirmar. Ese "bien" no es "bien": es "efectivamente".',7),
('transports','key','Pardon, je n''ai pas compris l''annonce. Qu''est-ce qu''ils ont dit ?','Perdone, no he entendido el aviso. ¿Qué han dicho?','Los avisos por megafonía cuestan hasta a los nativos. Pregunta al de al lado sin miedo.',8),
('transports','customer','Bonjour, qu''est-ce que je peux faire pour vous ?','Buenos días, ¿qué puedo hacer por usted?',NULL,1),
('transports','you','Bonjour. Un aller-retour pour Genève en deuxième classe, s''il vous plaît.','Buenos días. Una ida y vuelta a Ginebra en segunda, por favor.','"Genève": la G es la j francesa (como la ll argentina) y la primera e casi no suena.',2),
('transports','customer','Vous avez le demi-tarif ?','¿Tiene el abono de medio precio?',NULL,3),
('transports','you','Pas encore. C''est intéressant si je prends souvent le train ?','Todavía no. ¿Me compensa si cojo el tren a menudo?','"C''est intéressant", hablando de precios = sale a cuenta, compensa.',4),
('transports','customer','Oui, il est vite rentabilisé. Attention, aujourd''hui le train a dix minutes de retard.','Sí, se amortiza rápido. Ojo, hoy el tren lleva diez minutos de retraso.','"Rentabiliser" = amortizar. "Attention" = ojo, cuidado.',5),
('transports','you','D''accord. Et il part de quelle voie ?','Vale. ¿Y de qué vía sale?',NULL,6),
('transports','customer','Voie quatre, secteur C pour la deuxième classe. Vous changez à Lausanne.','Vía cuatro, sector C para segunda clase. Hace transbordo en Lausana.','Tres datos seguidos: vía, sector y transbordo. Es justo cuando hay que repetirlos.',7),
('transports','you','Voie quatre, secteur C, et je change à Lausanne. Merci beaucoup !','Vía cuatro, sector C, y hago transbordo en Lausana. ¡Muchas gracias!','Repetir lo que te dicen = confirmar sin tener que preguntar "¿cómo?". Técnica de supervivencia.',8),

-- ── 10. SALUD ───────────────────────────────────────────
('sante','key','Bonjour, je voudrais quelque chose contre le mal de gorge.','Buenos días, quería algo para el dolor de garganta.','"Contre" = para combatir algo. "Pour" es para qué sirve: "pour dormir".',1),
('sante','key','Je suis enrhumé, j''ai le nez qui coule.','Estoy constipado, me gotea la nariz.','FALSO AMIGO: "constipé" = ESTREÑIDO. Constipado o resfriado = "enrhumé".',2),
('sante','key','J''ai mal au dos depuis trois jours.','Me duele la espalda desde hace tres días.','"Avoir mal à": au dos, à la tête, aux pieds. Y con "depuis", presente: "j''ai mal depuis…", no pasado.',3),
('sante','key','Est-ce qu''il faut une ordonnance ?','¿Hace falta receta?','"L''ordonnance" = la receta médica. "La recette" es la de cocina.',4),
('sante','key','Voici ma carte d''assurance.','Aquí tiene mi tarjeta del seguro.','En la farmacia y en el médico te la piden siempre. Llévala en la cartera.',5),
('sante','key','J''ai une franchise élevée : ça coûte combien sans l''assurance ?','Tengo una franquicia alta: ¿cuánto cuesta sin el seguro?','"La franchise" = lo que pagas tú cada año antes de que pague el seguro. Cuanto más alta, más barata la cuota mensual.',6),
('sante','key','Mon employeur me demande un certificat médical.','Mi empresa me pide un justificante médico.','"Demander" = pedir, no demandar. Cuándo lo piden depende de la empresa: mira tu contrato.',7),
('sante','key','C''est à prendre combien de fois par jour ?','¿Cuántas veces al día hay que tomarlo?','"C''est à prendre" = hay que tomarlo. "Avant / pendant / après les repas" = antes / durante / después de comer.',8),
('sante','customer','Bonjour Monsieur, qu''est-ce qu''il vous faut ?','Buenos días, señor, ¿qué necesita?',NULL,1),
('sante','you','Bonjour. Je suis enrhumé et j''ai mal à la gorge depuis deux jours.','Buenos días. Estoy constipado y me duele la garganta desde hace dos días.','Aquí, jamás "je suis constipé": sería estreñido.',2),
('sante','customer','Vous avez de la fièvre ? Vous prenez déjà des médicaments ?','¿Tiene fiebre? ¿Toma ya algún medicamento?','"Un médicament" = un medicamento; "la médecine" es la ciencia o la carrera.',3),
('sante','you','Un peu de fièvre hier soir, mais je ne prends rien pour l''instant.','Un poco de fiebre anoche, pero de momento no tomo nada.','"Ne… rien" = nada. Las dos piezas: "je ne prends rien".',4),
('sante','customer','Je vous conseille ces pastilles pour la gorge. Si ça ne va pas mieux dans trois jours, allez voir un médecin.','Le recomiendo estas pastillas para la garganta. Si no mejora en tres días, vaya al médico.','"Aller voir un médecin" = ir al médico.',5),
('sante','you','Merci. C''est remboursé par l''assurance ?','Gracias. ¿Lo cubre el seguro?','"Rembourser" = reembolsar, cubrir. La pregunta que hay que hacer siempre en Suiza.',6),
('sante','customer','Non, sans ordonnance, c''est à votre charge. Ça fait dix-huit francs quarante.','No, sin receta corre de su cuenta. Son dieciocho francos con cuarenta.','"À votre charge" = lo paga usted. El seguro básico suele cubrir lo que receta el médico, no lo que compras por tu cuenta.',7),
('sante','you','D''accord, je paie par carte. Merci pour vos conseils !','Vale, pago con tarjeta. ¡Gracias por los consejos!','"Merci pour" + cosa; "merci de" + verbo ("merci de m''avoir aidé").',8),

-- ── 11. REUNIÓN DE EQUIPO ───────────────────────────────
('reunion','key','À mon avis, on devrait mettre le rayon running à l''entrée.','En mi opinión, deberíamos poner la sección de running en la entrada.','"À mon avis" o "selon moi". "En mon opinion" es un calco del español que chirría.',1),
('reunion','key','Je suis tout à fait d''accord avec toi.','Estoy totalmente de acuerdo contigo.','"D''accord AVEC toi": con avec, no con "de".',2),
('reunion','key','Je vois ce que tu veux dire, mais je ne suis pas sûr que ce soit la meilleure solution.','Entiendo lo que quieres decir, pero no estoy seguro de que sea la mejor solución.','Matizar = reconocer + "mais". "Je ne suis pas sûr que" pide subjuntivo: "ce soit".',3),
('reunion','key','Je ne suis pas tout à fait d''accord.','No estoy del todo de acuerdo.','"Pas tout à fait" dice que no sin cerrar la puerta. En Suiza se busca el consenso: el "no" rotundo choca.',4),
('reunion','key','Ce qui me gêne, c''est qu''on manque de monde le samedi.','Lo que me preocupa es que los sábados nos falta gente.','"Ce qui me gêne, c''est que…" = lo que me molesta es que… "Manquer de" = andar escaso de.',5),
('reunion','key','Il faudrait peut-être qu''on fasse un essai pendant un mois.','Quizá habría que hacer una prueba durante un mes.','Proponer sin imponer: condicional + subjuntivo ("qu''on fasse").',6),
('reunion','key','D''un côté, c''est plus pratique ; de l''autre, ça coûte plus cher.','Por un lado es más práctico; por otro, cuesta más.','Sopesar pros y contras: la estructura que piden en el DALF. Úsala aquí y en el examen.',7),
('reunion','key','Pour résumer : on est d''accord sur l''essai, mais pas sur les horaires.','Resumiendo: estamos de acuerdo en la prueba, pero no en los horarios.','"Les horaires" se liga porque la h no suena: "le-zo-rèr". Resumir te hace sonar B2.',8),
('reunion','customer','Bon, on a un problème : le samedi, l''attente à la caisse est trop longue. Vous avez des idées ?','Bueno, tenemos un problema: los sábados la espera en caja es demasiado larga. ¿Tenéis ideas?','"L''attente" = la espera. Otra vez: "attendre" = esperar.',1),
('reunion','you','À mon avis, on pourrait ouvrir une deuxième caisse entre onze heures et quinze heures.','En mi opinión, podríamos abrir una segunda caja entre las once y las tres.','Horas en formato 24 h: "quinze heures", no "trois heures de l''après-midi".',2),
('reunion','customer','Oui, mais ça fait une personne de moins en rayon. Qu''est-ce que tu en penses ?','Sí, pero eso es una persona menos en tienda. ¿Tú qué opinas?','"Qu''est-ce que tu en penses ?" = ¿qué opinas? Te la harán en cada reunión.',3),
('reunion','you','Je vois ce que tu veux dire. Mais le samedi, certains clients attendent dix minutes et repartent sans rien acheter.','Entiendo lo que quieres decir. Pero los sábados algunos clientes esperan diez minutos y se van sin comprar nada.','Reconoces la objeción y la rebates con un dato. Convence más que insistir.',4),
('reunion','customer','C''est vrai. Mais je ne suis pas sûre qu''on ait assez de personnel.','Es verdad. Pero no estoy segura de que tengamos suficiente personal.','"Qu''on ait": subjuntivo de avoir, suena "kon-nè".',5),
('reunion','you','Il faudrait peut-être faire un essai pendant un mois, et voir si les ventes augmentent.','Quizá habría que hacer una prueba durante un mes y ver si suben las ventas.','Proponer una prueba en vez de un cambio definitivo: más fácil de aceptar para todos.',6),
('reunion','customer','Bonne idée. Tu peux préparer une proposition pour la semaine prochaine ?','Buena idea. ¿Puedes preparar una propuesta para la semana que viene?','"Une proposition" = una propuesta.',7),
('reunion','you','Oui, volontiers. Je vous l''envoie à tous d''ici vendredi.','Sí, con mucho gusto. Os la mando a todos antes del viernes.','"Vous" aquí es plural: a todo el equipo. "D''ici vendredi" = como tarde el viernes.',8),

-- ── 12. HORARIO, HORAS EXTRA Y VACACIONES ───────────────
('horaires','key','Est-ce que je pourrais vous parler cinq minutes ?','¿Podría hablar con usted cinco minutos?','El condicional ("pourrais") es la llave de todas las peticiones delicadas.',1),
('horaires','key','Je voudrais prendre une semaine de vacances en février.','Quería cogerme una semana de vacaciones en febrero.','"Les vacances" siempre en plural. Por ley, en Suiza tienes al menos cuatro semanas al año.',2),
('horaires','key','Est-ce que je pourrais avoir congé samedi prochain ?','¿Podría tener libre el sábado que viene?','"Avoir congé" (sin artículo) = tener el día libre. Muy suizo.',3),
('horaires','key','Ça fait trois semaines que je fais des heures supplémentaires.','Llevo tres semanas haciendo horas extra.','"Ça fait + tiempo + que" = llevo… En presente, no en pasado. Hablado: "des heures sup".',4),
('horaires','key','Est-ce que je peux récupérer ces heures, ou est-ce qu''elles seront payées ?','¿Puedo compensar estas horas con tiempo libre, o me las pagarán?','"Récupérer des heures" = compensarlas con días libres. Mejor preguntarlo antes de hacerlas que después.',5),
('horaires','key','Je comprends que ce soit une période chargée, mais j''ai besoin de connaître mon horaire à l''avance.','Entiendo que sea una época de mucho trabajo, pero necesito saber mi horario con antelación.','"Je comprends que" + subjuntivo ("ce soit"). "Chargé" = cargado, de mucho trabajo.',6),
('horaires','key','Je ne voudrais pas que ça devienne une habitude.','No querría que se convirtiera en costumbre.','Firme pero educado. "Vouloir que" + subjuntivo ("devienne").',7),
('horaires','key','Qu''est-ce que vous proposez ?','¿Qué propone usted?','Tras plantear el problema, pide su propuesta: negocias sin enfrentarte.',8),
('horaires','customer','Oui, Edwin, entrez. Vous vouliez me voir ?','Sí, Edwin, pase. ¿Quería verme?','"Vous vouliez" (imperfecto) es cortesía, no pasado: = ¿quería usted…?',1),
('horaires','you','Oui, merci. C''est au sujet de mon horaire : ça fait trois semaines que je finis après vingt heures.','Sí, gracias. Es por mi horario: llevo tres semanas saliendo después de las ocho de la tarde.','"Au sujet de" = acerca de. "Vingt heures": la t de "vingt" se liga, "vin-teur".',2),
('horaires','customer','Je sais. C''est la période des fêtes, tout le monde fait des heures sup.','Lo sé. Es la época de fiestas, todo el mundo hace horas extra.','"Les fêtes" = Navidad y fin de año. "Sup" con la u francesa: labios de silbar, lengua de i.',3),
('horaires','you','Je comprends, mais je voudrais savoir si je pourrai récupérer ces heures.','Lo entiendo, pero quería saber si podré compensar estas horas con días libres.',NULL,4),
('horaires','customer','En janvier, c''est plus calme. Vous pourrez prendre quelques jours de congé.','En enero hay más calma. Podrá cogerse unos días libres.','"Vous pourrez" (futuro) ≠ "vous pourriez" (condicional). Una letra, otra promesa.',5),
('horaires','you','D''accord, ça me va. Est-ce qu''on pourrait le mettre par écrit ?','Vale, me parece bien. ¿Podríamos ponerlo por escrito?','Pedirlo por escrito es normal y no ofende. Un correo basta.',6),
('horaires','customer','Bien sûr, je vous envoie un e-mail cet après-midi. Autre chose ?','Claro, le mando un correo esta tarde. ¿Algo más?','"Autre chose ?" = ¿algo más? La señal de que la reunión se acaba.',7),
('horaires','you','Non, c''est tout. Merci de m''avoir écouté.','No, eso es todo. Gracias por escucharme.','"Merci de" + infinitivo pasado: "merci de m''avoir écouté". Cierre educado, y de nivel DALF.',8)

) AS v(slug, kind, en, es, note, ord) ON v.slug = s.slug;

COMMIT;

-- Comprobación:
--   SELECT s.order_index, s.slug, s.level,
--          count(*) FILTER (WHERE l.kind = 'key')  AS keys,
--          count(*) FILTER (WHERE l.kind <> 'key') AS turnos
--     FROM situations s
--     JOIN tracks t ON t.id = s.track_id AND t.slug = 'suisse-romande'
--     LEFT JOIN situation_lines l ON l.situation_id = s.id
--    GROUP BY s.id ORDER BY 1;
--   SELECT slug, lang FROM tracks;
