-- TutorIngles · Migración 16 — Pronunciación figurada y entrenamiento de oído
--
-- Aplicar:
--   ssh droplet 'docker exec -i postgres psql -U postgres -d tutoringles \
--     -v ON_ERROR_STOP=1 < /opt/tutoringles/migration_16_pronunciacion.sql'
--
-- Idempotente y reejecutable, como el resto.
--
-- Contexto: hasta ahora la app tenía SIETE pistas de pronunciación para 209
-- palabras, y encima escritas en AFI. Esta migración trae:
--   · lexicon         — 147.488 palabras con su transcripción británica
--   · pron_overrides  — correcciones a mano que mandan sobre el diccionario
--   · pron_contrasts  — los sonidos que un español confunde, con sus pares
--   · pron_traps      — las trampas del hispanohablante (e fantasma, -ed…)
--
-- La figurada NO se guarda: se calcula al vuelo con lib/respelling.js, para
-- poder afinar el motor sin tener que reimportar nada.

-- ══════════════════════ DICCIONARIO ══════════════════════
-- Se rellena aparte, con el TSV que genera tools/generar-lexico.js:
--   scp data/lexicon.tsv droplet:/tmp/
--   ssh droplet 'docker exec -i postgres psql -U postgres -d tutoringles \
--     -c "\copy lexicon(word,ipa,fuente) FROM STDIN" < /tmp/lexicon.tsv'
CREATE TABLE IF NOT EXISTS lexicon (
  word   VARCHAR(80) PRIMARY KEY,      -- siempre en minúsculas
  ipa    TEXT        NOT NULL,         -- AFI británico, sin barras
  fuente VARCHAR(10) NOT NULL DEFAULT 'uk'
);

-- Correcciones a mano. Mandan sobre `lexicon`: el diccionario automático se
-- equivoca en algunas palabras (trousers con s sorda, aisle en dos sílabas) y
-- aquí es donde se arreglan sin tocar los 147.000 registros.
CREATE TABLE IF NOT EXISTS pron_overrides (
  word  VARCHAR(80) PRIMARY KEY,
  ipa   TEXT        NOT NULL,
  nota  TEXT,                          -- aviso propio, sustituye al automático
  motivo TEXT                          -- por qué se corrigió, para no revertirlo
);

INSERT INTO pron_overrides (word, ipa, nota, motivo) VALUES
  ('aisle',    'aɪl',        'La S es muda. Suena igual que "I''ll"', 'el diccionario la parte en dos sílabas'),
  ('trousers', 'ˈtraʊzəz',   'La s del medio zumba: TRÁU-səs con s sonora', 'el diccionario pone s sorda'),
  ('receipt',  'rɪˈsiːt',    'La P es muda',                        'normalizar el acento'),
  ('queue',    'kjuː',       'Se dice como la letra Q, nada más',   'las cuatro últimas letras no suenan'),
  ('clothes',  'kləʊðz',     'Casi nadie dice la TH: suena como "close"', 'simplificación real del habla'),
  ('comfortable','ˈkʌmftəbəl','Tres sílabas, no cuatro: KAMF-tə-bəl', 'la o del medio desaparece'),
  ('vegetable','ˈvedʒtəbəl', 'Tres sílabas: VEDJ-tə-bəl',           'la e del medio desaparece'),
  ('wednesday','ˈwenzdeɪ',   'La primera D es muda: UENS-dei',      'grafía engañosa'),
  ('business', 'ˈbɪznəs',    'Dos sílabas: BIS-nəs',                'la i del medio no suena'),
  ('chocolate','ˈtʃɒklət',   'Tres sílabas: CHOK-lət',              'la o del medio desaparece')
ON CONFLICT (word) DO UPDATE
  SET ipa = EXCLUDED.ipa, nota = EXCLUDED.nota, motivo = EXCLUDED.motivo;

-- ══════════════════════ CONTRASTES DE SONIDO ══════════════════════
-- Los pares mínimos son la única parte del entrenamiento de pronunciación que
-- se puede medir de verdad sin servicio externo: se oye uno y se elige cuál
-- era. Entrenar la percepción va por delante de arreglar la producción — no se
-- puede decir bien un sonido que no se distingue al oírlo.
CREATE TABLE IF NOT EXISTS pron_contrasts (
  id            SERIAL PRIMARY KEY,
  slug          VARCHAR(40) UNIQUE NOT NULL,
  titulo_es     VARCHAR(120) NOT NULL,
  sonido_a      VARCHAR(12) NOT NULL,   -- AFI del primer sonido
  sonido_b      VARCHAR(12) NOT NULL,
  figurada_a    VARCHAR(12) NOT NULL,   -- cómo se escribe en nuestro sistema
  figurada_b    VARCHAR(12) NOT NULL,
  por_que_es    TEXT NOT NULL,          -- por qué le cuesta a un español
  como_se_hace  TEXT NOT NULL,          -- instrucción física, con la boca
  nivel         VARCHAR(4) NOT NULL DEFAULT 'A2',
  orden         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pron_pairs (
  id          SERIAL PRIMARY KEY,
  contrast_id INTEGER NOT NULL REFERENCES pron_contrasts(id) ON DELETE CASCADE,
  word_a      VARCHAR(40) NOT NULL,
  es_a        VARCHAR(80) NOT NULL,
  word_b      VARCHAR(40) NOT NULL,
  es_b        VARCHAR(80) NOT NULL,
  orden       INTEGER NOT NULL DEFAULT 0,
  UNIQUE (contrast_id, word_a, word_b)
);
CREATE INDEX IF NOT EXISTS pron_pairs_contrast_idx ON pron_pairs(contrast_id, orden);

-- Progreso: cuelga de profile_id como todo lo demás desde la migración 07.
CREATE TABLE IF NOT EXISTS pron_progress (
  id          SERIAL PRIMARY KEY,
  profile_id  INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(id) ON DELETE CASCADE,
  contrast_id INTEGER NOT NULL REFERENCES pron_contrasts(id) ON DELETE CASCADE,
  aciertos    INTEGER NOT NULL DEFAULT 0,
  fallos      INTEGER NOT NULL DEFAULT 0,
  mejor_pct   INTEGER CHECK (mejor_pct BETWEEN 0 AND 100),
  ultima_vez  TIMESTAMPTZ,
  UNIQUE (profile_id, contrast_id)
);

INSERT INTO pron_contrasts (slug, titulo_es, sonido_a, sonido_b, figurada_a, figurada_b, por_que_es, como_se_hace, nivel, orden) VALUES
  ('i-corta-larga', 'La i corta y la i larga', 'ɪ', 'iː', 'i', 'ii',
   'El español solo tiene una i. El inglés tiene dos y distinguen palabras enteras: ship (barco) y sheep (oveja) no son la misma.',
   'Para la corta, relaja la boca y déjala caer hacia la e: casi "she". Para la larga, estira los labios como en una sonrisa y alárgala el doble.',
   'A2', 1),
  ('b-v', 'La b y la v', 'b', 'v', 'b', 'v',
   'En español la b y la v suenan igual. En inglés son sonidos distintos y confundirlos cambia la palabra: berry (baya) y very (muy).',
   'Para la v, muerde suavemente el labio de abajo con los dientes de arriba y deja pasar el aire. Los labios NO se juntan.',
   'A2', 2),
  ('s-z', 'La s que zumba', 's', 'z', 's', 's (sonora)',
   'El español no tiene s sonora, así que ensordecemos todos los plurales y todas las terminaciones. Es lo que más marca acento.',
   'Pon la mano en la garganta: con la z inglesa tiene que vibrar, como una abeja. Con la s normal, no.',
   'A2', 3),
  ('e-fantasma', 'La e que sobra delante de la s', 'es', 's', 'es-', 's-',
   'En español no hay palabras que empiecen por s + consonante, así que le ponemos una e delante sin darnos cuenta: "escuul" por school. Es el error número uno del hispanohablante.',
   'Arranca directamente con el siseo de la serpiente y engánchalo a la consonante. Practica alargando la s: ssssschool.',
   'A2', 4),
  ('a-e-abierta', 'La a abierta', 'æ', 'e', 'æ', 'e',
   'La æ está a medio camino entre nuestra a y nuestra e, y no existe en español. Sin ella, bad (malo) y bed (cama) se confunden.',
   'Di una a española y, sin parar, abre más la boca y baja la mandíbula como si fueras al dentista.',
   'A2', 5),
  ('u-corta-larga', 'La u corta y la u larga', 'ʊ', 'uː', 'u', 'uu',
   'Igual que con la i: el inglés tiene dos úes y el español solo una. full (lleno) y fool (tonto) se distinguen solo por eso.',
   'Para la corta, labios relajados y sonido breve. Para la larga, saca los labios como para dar un beso y alárgala.',
   'A2', 6),
  ('sh-ch', 'La sh y la ch', 'ʃ', 'tʃ', 'sh', 'ch',
   'El español solo tiene ch, así que tendemos a convertir todas las sh en ch: "chop" por shop.',
   'La sh es el sonido de mandar callar: aire continuo, sin golpe. La ch empieza con la lengua pegada y explota.',
   'A2', 7),
  ('h-suave', 'La h que sí suena', '∅', 'h', '(muda)', 'j',
   'En español la h no suena nunca, y cuando la pronunciamos nos sale la j fuerte de "jamón". La inglesa es un simple soplo.',
   'Empaña un cristal con el aliento: ese soplo es la h inglesa. La garganta no raspa.',
   'A2', 8),
  ('n-ng', 'La n del final', 'n', 'ŋ', 'n', 'ng',
   'El inglés distingue thin (delgado) de thing (cosa) solo por el final. En español ese sonido solo aparece antes de g o k, nunca solo.',
   'Di "tengo" y párate justo antes de la g: la lengua toca el paladar del fondo, la punta no toca nada.',
   'B1', 9),
  ('dj-y', 'La j inglesa', 'dʒ', 'j', 'dj', 'y',
   'La j de John no existe en español y solemos cambiarla por y: "yet" en lugar de "jet".',
   'Es una ch pero con la garganta vibrando. Di "ch" y añade voz sin soltar la lengua.',
   'B1', 10),
  ('th-sonora', 'Las dos th', 'θ', 'ð', 'z', 'd',
   'Aquí el español de España juega con ventaja: la th de think es nuestra z de zapato, y la de this es nuestra d de cada. Solo hay que no mezclarlas.',
   'En las dos, la punta de la lengua asoma entre los dientes. En think no vibra la garganta; en this sí.',
   'B1', 11),
  ('r-inglesa', 'La r que no vibra', 'ɹ', 'r', 'r', 'rr',
   'La r española vibra porque la lengua golpea el paladar. La inglesa no toca nada, y una r vibrada delata el acento al instante.',
   'Pon la lengua como para decir una r, pero párala a medio camino sin que llegue a tocar. Redondea un poco los labios.',
   'B1', 12)
ON CONFLICT (slug) DO UPDATE
  SET titulo_es = EXCLUDED.titulo_es, por_que_es = EXCLUDED.por_que_es,
      como_se_hace = EXCLUDED.como_se_hace, orden = EXCLUDED.orden;

INSERT INTO pron_pairs (contrast_id, word_a, es_a, word_b, es_b, orden)
SELECT c.id, v.a, v.ea, v.b, v.eb, v.ord
FROM pron_contrasts c JOIN (VALUES
  ('i-corta-larga', 'ship',   'barco',            'sheep',  'oveja',            1),
  ('i-corta-larga', 'live',   'vivir',            'leave',  'irse',             2),
  ('i-corta-larga', 'bit',    'trozo',            'beat',   'golpear',          3),
  ('i-corta-larga', 'fill',   'llenar',           'feel',   'sentir',           4),
  ('i-corta-larga', 'this',   'este',             'these',  'estos',            5),
  ('i-corta-larga', 'chip',   'patata frita',     'cheap',  'barato',           6),
  ('i-corta-larga', 'sit',    'sentarse',         'seat',   'asiento',          7),
  ('i-corta-larga', 'it',     'ello',             'eat',    'comer',            8),

  ('b-v',           'berry',  'baya',             'very',   'muy',              1),
  ('b-v',           'boat',   'barco',            'vote',   'votar',            2),
  ('b-v',           'ban',    'prohibir',         'van',    'furgoneta',        3),
  ('b-v',           'best',   'el mejor',         'vest',   'camiseta interior',4),
  ('b-v',           'curb',   'bordillo',         'curve',  'curva',            5),
  ('b-v',           'bet',    'apostar',          'vet',    'veterinario',      6),

  ('s-z',           'price',  'precio',           'prize',  'premio',           1),
  ('s-z',           'place',  'sitio',            'plays',  'juega',            2),
  ('s-z',           'bus',    'autobús',          'buzz',   'zumbido',          3),
  ('s-z',           'ice',    'hielo',            'eyes',   'ojos',             4),
  ('s-z',           'race',   'carrera',          'raise',  'subir',            5),
  ('s-z',           'loose',  'suelto',           'lose',   'perder',           6),

  ('a-e-abierta',   'bad',    'malo',             'bed',    'cama',             1),
  ('a-e-abierta',   'man',    'hombre',           'men',    'hombres',          2),
  ('a-e-abierta',   'had',    'tenía',            'head',   'cabeza',           3),
  ('a-e-abierta',   'bat',    'murciélago',       'bet',    'apostar',          4),
  ('a-e-abierta',   'sad',    'triste',           'said',   'dijo',             5),
  ('a-e-abierta',   'pan',    'sartén',           'pen',    'bolígrafo',        6),

  ('u-corta-larga', 'full',   'lleno',            'fool',   'tonto',            1),
  ('u-corta-larga', 'pull',   'tirar de',         'pool',   'piscina',          2),
  ('u-corta-larga', 'look',   'mirar',            'Luke',   'Lucas',            3),
  ('u-corta-larga', 'foot',   'pie',              'food',   'comida',           4),
  ('u-corta-larga', 'should', 'debería',          'shooed', 'espantó',          5),

  ('sh-ch',         'shop',   'tienda',           'chop',   'cortar',           1),
  ('sh-ch',         'ship',   'barco',            'chip',   'patata frita',     2),
  ('sh-ch',         'wash',   'lavar',            'watch',  'reloj, mirar',     3),
  ('sh-ch',         'share',  'compartir',        'chair',  'silla',            4),
  ('sh-ch',         'cash',   'efectivo',         'catch',  'coger',            5),
  ('sh-ch',         'sheep',  'oveja',            'cheap',  'barato',           6),

  ('h-suave',       'eat',    'comer',            'heat',   'calor',            1),
  ('h-suave',       'air',    'aire',             'hair',   'pelo',             2),
  ('h-suave',       'arm',    'brazo',            'harm',   'daño',             3),
  ('h-suave',       'old',    'viejo',            'hold',   'sujetar',          4),
  ('h-suave',       'ill',    'enfermo',          'hill',   'colina',           5),
  ('h-suave',       'and',    'y',                'hand',   'mano',             6),

  ('n-ng',          'thin',   'delgado',          'thing',  'cosa',             1),
  ('n-ng',          'sin',    'pecado',           'sing',   'cantar',           2),
  ('n-ng',          'ban',    'prohibir',         'bang',   'golpe',            3),
  ('n-ng',          'run',    'correr',           'rung',   'peldaño',          4),
  ('n-ng',          'win',    'ganar',            'wing',   'ala',              5),

  ('dj-y',          'jet',    'reactor',          'yet',    'todavía',          1),
  ('dj-y',          'jam',    'mermelada',        'yam',    'boniato',          2),
  ('dj-y',          'joke',   'broma',            'yolk',   'yema',             3),
  ('dj-y',          'jaw',    'mandíbula',        'your',   'tu',               4),

  ('th-sonora',     'think',  'pensar',           'sink',   'fregadero',        1),
  ('th-sonora',     'thin',   'delgado',          'tin',    'lata',             2),
  ('th-sonora',     'three',  'tres',             'tree',   'árbol',            3),
  ('th-sonora',     'mouth',  'boca',             'mouse',  'ratón',            4),
  ('th-sonora',     'they',   'ellos',            'day',    'día',              5),
  ('th-sonora',     'breathe','respirar',         'breed',  'criar',            6),

  ('r-inglesa',     'right',  'correcto',         'light',  'luz',              1),
  ('r-inglesa',     'red',    'rojo',             'led',    'condujo',          2),
  ('r-inglesa',     'rock',   'roca',             'lock',   'cerradura',        3),
  ('r-inglesa',     'grass',  'hierba',           'glass',  'vaso',             4),
  ('r-inglesa',     'pray',   'rezar',            'play',   'jugar',            5),

  ('e-fantasma',    'school', 'colegio',          'cool',   'guay',             1),
  ('e-fantasma',    'Spain',  'España',           'pain',   'dolor',            2),
  ('e-fantasma',    'stop',   'parar',            'top',    'lo más alto',      3),
  ('e-fantasma',    'start',  'empezar',          'tart',   'tarta',            4),
  ('e-fantasma',    'small',  'pequeño',          'mall',   'centro comercial', 5),
  ('e-fantasma',    'speak',  'hablar',           'peak',   'cima',             6),
  ('e-fantasma',    'store',  'tienda',           'tore',   'rasgó',            7),
  ('e-fantasma',    'stand',  'estar de pie',     'and',    'y',                8)
) AS v(slug, a, ea, b, eb, ord) ON v.slug = c.slug
ON CONFLICT (contrast_id, word_a, word_b) DO NOTHING;

-- ══════════════════════ TRAMPAS DEL HISPANOHABLANTE ══════════════════════
-- Reglas que no son un par de sonidos sino un patrón que se repite. Los
-- ejemplos van en JSON porque cada trampa tiene una forma distinta.
CREATE TABLE IF NOT EXISTS pron_traps (
  id        SERIAL PRIMARY KEY,
  slug      VARCHAR(40) UNIQUE NOT NULL,
  titulo_es VARCHAR(120) NOT NULL,
  regla_es  TEXT NOT NULL,
  ejemplos  JSONB NOT NULL DEFAULT '[]',
  orden     INTEGER NOT NULL DEFAULT 0
);

INSERT INTO pron_traps (slug, titulo_es, regla_es, ejemplos, orden) VALUES
  ('ed-final', 'Cómo suena el pasado -ed',
   'La terminación -ed tiene tres sonidos distintos y solo uno es "id". Se elige por el sonido que va justo antes, no por la letra.',
   '[{"regla":"Después de T o D suena /ɪd/ y añade una sílaba","casos":[["wanted","UON-tid"],["needed","NII-did"],["started","STAA-tid"]]},
     {"regla":"Después de sonido sordo (p, k, f, s, sh, ch) suena /t/","casos":[["walked","UOOKT"],["washed","UOSHT"],["helped","JELPT"]]},
     {"regla":"Después de sonido sonoro o vocal suena /d/","casos":[["played","PLEID"],["opened","OU-pənd"],["closed","KLOUSD"]]}]',
   1),
  ('plural-s', 'Cómo suena la -s del plural',
   'Igual que el pasado: tres sonidos. El español los ensordece todos, y eso es lo que más marca el acento en una tienda, donde los plurales salen sin parar.',
   '[{"regla":"Después de s, z, sh, ch, x suena /ɪz/ y añade sílaba","casos":[["boxes","BOK-sis"],["watches","UO-chis"],["prices","PRAI-sis"]]},
     {"regla":"Después de sonido sordo suena /s/","casos":[["shirts","SHƏƏTS"],["books","BUKS"],["receipts","ri-SIITS"]]},
     {"regla":"Después de sonido sonoro o vocal suena /z/ (zumba)","casos":[["bags","BÆGS con s sonora"],["shoes","SHUUS con s sonora"],["sizes","SAI-sis"]]}]',
   2),
  ('e-fantasma', 'La e que se cuela delante de la s',
   'En español ninguna palabra empieza por s + consonante, así que le ponemos una e delante sin querer. En inglés esa e no existe y se nota muchísimo.',
   '[{"regla":"Arranca directamente con el siseo, sin e","casos":[["school","SKUUL, no ESKUUL"],["Spain","SPEIN, no ESPEIN"],["student","STIUU-dənt"],["street","STRIIT"],["stock","STOK"],["small","SMOOL"]]}]',
   3),
  ('letras-mudas', 'Letras que se escriben y no se dicen',
   'El inglés arrastra letras de su propia historia que dejaron de pronunciarse hace siglos. La grafía engaña: hay que fiarse del sonido.',
   '[{"regla":"Mudas en palabras de tienda","casos":[["receipt","ri-SIIT — la P"],["aisle","ÁIL — la S"],["Wednesday","UENS-dei — la primera D"],["half","JAAF — la L"],["could","KUD — la L"]]},
     {"regla":"Grupos que no suenan","casos":[["know","NOU — la K"],["write","RAIT — la W"],["thought","ZOOT — el GH"],["listen","LI-sən — la T"]]}]',
   4),
  ('silabas-que-caen', 'Palabras que tienen menos sílabas de las que parece',
   'El inglés se come sílabas enteras en las palabras largas. Pronunciarlas todas suena a libro de texto, no a persona.',
   '[{"regla":"Se dicen con una sílaba menos","casos":[["comfortable","KAMF-tə-bəl, no com-for-ta-ble"],["vegetable","VEDJ-tə-bəl"],["chocolate","CHOK-lət"],["business","BIS-nəs"],["different","DI-frənt"],["interesting","IN-trəs-ting"]]}]',
   5)
ON CONFLICT (slug) DO UPDATE
  SET titulo_es = EXCLUDED.titulo_es, regla_es = EXCLUDED.regla_es,
      ejemplos = EXCLUDED.ejemplos, orden = EXCLUDED.orden;

-- ══════════════════════ PERMISOS ══════════════════════
-- Las tablas se crean como `postgres` pero la app se conecta como
-- `tutoringles`. Sin esto sale "permission denied for table".
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "tutoringles";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "tutoringles";
