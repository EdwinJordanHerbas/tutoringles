-- TutorIngles · Migration 08 — CONTENIDO: DEPENDIENTE / TIENDA
--
-- 12 situaciones reales de mostrador, en inglés británico (el del Cambridge).
-- Cada una trae:
--   · frases clave ('key')      → lo que tienes que saber decir
--   · un role-play ('customer'/'you') → la conversación entera, turno a turno
--
-- Las notas avisan de lo que suele fallar un hispanohablante: falsos amigos,
-- registro (sonar brusco sin querer) y sonidos que delatan.
--
-- Aplicar:
--   docker exec -i postgres psql -U postgres -d tutoringles < migration_08_retail_content.sql
--
-- Idempotente: reejecutable (refresca situaciones y regenera las líneas).

BEGIN;

-- ══════════════════════ SECTOR ══════════════════════
INSERT INTO tracks (slug, name, icon, description, order_index) VALUES
  ('retail', 'Dependiente / tienda', 'work',
   'Atender, aconsejar, cobrar y resolver problemas de clientes en una tienda.', 1)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon;

-- Asignar este sector al perfil por defecto si aún no tiene ninguno
UPDATE profiles
   SET track_id = (SELECT id FROM tracks WHERE slug = 'retail')
 WHERE id = 1 AND track_id IS NULL;

-- ══════════════════════ SITUACIONES ══════════════════════
INSERT INTO situations (track_id, slug, title_es, title_en, context_es, level, order_index)
SELECT t.id, v.slug, v.title_es, v.title_en, v.context_es, v.level, v.ord
FROM tracks t, (VALUES
  ('greeting',   'Saludar y ofrecer ayuda',       'Greeting a customer',
   'Los primeros 10 segundos. Marca el tono de todo lo demás.', 'A2', 1),
  ('directions', 'Dónde está cada cosa',          'Directions inside the shop',
   'El cliente busca algo y no lo encuentra. Hay que orientarle sin moverse del sitio.', 'A2', 2),
  ('sizes',      'Tallas y probador',             'Sizes and the fitting room',
   'La conversación más frecuente en tienda de ropa.', 'A2', 3),
  ('stock',      'No queda stock',                'Out of stock',
   'Decir que no hay sin que el cliente se vaya. Aquí se gana o se pierde la venta.', 'A2', 4),
  ('advice',     'Aconsejar al cliente',          'Giving advice and recommending',
   'Cuando dudan entre dos cosas y te preguntan a ti.', 'B1', 5),
  ('payment',    'Cobrar: caja, tarjeta, efectivo','Taking payment',
   'Datáfono, contactless, efectivo y cambio. Números claros y sin titubear.', 'A2', 6),
  ('giftreceipt','Regalo y tickets',              'Gift wrapping and receipts',
   'Envolver, ticket regalo y explicar hasta cuándo vale.', 'B1', 7),
  ('returns',    'Devoluciones y cambios',        'Returns and exchanges',
   'Política de la tienda, plazos y qué pasa si no traen el ticket.', 'B1', 8),
  ('discounts',  'Rebajas y descuentos',          'Sales, discounts and offers',
   'Explicar un 3x2, un porcentaje o por qué algo no entra en la oferta.', 'B1', 9),
  ('complaints', 'Quejas y clientes enfadados',   'Handling complaints',
   'Bajar el tono sin admitir culpa y sin sonar frío. Lo más difícil del oficio.', 'B1', 10),
  ('phone',      'Atender el teléfono',           'Answering the phone',
   'Sin cara ni gestos: aquí la pronunciación es lo único que tienes.', 'B1', 11),
  ('closing',    'Cerrar la venta y despedir',    'Closing the sale',
   'Que se vaya con ganas de volver.', 'A2', 12)
) AS v(slug, title_es, title_en, context_es, level, ord)
WHERE t.slug = 'retail'
ON CONFLICT (track_id, slug) DO UPDATE
  SET title_es = EXCLUDED.title_es, title_en = EXCLUDED.title_en,
      context_es = EXCLUDED.context_es, level = EXCLUDED.level,
      order_index = EXCLUDED.order_index;

-- Regenerar las líneas (permite reejecutar la migración con contenido corregido)
DELETE FROM situation_lines
 WHERE situation_id IN (
   SELECT s.id FROM situations s JOIN tracks t ON t.id = s.track_id WHERE t.slug = 'retail'
 );

-- ══════════════════════ LÍNEAS ══════════════════════
INSERT INTO situation_lines (situation_id, kind, en, es, note, order_index)
SELECT s.id, v.kind, v.en, v.es, v.note, v.ord
FROM situations s
JOIN tracks t ON t.id = s.track_id AND t.slug = 'retail'
JOIN (VALUES

-- ── 1. SALUDAR ──────────────────────────────────────────
('greeting','key','Hi there, are you all right?','Hola, ¿todo bien?','En una tienda británica es EL saludo normal. No preguntan cómo estás: preguntan si necesitas algo.',1),
('greeting','key','Can I help you with anything?','¿Le ayudo en algo?','Más seguro que "What do you want?", que suena a interrogatorio.',2),
('greeting','key','Are you looking for anything in particular?','¿Busca algo en concreto?','"In particular" es la coletilla que lo suaviza.',3),
('greeting','key','Take your time, I''ll be just over here.','Tómese su tiempo, estaré por aquí.','La frase de oro: le dejas espacio sin abandonarle.',4),
('greeting','key','Just give me a shout if you need anything.','Avíseme si necesita algo.','"Give me a shout" es coloquial y natural. No es gritar.',5),
('greeting','key','Of course, no problem at all.','Claro, sin problema.','"At all" refuerza y suena más cálido que un "no problem" seco.',6),
('greeting','customer','Hi, I''m just browsing, thanks.','Hola, solo estoy mirando, gracias.','"Just browsing" o "just looking" = solo miro. Óyelo mil veces al día.',1),
('greeting','you','No worries at all. Take your time.','Sin problema. Tómese su tiempo.','Nunca insistas después de un "just browsing".',2),
('greeting','customer','Actually, do you have this in a smaller size?','De hecho, ¿tienen esto en una talla menos?','OJO: "actually" NO es "actualmente". Significa "de hecho".',3),
('greeting','you','Let me have a look for you. What size are you after?','Déjeme mirar. ¿Qué talla busca?','"What are you after?" = ¿qué busca? Muy británico.',4),
('greeting','customer','A medium, please.','Una mediana, por favor.',NULL,5),
('greeting','you','I''ll just check out the back for you. Two seconds.','Miro en el almacén. Un segundo.','"Out the back" = en el almacén. "Two seconds" es la muletilla real.',6),

-- ── 2. DÓNDE ESTÁ CADA COSA ─────────────────────────────
('directions','key','It''s just over there, on your left.','Está justo allí, a su izquierda.','"Just" suaviza y suena natural en casi todo.',1),
('directions','key','You''ll find them at the back of the shop.','Los encontrará al fondo de la tienda.','"At the back" = al fondo. No "in the bottom".',2),
('directions','key','They''re on the second floor, next to the lifts.','Están en la segunda planta, al lado de los ascensores.','"Lift" en británico, "elevator" en americano.',3),
('directions','key','Follow me, I''ll show you.','Sígame, se lo enseño.','"I''ll show you" > "I explain you" (incorrecto en inglés).',4),
('directions','key','It''s the aisle right behind you.','Es el pasillo justo detrás de usted.','"Aisle" se pronuncia /aɪl/: la S es MUDA. Suena igual que "I''ll".',5),
('directions','key','Sorry, we don''t stock that here.','Lo siento, aquí no trabajamos ese producto.','"To stock something" = tenerlo en catálogo.',6),
('directions','customer','Excuse me, where can I find the socks?','Perdone, ¿dónde están los calcetines?',NULL,1),
('directions','you','They''re just down that aisle, on the right-hand side.','Están bajando ese pasillo, a mano derecha.','"Right-hand side" suena más claro que "right" a secas.',2),
('directions','customer','Sorry, which one?','Perdón, ¿cuál?',NULL,3),
('directions','you','The one past the till. Would you like me to show you?','El que está pasada la caja. ¿Quiere que se lo enseñe?','"Till" = caja registradora en británico.',4),
('directions','customer','That''d be great, thanks.','Sería genial, gracias.','"That''d" = "that would". Óyelo así, contraído.',5),
('directions','you','No problem, it''s this way.','Sin problema, es por aquí.','"This way" acompañado del gesto. Simple y eficaz.',6),

-- ── 3. TALLAS Y PROBADOR ────────────────────────────────
('sizes','key','What size are you looking for?','¿Qué talla busca?',NULL,1),
('sizes','key','The fitting rooms are just over there.','Los probadores están justo allí.','"Fitting room" (UK) o "changing room". Nunca "prover".',2),
('sizes','key','How many items are you taking in?','¿Cuántas prendas se lleva?','En muchas tiendas hay límite. "Items" es la palabra neutra.',3),
('sizes','key','I''m afraid that''s the last one we''ve got.','Me temo que es la última que nos queda.','"I''m afraid" = manera educada de dar malas noticias.',4),
('sizes','key','It runs a bit small, so you might want to size up.','Talla un poco pequeño, quizá le vaya mejor una talla más.','"To run small/big" es EL verbo del sector. "Size up/down" = subir/bajar talla.',5),
('sizes','key','How did you get on with those?','¿Qué tal le han quedado?','Lo que pregunta un dependiente británico al salir del probador. Literalmente "cómo te fue".',6),
('sizes','customer','Hi, have you got these trousers in a 12?','Hola, ¿tienen estos pantalones en una 12?','"Trousers" (UK). "Pants" en británico es ropa interior: cuidado.',1),
('sizes','you','Let me check for you. Is it for you or a gift?','Déjeme mirar. ¿Es para usted o es un regalo?',NULL,2),
('sizes','customer','For me. I usually take a 12 but they look quite small.','Para mí. Suelo usar la 12 pero parecen bastante pequeños.','"Take a size" = usar una talla.',3),
('sizes','you','They do run small, actually. Shall I get you a 14 as well?','Sí que tallan pequeño, la verdad. ¿Le traigo también una 14?','"Shall I…?" = ¿quiere que…? Muy educado y muy británico.',4),
('sizes','customer','Yes please, that''d be helpful.','Sí por favor, me vendría bien.',NULL,5),
('sizes','you','No problem. The fitting rooms are on your right whenever you''re ready.','Sin problema. Los probadores están a su derecha cuando quiera.',NULL,6),

-- ── 4. NO QUEDA STOCK ───────────────────────────────────
('stock','key','I''m afraid we''ve sold out of that one.','Me temo que se nos ha agotado.','"Sold out" = agotado. Con "I''m afraid" duele menos.',1),
('stock','key','Let me check if we''ve got any out the back.','Déjeme ver si queda alguno en el almacén.',NULL,2),
('stock','key','We''re getting a delivery in on Thursday.','Nos llega un pedido el jueves.','"Delivery" = entrega/pedido. "On Thursday", no "the Thursday".',3),
('stock','key','I can order it in for you if you like.','Se lo puedo pedir si quiere.','"Order it in" = traerlo por encargo. La frase que salva la venta.',4),
('stock','key','Our other branch might have it. Shall I ring them?','Puede que lo tengan en la otra tienda. ¿Les llamo?','"Branch" = sucursal. "To ring" = llamar por teléfono (UK).',5),
('stock','key','Would you like me to put one aside for you?','¿Quiere que le aparte uno?','"Put aside" = apartar/reservar. Muy útil.',6),
('stock','customer','Do you have this jumper in navy?','¿Tienen este jersey en azul marino?','"Jumper" (UK) = jersey. "Sweater" es más americano. "Navy" = azul marino.',1),
('stock','you','Let me have a look. I''m afraid we''ve sold out of the navy.','Déjeme mirar. Me temo que el azul marino está agotado.',NULL,2),
('stock','customer','Oh no, really? That''s a shame.','Ay, ¿en serio? Qué pena.','"That''s a shame" = qué pena. No es vergüenza.',3),
('stock','you','We are getting more in on Friday, though. I could put one aside for you.','Pero nos llegan más el viernes. Le podría apartar uno.','"Though" al final = "pero/aunque". Muy natural hablado.',4),
('stock','customer','That would be brilliant, thank you.','Sería estupendo, gracias.','"Brilliant" en UK = genial. Se usa constantemente.',5),
('stock','you','Lovely. Can I take a name and a number?','Perfecto. ¿Me da un nombre y un teléfono?','"Lovely" como confirmación es muy de tienda británica.',6),

-- ── 5. ACONSEJAR ────────────────────────────────────────
('advice','key','If you ask me, the black one suits you better.','Si me pregunta, el negro le queda mejor.','"To suit somebody" = quedarle bien a alguien.',1),
('advice','key','That colour really suits you.','Ese color le queda muy bien.','"Suit" para color/prenda; "fit" para talla. No los mezcles.',2),
('advice','key','It''s a bit more expensive, but the quality is much better.','Es algo más caro, pero la calidad es mucho mejor.','"A bit" suaviza el precio; "much better" lo compensa.',3),
('advice','key','They both look great, to be honest.','Los dos le quedan bien, la verdad.','Salida diplomática cuando no quieres decidir por el cliente.',4),
('advice','key','This one''s our best seller.','Este es el que más vendemos.',NULL,5),
('advice','key','It goes really well with what you''re wearing.','Combina muy bien con lo que lleva puesto.','"To go with" = combinar con.',6),
('advice','customer','I can''t decide between these two. Which do you prefer?','No me decido entre estos dos. ¿Cuál prefiere?',NULL,1),
('advice','you','They''re both lovely. Is it for anything in particular?','Los dos son bonitos. ¿Es para alguna ocasión concreta?','Antes de aconsejar, pregunta. Vendes mejor.',2),
('advice','customer','A wedding, next month.','Una boda, el mes que viene.',NULL,3),
('advice','you','Then I''d go for the blue one. It''s a bit smarter.','Entonces yo iría a por el azul. Es algo más elegante.','"Smart" en UK = elegante, arreglado. NO significa listo aquí.',4),
('advice','customer','You''re right. I''ll take it.','Tiene razón. Me lo llevo.','"I''ll take it" = me lo llevo. La frase que quieres oír.',5),
('advice','you','Great choice. Shall I take it to the till for you?','Buena elección. ¿Se lo llevo a caja?',NULL,6),

-- ── 6. COBRAR ───────────────────────────────────────────
('payment','key','That''ll be twenty-four ninety-nine, please.','Son veinticuatro con noventa y nueve, por favor.','Los precios se dicen sin "pounds": "twenty-four ninety-nine".',1),
('payment','key','How would you like to pay?','¿Cómo desea pagar?',NULL,2),
('payment','key','Card or cash?','¿Tarjeta o efectivo?','Versión corta y perfectamente educada.',3),
('payment','key','Just pop your card in there, please.','Meta la tarjeta ahí, por favor.','"Pop" = hacer algo rápido y sin ceremonia. Muy británico.',4),
('payment','key','It''s asking for your PIN.','Le pide el PIN.','La máquina "asks for". No digas "the machine wants".',5),
('payment','key','Sorry, it''s been declined. Do you have another card?','Lo siento, la ha rechazado. ¿Tiene otra tarjeta?','"Declined" = rechazada. Dilo bajito y sin dramatizar.',6),
('payment','key','Here''s your change and your receipt.','Aquí tiene su cambio y su ticket.','"Receipt" se pronuncia /rɪˈsiːt/: la P es MUDA.',7),
('payment','customer','Hi, just these two, please.','Hola, solo estos dos, por favor.',NULL,1),
('payment','you','Of course. That comes to thirty-two pounds exactly.','Claro. Son treinta y dos libras justas.','"That comes to…" = el total asciende a. Muy de caja.',2),
('payment','customer','Can I pay by card?','¿Puedo pagar con tarjeta?','"By card", no "with card".',3),
('payment','you','Absolutely. Whenever you''re ready — it''s contactless if you prefer.','Por supuesto. Cuando quiera, también es contactless si prefiere.',NULL,4),
('payment','customer','Sorry, is it not working?','Perdone, ¿no funciona?',NULL,5),
('payment','you','Let''s try it once more. Sometimes it takes a second.','Probemos otra vez. A veces tarda un momento.','Nunca digas "your card is bad". Culpa a la máquina.',6),

-- ── 7. REGALO Y TICKETS ─────────────────────────────────
('giftreceipt','key','Would you like it gift-wrapped?','¿Se lo envuelvo para regalo?',NULL,1),
('giftreceipt','key','Shall I pop a gift receipt in the bag?','¿Le meto un ticket regalo en la bolsa?','El ticket regalo no lleva el precio: por eso se ofrece.',2),
('giftreceipt','key','That way they can exchange it if it doesn''t fit.','Así lo pueden cambiar si no le queda bien.','"Fit" = quedar bien de talla.',3),
('giftreceipt','key','Do you need a bag? They''re twenty pence.','¿Necesita bolsa? Cuestan veinte peniques.','En Reino Unido las bolsas se cobran por ley. Hay que preguntarlo.',4),
('giftreceipt','key','Keep hold of your receipt, just in case.','Guarde el ticket, por si acaso.','"Keep hold of" = conserve. "Just in case" = por si acaso.',5),
('giftreceipt','key','It''s valid for twenty-eight days.','Es válido durante veintiocho días.',NULL,6),
('giftreceipt','customer','It''s a present, could you wrap it?','Es un regalo, ¿lo podría envolver?',NULL,1),
('giftreceipt','you','Of course. Would you like a gift receipt as well?','Claro. ¿Quiere también un ticket regalo?',NULL,2),
('giftreceipt','customer','What''s that exactly?','¿Y eso qué es exactamente?',NULL,3),
('giftreceipt','you','It''s a receipt without the price, so they can exchange it if they need to.','Es un ticket sin el precio, para que lo puedan cambiar si lo necesitan.',NULL,4),
('giftreceipt','customer','Oh, that''s handy. Yes please.','Ah, qué práctico. Sí, por favor.','"Handy" = práctico, útil. Muy común.',5),
('giftreceipt','you','No problem. I''ll pop it in the bag for you.','Sin problema. Se lo meto en la bolsa.',NULL,6),

-- ── 8. DEVOLUCIONES ─────────────────────────────────────
('returns','key','Have you got the receipt with you?','¿Trae el ticket?','Primera pregunta siempre, pero con "have you got", no "do you have the ticket".',1),
('returns','key','Was there anything wrong with it?','¿Tenía algún problema?','Obligatorio preguntarlo, y sirve para detectar defectos.',2),
('returns','key','You can exchange it or get a credit note.','Puede cambiarlo o llevarse un vale.','"Credit note" = vale de compra. No "voucher" (eso es cupón/descuento).',3),
('returns','key','I''m afraid we can''t refund sale items.','Me temo que no podemos devolver el dinero de artículos rebajados.','"Refund" (devolver dinero) ≠ "return" (devolver la prenda).',4),
('returns','key','It has to be unworn and with the tags still on.','Tiene que estar sin usar y con las etiquetas puestas.','"Tags" = etiquetas. "Unworn" = sin estrenar.',5),
('returns','key','The refund should be back in your account within five working days.','El reembolso estará en su cuenta en cinco días laborables.','"Working days" = días laborables.',6),
('returns','key','Let me just check with my manager.','Déjeme consultarlo con mi encargado.','La frase que te salva de decir que no tú solo.',7),
('returns','customer','Hi, I''d like to return this. It doesn''t fit.','Hola, quería devolver esto. No me queda bien.',NULL,1),
('returns','you','No problem at all. Have you got the receipt with you?','Sin ningún problema. ¿Trae el ticket?',NULL,2),
('returns','customer','Yes, here you go. Can I get my money back?','Sí, aquí tiene. ¿Me devuelven el dinero?','"Here you go" = aquí tiene. Lo dirás y lo oirás sin parar.',3),
('returns','you','Let me have a look. It was bought last week, so that''s fine.','Déjeme ver. Se compró la semana pasada, así que sin problema.',NULL,4),
('returns','customer','Great. How long does it take?','Genial. ¿Cuánto tarda?',NULL,5),
('returns','you','It goes back on the card you paid with, usually three to five working days.','Vuelve a la tarjeta con la que pagó, normalmente de tres a cinco días laborables.',NULL,6),

-- ── 9. REBAJAS Y DESCUENTOS ─────────────────────────────
('discounts','key','It''s three for two on all of these.','Hay un 3x2 en todos estos.','El 3x2 se dice "three for two". No "3 by 2".',1),
('discounts','key','That''s twenty per cent off the original price.','Es un veinte por ciento sobre el precio original.','"Per cent off" = de descuento.',2),
('discounts','key','I''m afraid the offer doesn''t apply to this one.','Me temo que la oferta no se aplica a este.',NULL,3),
('discounts','key','The discount comes off automatically at the till.','El descuento se aplica solo en caja.',NULL,4),
('discounts','key','It''s already been reduced.','Ya está rebajado.','"Reduced" = rebajado. En el cartel pone "Reduced".',5),
('discounts','key','The sale ends on Sunday.','Las rebajas terminan el domingo.','"Sale" = rebajas. OJO: "sales" son las ventas.',6),
('discounts','customer','Excuse me, is this one in the sale?','Perdone, ¿este está de rebajas?',NULL,1),
('discounts','you','Let me scan it for you. Yes, it''s down from fifty to thirty-five.','Déjeme escanearlo. Sí, ha bajado de cincuenta a treinta y cinco.','"Down from X to Y" = ha bajado de X a Y.',2),
('discounts','customer','Oh brilliant. And is the three for two on as well?','Ah, genial. ¿Y el 3x2 también está activo?','"To be on" = estar activo/vigente.',3),
('discounts','you','It is, but I''m afraid it doesn''t apply to reduced items.','Sí, pero me temo que no se aplica a artículos ya rebajados.',NULL,4),
('discounts','customer','Ah, fair enough.','Ah, vale, es justo.','"Fair enough" = me parece bien. Muy útil para cerrar un tema.',5),
('discounts','you','Sorry about that. It''s still a good saving, though.','Lo siento. Aun así es un buen ahorro.','"Saving" = ahorro. Termina en positivo.',6),

-- ── 10. QUEJAS ──────────────────────────────────────────
('complaints','key','I''m really sorry about that.','Lo siento mucho.','Disculparse por la situación no es admitir culpa.',1),
('complaints','key','I can see why you''re frustrated.','Entiendo que esté molesto.','Validar antes de resolver. Baja el tono al instante.',2),
('complaints','key','Let me see what I can do for you.','Déjeme ver qué puedo hacer.',NULL,3),
('complaints','key','Bear with me a moment.','Deme un momento.','"Bear with me" = tenga paciencia. Se usa muchísimo.',4),
('complaints','key','I''ll get my manager, she''ll be able to help.','Aviso a mi encargada, ella podrá ayudarle.',NULL,5),
('complaints','key','Thanks for letting us know.','Gracias por avisarnos.','Convierte la queja en favor. Desarma al cliente.',6),
('complaints','key','That shouldn''t have happened.','Eso no debería haber pasado.','Reconoce el fallo sin echarte la culpa personalmente.',7),
('complaints','customer','This is the second time I''ve come in and it''s still not sorted.','Es la segunda vez que vengo y sigue sin resolverse.','"Sorted" = resuelto, arreglado. Muy británico.',1),
('complaints','you','I''m really sorry, that shouldn''t have happened. Let me look into it.','Lo siento mucho, eso no debería haber pasado. Déjeme investigarlo.','"Look into it" = investigarlo.',2),
('complaints','customer','I''ve already explained it twice.','Ya lo he explicado dos veces.',NULL,3),
('complaints','you','I understand, and I won''t make you explain it again. Bear with me one moment.','Lo entiendo, y no le voy a hacer explicarlo otra vez. Deme un momento.','Prometer que no repetirá la historia es lo que más calma.',4),
('complaints','customer','Fine. Thank you.','Vale. Gracias.',NULL,5),
('complaints','you','Thanks for your patience. Let''s get this sorted for you.','Gracias por su paciencia. Vamos a resolverlo.','"Let''s get this sorted" = vamos a arreglarlo. Cierra en equipo.',6),

-- ── 11. TELÉFONO ────────────────────────────────────────
('phone','key','Good morning, thanks for calling. How can I help?','Buenos días, gracias por llamar. ¿En qué puedo ayudarle?',NULL,1),
('phone','key','Sorry, could you say that again, please?','Perdone, ¿me lo puede repetir?','Mejor que "What?", que suena brusco.',2),
('phone','key','Could you speak up a bit? The line''s not great.','¿Puede hablar un poco más alto? La línea no va bien.','"Speak up" = hablar más alto. Culpa a la línea, no al cliente.',3),
('phone','key','Bear with me, I''ll just check for you.','Un momento, lo compruebo.',NULL,4),
('phone','key','Can I take your name and number?','¿Me da su nombre y teléfono?',NULL,5),
('phone','key','How do you spell that?','¿Cómo se escribe?','Imprescindible. Y practica el alfabeto en inglés.',6),
('phone','key','I''ll get someone to call you back.','Haré que alguien le devuelva la llamada.','"Call back" = devolver la llamada.',7),
('phone','customer','Hi, I''m calling to see if you have the blue coat in a size 10.','Hola, llamo para ver si tienen el abrigo azul en la talla 10.',NULL,1),
('phone','you','Let me check for you. Bear with me one second.','Déjeme comprobarlo. Un segundo.',NULL,2),
('phone','customer','No problem.','Sin problema.',NULL,3),
('phone','you','Yes, we''ve got one left. Would you like me to put it aside?','Sí, nos queda uno. ¿Quiere que se lo aparte?',NULL,4),
('phone','customer','Yes please. It''s under Marshall.','Sí por favor. A nombre de Marshall.','"It''s under [nombre]" = a nombre de.',5),
('phone','you','Sorry, how do you spell that?','Perdone, ¿cómo se escribe?','Nunca adivines un nombre. Pregunta siempre.',6),

-- ── 12. CERRAR LA VENTA ─────────────────────────────────
('closing','key','Is that everything for you today?','¿Eso es todo?',NULL,1),
('closing','key','Would you like a bag with that?','¿Quiere bolsa?',NULL,2),
('closing','key','There you go. Enjoy the rest of your day.','Aquí tiene. Que pase buen día.','"There you go" al entregar algo. Automático.',3),
('closing','key','Thanks very much, see you soon.','Muchas gracias, hasta pronto.',NULL,4),
('closing','key','Hope you like it!','¡Espero que le guste!','Se omite el "I" al principio. Suena natural y cercano.',5),
('closing','key','Have a good one!','¡Que vaya bien!','Despedida informal y muy usada.',6),
('closing','customer','That''s everything, thanks.','Eso es todo, gracias.',NULL,1),
('closing','you','Lovely. That''s forty-two pounds, please.','Perfecto. Son cuarenta y dos libras, por favor.',NULL,2),
('closing','customer','Here you go.','Aquí tiene.',NULL,3),
('closing','you','Thank you. Here''s your receipt, and your change.','Gracias. Aquí tiene su ticket y su cambio.',NULL,4),
('closing','customer','Cheers, bye.','Gracias, adiós.','"Cheers" en UK = gracias (además de salud al brindar).',5),
('closing','you','Thanks a lot, have a good one!','Muchas gracias, ¡que vaya bien!',NULL,6)

) AS v(slug, kind, en, es, note, ord) ON v.slug = s.slug;

-- ══════════════════════ VOCABULARIO DE TIENDA ══════════════════════
INSERT INTO words (word, translation, example_sentence, level, category, track_id, audio_hint)
SELECT v.word, v.translation, v.example, v.level, 'work', t.id, v.hint
FROM tracks t, (VALUES
  ('till',            'caja registradora',        'Please pay at the till.',                       'A2', NULL),
  ('receipt',         'ticket, recibo',           'Keep hold of your receipt.',                    'A2', 'rɪˈsiːt — la P es muda'),
  ('change',          'cambio (dinero)',          'Here''s your change.',                          'A2', NULL),
  ('fitting room',    'probador',                 'The fitting rooms are over there.',             'A2', NULL),
  ('aisle',           'pasillo',                  'It''s in the next aisle.',                      'A2', 'aɪl — la S es muda'),
  ('shelf',           'estante, balda',           'It''s on the top shelf.',                       'A2', NULL),
  ('trolley',         'carro de la compra',       'You can leave the trolley here.',               'A2', NULL),
  ('basket',          'cesta',                    'Baskets are by the entrance.',                  'A2', NULL),
  ('queue',           'cola, fila',               'The queue starts over there.',                  'A2', 'kjuː — se dice como la letra Q'),
  ('tag',             'etiqueta',                 'The tags need to still be on.',                 'A2', NULL),
  ('size',            'talla',                    'What size are you looking for?',                'A2', NULL),
  ('jumper',          'jersey',                   'That jumper comes in three colours.',           'A2', NULL),
  ('trousers',        'pantalones',               'These trousers run small.',                     'A2', NULL),
  ('trainers',        'zapatillas deportivas',    'The trainers are downstairs.',                  'A2', NULL),
  ('stock',           'existencias, stock',       'We''ve got none left in stock.',                'B1', NULL),
  ('sold out',        'agotado',                  'I''m afraid we''ve sold out.',                  'A2', NULL),
  ('delivery',        'pedido, entrega',          'We''re getting a delivery on Friday.',          'A2', NULL),
  ('branch',          'sucursal, otra tienda',    'Our other branch might have it.',               'B1', NULL),
  ('refund',          'reembolso, devolver dinero','Can I get a refund?',                          'B1', NULL),
  ('exchange',        'cambio de producto',       'You can exchange it for another size.',         'B1', NULL),
  ('credit note',     'vale de compra',           'We can give you a credit note.',                'B1', NULL),
  ('faulty',          'defectuoso',               'The zip is faulty.',                            'B1', NULL),
  ('warranty',        'garantía',                 'It comes with a two-year warranty.',            'B1', NULL),
  ('sale',            'rebajas',                  'It''s in the sale this week.',                  'A2', 'sale = rebajas; sales = ventas'),
  ('discount',        'descuento',                'There''s a ten per cent discount.',             'A2', NULL),
  ('bargain',         'chollo, ganga',            'That''s a real bargain.',                       'B1', NULL),
  ('voucher',         'cupón de descuento',       'Have you got a voucher?',                       'B1', NULL),
  ('loyalty card',    'tarjeta de fidelidad',     'Do you have a loyalty card?',                   'B1', NULL),
  ('contactless',     'pago sin contacto',        'It''s contactless if you prefer.',              'A2', NULL),
  ('declined',        'rechazada (tarjeta)',      'Sorry, it''s been declined.',                   'B1', NULL),
  ('gift-wrap',       'envolver para regalo',     'Would you like it gift-wrapped?',               'B1', NULL),
  ('working days',    'días laborables',          'Three to five working days.',                   'B1', NULL),
  ('to suit',         'quedar bien (color/estilo)','That colour really suits you.',                'B1', 'suit = estilo · fit = talla'),
  ('to fit',          'quedar bien (de talla)',   'It doesn''t fit me.',                           'A2', NULL),
  ('to run small',    'tallar pequeño',           'These run small, try a size up.',               'B1', NULL),
  ('to size up',      'coger una talla más',      'You might want to size up.',                    'B1', NULL),
  ('to try on',       'probarse',                 'Would you like to try it on?',                  'A2', NULL),
  ('to put aside',    'apartar, reservar',        'Shall I put one aside for you?',                'B1', NULL),
  ('to order in',     'traer por encargo',        'I can order it in for you.',                    'B1', NULL),
  ('to sort out',     'resolver, arreglar',       'Let''s get this sorted.',                       'B1', NULL),
  ('to look into',    'investigar, mirar',        'I''ll look into it for you.',                   'B1', NULL),
  ('to bear with',    'tener paciencia',          'Bear with me a moment.',                        'B1', 'beə — suena como "bear" el oso'),
  ('to browse',       'mirar sin comprar',        'I''m just browsing, thanks.',                   'A2', NULL),
  ('to be after',     'buscar algo',              'What size are you after?',                      'B1', NULL),
  ('to speak up',     'hablar más alto',          'Could you speak up a bit?',                     'B1', NULL),
  ('to call back',    'devolver la llamada',      'I''ll get someone to call you back.',           'A2', NULL),
  ('to come to',      'ascender a (total)',       'That comes to thirty pounds.',                  'B1', NULL),
  ('brilliant',       'genial, estupendo',        'That''d be brilliant, thanks.',                 'A2', NULL),
  ('lovely',          'perfecto, estupendo',      'Lovely, that''s all sorted.',                   'A2', NULL),
  ('handy',           'práctico, útil',           'Oh, that''s handy.',                            'B1', NULL),
  ('smart',           'elegante, arreglado',      'It''s a bit smarter.',                          'B1', 'en UK = elegante, NO listo'),
  ('fair enough',     'me parece bien',           'Ah, fair enough.',                              'B1', NULL),
  ('that''s a shame', 'qué pena',                 'Oh no, that''s a shame.',                       'B1', NULL),
  ('cheers',          'gracias (informal)',       'Cheers, see you soon.',                         'A2', NULL),
  ('no worries',      'sin problema',             'No worries at all.',                            'A2', NULL)
) AS v(word, translation, example, level, hint)
WHERE t.slug = 'retail'
  AND NOT EXISTS (SELECT 1 FROM words w WHERE lower(w.word) = lower(v.word));

-- Meter el vocabulario nuevo en el SRS del perfil 1
INSERT INTO user_words (profile_id, word_id, status, next_review_date)
SELECT 1, w.id, 'new', CURRENT_DATE
FROM words w
WHERE w.track_id = (SELECT id FROM tracks WHERE slug = 'retail')
ON CONFLICT (profile_id, word_id) DO NOTHING;

COMMIT;
