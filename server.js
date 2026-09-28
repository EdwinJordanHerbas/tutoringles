// TutorIngles Backend v1 — PWA para aprender inglés A2→C1 Cambridge CAE
// Requiere Node 18+ (usa fetch global)
const express = require('express');
const { Pool } = require('pg');
const app = express();

// ════════════════════════════════════════════════════════
// CONFIG (variables de entorno)
// ════════════════════════════════════════════════════════
const PORT          = parseInt(process.env.PORT || '3400', 10);
const APP_TOKEN     = process.env.APP_TOKEN || '';          // clave de acceso única (mono-usuario)
const APP_USER_NAME = process.env.APP_USER_NAME || 'Stark';

// Perfil activo. Hoy solo existe el 1, pero todo el progreso ya cuelga de aquí:
// añadir más usuarios será resolver este valor desde la sesión, no migrar el esquema.
const PROFILE_ID    = parseInt(process.env.PROFILE_ID || '1', 10);

// ── Estáticos (la PWA) — siempre públicos ────────────────
app.use(express.static(__dirname, {
  setHeaders(res, filePath) {
    if (filePath.endsWith('sw.js') || filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// ── CORS ─────────────────────────────────────────────────
const PROD_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://tutoringles.example.com';
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  const isDev  = process.env.NODE_ENV === 'development' || /^https?:\/\/localhost(:\d+)?$/.test(origin);
  res.setHeader('Access-Control-Allow-Origin', isDev ? (origin || PROD_ORIGIN) : PROD_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json({ limit: '5mb' }));

// ── AUTH: clave de acceso única ──────────────────────────
// Si APP_TOKEN no está definido, la API queda abierta (modo dev).
const crypto = require('crypto');

// Comparación en tiempo constante: evita filtrar el token carácter a carácter
// midiendo cuánto tarda la respuesta.
function tokenValido(recibido) {
  if (!recibido || typeof recibido !== 'string') return false;
  const a = Buffer.from(recibido);
  const b = Buffer.from(APP_TOKEN);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Extrae el token de la cabecera Authorization o del query param (cómodo para probar).
const tokenDe = (req) =>
  (req.headers.authorization || '').replace('Bearer ', '') || req.query.token || '';

const PUBLIC_PATHS = [/^\/health$/, /^\/auth\/check$/];
app.use((req, res, next) => {
  if (!APP_TOKEN) return next();
  if (PUBLIC_PATHS.some(r => r.test(req.path))) return next();
  if (tokenValido(tokenDe(req))) return next();
  res.status(401).json({ error: 'No autorizado' });
});

// Comprueba si la clave recibida es correcta.
// Antes devolvía siempre ok:true, con lo que la pantalla de acceso daba por
// buena CUALQUIER clave y solo fallaba después, al pedir datos.
app.get('/auth/check', (req, res) => {
  if (!APP_TOKEN) return res.json({ ok: true, user: APP_USER_NAME, auth_required: false });
  const ok = tokenValido(tokenDe(req));
  res.json({ ok, user: ok ? APP_USER_NAME : null, auth_required: true });
});

// ── DB ───────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on('error', (e) => console.error('DB error', e.message));
const db = (q, p) => pool.query(q, p);

// ── ERRORES ──────────────────────────────────────────────
// El detalle del fallo (mensaje de Postgres, nombres de usuario y de tabla) se
// queda en el log del servidor. Al cliente le llega una frase que pueda leer una
// persona. Antes se pintaba en pantalla el mensaje crudo del driver, del estilo
// "la autentificación password falló para el usuario X": ni ayuda a quien estudia
// ni debería salir de la máquina.
function fallo(res, e, estado = 500) {
  console.error('[error]', e?.stack || e?.message || e);
  res.status(estado).json({ error: 'No se han podido cargar los datos.' });
}

// ── FSRS (repetición espaciada) ──────────────────────────
// La lógica vive en lib/fsrs.js para poder probarla aislada. Ver los tests
// en test/fsrs.test.js.
const fsrs = require("./lib/fsrs");
const fsrsInit     = fsrs.init;
const fsrsNext     = fsrs.next;
const fsrsInterval = fsrs.interval;

// Suma XP al contador global. Se llama desde cada actividad que puntúa.
async function addXp(amount) {
  const xp = Math.max(0, Math.round(amount || 0));
  if (!xp) return;
  await db(
    `INSERT INTO config (key, value) VALUES ('xp_total', $1)
     ON CONFLICT (key) DO UPDATE SET value = (COALESCE(config.value::int, 0) + $2)::text`,
    [String(xp), xp]
  );
}

// ════════════════════════════════════════════════════════
// PRONUNCIACIÓN FIGURADA — soporte
// ════════════════════════════════════════════════════════
const respelling  = require('./lib/respelling');
const pron        = require('./lib/pronunciacion');
const guiaSonidos = require('./lib/guia-sonidos');
const introPron   = require('./lib/intro-pronunciacion');
const avisos      = require('./lib/avisos');
const fechas      = require('./lib/fechas');
const tetris      = require('./lib/tetris');
const { fasesFrances } = require('./lib/fases');
const { IDIOMAS, esIdioma, normalizarIdioma } = require('./lib/idiomas');

// ── IDIOMA ACTIVO ────────────────────────────────────────
// Desde el 27-sep-2026 la app entrena inglés Y francés. El contenido lleva una
// columna `lang` y todo lo que se enseña (palabras, situaciones, gramática, la
// sesión) se filtra por el idioma activo, que vive en config y no en el
// navegador: así el aviso diario, que sale del servidor, sabe de qué idioma
// hablar sin que el móvil se lo diga.
//
// Se lee en cada petición en vez de cachearlo: es una fila, y una caché aquí
// tendría que invalidarse también desde PUT /config/:key.
async function idiomaActivo() {
  const { rows } = await db("SELECT value FROM config WHERE key='idioma_activo'");
  return normalizarIdioma(rows[0]?.value);
}

/** El idioma pedido con ?lang=, o el activo si no se pide ninguno válido. */
async function idiomaDe(req) {
  const pedido = req.query?.lang;
  return esIdioma(pedido) ? pedido : idiomaActivo();
}

/**
 * El sector de un idioma: el del perfil si es de ese idioma, y si no el
 * primero que haya. El perfil tiene UN sector (retail, en inglés), y el
 * francés tiene el suyo propio (la Suiza romanda): sin esto, cambiar de idioma
 * dejaba TRABAJO enseñando situaciones en inglés.
 */
async function sectorDe(lang) {
  const { rows } = await db(
    `SELECT t.* FROM tracks t
      WHERE t.lang = $2
      ORDER BY (t.id = (SELECT track_id FROM profiles WHERE id = $1)) DESC NULLS LAST,
               t.order_index, t.id
      LIMIT 1`, [PROFILE_ID, lang]);
  return rows[0] || null;
}

/** Varias claves de config de una vez, como objeto. */
async function leerConfig(claves) {
  const { rows } = await db('SELECT key, value FROM config WHERE key = ANY($1::text[])', [claves]);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

// La figurada (ri-SIIT) es un motor del inglés: con una palabra francesa
// buscaría su AFI en el diccionario inglés y, si por casualidad existe
// ("table", "place"), enseñaría a leerla como en inglés. Así que sólo se
// calcula cuando el contenido es inglés.
const figurarSi = (lang, filas, campo) =>
  (lang === 'en' ? conFigurada(filas, campo) : Promise.resolve(filas));

// Claves VAPID de las notificaciones. Sin ellas la app funciona igual, solo que
// sin avisos: la clave privada firma cada envío y no puede ir en el repositorio.
//
// Se aceptan por variable de entorno o por fichero `vapid.json` junto al
// servidor. Lo segundo existe para no tener que recrear el contenedor de
// producción —que se levantó con `docker run` y sin compose— solo por añadir
// dos variables: el directorio ya está montado dentro.
function leerVapid() {
  if (process.env.VAPID_PUBLIC && process.env.VAPID_PRIVATE) {
    return { publica: process.env.VAPID_PUBLIC, privada: process.env.VAPID_PRIVATE };
  }
  try {
    const j = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'vapid.json'), 'utf8'));
    return { publica: j.publicKey || j.publica, privada: j.privateKey || j.privada };
  } catch {
    return { publica: '', privada: '' };
  }
}

const { publica: VAPID_PUBLIC, privada: VAPID_PRIVATE } = leerVapid();
avisos.configurar({
  publica:  VAPID_PUBLIC,
  privada:  VAPID_PRIVATE,
  contacto: process.env.VAPID_CONTACT || 'mailto:ejordanherbas@gmail.com',
});

// Caché en memoria de palabra → { ipa, nota }. El contenido de la app tiene
// 843 palabras distintas, así que se llena entera enseguida y ahorra una
// consulta por cada frase que se pinta.
const cacheIpa = new Map();
const CACHE_MAX = 20000;

/**
 * Deja en caché el AFI de todas las palabras de un texto y devuelve la función
 * de búsqueda que espera lib/pronunciacion. Las correcciones a mano de
 * `pron_overrides` mandan sobre el diccionario automático.
 */
async function cargarIpa(texto) {
  const necesarias = pron.palabrasDe(texto).filter((p) => !cacheIpa.has(p));
  if (necesarias.length) {
    const { rows } = await db(
      `SELECT k.word, COALESCE(o.ipa, l.ipa) AS ipa, o.nota
         FROM unnest($1::text[]) AS k(word)
         LEFT JOIN lexicon        l ON l.word = k.word
         LEFT JOIN pron_overrides o ON o.word = k.word
        WHERE l.ipa IS NOT NULL OR o.ipa IS NOT NULL`,
      [necesarias]
    );
    const encontradas = new Map(rows.map((r) => [r.word, r]));
    for (const p of necesarias) {
      if (cacheIpa.size >= CACHE_MAX) cacheIpa.clear();
      const r = encontradas.get(p);
      cacheIpa.set(p, r?.ipa ? { ipa: r.ipa, nota: r.nota } : null);
    }
  }
  return (clave) => cacheIpa.get(clave) || null;
}

/** Figurada de una palabra suelta, resolviendo su AFI por el camino. */
async function figurarUna(palabra) {
  const buscar = await cargarIpa(palabra);
  return pron.figurarPalabra(palabra, buscar);
}

/**
 * Añade la figurada a una lista de filas, sobre el campo indicado.
 * Una sola consulta para todas: importa cuando una situación trae 24 frases.
 */
async function conFigurada(filas, campo, destino = 'pron') {
  if (!filas?.length) return filas;
  const buscar = await cargarIpa(filas.map((f) => f[campo] || '').join(' '));
  for (const f of filas) {
    if (!f[campo]) continue;
    f[destino] = pron.figurarTexto(f[campo], buscar);
  }
  return filas;
}

// ── HEALTH ───────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await db('SELECT 1');
    res.json({ ok: true, ts: new Date().toISOString() });
  } catch (e) {
    // /health es público: tampoco aquí se filtra el detalle del driver.
    console.error('[health]', e?.message || e);
    res.status(503).json({ ok: false, error: 'Base de datos no disponible' });
  }
});

// Qué día es PARA EL USUARIO. Con `toISOString()` esto devolvía el día en UTC,
// así que entre las 00:00 y las 02:00 de España el servidor seguía creyendo que
// era ayer: una sesión de madrugada se apuntaba al día anterior y la racha se
// rompía sin motivo. Se usa en 27 sitios, así que el arreglo va aquí y no en
// cada consulta. Ver lib/fechas.js.
const todayStr = () => fechas.fechaEnZona();

// La meta de vocabulario con la que nace la fila del día. Tres sitios creaban
// esa fila sin decirla (la sesión, las situaciones y los pares mínimos), y
// entonces se quedaba con el DEFAULT de la columna, que es el 20 de la
// migración base: tras la primera sesión HOY decía "5 / 20" con la meta en 8.
const SQL_META_VOCAB =
  "COALESCE((SELECT NULLIF(value, '')::int FROM config WHERE key = 'daily_vocab_target'), 8)";

// Recalcula la racha del día indicado y actualiza streak_max en config.
// Un día "cuenta" si tiene alguna meta hecha (vocab, gramática o speaking).
// La racha = racha de ayer + 1 si ayer contó; si hubo hueco, vuelve a 1.
// Antes no existía: el 🔥 se quedaba clavado en 0 para siempre.
async function recomputeStreak(date) {
  const { rows } = await db('SELECT * FROM daily_goals WHERE date=$1 AND profile_id=$2', [date, PROFILE_ID]);
  const t = rows[0];
  const activo = !!t && (Number(t.vocab_done) > 0 || t.grammar_done === true || t.speaking_done === true);
  if (!activo) return t ? Number(t.streak) || 0 : 0;

  const { rows: ayer } = await db(
    "SELECT streak FROM daily_goals WHERE date = ($1::date - INTERVAL '1 day') AND profile_id=$2", [date, PROFILE_ID]
  );
  const streak = (ayer.length ? Number(ayer[0].streak) || 0 : 0) + 1;
  await db('UPDATE daily_goals SET streak=$2 WHERE date=$1 AND profile_id=$3', [date, streak, PROFILE_ID]);
  await db(
    `INSERT INTO config (key, value) VALUES ('streak_max', $1)
     ON CONFLICT (key) DO UPDATE SET value = GREATEST(COALESCE(config.value::int, 0), $2)::text`,
    [String(streak), streak]
  );
  return streak;
}

// ════════════════════════════════════════════════════════
// MOCK MODE (?mock=1 intercepta todos los endpoints)
// Devuelve datos de ejemplo para trabajar sin DB.
// ════════════════════════════════════════════════════════
app.use((req, res, next) => {
  if (req.query.mock !== '1') return next();

  const path = req.path;
  const method = req.method;

  // Words
  if (path === '/words' && method === 'GET') {
    return res.json([
      { id: 1, word: 'endeavour', translation: 'esfuerzo, empeño', level: 'C1', category: 'academic', example_sentence: 'Despite every endeavour, the project failed.' },
      { id: 2, word: 'paraphrase', translation: 'parafrasear', level: 'B2', category: 'academic', example_sentence: 'Could you paraphrase that?' },
      { id: 3, word: 'give up', translation: 'rendirse', level: 'A2', category: 'phrasal', example_sentence: "Don't give up." }
    ]);
  }

  // User-words (palabras para repasar hoy)
  if (path === '/user-words' && method === 'GET') {
    return res.json([
      { id: 1, word_id: 1, word: 'endeavour', translation: 'esfuerzo', status: 'learning', next_review_date: todayStr(), ease_factor: 2.5, interval_days: 1 },
      { id: 2, word_id: 2, word: 'paraphrase', translation: 'parafrasear', status: 'new', next_review_date: todayStr(), ease_factor: 2.5, interval_days: 1 }
    ]);
  }

  // Grammar topics
  if (path === '/grammar-topics' && method === 'GET') {
    return res.json([
      { id: 1, title: 'Present Perfect vs Past Simple', level: 'B1', description: 'Diferencias clave', order_index: 1, completed: false },
      { id: 2, title: 'Conditionals 0, 1, 2, 3 & Mixed', level: 'B2', description: 'Condicionales CAE', order_index: 3, completed: false }
    ]);
  }

  // Daily goals
  if (path.startsWith('/daily-goals')) {
    return res.json({ id: 1, date: todayStr(), vocab_target: 20, vocab_done: 5, grammar_done: false, speaking_done: false, streak: 3 });
  }

  // Stats
  if (path === '/stats') {
    return res.json({ xp_total: 340, streak: 3, streak_max: 7, words_mastered: 28, estimated_level: 'B2', sessions_this_week: 4 });
  }

  // Study sessions
  if (path === '/study-sessions' && method === 'GET') {
    return res.json([
      { id: 1, date: todayStr(), type: 'vocab', duration_minutes: 15, score: 85, notes: '' }
    ]);
  }

  // Exam attempts
  if (path === '/exam-attempts' && method === 'GET') {
    return res.json([
      { id: 1, date: todayStr(), section: 'reading', score: 72, max_score: 100, notes: 'Part 5 difícil' }
    ]);
  }

  // Config
  if (path.startsWith('/config/') && method === 'GET') {
    const key = path.split('/config/')[1];
    const defaults = { user_level: 'B1', target_exam_date: '', daily_vocab_target: '8', xp_total: '340' };
    return res.json({ key, value: defaults[key] ?? null });
  }

  // Auth
  if (path === '/auth/check') {
    return res.json({ ok: true, user: APP_USER_NAME });
  }

  if (path === '/idioma' && method === 'GET') {
    return res.json({ idioma: 'fr', idiomas: IDIOMAS, tetris_activo: true });
  }

  // POST/PUT — respuestas genéricas en mock
  if (['POST', 'PUT'].includes(method)) {
    return res.json({ ok: true, mock: true, ...req.body });
  }

  next();
});

// ════════════════════════════════════════════════════════
// VOCABULARIO
// ════════════════════════════════════════════════════════
app.get('/words', async (req, res) => {
  const { level, category } = req.query;
  try {
    let q = 'SELECT * FROM words WHERE lang=$1';
    const params = [await idiomaDe(req)];
    if (level)    { params.push(level);    q += ` AND level=$${params.length}`; }
    if (category) { params.push(category); q += ` AND category=$${params.length}`; }
    q += ' ORDER BY id';
    const { rows } = await db(q, params);
    res.json(rows);
  } catch (e) { fallo(res, e); }
});

app.get('/words/:id', async (req, res) => {
  try {
    const { rows } = await db('SELECT * FROM words WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (e) { fallo(res, e); }
});

app.post('/words', async (req, res) => {
  const { word, translation, example_sentence, level, category, audio_hint } = req.body;
  if (!word || !translation) return res.status(400).json({ error: 'word y translation requeridos' });
  try {
    // Una palabra añadida a mano es del idioma que se está estudiando, salvo
    // que se diga otra cosa.
    const lang = esIdioma(req.body.lang) ? req.body.lang : await idiomaActivo();
    const { rows } = await db(
      `INSERT INTO words (word, translation, example_sentence, level, category, audio_hint, lang)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [word, translation, example_sentence || null, level || 'B1', category || 'general', audio_hint || null, lang]
    );
    // Crear entrada en user_words automáticamente
    await db('INSERT INTO user_words (profile_id, word_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [PROFILE_ID, rows[0].id]);
    res.json(rows[0]);
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// USER-WORDS (SRS — repetición espaciada)
// ════════════════════════════════════════════════════════
app.get('/user-words', async (req, res) => {
  const { status, due } = req.query;
  try {
    const lang = await idiomaDe(req);
    let q = `SELECT uw.*, w.word, w.translation, w.example_sentence, w.level, w.category, w.audio_hint, w.lang
             FROM user_words uw JOIN words w ON w.id = uw.word_id
             WHERE uw.profile_id = $1 AND w.lang = $2`;
    const params = [PROFILE_ID, lang];
    if (status) { params.push(status); q += ` AND uw.status=$${params.length}`; }
    if (due === '1') { params.push(todayStr()); q += ` AND uw.next_review_date<=$${params.length}`; }
    q += ' ORDER BY uw.next_review_date, uw.id';
    const { rows } = await db(q, params);
    res.json(await figurarSi(lang, rows, 'word'));
  } catch (e) { fallo(res, e); }
});

// POST /user-words/:id/review
// body: { rating: 1|2|3|4 }   1 again · 2 hard · 3 good · 4 easy
// Acepta también el formato antiguo { correct: true|false } para no romper
// clientes viejos: false → 1 (again), true → 3 (good).
app.post('/user-words/:id/review', async (req, res) => {
  let rating = parseInt(req.body?.rating, 10);
  if (!Number.isInteger(rating) || rating < 1 || rating > 4) {
    if (typeof req.body?.correct === 'boolean') rating = req.body.correct ? 3 : 1;
    else return res.status(400).json({ error: 'rating debe ser 1, 2, 3 o 4' });
  }

  try {
    const r = await repasarPalabra(req.params.id, rating);
    if (!r) return res.status(404).json({ error: 'No encontrado' });
    res.json(r);
  } catch (e) { fallo(res, e); }
});

/**
 * Aplica un repaso FSRS a una carta y lo deja en el historial. Devuelve la
 * fila actualizada, o null si la carta no es de este perfil.
 *
 * Vive fuera del endpoint porque hay dos sitios que repasan de verdad: las
 * tarjetas y el test del despertar del modo Tetris. Recordar a la mañana una
 * palabra de ayer ES un repaso, y no apuntarlo sería tirar el dato que mejor
 * dice cuánto aguanta esa palabra.
 */
async function repasarPalabra(userWordId, rating) {
  const { rows } = await db('SELECT * FROM user_words WHERE id=$1 AND profile_id=$2',
    [userWordId, PROFILE_ID]);
  if (!rows.length) return null;

  const w = rows[0];
  const today = todayStr();

  // Días transcurridos desde el último repaso (0 si es la primera vez).
  const elapsed = w.last_review
    ? Math.max(0, Math.round((new Date(today) - new Date(w.last_review)) / 86400000))
    : 0;

  // Primera vez que se ve la carta → estado inicial. Si no, evolución.
  const isNew = w.stability == null || w.difficulty == null;
  const next  = isNew
    ? fsrsInit(rating)
    : fsrsNext(Number(w.stability), Number(w.difficulty), elapsed, rating);

  const intervalDays = fsrsInterval(next.stability);
  const nextDate     = new Date(today);
  nextDate.setDate(nextDate.getDate() + intervalDays);

  const timesCorrect = w.times_correct + (rating > 1 ? 1 : 0);
  const timesWrong   = w.times_wrong   + (rating === 1 ? 1 : 0);
  const lapses       = w.lapses        + (rating === 1 ? 1 : 0);

  // "Dominada" cuando el recuerdo aguanta tres semanas por sí solo.
  const status = rating === 1 ? 'learning'
               : next.stability >= 21 ? 'mastered'
               : 'review';

  const { rows: updated } = await db(
    `UPDATE user_words SET
       stability=$1, difficulty=$2, interval_days=$3, next_review_date=$4,
       times_correct=$5, times_wrong=$6, status=$7, reps=reps+1, lapses=$8,
       last_review=$9
     WHERE id=$10 RETURNING *`,
    [next.stability, next.difficulty, intervalDays,
     nextDate.toISOString().split('T')[0],
     timesCorrect, timesWrong, status, lapses, today, w.id]
  );

  // Historial: permite reoptimizar los pesos con datos reales más adelante.
  // Y desde el modo Tetris, también dice QUÉ se estudió hoy: las rondas repiten
  // lo fallado y la noche sortea sus pistas entre las filas de este día.
  await db(
    `INSERT INTO review_log
       (profile_id, user_word_id, rating, state_before, stability, difficulty, elapsed_days, scheduled_days)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [PROFILE_ID, w.id, rating, w.status, next.stability, next.difficulty, elapsed, intervalDays]
  );

  return { ...updated[0], interval_days: intervalDays, rating };
}


// Previsualiza a cuántos días iría la carta con cada uno de los cuatro botones,
// para poder mostrarlo en la interfaz antes de pulsar.
app.get('/user-words/:id/preview', async (req, res) => {
  try {
    const { rows } = await db('SELECT * FROM user_words WHERE id=$1 AND profile_id=$2',
      [req.params.id, PROFILE_ID]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    const w = rows[0];
    const elapsed = w.last_review
      ? Math.max(0, Math.round((new Date(todayStr()) - new Date(w.last_review)) / 86400000))
      : 0;
    const isNew = w.stability == null || w.difficulty == null;

    const out = {};
    for (const rating of [1, 2, 3, 4]) {
      const n = isNew ? fsrsInit(rating)
                      : fsrsNext(Number(w.stability), Number(w.difficulty), elapsed, rating);
      out[rating] = fsrsInterval(n.stability);
    }
    res.json(out);
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// GRAMÁTICA
// ════════════════════════════════════════════════════════
app.get('/grammar-topics', async (req, res) => {
  try {
    const { rows } = await db(
      `SELECT gt.*, gp.completed, gp.score, gp.completed_at
       FROM grammar_topics gt
       LEFT JOIN grammar_progress gp ON gp.topic_id = gt.id AND gp.profile_id = $1
       WHERE gt.lang = $2
       ORDER BY gt.order_index, gt.id`, [PROFILE_ID, await idiomaDe(req)]
    );
    res.json(rows);
  } catch (e) { fallo(res, e); }
});

app.get('/grammar-topics/:id', async (req, res) => {
  try {
    const { rows } = await db('SELECT * FROM grammar_topics WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (e) { fallo(res, e); }
});

app.post('/grammar-progress', async (req, res) => {
  const { topic_id, completed, score } = req.body;
  if (!topic_id) return res.status(400).json({ error: 'topic_id requerido' });
  try {
    const { rows } = await db(
      `INSERT INTO grammar_progress (profile_id, topic_id, completed, score, completed_at)
       VALUES ($5,$1,$2,$3,$4)
       ON CONFLICT (profile_id, topic_id) DO UPDATE SET completed=$2, score=$3, completed_at=$4
       RETURNING *`,
      [topic_id, completed ?? false, score ?? null, completed ? new Date().toISOString() : null, PROFILE_ID]
    );
    res.json(rows[0]);
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// SESIONES DE ESTUDIO
// ════════════════════════════════════════════════════════
app.get('/study-sessions', async (req, res) => {
  try {
    const { rows } = await db(
      'SELECT * FROM study_sessions WHERE profile_id=$1 ORDER BY date DESC, created_at DESC LIMIT 50',
      [PROFILE_ID]);
    res.json(rows);
  } catch (e) { fallo(res, e); }
});

app.post('/study-sessions', async (req, res) => {
  const { date, type, duration_minutes, score, notes } = req.body;
  if (!type) return res.status(400).json({ error: 'type requerido' });
  try {
    const { rows } = await db(
      `INSERT INTO study_sessions (profile_id, date, type, duration_minutes, score, notes)
       VALUES ($6,$1,$2,$3,$4,$5) RETURNING *`,
      [date || todayStr(), type, duration_minutes || 0, score ?? null, notes || '', PROFILE_ID]
    );
    // Actualizar XP total (+10 por sesión, +score*0.1 si hay score)
    await addXp(10 + Math.round((score || 0) * 0.1));
    res.json(rows[0]);
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// DAILY GOALS
// ════════════════════════════════════════════════════════
app.get('/daily-goals/:date', async (req, res) => {
  try {
    const { rows } = await db('SELECT * FROM daily_goals WHERE date=$1 AND profile_id=$2',
      [req.params.date, PROFILE_ID]);
    if (!rows.length) {
      // Calcular racha
      const { rows: cfg } = await db("SELECT value FROM config WHERE key='daily_vocab_target'");
      const target = parseInt(cfg[0]?.value || '20', 10);
      return res.json({ date: req.params.date, vocab_target: target, vocab_done: 0, grammar_done: false, speaking_done: false, streak: 0 });
    }
    res.json(rows[0]);
  } catch (e) { fallo(res, e); }
});

app.post('/daily-goals', async (req, res) => {
  const { date, vocab_target, vocab_done, grammar_done, speaking_done, streak } = req.body;
  try {
    const { rows } = await db(
      `INSERT INTO daily_goals (profile_id, date, vocab_target, vocab_done, grammar_done, speaking_done, streak)
       VALUES ($7,$1,$2,$3,$4,$5,$6)
       ON CONFLICT (profile_id, date) DO UPDATE SET
         vocab_target=$2, vocab_done=$3, grammar_done=$4, speaking_done=$5, streak=$6
       RETURNING *`,
      [date || todayStr(), vocab_target ?? 20, vocab_done ?? 0, grammar_done ?? false, speaking_done ?? false, streak ?? 0, PROFILE_ID]
    );
    res.json(rows[0]);
  } catch (e) { fallo(res, e); }
});

app.put('/daily-goals/:date', async (req, res) => {
  const date = req.params.date;
  const fields = req.body || {};
  // Whitelist: nunca dejamos que el cliente escriba streak a mano, lo
  // calcula el servidor. Antes el UPDATE fallaba con 404 si no había fila
  // (y el front nunca creaba una), así que las metas no se guardaban jamás.
  const allowed = ['vocab_target', 'vocab_done', 'grammar_done', 'speaking_done'];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));
  try {
    // 1. Asegurar la fila del día (upsert vacío con el target por defecto)
    const { rows: cfg } = await db("SELECT value FROM config WHERE key='daily_vocab_target'");
    const target = parseInt(cfg[0]?.value || '20', 10);
    await db(
      `INSERT INTO daily_goals (profile_id, date, vocab_target) VALUES ($3,$1,$2)
       ON CONFLICT (profile_id, date) DO NOTHING`,
      [date, target, PROFILE_ID]
    );
    // 2. Aplicar solo los campos recibidos
    if (keys.length) {
      const sets = keys.map((k, i) => `${k}=$${i + 3}`).join(',');
      const vals = [date, PROFILE_ID, ...keys.map((k) => fields[k])];
      await db(`UPDATE daily_goals SET ${sets} WHERE date=$1 AND profile_id=$2`, vals);
    }
    // 3. Recalcular la racha con el estado ya actualizado
    await recomputeStreak(date);
    const { rows } = await db('SELECT * FROM daily_goals WHERE date=$1 AND profile_id=$2', [date, PROFILE_ID]);
    res.json(rows[0]);
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// SPEAKING
// ════════════════════════════════════════════════════════
app.get('/speaking-practice', async (req, res) => {
  try {
    const { rows } = await db(
      'SELECT * FROM speaking_practice WHERE profile_id=$1 ORDER BY created_at DESC LIMIT 20',
      [PROFILE_ID]);
    res.json(rows);
  } catch (e) { fallo(res, e); }
});

app.post('/speaking-practice', async (req, res) => {
  const { date, phrase_en, user_transcript, score, notes } = req.body;
  if (!phrase_en) return res.status(400).json({ error: 'phrase_en requerido' });
  try {
    const { rows } = await db(
      `INSERT INTO speaking_practice (profile_id, date, phrase_en, user_transcript, score, notes)
       VALUES ($6,$1,$2,$3,$4,$5) RETURNING *`,
      [date || todayStr(), phrase_en, user_transcript || null, score ?? null, notes || null, PROFILE_ID]
    );
    res.json(rows[0]);
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// SIMULACROS CAMBRIDGE
// ════════════════════════════════════════════════════════
app.get('/exam-attempts', async (req, res) => {
  try {
    // Las notas de cada idioma van aparte: un ensayo del DALF no puede entrar
    // en la media del Writing del Cambridge.
    const { rows } = await db(
      `SELECT * FROM exam_attempts WHERE profile_id=$1 AND lang=$2
        ORDER BY date DESC, created_at DESC LIMIT 30`,
      [PROFILE_ID, await idiomaDe(req)]);
    res.json(rows);
  } catch (e) { fallo(res, e); }
});

app.post('/exam-attempts', async (req, res) => {
  const { date, section, score, max_score, notes } = req.body;
  if (!section || score === undefined) return res.status(400).json({ error: 'section y score requeridos' });
  // Los simulacros que mandan aquí (Reading, Listening, Use of English) son
  // todos del Cambridge: sin idioma explícito, la nota es del inglés aunque se
  // hagan con el francés activo.
  const lang = esIdioma(req.body.lang) ? req.body.lang : 'en';
  try {
    const { rows } = await db(
      `INSERT INTO exam_attempts (profile_id, date, section, score, max_score, notes, lang)
       VALUES ($6,$1,$2,$3,$4,$5,$7) RETURNING *`,
      [date || todayStr(), section, score, max_score || 100, notes || '', PROFILE_ID, lang]
    );
    res.json(rows[0]);
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// STATS (resumen para el dashboard)
// ════════════════════════════════════════════════════════
app.get('/stats', async (req, res) => {
  try {
    // Todo del idioma activo: el vocabulario y también las notas. En francés,
    // de momento sólo puede haber Writing (las tareas C1 del DALF, migración
    // 29); el resto de destrezas sale en blanco, que es la verdad.
    const lang = await idiomaDe(req);
    const [xpQ, masteredQ, streakQ, sessWeekQ, examQ, sessTotalQ, wordsTotalQ, bestExamQ, examCfgQ, maxStreakQ] = await Promise.all([
      db("SELECT value FROM config WHERE key='xp_total'"),
      db(`SELECT COUNT(*) AS cnt FROM user_words uw JOIN words w ON w.id = uw.word_id
          WHERE uw.status='mastered' AND uw.profile_id=$1 AND w.lang=$2`, [PROFILE_ID, lang]),
      db('SELECT streak FROM daily_goals WHERE profile_id=$1 ORDER BY date DESC LIMIT 1', [PROFILE_ID]),
      // La ventana de 7 días se cuenta desde el día del usuario, no desde el
      // CURRENT_DATE de Postgres, que va en UTC como el resto del servidor.
      db(`SELECT COUNT(*) AS cnt FROM study_sessions
          WHERE profile_id=$1 AND date >= $2::date - INTERVAL '7 days'`, [PROFILE_ID, todayStr()]),
      db(`SELECT section, AVG(score::float/max_score*100) AS avg_pct FROM exam_attempts
          WHERE profile_id=$1 AND lang=$2 GROUP BY section`, [PROFILE_ID, lang]),
      db('SELECT COUNT(*) AS cnt FROM study_sessions WHERE profile_id=$1', [PROFILE_ID]),
      db(`SELECT COUNT(*) AS cnt FROM user_words uw JOIN words w ON w.id = uw.word_id
          WHERE uw.profile_id=$1 AND w.lang=$2`, [PROFILE_ID, lang]),
      db(`SELECT MAX(score::float/max_score*100) AS best, COUNT(*) AS done FROM exam_attempts
          WHERE profile_id=$1 AND lang=$2`, [PROFILE_ID, lang]),
      db("SELECT value FROM config WHERE key='target_exam_date'"),
      db('SELECT MAX(streak) AS m FROM daily_goals WHERE profile_id=$1', [PROFILE_ID])
    ]);

    // Intentos por sección (hacen falta para saber si hay datos suficientes)
    const { rows: attemptsBySection } = await db(
      `SELECT section, COUNT(*)::int AS n, AVG(score::float/max_score*100) AS avg_pct
         FROM exam_attempts WHERE profile_id=$1 AND lang=$2 GROUP BY section`, [PROFILE_ID, lang]
    );
    // Vocabulario dominado por nivel CEFR
    const { rows: vocabByLevel } = await db(
      `SELECT w.level,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE uw.status='mastered')::int AS mastered
         FROM user_words uw JOIN words w ON w.id = uw.word_id
        WHERE uw.profile_id=$1 AND w.lang=$2 GROUP BY w.level`, [PROFILE_ID, lang]
    );
    const xp        = parseInt(xpQ.rows[0]?.value || '0', 10);
    const mastered  = parseInt(masteredQ.rows[0]?.cnt || '0', 10);
    const streak    = parseInt(streakQ.rows[0]?.streak || '0', 10);
    const sessWeek  = parseInt(sessWeekQ.rows[0]?.cnt || '0', 10);
    const sessTotal = parseInt(sessTotalQ.rows[0]?.cnt || '0', 10);
    const wordsTotal = parseInt(wordsTotalQ.rows[0]?.cnt || '0', 10);
    const ingles    = lang === 'en';
    const examsDone = parseInt(bestExamQ.rows[0]?.done || '0', 10);
    const bestExam  = bestExamQ.rows[0]?.best != null ? Math.round(bestExamQ.rows[0].best) : null;
    const streak_max = parseInt(maxStreakQ.rows[0]?.m || '0', 10);
    const exam_scores = {};
    for (const r of examQ.rows) exam_scores[r.section] = Math.round(r.avg_pct);
    // % de vocabulario dominado sobre el que se está estudiando
    const vocab_pct = wordsTotal > 0 ? Math.round((mastered / wordsTotal) * 100) : 0;

    // ── NIVEL POR DESTREZA ────────────────────────────────
    // Solo se estima si hay datos. Sin intentos, el nivel es null y la interfaz
    // debe decir "sin datos" en vez de inventarse una letra.
    const MIN_ATTEMPTS = 2;               // por debajo de esto no hay muestra
    const pctToLevel = (pct) => pct >= 80 ? 'C1' : pct >= 60 ? 'B2' : pct >= 40 ? 'B1' : 'A2';

    const skills = {};
    for (const s of ['reading', 'writing', 'listening', 'speaking']) {
      const row = attemptsBySection.find((r) => r.section === s);
      skills[s] = row && row.n >= MIN_ATTEMPTS
        ? { pct: Math.round(row.avg_pct), level: pctToLevel(row.avg_pct), attempts: row.n }
        : { pct: row ? Math.round(row.avg_pct) : null, level: null, attempts: row?.n || 0 };
    }

    // Vocabulario: nivel más alto en el que se domina al menos el 60% de las palabras.
    const ORDER = ['A2', 'B1', 'B2', 'C1'];
    let vocabLevel = null;
    for (const lvl of ORDER) {
      const row = vocabByLevel.find((r) => r.level === lvl);
      if (row && row.total >= 10 && (row.mastered / row.total) >= 0.6) vocabLevel = lvl;
    }
    skills.vocab = { pct: vocab_pct, level: vocabLevel, attempts: mastered };

    // ── NIVEL GLOBAL ──────────────────────────────────────
    // Media de las destrezas que tienen nivel calculable. Si no hay ninguna,
    // se devuelve null: el usuario aún no ha demostrado nada.
    const withLevel = Object.values(skills).filter((s) => s.level);
    const estimated_level = withLevel.length
      ? ORDER[Math.floor(withLevel.reduce((a, s) => a + ORDER.indexOf(s.level), 0) / withLevel.length)]
      : null;

    // El nivel del test de ubicación del idioma, aparte del estimado por
    // destrezas: son dos medidas distintas y mezclarlas escondería de dónde
    // sale cada una. La cabecera usa éste cuando no hay destrezas medidas.
    const claveTest = lang === 'fr' ? 'nivel_medido_fr' : 'nivel_medido';
    const nivelTest = (await leerConfig([claveTest]))[claveTest] || null;

    res.json({
      idioma: lang,
      nivel_test: nivelTest,
      xp_total: xp,
      streak, streak_max,
      words_mastered: mastered,
      words_total: wordsTotal,
      vocab_pct,
      estimated_level,                       // null = sin datos suficientes
      level_evidence: withLevel.length,      // sobre cuántas destrezas se apoya
      skills,                                // nivel y % por destreza
      sessions_this_week: sessWeek,
      sessions_total: sessTotal,
      exams_done: examsDone,
      best_exam_score: bestExam,
      exam_scores,
      exam_date: ingles ? examCfgQ.rows[0]?.value || null : null,
    });
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════
app.get('/config/:key', async (req, res) => {
  try {
    const { rows } = await db('SELECT * FROM config WHERE key=$1', [req.params.key]);
    if (!rows.length) return res.json({ key: req.params.key, value: null });
    res.json(rows[0]);
  } catch (e) { fallo(res, e); }
});

app.put('/config/:key', async (req, res) => {
  const { value } = req.body;
  if (value === undefined) return res.status(400).json({ error: 'value requerido' });
  try {
    const { rows } = await db(
      `INSERT INTO config (key, value) VALUES ($1,$2)
       ON CONFLICT (key) DO UPDATE SET value=$2 RETURNING *`,
      [req.params.key, String(value)]
    );
    res.json(rows[0]);
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// EXAMEN INTERACTIVO (Use of English auto-corregible)
// ════════════════════════════════════════════════════════
// Devuelve N preguntas al azar de una parte, SIN la respuesta.
app.get('/exam-questions/quiz', async (req, res) => {
  const part = req.query.part;
  const n = Math.min(parseInt(req.query.n || '8', 10), 30);
  try {
    const params = [];
    let where = '';
    if (part) { where = 'WHERE part=$1'; params.push(part); }
    const { rows } = await db(
      `SELECT id, part, level, prompt, options, given_word
         FROM exam_questions ${where}
         ORDER BY RANDOM() LIMIT ${n}`, params
    );
    res.json(rows);
  } catch (e) { fallo(res, e); }
});

// Normaliza para comparar: minúsculas, sin espacios de sobra.
const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

// Corrige un intento en el servidor y devuelve el detalle por pregunta.
app.post('/exam-quiz/grade', async (req, res) => {
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  if (!answers.length) return res.status(400).json({ error: 'answers requerido' });
  try {
    const ids = answers.map((a) => a.id);
    const { rows } = await db('SELECT * FROM exam_questions WHERE id = ANY($1)', [ids]);
    const byId = Object.fromEntries(rows.map((q) => [q.id, q]));
    const detail = answers.map((a) => {
      const q = byId[a.id];
      if (!q) return { id: a.id, correct: false, error: 'no encontrada' };
      const correct = norm(a.response) === norm(q.answer);
      return {
        id: q.id, part: q.part, prompt: q.prompt,
        your: a.response ?? '', answer: q.answer,
        correct, explanation: q.explanation,
      };
    });
    const aciertos = detail.filter((d) => d.correct).length;
    const score = Math.round((aciertos / detail.length) * 100);
    res.json({ total: detail.length, aciertos, score, detail });
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// DIAGNÓSTICO — de dónde se parte
// ════════════════════════════════════════════════════════
// `user_level` decía B1 desde la migración base, escrito a mano, y
// `exam_attempts` tenía CERO filas: nadie había medido nada. Con el examen
// movido a finales de octubre, la diferencia entre estar en B1 o en B2 alto son
// dos meses de trabajo distinto, así que esto deja de ser opcional.

// Cuántas preguntas de cada parte entran. Se cogen de las cuatro partes de Use
// of English porque son las que mejor separan niveles con pocas preguntas: no
// dependen de haber leído un texto largo ni de oír bien un audio, y se corrigen
// solas sin criterio humano.
const DIAG_REPARTO = {
  open_cloze:              6,
  mc_cloze:                6,
  word_formation:          6,
  key_word_transformation: 6,
};

/**
 * Traduce el porcentaje a una franja del MCER.
 *
 * Las preguntas son de nivel C1, así que el listón no es el escolar: en el CAE
 * real se aprueba en torno al 60 %. Es una ESTIMACIÓN para decidir por dónde
 * atacar, y la app lo dice con esas palabras — no es una nota oficial ni
 * pretende serlo.
 */
function nivelDesdePct(pct) {
  if (pct >= 80) return { nivel: 'C1+', texto: 'Por encima del aprobado. El examen está a tiro.' };
  if (pct >= 60) return { nivel: 'C1',  texto: 'En la franja de aprobado, justo. Hay que consolidar.' };
  if (pct >= 45) return { nivel: 'B2+', texto: 'Cerca. Falta el salto de precisión que pide el C1.' };
  if (pct >= 30) return { nivel: 'B2',  texto: 'Base sólida, pero el C1 pide bastante más.' };
  return { nivel: 'B1', texto: 'Queda un nivel entero por delante. Conviene hablarlo antes de fijar fecha.' };
}

// GET /diagnostico — el test, equilibrado entre las cuatro partes
app.get('/diagnostico', async (req, res) => {
  try {
    const trozos = await Promise.all(
      Object.entries(DIAG_REPARTO).map(([part, n]) =>
        db(`SELECT id, part, prompt, options, given_word
              FROM exam_questions
             WHERE part = $1 AND text_id IS NULL
             ORDER BY random() LIMIT $2`, [part, n]))
    );
    const preguntas = trozos.flatMap((t) => t.rows);

    const { rows: cfg } = await db(
      "SELECT key, value FROM config WHERE key IN ('nivel_medido','nivel_medido_pct','nivel_medido_fecha','target_exam_date')");
    const c = Object.fromEntries(cfg.map((r) => [r.key, r.value]));

    res.json({
      preguntas,
      total: preguntas.length,
      ya_hecho: !!c.nivel_medido,
      nivel_medido: c.nivel_medido || null,
      pct: c.nivel_medido_pct ? Number(c.nivel_medido_pct) : null,
      fecha: c.nivel_medido_fecha || null,
      examen: c.target_exam_date || null,
    });
  } catch (e) { fallo(res, e); }
});

// POST /diagnostico — corregir, estimar el nivel y guardarlo
app.post('/diagnostico', async (req, res) => {
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  if (!answers.length) return res.status(400).json({ error: 'answers requerido' });
  try {
    const { rows } = await db('SELECT * FROM exam_questions WHERE id = ANY($1)',
      [answers.map((a) => a.id)]);
    const byId = Object.fromEntries(rows.map((q) => [q.id, q]));

    const detail = answers.map((a) => {
      const q = byId[a.id];
      if (!q) return { id: a.id, correct: false };
      return {
        id: q.id, part: q.part, prompt: q.prompt,
        your: a.response ?? '', answer: q.answer,
        correct: norm(a.response) === norm(q.answer),
        explanation: q.explanation,
      };
    });

    const aciertos = detail.filter((d) => d.correct).length;
    const pct = Math.round((aciertos / detail.length) * 100);
    const { nivel, texto } = nivelDesdePct(pct);

    // Por parte, que es lo que dice por dónde empezar: no es lo mismo fallar
    // las transformaciones que no tener léxico.
    const porParte = {};
    for (const d of detail) {
      porParte[d.part] ??= { total: 0, aciertos: 0 };
      porParte[d.part].total++;
      if (d.correct) porParte[d.part].aciertos++;
    }

    // Las cuatro escrituras van en UNA transacción, y el orden importa: primero
    // el intento —que es el dato de verdad, y lo que puede rechazar la base— y
    // después el resumen en config. Sueltas, el 12-ago fallaba la última y las
    // tres primeras quedaban escritas: `nivel_medido` con un porcentaje que
    // nadie había llegado a ver, y la tarjeta de HOY convencida de que el test
    // estaba hecho. Una medición a medias miente peor que ninguna medición.
    const cli = await pool.connect();
    try {
      await cli.query('BEGIN');
      await cli.query(
        `INSERT INTO exam_attempts (profile_id, date, section, score, max_score, notes)
         VALUES ($1, $2, 'diag', $3, 100, $4)`,
        [PROFILE_ID, todayStr(), pct, `Diagnóstico inicial · ${aciertos}/${detail.length} · ${nivel}`]);
      await cli.query(`INSERT INTO config (key, value) VALUES ('nivel_medido', $1)
                       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [nivel]);
      await cli.query(`INSERT INTO config (key, value) VALUES ('nivel_medido_pct', $1)
                       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [String(pct)]);
      await cli.query(`INSERT INTO config (key, value) VALUES ('nivel_medido_fecha', $1)
                       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [todayStr()]);
      await cli.query('COMMIT');
    } catch (e) {
      await cli.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      cli.release();
    }
    await addXp(30);

    res.json({ total: detail.length, aciertos, pct, nivel, texto, porParte, detail });
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// TEST DE NIVEL DEL FRANCÉS
// ════════════════════════════════════════════════════════
// Otro test y otra escala: el del inglés mide cuánto falta para aprobar un C1,
// éste UBICA (A2 → C1) a alguien que dice estar en A2. Preguntas, respuestas y
// corrección en lib/test-frances.js; las respuestas no salen nunca de aquí.
const testFrances = require('./lib/test-frances');

const CLAVES_NIVEL_FR = ['nivel_medido_fr', 'nivel_medido_fr_pct', 'nivel_medido_fr_fecha'];

// GET /diagnostico/fr — el test, sin respuestas
app.get('/diagnostico/fr', async (req, res) => {
  try {
    const c = await leerConfig(CLAVES_NIVEL_FR);
    res.json({
      preguntas: testFrances.preguntasParaCliente(),
      total: testFrances.PREGUNTAS.length,
      ya_hecho: !!c.nivel_medido_fr,
      nivel_medido: c.nivel_medido_fr || null,
      pct: c.nivel_medido_fr_pct ? Number(c.nivel_medido_fr_pct) : null,
      fecha: c.nivel_medido_fr_fecha || null,
    });
  } catch (e) { fallo(res, e); }
});

// POST /diagnostico/fr — corregir, ubicar y guardar
app.post('/diagnostico/fr', async (req, res) => {
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  if (!answers.length) return res.status(400).json({ error: 'answers requerido' });
  try {
    const r = testFrances.corregir(answers);
    // Igual que el del inglés: el intento y el resumen en UNA transacción, el
    // intento primero. Una medición a medias miente peor que ninguna.
    const cli = await pool.connect();
    try {
      await cli.query('BEGIN');
      await cli.query(
        `INSERT INTO exam_attempts (profile_id, date, section, score, max_score, notes, lang)
         VALUES ($1, $2, 'diag', $3, 100, $4, 'fr')`,
        [PROFILE_ID, todayStr(), r.pct, `Test de nivel de francés · ${r.aciertos}/${r.total} · ${r.nivel}`]);
      const guardar = (k, v) => cli.query(
        `INSERT INTO config (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [k, v]);
      await guardar('nivel_medido_fr', r.nivel);
      await guardar('nivel_medido_fr_pct', String(r.pct));
      await guardar('nivel_medido_fr_fecha', todayStr());
      await cli.query('COMMIT');
    } catch (e) {
      await cli.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      cli.release();
    }
    await addXp(30);
    res.json(r);
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// READING (partes 5-8 del paper de Reading & Use of English)
// ════════════════════════════════════════════════════════

// Tareas disponibles, con cuántas preguntas trae cada una.
app.get('/reading/tasks', async (req, res) => {
  try {
    // Del idioma activo. En francés van de menos a más nivel (B1 → C1): el B1
    // es la prueba inicial de comprensión escrita.
    const { rows } = await db(
      `SELECT t.id, t.slug, t.part, t.title, t.intro, t.level, t.lang,
              COUNT(q.id)::int AS questions
         FROM exam_texts t
         LEFT JOIN exam_questions q ON q.text_id = t.id
        WHERE t.part IN ('reading_mc','cross_text','gapped_text','multi_match')
          AND t.lang = $1
        GROUP BY t.id
        ORDER BY t.level, CASE t.part
                   WHEN 'reading_mc'   THEN 5
                   WHEN 'cross_text'   THEN 6
                   WHEN 'gapped_text'  THEN 7
                   WHEN 'multi_match'  THEN 8
                 END, t.id`, [await idiomaDe(req)]
    );
    res.json(rows);
  } catch (e) { fallo(res, e); }
});

// Una tarea completa. Nunca se envía la respuesta correcta al cliente:
// la corrección se hace en el servidor con /exam-quiz/grade.
app.get('/reading/task/:slug', async (req, res) => {
  try {
    const { rows: t } = await db('SELECT * FROM exam_texts WHERE slug=$1', [req.params.slug]);
    if (!t.length) return res.status(404).json({ error: 'No encontrada' });
    const { rows: qs } = await db(
      `SELECT id, part, prompt, options, order_index
         FROM exam_questions WHERE text_id=$1 ORDER BY order_index`, [t[0].id]
    );
    res.json({ ...t[0], questions: qs });
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// PLAN DE 30 DÍAS
// ════════════════════════════════════════════════════════
app.get('/curriculum', async (req, res) => {
  try {
    const { rows } = await db(
      `SELECT c.*, g.title AS grammar_title
         FROM curriculum c
         LEFT JOIN grammar_topics g ON g.id = c.grammar_topic_id
         ORDER BY c.day`
    );
    res.json(rows);
  } catch (e) { fallo(res, e); }
});

// El día de hoy según la fecha de inicio del plan (config plan_start_date).
app.get('/curriculum/today', async (req, res) => {
  try {
    const { rows: cfg } = await db("SELECT value FROM config WHERE key='plan_start_date'");
    const start = cfg[0]?.value || null;
    let day = 1, started = false;
    if (start) {
      started = true;
      const ms = new Date(todayStr()) - new Date(start);
      day = Math.min(30, Math.max(1, Math.floor(ms / 86400000) + 1));
    }
    const { rows } = await db(
      `SELECT c.*, g.title AS grammar_title, g.content_html AS grammar_html,
              s.title_es AS situation_title, s.level AS situation_level,
              COALESCE(sp.completed, false) AS situation_done
         FROM curriculum c
         LEFT JOIN grammar_topics g ON g.id = c.grammar_topic_id
         LEFT JOIN situations     s ON s.id = c.situation_id
         LEFT JOIN situation_progress sp
                ON sp.situation_id = s.id AND sp.profile_id = $2
         WHERE c.day=$1`, [day, PROFILE_ID]
    );
    res.json({ started, day, plan_start_date: start, ...(rows[0] || {}) });
  } catch (e) { fallo(res, e); }
});

// Arranca (o reinicia) el plan hoy.
app.post('/plan/start', async (req, res) => {
  try {
    await db(
      `INSERT INTO config (key, value) VALUES ('plan_start_date', $1)
       ON CONFLICT (key) DO UPDATE SET value=$1`, [todayStr()]
    );
    res.json({ started: true, plan_start_date: todayStr() });
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// CARRIL DIARIO — SECTORES Y SITUACIONES
// El inglés que necesitas en tu trabajo, por situación real.
// ════════════════════════════════════════════════════════

// Perfil activo: quién eres, qué sector llevas y qué persigues.
app.get('/profile', async (req, res) => {
  try {
    const { rows } = await db('SELECT p.* FROM profiles p WHERE p.id = $1', [PROFILE_ID]);
    if (!rows.length) return res.status(404).json({ error: 'Perfil no encontrado' });
    // El sector que se enseña es el del idioma activo: en francés, la Suiza
    // romanda; en inglés, el del perfil (la tienda).
    const lang = await idiomaDe(req);
    const t = await sectorDe(lang);
    res.json({
      ...rows[0],
      idioma: lang,
      track_slug: t?.slug || null,
      track_name: t?.name || null,
      track_icon: t?.icon || null,
    });
  } catch (e) { fallo(res, e); }
});

// Cambiar de sector, de objetivo o de nivel.
app.put('/profile', async (req, res) => {
  const allowed = ['name', 'track_id', 'goal', 'level'];
  const keys = Object.keys(req.body || {}).filter((k) => allowed.includes(k));
  if (!keys.length) return res.status(400).json({ error: 'Nada que actualizar' });
  try {
    const sets = keys.map((k, i) => `${k}=$${i + 2}`).join(',');
    const vals = [PROFILE_ID, ...keys.map((k) => req.body[k])];
    const { rows } = await db(`UPDATE profiles SET ${sets} WHERE id=$1 RETURNING *`, vals);
    res.json(rows[0]);
  } catch (e) { fallo(res, e); }
});

// Sectores disponibles, con cuántas situaciones trae cada uno.
app.get('/tracks', async (req, res) => {
  try {
    const { rows } = await db(
      `SELECT t.*, COUNT(s.id)::int AS situation_count
         FROM tracks t
         LEFT JOIN situations s ON s.track_id = t.id
        GROUP BY t.id
        ORDER BY t.order_index, t.name`
    );
    res.json(rows);
  } catch (e) { fallo(res, e); }
});

// Situaciones del sector activo (o de ?track=<slug>), con tu progreso en cada una.
app.get('/situations', async (req, res) => {
  try {
    const sector = req.query.track ? null : await sectorDe(await idiomaDe(req));
    const { rows } = await db(
      `SELECT s.*,
              COALESCE(sp.practiced_count, 0) AS practiced_count,
              COALESCE(sp.completed, false)   AS completed,
              sp.best_score, sp.last_practiced_at,
              (SELECT COUNT(*)::int FROM situation_lines l
                WHERE l.situation_id = s.id AND l.kind = 'key') AS key_count
         FROM situations s
         JOIN tracks t ON t.id = s.track_id
         LEFT JOIN situation_progress sp
                ON sp.situation_id = s.id AND sp.profile_id = $1
        WHERE t.slug = COALESCE($2, $3)
        ORDER BY s.order_index`,
      [PROFILE_ID, req.query.track || null, sector?.slug || null]
    );
    res.json(rows);
  } catch (e) { fallo(res, e); }
});

// Una situación al completo: frases clave + role-play turno a turno.
app.get('/situations/:id', async (req, res) => {
  try {
    const { rows: sit } = await db(
      `SELECT s.*, t.slug AS track_slug, t.name AS track_name, t.lang
         FROM situations s JOIN tracks t ON t.id = s.track_id
        WHERE s.id = $1`, [req.params.id]
    );
    if (!sit.length) return res.status(404).json({ error: 'No encontrada' });

    const { rows: lines } = await db(
      `SELECT id, kind, en, es, note, order_index
         FROM situation_lines WHERE situation_id = $1
        ORDER BY order_index`, [req.params.id]
    );
    const { rows: prog } = await db(
      `SELECT * FROM situation_progress WHERE situation_id=$1 AND profile_id=$2`,
      [req.params.id, PROFILE_ID]
    );

    // La columna se llama `en` por herencia, pero guarda el texto en el idioma
    // del sector: en la Suiza romanda es francés, y ahí no hay figurada.
    await figurarSi(sit[0].lang, lines, 'en');

    // Cuántas frases entran en una tanda. Va en config para poder moverlo sin
    // desplegar: doce frases seguidas con micrófono era lo que hacía que nadie
    // entrase aquí.
    const { rows: cfg } = await db("SELECT value FROM config WHERE key='situation_batch'");

    res.json({
      ...sit[0],
      keys:     lines.filter((l) => l.kind === 'key'),
      dialogue: lines.filter((l) => l.kind !== 'key'),
      progress: prog[0] || null,
      batch:    parseInt(cfg[0]?.value, 10) || 4,
    });
  } catch (e) { fallo(res, e); }
});

// Registrar que has practicado una situación.
app.post('/situations/:id/practice', async (req, res) => {
  const { score, completed } = req.body || {};
  // Cuántas frases se han dicho en esta tanda, y por cuál se sigue después.
  const hechas = Math.max(0, parseInt(req.body?.lines_done, 10) || 0);
  try {
    const { rows } = await db(
      `INSERT INTO situation_progress (profile_id, situation_id, practiced_count, best_score, completed, lines_done, last_practiced_at)
       VALUES ($1, $2, 1, $3, $4, $5, NOW())
       ON CONFLICT (profile_id, situation_id) DO UPDATE SET
         practiced_count   = situation_progress.practiced_count + 1,
         best_score        = GREATEST(COALESCE(situation_progress.best_score, 0), COALESCE($3, 0)),
         completed         = situation_progress.completed OR $4,
         -- Al completar vuelve a cero: la siguiente vuelta empieza de nuevo.
         lines_done        = CASE WHEN $4 THEN 0 ELSE GREATEST(situation_progress.lines_done, $5) END,
         last_practiced_at = NOW()
       RETURNING *`,
      [PROFILE_ID, req.params.id, score ?? null, completed ?? false, hechas]
    );

    // Sólo cuenta como speaking si de verdad ha hablado. `score` viene del
    // reconocimiento de voz, así que su presencia ES la prueba de que el
    // micrófono se usó: sin él esto sería otra vía de marcar HABLAR sin hablar,
    // que es justo lo que dejó la sección a cero durante tres semanas.
    const hubloMicro = score !== null && score !== undefined;
    if (hubloMicro) {
      await db(
        `INSERT INTO study_sessions (profile_id, date, type, duration_minutes, score, notes)
         VALUES ($1, $2, 'speaking', 5, $3, 'Situación del carril diario')`,
        [PROFILE_ID, todayStr(), score]
      );
      await db(
        `INSERT INTO daily_goals (profile_id, date, speaking_done, vocab_target)
         VALUES ($1, $2, TRUE, ${SQL_META_VOCAB})
         ON CONFLICT (profile_id, date) DO UPDATE SET speaking_done = TRUE`,
        [PROFILE_ID, todayStr()]
      );
      await recomputeStreak(todayStr());
    }
    await addXp(hubloMicro ? 10 : 4);

    res.json(rows[0]);
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// LISTENING
// El guion se locuta en el navegador si no hay audio grabado (audio_url).
// ════════════════════════════════════════════════════════
app.get('/listening/tasks', async (req, res) => {
  try {
    const { rows } = await db(
      `SELECT t.id, t.slug, t.part, t.title, t.intro, t.audio_url, t.speaker, t.level, t.lang,
              COUNT(q.id)::int AS questions
         FROM listening_tasks t
         LEFT JOIN exam_questions q ON q.listening_id = t.id
        WHERE t.lang = $1
        GROUP BY t.id ORDER BY t.level, t.part, t.id`, [await idiomaDe(req)]
    );
    res.json(rows);
  } catch (e) { fallo(res, e); }
});

app.get('/listening/task/:slug', async (req, res) => {
  try {
    const { rows: t } = await db('SELECT * FROM listening_tasks WHERE slug=$1', [req.params.slug]);
    if (!t.length) return res.status(404).json({ error: 'No encontrada' });
    const { rows: qs } = await db(
      `SELECT id, part, prompt, options, order_index
         FROM exam_questions WHERE listening_id=$1 ORDER BY order_index`, [t[0].id]
    );
    res.json({ ...t[0], questions: qs });
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// WRITING
// No se puede autocorregir: se puntúa contra los cuatro criterios oficiales
// de Cambridge (Content, Communicative Achievement, Organisation, Language).
// ════════════════════════════════════════════════════════
app.get('/writing/tasks', async (req, res) => {
  try {
    // Del idioma activo, y de menos a más nivel: en francés van primero los
    // correos que hacen falta el primer mes y al final el formato del DALF.
    const { rows } = await db(
      `SELECT t.*, (SELECT COUNT(*)::int FROM writing_submissions s
                     WHERE s.task_id = t.id AND s.profile_id = $1) AS attempts
         FROM writing_tasks t
        WHERE t.lang = $2
        ORDER BY t.nivel, t.part, t.id`, [PROFILE_ID, await idiomaDe(req)]
    );
    res.json(rows);
  } catch (e) { fallo(res, e); }
});

app.get('/writing/tasks/:slug', async (req, res) => {
  try {
    const { rows } = await db('SELECT * FROM writing_tasks WHERE slug=$1', [req.params.slug]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrada' });
    res.json(rows[0]);
  } catch (e) { fallo(res, e); }
});

app.post('/writing/submissions', async (req, res) => {
  const { task_id, body, content, achievement, organisation, language, notes } = req.body || {};
  if (!task_id || !body) return res.status(400).json({ error: 'task_id y body requeridos' });
  // Se cuenta igual que Cambridge: por palabras separadas por espacios.
  const words = String(body).trim().split(/\s+/).filter(Boolean).length;
  try {
    const { rows } = await db(
      `INSERT INTO writing_submissions
         (profile_id, task_id, body, word_count, content, achievement, organisation, language, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [PROFILE_ID, task_id, body, words,
       content ?? null, achievement ?? null, organisation ?? null, language ?? null, notes || null]
    );
    // Si se ha autopuntuado, cuenta como intento de la destreza — pero sólo
    // si la tarea es de nivel de examen (C1). Un 18/20 en un correo de B1 a la
    // régie no dice que escribas en C1, y contarlo haría que la cabecera se
    // inventase un nivel. La nota va con el idioma de la tarea.
    const { rows: [tarea] } = await db('SELECT lang, nivel FROM writing_tasks WHERE id=$1', [task_id]);
    const criterios = [content, achievement, organisation, language].filter((v) => v != null);
    if (criterios.length === 4 && tarea?.nivel === 'C1') {
      const total = criterios.reduce((a, b) => a + b, 0);
      await db(
        `INSERT INTO exam_attempts (profile_id, date, section, score, max_score, notes, lang)
         VALUES ($1,$2,'writing',$3,20,$4,$5)`,
        [PROFILE_ID, todayStr(), total, `Writing · ${words} palabras`, tarea.lang]
      );
    }
    await db(
      `INSERT INTO study_sessions (profile_id, date, type, duration_minutes, notes)
       VALUES ($1,$2,'exam',45,'Writing')`, [PROFILE_ID, todayStr()]
    );
    await addXp(25);
    res.json({ ...rows[0], word_count: words });
  } catch (e) { fallo(res, e); }
});

app.get('/writing/submissions', async (req, res) => {
  try {
    const { rows } = await db(
      `SELECT s.*, t.title, t.kind, t.part, t.word_min, t.word_max
         FROM writing_submissions s JOIN writing_tasks t ON t.id = s.task_id
        WHERE s.profile_id=$1 ORDER BY s.created_at DESC LIMIT 20`, [PROFILE_ID]
    );
    res.json(rows);
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// SPEAKING (las 4 partes del examen oral)
// ════════════════════════════════════════════════════════
app.get('/speaking/tasks', async (req, res) => {
  try {
    const { rows } = await db(
      'SELECT * FROM speaking_tasks WHERE lang = $1 ORDER BY part, nivel, id', [await idiomaDe(req)]);
    res.json(rows);
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// PRONUNCIACIÓN — figurada, contrastes y trampas
// ════════════════════════════════════════════════════════

// GET /pronunciation/word/:word — cómo se lee una palabra suelta
app.get('/pronunciation/word/:word', async (req, res) => {
  try {
    const r = await figurarUna(req.params.word);
    if (!r) return res.status(404).json({ error: 'No está en el diccionario' });
    res.json(r);
  } catch (e) { fallo(res, e); }
});

// POST /pronunciation/text — figurada de una frase o de varias
// body: { texto: "..." }  ó  { textos: ["...", "..."] }
app.post('/pronunciation/text', async (req, res) => {
  const { texto, textos } = req.body || {};
  const lista = Array.isArray(textos) ? textos : [texto];
  if (!lista.length || lista.every((t) => !t)) {
    return res.status(400).json({ error: 'Falta el texto' });
  }
  try {
    const buscar = await cargarIpa(lista.join(' '));
    const out = lista.map((t) => (t ? pron.figurarTexto(t, buscar) : null));
    res.json(Array.isArray(textos) ? out : out[0]);
  } catch (e) { fallo(res, e); }
});

// GET /pronunciation/legend — la guía de cómo se lee cada letra de la figurada.
// Va ordenada por lo que más se nota al hablar, no por orden alfabético.
app.get('/pronunciation/legend', (req, res) => {
  res.json({
    marcas:  guiaSonidos.MARCAS,
    sonidos: [...guiaSonidos.GUIA].sort((a, b) => a.prioridad - b.prioridad),
  });
});

// GET /pronunciation/contrasts — los sonidos que confunde un español
app.get('/pronunciation/contrasts', async (req, res) => {
  try {
    const { rows } = await db(
      `SELECT c.*, p.aciertos, p.fallos, p.mejor_pct, p.ultima_vez,
              (SELECT count(*) FROM pron_pairs pp WHERE pp.contrast_id = c.id) AS n_pares
         FROM pron_contrasts c
         LEFT JOIN pron_progress p ON p.contrast_id = c.id AND p.profile_id = $1
        ORDER BY c.orden`, [PROFILE_ID]
    );
    res.json(rows);
  } catch (e) { fallo(res, e); }
});

// GET /pronunciation/contrasts/:slug — un contraste con sus pares ya figurados
app.get('/pronunciation/contrasts/:slug', async (req, res) => {
  try {
    const { rows: cs } = await db('SELECT * FROM pron_contrasts WHERE slug=$1', [req.params.slug]);
    if (!cs.length) return res.status(404).json({ error: 'No encontrado' });

    const { rows: pares } = await db(
      'SELECT * FROM pron_pairs WHERE contrast_id=$1 ORDER BY orden', [cs[0].id]
    );
    const buscar = await cargarIpa(pares.map((p) => `${p.word_a} ${p.word_b}`).join(' '));
    // Un par puede traer su propio AFI cuando la palabra es ambigua: el
    // diccionario da "live" como /laɪv/ (en directo) y aquí hace falta /lɪv/.
    const figura = (palabra, ipaForzado) => ipaForzado
      ? respelling.desdeIpa(ipaForzado, palabra)
      : pron.figurarPalabra(palabra, buscar);

    res.json({
      ...cs[0],
      pares: pares.map((p) => {
        const fig_a = figura(p.word_a, p.ipa_a);
        const fig_b = figura(p.word_b, p.ipa_b);
        return {
          ...p,
          fig_a,
          fig_b,
          // Tres contrastes (s/z, θ/ð) comparten grafía en la figurada: la /z/
          // se escribe "s" y la /ð/ se escribe "d", y el color es lo que las
          // separa. En el modo lectura eso dejaría la pregunta sin solución,
          // así que se avisa para que el cliente enseñe también el AFI.
          ambiguo: !!(fig_a && fig_b && fig_a.texto === fig_b.texto),
        };
      }),
    });
  } catch (e) { fallo(res, e); }
});

// POST /pronunciation/contrasts/:slug/result — resultado de una ronda
// body: { aciertos, fallos }
app.post('/pronunciation/contrasts/:slug/result', async (req, res) => {
  const aciertos = Math.max(0, parseInt(req.body?.aciertos, 10) || 0);
  const fallos   = Math.max(0, parseInt(req.body?.fallos, 10) || 0);
  const total    = aciertos + fallos;
  if (!total) return res.status(400).json({ error: 'Ronda vacía' });
  const pct = Math.round((aciertos / total) * 100);

  try {
    const { rows: cs } = await db('SELECT id FROM pron_contrasts WHERE slug=$1', [req.params.slug]);
    if (!cs.length) return res.status(404).json({ error: 'No encontrado' });

    // OJO: el índice único es (profile_id, contrast_id). Nombrar solo una
    // columna aquí rompería el ON CONFLICT, como ya pasó en la migración 07.
    const { rows } = await db(
      `INSERT INTO pron_progress (profile_id, contrast_id, aciertos, fallos, mejor_pct, ultima_vez)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (profile_id, contrast_id) DO UPDATE SET
         aciertos   = pron_progress.aciertos + EXCLUDED.aciertos,
         fallos     = pron_progress.fallos   + EXCLUDED.fallos,
         mejor_pct  = GREATEST(COALESCE(pron_progress.mejor_pct, 0), EXCLUDED.mejor_pct),
         ultima_vez = NOW()
       RETURNING *`,
      [PROFILE_ID, cs[0].id, aciertos, fallos, pct]
    );
    // Entrenar el oído cuenta como práctica de speaking del día.
    await db(
      `INSERT INTO daily_goals (profile_id, date, speaking_done, vocab_target)
       VALUES ($1, $2, TRUE, ${SQL_META_VOCAB})
       ON CONFLICT (profile_id, date) DO UPDATE SET speaking_done = TRUE`,
      [PROFILE_ID, todayStr()]
    ).catch(() => {});
    await addXp(Math.round(aciertos * 2));
    res.json({ ...rows[0], pct });
  } catch (e) { fallo(res, e); }
});

// GET /pronunciation/intro — el recorrido guiado que enseña a leer la figurada
app.get('/pronunciation/intro', async (req, res) => {
  try {
    const { rows } = await db("SELECT value FROM config WHERE key='pron_intro_vista'");
    res.json({ pasos: introPron.PASOS, vista: rows[0]?.value || null });
  } catch (e) { fallo(res, e); }
});

// GET /pronunciation/traps — las trampas del hispanohablante
app.get('/pronunciation/traps', async (req, res) => {
  try {
    const { rows } = await db('SELECT * FROM pron_traps ORDER BY orden');
    res.json(rows);
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// SESIÓN DIARIA — cinco minutos con final
// ════════════════════════════════════════════════════════
// Antes había que entrar y decidir entre cinco secciones. Decidir es fricción,
// y con 209 palabras pendientes de golpe la decisión que se toma es cerrar la
// app. Esto devuelve un guion cerrado: unas pocas palabras, una frase de tu
// sector y un par mínimo. Se acaba, y se sabe cuándo se ha acabado.

// GET /sesion-diaria — el guion de hoy
app.get('/sesion-diaria', async (req, res) => {
  try {
    const { rows: cfg } = await db("SELECT value FROM config WHERE key='daily_vocab_target'");
    const meta = Math.max(1, parseInt(cfg[0]?.value, 10) || 8);
    const lang = await idiomaActivo();
    const hoy  = todayStr();
    const dia  = tetris.diaDeEstudio();

    // 1a. Lo que se ha fallado HOY vuelve en la siguiente ronda.
    //
    // FSRS manda una palabra fallada a mañana como pronto, y con una sesión al
    // día eso bastaba. Con el modo Tetris hay seis rondas al día, y dejar que
    // una palabra fallada a las 9:00 no vuelva a salir hasta mañana es tirar
    // cinco oportunidades de aprenderla. Como mucho media ronda, para que las
    // falladas no se coman las nuevas.
    const { rows: falladas } = await db(
      `WITH ultimas AS (
         SELECT DISTINCT ON (rl.user_word_id) rl.user_word_id, rl.rating
           FROM review_log rl
          WHERE rl.profile_id = $1 AND ${tetris.sqlDiaDeEstudio('rl.reviewed_at', '$2')} = $3::date
          ORDER BY rl.user_word_id, rl.reviewed_at DESC
       )
       SELECT uw.id, uw.status, w.word, w.translation, w.example_sentence, w.level, w.category,
              TRUE AS repetida
         FROM ultimas u
         JOIN user_words uw ON uw.id = u.user_word_id
         JOIN words w ON w.id = uw.word_id
        WHERE u.rating = 1 AND w.lang = $4
        ORDER BY uw.id
        LIMIT $5`, [PROFILE_ID, fechas.ZONA, dia, lang, Math.ceil(meta / 2)]
    );

    // 1b. El resto, las que tocan por FSRS, hasta completar la meta del día.
    const { rows: nuevas } = await db(
      `SELECT uw.id, uw.status, w.word, w.translation, w.example_sentence, w.level, w.category
         FROM user_words uw JOIN words w ON w.id = uw.word_id
        WHERE uw.profile_id = $1 AND uw.next_review_date <= $2 AND w.lang = $3
          AND NOT (uw.id = ANY($4::int[]))
        ORDER BY uw.next_review_date, uw.id
        LIMIT $5`, [PROFILE_ID, hoy, lang, falladas.map((f) => f.id), meta - falladas.length]
    );
    const palabras = [...falladas, ...nuevas];
    await figurarSi(lang, palabras, 'word');

    // 2. Una frase de la situación que toca HOY según el plan de 30 días.
    //
    // Antes cogía la primera sin terminar y el currículo se ignoraba entero:
    // había un guion escrito que asignaba situación y gramática a cada día, y
    // la sesión servía otra cosa. Si el día del plan no tiene situación
    // asignada —o el plan ya se acabó— se cae a la primera sin terminar, que es
    // el comportamiento de siempre.
    //
    // Todo dentro del sector del idioma activo: el plan de 30 días es del
    // inglés, así que en francés se va directo a la primera sin terminar de la
    // Suiza romanda. Y el día del plan se cuenta desde la fecha del usuario, no
    // desde el CURRENT_DATE de Postgres, que va en UTC.
    const sector = await sectorDe(lang);
    const { rows: sit } = sector ? await db(
      `WITH dia AS (
         SELECT ($3::date - (SELECT value::date FROM config WHERE key='plan_start_date')) + 1 AS n
       ),
       del_plan AS (
         SELECT s.id, s.title_es, s.title_en, 0 AS prioridad
           FROM curriculum c
           JOIN situations s ON s.id = c.situation_id
           LEFT JOIN situation_progress p ON p.situation_id = s.id AND p.profile_id = $1
          WHERE c.day = (SELECT n FROM dia)
            AND s.track_id = $2
            AND COALESCE(p.completed, FALSE) = FALSE
       ),
       siguiente AS (
         SELECT s.id, s.title_es, s.title_en, 1 AS prioridad
           FROM situations s
           LEFT JOIN situation_progress p ON p.situation_id = s.id AND p.profile_id = $1
          WHERE s.track_id = $2
            AND COALESCE(p.completed, FALSE) = FALSE
          ORDER BY s.order_index LIMIT 1
       )
       SELECT id, title_es, title_en FROM (
         SELECT * FROM del_plan UNION ALL SELECT * FROM siguiente
       ) t ORDER BY prioridad LIMIT 1`, [PROFILE_ID, sector.id, hoy]
    ) : { rows: [] };
    let frase = null;
    if (sit.length) {
      const { rows: lineas } = await db(
        `SELECT id, en, es, note FROM situation_lines
          WHERE situation_id = $1 AND kind = 'key' ORDER BY order_index`, [sit[0].id]
      );
      if (lineas.length) {
        // Rota por día del usuario: con getDate() del servidor, la frase de la
        // sesión cambiaba a las 2 de la madrugada en vez de a medianoche.
        const diaDelMes = Number(hoy.split('-')[2]);
        const elegida = lineas[diaDelMes % lineas.length];
        await figurarSi(lang, [elegida], 'en');
        frase = { ...elegida, situacion: sit[0] };
      }
    }

    // 3. Un contraste de pronunciación: el menos dominado que haya. Los pares
    //    mínimos son del inglés; en francés este tramo no sale.
    const { rows: contraste } = lang === 'en' ? await db(
      `SELECT c.slug, c.titulo_es, c.figurada_a, c.figurada_b
         FROM pron_contrasts c
         LEFT JOIN pron_progress p ON p.contrast_id = c.id AND p.profile_id = $1
        ORDER BY COALESCE(p.mejor_pct, -1), c.orden LIMIT 1`, [PROFILE_ID]
    ) : { rows: [] };

    const { rows: goal } = await db(
      'SELECT * FROM daily_goals WHERE profile_id=$1 AND date=$2', [PROFILE_ID, hoy]);

    res.json({
      idioma: lang,
      meta,
      palabras,
      frase,
      contraste: contraste[0] || null,
      pendientes_totales: (await db(
        `SELECT count(*)::int AS n FROM user_words uw JOIN words w ON w.id = uw.word_id
          WHERE uw.profile_id=$1 AND uw.next_review_date<=$2 AND w.lang=$3`,
        [PROFILE_ID, hoy, lang])).rows[0].n,
      ya_hecha: !!goal[0] && (Number(goal[0].vocab_done) > 0 || goal[0].speaking_done === true),
    });
  } catch (e) { fallo(res, e); }
});


// POST /sesion-diaria/fin — cerrar la sesión del día
app.post('/sesion-diaria/fin', async (req, res) => {
  const aciertos = Math.max(0, parseInt(req.body?.aciertos, 10) || 0);
  const frase    = req.body?.frase_hecha === true;
  try {
    // OJO: la sesión NO marca `speaking_done`, y quitarlo fue el arreglo más
    // importante de esta pantalla. Antes ver UNA frase del sector —leerla, sin
    // micrófono— dejaba la meta de HABLAR en "Completado ✓" y la barra del día
    // al 66 %. Los cuatro días de uso tenían speaking_done=true con la tabla
    // `speaking_practice` vacía: la app llevaba tres semanas diciendo que ya
    // habías hablado, así que nunca había motivo para entrar en HABLAR.
    //
    // El índice único es (profile_id, date): nombrarlo entero, como manda la
    // migración 07. Con solo (date) esto reventaría.
    await db(
      `INSERT INTO daily_goals (profile_id, date, vocab_done, vocab_target)
       VALUES ($1, $2, $3, ${SQL_META_VOCAB})
       ON CONFLICT (profile_id, date) DO UPDATE SET
         vocab_done = GREATEST(daily_goals.vocab_done, EXCLUDED.vocab_done)`,
      [PROFILE_ID, todayStr(), aciertos]
    );

    // La frase del sector sí cuenta como lo que es: una frase de esa situación.
    // Así el trabajo que la sesión SÍ hace deja rastro donde corresponde, en
    // vez de anotarse en una meta que no ha tocado.
    const sitId = parseInt(req.body?.situation_id, 10);
    if (frase && Number.isFinite(sitId)) {
      await db(
        `INSERT INTO situation_progress (profile_id, situation_id, practiced_count, lines_done, last_practiced_at)
         VALUES ($1, $2, 0, 1, NOW())
         ON CONFLICT (profile_id, situation_id) DO UPDATE SET
           lines_done        = situation_progress.lines_done + 1,
           last_practiced_at = NOW()`,
        [PROFILE_ID, sitId]
      );
    }
    await db(
      `INSERT INTO study_sessions (profile_id, date, type, duration_minutes, notes)
       VALUES ($1,$2,'vocab',5,'Sesión diaria')`, [PROFILE_ID, todayStr()]);

    // Cada sesión terminada es una ronda del modo Tetris, en el día de estudio
    // (que va de 05:00 a 05:00) y en el idioma en el que se ha hecho.
    const { rows: td } = await db(
      `INSERT INTO tetris_dias (profile_id, fecha, lang, rondas) VALUES ($1, $2, $3, 1)
       ON CONFLICT (profile_id, fecha, lang) DO UPDATE SET rondas = tetris_dias.rondas + 1
       RETURNING rondas`, [PROFILE_ID, tetris.diaDeEstudio(), await idiomaActivo()]);

    await addXp(aciertos * 5 + (frase ? 10 : 0));
    const racha = await recomputeStreak(todayStr());
    res.json({ ok: true, racha, rondas: td[0]?.rondas || 1 });
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// IDIOMA — inglés o francés
// ════════════════════════════════════════════════════════

// GET /idioma — el idioma activo y lo que el cliente necesita para pintarlo
app.get('/idioma', async (req, res) => {
  try {
    const c = await leerConfig(['idioma_activo', 'tetris_activo']);
    res.json({
      idioma: normalizarIdioma(c.idioma_activo),
      idiomas: IDIOMAS,
      tetris_activo: c.tetris_activo !== '0',
    });
  } catch (e) { fallo(res, e); }
});

// PUT /idioma — cambiar de idioma. body: { idioma: 'en' | 'fr' }
app.put('/idioma', async (req, res) => {
  const idioma = req.body?.idioma;
  if (!esIdioma(idioma)) return res.status(400).json({ error: 'Idioma no válido' });
  try {
    await db(`INSERT INTO config (key, value) VALUES ('idioma_activo', $1)
              ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [idioma]);
    res.json({ ok: true, idioma });
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// PLAN DEL FRANCÉS — por fases, no por días
// ════════════════════════════════════════════════════════
// Ver lib/fases.js: tres fases con objetivos medibles, sin calendario. Se pasa
// de una a otra cuando los datos lo dicen.
app.get('/plan/fases', async (req, res) => {
  try {
    const [pal, sit, gram, esc, comp] = await Promise.all([
      db(`SELECT w.category, count(*)::int AS total,
                 count(*) FILTER (WHERE uw.stability >= 7)::int AS consolidadas,
                 count(*) FILTER (WHERE uw.reps > 0)::int AS vistas
            FROM words w
            JOIN user_words uw ON uw.word_id = w.id AND uw.profile_id = $1
           WHERE w.lang = 'fr'
           GROUP BY w.category`, [PROFILE_ID]),
      db(`SELECT s.level, count(*)::int AS total,
                 count(*) FILTER (WHERE COALESCE(p.completed, FALSE))::int AS hechas
            FROM situations s
            JOIN tracks t ON t.id = s.track_id AND t.lang = 'fr'
            LEFT JOIN situation_progress p ON p.situation_id = s.id AND p.profile_id = $1
           GROUP BY s.level`, [PROFILE_ID]),
      db(`SELECT g.level, count(*)::int AS total,
                 count(*) FILTER (WHERE COALESCE(p.completed, FALSE))::int AS hechas
            FROM grammar_topics g
            LEFT JOIN grammar_progress p ON p.topic_id = g.id AND p.profile_id = $1
           WHERE g.lang = 'fr'
           GROUP BY g.level`, [PROFILE_ID]),
      // Tareas escritas: las prácticas cuentan con haberlas escrito una vez;
      // las del DALF, sólo si además se han autoevaluado con los 4 criterios.
      db(`SELECT (t.nivel = 'C1') AS dalf, count(*)::int AS total,
                 count(*) FILTER (WHERE EXISTS (
                   SELECT 1 FROM writing_submissions s
                    WHERE s.task_id = t.id AND s.profile_id = $1
                      AND (t.nivel <> 'C1' OR (s.content IS NOT NULL AND s.achievement IS NOT NULL
                           AND s.organisation IS NOT NULL AND s.language IS NOT NULL))
                 ))::int AS hechas
            FROM writing_tasks t
           WHERE t.lang = 'fr'
           GROUP BY 1`, [PROFILE_ID]),
      // Comprensión: de las dos pruebas, cuántas tienen algún intento con un
      // 50 % o más. Sólo los textos y audios C1 dejan intento (los B1 y B2 son
      // práctica), así que esto ya es "un C1 aprobado".
      db(`SELECT count(DISTINCT section)::int AS hechas
            FROM exam_attempts
           WHERE profile_id = $1 AND lang = 'fr' AND section IN ('listening','reading')
             AND score::float / NULLIF(max_score, 0) >= 0.5`, [PROFILE_ID]),
    ]);
    const porClave = (rows, clave) => Object.fromEntries(rows.map((r) => [r[clave], r]));
    const palabras = porClave(pal.rows, 'category');
    res.json({
      fases: fasesFrances({
        palabras,
        situaciones: porClave(sit.rows, 'level'),
        gramatica: porClave(gram.rows, 'level'),
        correos: esc.rows.find((r) => !r.dalf),
        dalf:    esc.rows.find((r) => r.dalf),
        comprension: { total: 2, hechas: comp.rows[0]?.hechas || 0 },
      }),
      vistas: pal.rows.reduce((a, r) => a + r.vistas, 0),
      total: pal.rows.reduce((a, r) => a + r.total, 0),
    });
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// MODO TETRIS — día intenso, repaso de almohada y pistas de noche
// ════════════════════════════════════════════════════════
// Toda la lógica que se puede probar sin base de datos está en lib/tetris.js,
// con el porqué de cada decisión. Aquí sólo se lee y se guarda.

const SQL_DIA_RL = tetris.sqlDiaDeEstudio('rl.reviewed_at', '$2');

/** Las palabras (ids de user_words) repasadas en un día de estudio. */
async function palabrasDelDia(lang, dia) {
  const { rows } = await db(
    `SELECT DISTINCT uw.id, uw.difficulty, w.word, w.translation, w.example_sentence
       FROM review_log rl
       JOIN user_words uw ON uw.id = rl.user_word_id
       JOIN words w ON w.id = uw.word_id
      WHERE rl.profile_id = $1 AND ${SQL_DIA_RL} = $3::date AND w.lang = $4`,
    [PROFILE_ID, fechas.ZONA, dia, lang]);
  return rows;
}

/**
 * El test del despertar pendiente: la noche del día de estudio ANTERIOR con
 * palabras aún sin probar. Sólo la de ayer: una noche de hace tres días ya no
 * mide lo que dejó el sueño, mide lo que quedó después de tres días.
 */
async function despertarPendiente(lang, dia = tetris.diaDeEstudio()) {
  const { rows } = await db(
    `SELECT n.id, n.fecha::text AS fecha, n.pistas, count(*)::int AS n
       FROM noches n JOIN noche_palabras np ON np.noche_id = n.id
      WHERE n.profile_id = $1 AND n.lang = $2 AND n.fecha = $3::date - 1
        AND np.recordada IS NULL
      GROUP BY n.id`, [PROFILE_ID, lang, dia]);
  return rows[0] || null;
}

/** Filas ya probadas de todas las noches, para comparar grupos. */
async function resumenTetris(lang) {
  const { rows } = await db(
    `SELECT np.noche_id, n.pistas, np.con_pista, np.recordada
       FROM noche_palabras np JOIN noches n ON n.id = np.noche_id
      WHERE n.profile_id = $1 AND n.lang = $2 AND np.recordada IS NOT NULL`,
    [PROFILE_ID, lang]);
  const r = tetris.resumenNoches(rows);
  return { ...r, veredicto: tetris.veredicto(r) };
}

const CLAVES_TETRIS = ['tetris_activo', 'tetris_rondas', 'tetris_hora_manana', 'tetris_hora_almohada',
                       'noche_espera_min', 'noche_duracion_min', 'noche_intervalo_s', 'noche_volumen'];

/** Ajustes del modo noche, con límites: un intervalo de 0 s sería una ráfaga. */
function ajustesNoche(c) {
  const num = (v, def, min, max) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  };
  return {
    espera_min:   num(c.noche_espera_min, 30, 0, 120),
    duracion_min: num(c.noche_duracion_min, 90, 10, 240),
    intervalo_s:  num(c.noche_intervalo_s, 6, 3, 30),
    volumen:      num(c.noche_volumen, 0.35, 0.05, 1),
  };
}

// GET /tetris/hoy — el estado del día y qué toca ahora
app.get('/tetris/hoy', async (req, res) => {
  try {
    const lang = await idiomaActivo();
    const dia  = tetris.diaDeEstudio();
    const c    = await leerConfig(CLAVES_TETRIS);
    const [td, pal, noche, pend, resultados, anoche] = await Promise.all([
      db('SELECT rondas, almohada_at FROM tetris_dias WHERE profile_id=$1 AND fecha=$2 AND lang=$3',
         [PROFILE_ID, dia, lang]),
      db(`SELECT count(DISTINCT rl.user_word_id)::int AS n
            FROM review_log rl JOIN user_words uw ON uw.id = rl.user_word_id
            JOIN words w ON w.id = uw.word_id
           WHERE rl.profile_id = $1 AND ${SQL_DIA_RL} = $3::date AND w.lang = $4`,
         [PROFILE_ID, fechas.ZONA, dia, lang]),
      db(`SELECT n.id, n.empezada, n.terminada, n.pistas,
                 count(*) FILTER (WHERE np.con_pista)::int AS con_pista,
                 count(*) FILTER (WHERE NOT np.con_pista)::int AS control
            FROM noches n LEFT JOIN noche_palabras np ON np.noche_id = n.id
           WHERE n.profile_id=$1 AND n.fecha=$2 AND n.lang=$3
           GROUP BY n.id`, [PROFILE_ID, dia, lang]),
      despertarPendiente(lang, dia),
      resumenTetris(lang),
      // Cómo fue el test de la noche de ayer, para enseñarlo hecho en HOY.
      db(`SELECT n.id, n.pistas, count(*)::int AS total,
                 count(np.recordada)::int AS probadas,
                 count(*) FILTER (WHERE np.recordada = 2)::int AS primera
            FROM noches n JOIN noche_palabras np ON np.noche_id = n.id
           WHERE n.profile_id=$1 AND n.lang=$2 AND n.fecha = $3::date - 1
           GROUP BY n.id`, [PROFILE_ID, lang, dia]),
    ]);

    const rondas      = td.rows[0]?.rondas || 0;
    const metaRondas  = Math.max(1, parseInt(c.tetris_rondas, 10) || 6);
    const palabrasHoy = pal.rows[0]?.n || 0;
    const horaAlmohada = c.tetris_hora_almohada || '22:30';

    const fase = tetris.faseTetris({
      minutos: fechas.minutosEnZona(),
      despertarPendiente: !!pend,
      rondas,
      metaRondas,
      almohadaHecha: !!td.rows[0]?.almohada_at,
      nocheEmpezada: !!noche.rows[0],
      minAlmohada: tetris.minutosDeHora(horaAlmohada),
      palabrasHoy,
    });

    res.json({
      activo: c.tetris_activo !== '0',
      idioma: lang,
      dia,
      rondas,
      meta_rondas: metaRondas,
      palabras_hoy: palabrasHoy,
      almohada_hecha: !!td.rows[0]?.almohada_at,
      hora_almohada: horaAlmohada,
      hora_manana: c.tetris_hora_manana || '08:00',
      noche: noche.rows[0] || null,
      anoche: anoche.rows[0] || null,
      despertar: pend,
      ajustes_noche: ajustesNoche(c),
      resultados,
      ...fase,
    });
  } catch (e) { fallo(res, e); }
});

// GET /tetris/almohada — las palabras de hoy para el último repaso
app.get('/tetris/almohada', async (req, res) => {
  try {
    const lang = await idiomaActivo();
    const palabras = await palabrasDelDia(lang, tetris.diaDeEstudio());
    // Barajadas, y con tope: el repaso de almohada es un último vistazo, no
    // otra sesión de media hora que quite sueño.
    palabras.sort(() => Math.random() - 0.5);
    res.json({ idioma: lang, palabras: palabras.slice(0, 40), total: palabras.length });
  } catch (e) { fallo(res, e); }
});

// POST /tetris/almohada — repaso de almohada hecho
app.post('/tetris/almohada', async (req, res) => {
  try {
    const lang = await idiomaActivo();
    await db(
      `INSERT INTO tetris_dias (profile_id, fecha, lang, almohada_at) VALUES ($1, $2, $3, NOW())
       ON CONFLICT (profile_id, fecha, lang) DO UPDATE SET almohada_at = NOW()`,
      [PROFILE_ID, tetris.diaDeEstudio(), lang]);
    await addXp(10);
    res.json({ ok: true });
  } catch (e) { fallo(res, e); }
});

// POST /tetris/noche — abre (o recupera) la noche de hoy y da las pistas
//
// El sorteo se hace UNA vez por noche. Reabrir el modo noche devuelve el mismo
// reparto: volver a sortear dejaría palabras que ya sonaron en el grupo de
// control, y la comparación de la mañana no valdría nada. Por la misma razón,
// lo que se estudie después de abrir la noche ya no entra en ella.
app.post('/tetris/noche', async (req, res) => {
  try {
    const lang = await idiomaActivo();
    const dia  = tetris.diaDeEstudio();

    let { rows: [noche] } = await db(
      'SELECT id, fecha::text AS fecha, pistas FROM noches WHERE profile_id=$1 AND fecha=$2 AND lang=$3',
      [PROFILE_ID, dia, lang]);

    if (!noche) {
      const palabras = await palabrasDelDia(lang, dia);
      if (!palabras.length) {
        return res.status(409).json({
          error: 'Hoy no has estudiado ninguna palabra: sin eso no hay nada que repasar de noche. Haz una ronda primero.',
        });
      }
      const { conPista, control } = tetris.repartirPistas(
        palabras.map((p) => ({ id: p.id, peso: Number(p.difficulty) || 5 })));

      const cli = await pool.connect();
      try {
        await cli.query('BEGIN');
        const { rows: nueva } = await cli.query(
          `INSERT INTO noches (profile_id, fecha, lang) VALUES ($1, $2, $3)
           ON CONFLICT (profile_id, fecha, lang) DO NOTHING
           RETURNING id, fecha::text AS fecha, pistas`, [PROFILE_ID, dia, lang]);
        if (nueva.length) {
          noche = nueva[0];
          await cli.query(
            `INSERT INTO noche_palabras (noche_id, user_word_id, con_pista)
             SELECT $1::int, unnest($2::int[]), TRUE
             UNION ALL
             SELECT $1::int, unnest($3::int[]), FALSE`,
            [noche.id, conPista.map((p) => p.id), control.map((p) => p.id)]);
        }
        await cli.query('COMMIT');
      } catch (e) {
        await cli.query('ROLLBACK').catch(() => {});
        throw e;
      } finally {
        cli.release();
      }
      // Dos pestañas a la vez: la otra ganó la carrera y ya hizo el sorteo.
      if (!noche) {
        ({ rows: [noche] } = await db(
          'SELECT id, fecha::text AS fecha, pistas FROM noches WHERE profile_id=$1 AND fecha=$2 AND lang=$3',
          [PROFILE_ID, dia, lang]));
      }
    }

    // Sólo la palabra extranjera: la traducción NO se manda a propósito. Oírla
    // detrás de la pista anula el efecto en los estudios que lo han medido.
    const { rows: pistas } = await db(
      `SELECT uw.id, w.word
         FROM noche_palabras np
         JOIN user_words uw ON uw.id = np.user_word_id
         JOIN words w ON w.id = uw.word_id
        WHERE np.noche_id = $1 AND np.con_pista
        ORDER BY random()`, [noche.id]);
    const { rows: [ctl] } = await db(
      'SELECT count(*)::int AS n FROM noche_palabras WHERE noche_id = $1 AND NOT con_pista', [noche.id]);

    res.json({
      idioma: lang,
      noche,
      pistas,
      n_control: ctl.n,
      ajustes: ajustesNoche(await leerConfig(CLAVES_TETRIS)),
    });
  } catch (e) { fallo(res, e); }
});

// POST /tetris/noche/:id/progreso — cuántas pistas han sonado de verdad
// body: { nuevas: n, terminada: bool }. Se manda por tandas durante la noche:
// si el móvil se apaga a las tres, lo sonado hasta entonces queda apuntado.
app.post('/tetris/noche/:id/progreso', async (req, res) => {
  const nuevas = Math.max(0, Math.min(5000, parseInt(req.body?.nuevas, 10) || 0));
  const terminada = req.body?.terminada === true;
  try {
    const { rows } = await db(
      `UPDATE noches SET pistas = pistas + $2,
                         terminada = CASE WHEN $3 THEN NOW() ELSE terminada END
        WHERE id = $1 AND profile_id = $4
        RETURNING id, pistas, terminada`, [req.params.id, nuevas, terminada, PROFILE_ID]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrada' });
    res.json(rows[0]);
  } catch (e) { fallo(res, e); }
});

// GET /tetris/despertar — el test de la mañana, A CIEGAS
// No se dice qué palabras sonaron por la noche: saberlo cambia cómo se juzga
// uno mismo, y el test es precisamente para comparar los dos grupos.
app.get('/tetris/despertar', async (req, res) => {
  try {
    const lang = await idiomaActivo();
    const pend = await despertarPendiente(lang);
    if (!pend) return res.json({ idioma: lang, noche: null, palabras: [] });
    const { rows } = await db(
      `SELECT uw.id, w.word, w.translation, w.example_sentence
         FROM noche_palabras np
         JOIN user_words uw ON uw.id = np.user_word_id
         JOIN words w ON w.id = uw.word_id
        WHERE np.noche_id = $1 AND np.recordada IS NULL
        ORDER BY random()`, [pend.id]);
    res.json({ idioma: lang, noche: pend, palabras: rows });
  } catch (e) { fallo(res, e); }
});

// POST /tetris/despertar — resultados del test
// body: { noche_id, resultados: [{ id, recordada: 0|1|2 }] }
app.post('/tetris/despertar', async (req, res) => {
  const nocheId = parseInt(req.body?.noche_id, 10);
  const resultados = (Array.isArray(req.body?.resultados) ? req.body.resultados : [])
    .map((r) => ({ id: parseInt(r?.id, 10), recordada: parseInt(r?.recordada, 10) }))
    .filter((r) => Number.isInteger(r.id) && [0, 1, 2].includes(r.recordada));
  if (!Number.isInteger(nocheId) || !resultados.length) {
    return res.status(400).json({ error: 'Faltan resultados' });
  }
  try {
    const lang = await idiomaActivo();
    const { rows: [noche] } = await db(
      'SELECT id, pistas FROM noches WHERE id = $1 AND profile_id = $2', [nocheId, PROFILE_ID]);
    if (!noche) return res.status(404).json({ error: 'Noche no encontrada' });

    for (const r of resultados) {
      const { rowCount } = await db(
        `UPDATE noche_palabras SET recordada = $3, probada_at = NOW()
          WHERE noche_id = $1 AND user_word_id = $2 AND recordada IS NULL`,
        [nocheId, r.id, r.recordada]);
      // El test es también un repaso de verdad: no salía → otra vez, con
      // dudas → difícil, a la primera → bien. Sólo si la fila era de esta
      // noche y estaba sin probar, para no repasar dos veces por un reenvío.
      if (rowCount) await repasarPalabra(r.id, [1, 2, 3][r.recordada]);
    }
    await addXp(resultados.length * 2);

    // Ahora sí se destapa qué sonó y qué no: el test ya está hecho.
    const { rows } = await db(
      `SELECT np.noche_id, $2::int AS pistas, np.con_pista, np.recordada
         FROM noche_palabras np WHERE np.noche_id = $1 AND np.recordada IS NOT NULL`,
      [nocheId, noche.pistas]);
    const estaNoche = tetris.resumenNoches(rows, { minPistas: 0, minNoches: 1 });
    res.json({
      pistas: noche.pistas,
      esta_noche: estaNoche,
      acumulado: await resumenTetris(lang),
    });
  } catch (e) { fallo(res, e); }
});

// GET /tetris/resultados — el experimento completo
app.get('/tetris/resultados', async (req, res) => {
  try {
    const lang = await idiomaDe(req);
    const { rows: noches } = await db(
      `SELECT n.id, n.fecha::text AS fecha, n.pistas,
              count(*) FILTER (WHERE np.con_pista)::int AS con_pista,
              count(*) FILTER (WHERE NOT np.con_pista)::int AS control,
              count(np.recordada)::int AS probadas
         FROM noches n LEFT JOIN noche_palabras np ON np.noche_id = n.id
        WHERE n.profile_id = $1 AND n.lang = $2
        GROUP BY n.id ORDER BY n.fecha DESC LIMIT 30`, [PROFILE_ID, lang]);
    res.json({ idioma: lang, resumen: await resumenTetris(lang), noches });
  } catch (e) { fallo(res, e); }
});

// ════════════════════════════════════════════════════════
// AVISOS — la notificación diaria
// ════════════════════════════════════════════════════════
// A los diez días en producción la app tenía 0 sesiones de estudio. No faltaba
// contenido: faltaba que algo recordase que existe.

// GET /push/config — clave pública y estado, para que el cliente se suscriba
app.get('/push/config', async (req, res) => {
  try {
    const { rows } = await db("SELECT key, value FROM config WHERE key IN ('push_hora','push_activo')");
    const c = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const { rows: subs } = await db(
      'SELECT count(*)::int AS n FROM push_subscriptions WHERE profile_id=$1', [PROFILE_ID]);
    res.json({
      disponible:    avisos.estaConfigurado(),
      clave_publica: VAPID_PUBLIC || null,
      hora:          c.push_hora || '20:30',
      activo:        c.push_activo === '1',
      dispositivos:  subs[0].n,
    });
  } catch (e) { fallo(res, e); }
});

// POST /push/subscribe — el navegador entrega su suscripción
app.post('/push/subscribe', async (req, res) => {
  const s = req.body?.subscription || req.body;
  const endpoint = s?.endpoint;
  const p256dh   = s?.keys?.p256dh;
  const auth     = s?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return res.status(400).json({ error: 'Suscripción incompleta' });
  }
  try {
    // El endpoint identifica al dispositivo: resuscribirse actualiza, no duplica.
    await db(
      `INSERT INTO push_subscriptions (profile_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (endpoint) DO UPDATE
         SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, fallos = 0`,
      [PROFILE_ID, endpoint, p256dh, auth, (req.headers['user-agent'] || '').slice(0, 300)]
    );
    await db("INSERT INTO config (key,value) VALUES ('push_activo','1') ON CONFLICT (key) DO UPDATE SET value='1'");
    res.json({ ok: true });
  } catch (e) { fallo(res, e); }
});

// DELETE /push/subscribe — dejar de recibir avisos en este dispositivo
app.delete('/push/subscribe', async (req, res) => {
  const { endpoint } = req.body || {};
  try {
    if (endpoint) await db('DELETE FROM push_subscriptions WHERE endpoint=$1', [endpoint]);
    else          await db('DELETE FROM push_subscriptions WHERE profile_id=$1', [PROFILE_ID]);
    const { rows } = await db('SELECT count(*)::int AS n FROM push_subscriptions WHERE profile_id=$1', [PROFILE_ID]);
    if (!rows[0].n) {
      await db("INSERT INTO config (key,value) VALUES ('push_activo','0') ON CONFLICT (key) DO UPDATE SET value='0'");
    }
    res.json({ ok: true, dispositivos: rows[0].n });
  } catch (e) { fallo(res, e); }
});

// PUT /push/hora — a qué hora avisar
app.put('/push/hora', async (req, res) => {
  const hora = String(req.body?.hora || '').trim();
  if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(hora)) {
    return res.status(400).json({ error: 'Hora no válida (formato HH:MM)' });
  }
  try {
    await db("INSERT INTO config (key,value) VALUES ('push_hora',$1) ON CONFLICT (key) DO UPDATE SET value=$1", [hora]);
    res.json({ ok: true, hora });
  } catch (e) { fallo(res, e); }
});

// POST /push/test — enviar uno ahora, para comprobar que llega de verdad
app.post('/push/test', async (req, res) => {
  try {
    const { rows: subs } = await db('SELECT * FROM push_subscriptions WHERE profile_id=$1', [PROFILE_ID]);
    if (!subs.length) return res.status(400).json({ error: 'No hay ningún dispositivo suscrito' });
    const { ok, caducadas } = await avisos.enviar(subs, {
      titulo: 'Funciona',
      cuerpo: 'Los avisos están activados. Este es de prueba.',
      url: '/?sesion=1',
    });
    await limpiarCaducadas(caducadas);
    res.json({ ok: true, enviados: ok, caducadas: caducadas.length });
  } catch (e) { fallo(res, e); }
});

async function limpiarCaducadas(endpoints) {
  if (!endpoints?.length) return;
  await db('DELETE FROM push_subscriptions WHERE endpoint = ANY($1::text[])', [endpoints]);
}

/** Reúne lo que hay pendiente hoy para que el aviso diga algo concreto. */
async function datosDelAviso() {
  const lang = await idiomaActivo();
  const sector = await sectorDe(lang);
  const [pend, meta, sit, goal] = await Promise.all([
    db(`SELECT count(*)::int AS n FROM user_words uw JOIN words w ON w.id = uw.word_id
         WHERE uw.profile_id=$1 AND uw.next_review_date<=$2 AND w.lang=$3`,
       [PROFILE_ID, todayStr(), lang]),
    db("SELECT value FROM config WHERE key='daily_vocab_target'"),
    db(`SELECT s.title_es FROM situations s
         LEFT JOIN situation_progress p ON p.situation_id=s.id AND p.profile_id=$1
        WHERE COALESCE(p.completed,FALSE)=FALSE AND s.track_id = $2
        ORDER BY s.order_index LIMIT 1`, [PROFILE_ID, sector?.id ?? null]),
    db('SELECT streak FROM daily_goals WHERE profile_id=$1 ORDER BY date DESC LIMIT 1', [PROFILE_ID]),
  ]);
  return {
    idioma:     lang,
    pendientes: pend.rows[0].n,
    meta:       parseInt(meta.rows[0]?.value, 10) || 8,
    situacion:  sit.rows[0]?.title_es || null,
    racha:      goal.rows[0]?.streak || 0,
  };
}

/**
 * Planificador. Mira cada minuto si toca avisar. Con un solo perfil no hace
 * falta nada más sofisticado, y así no depende de un cron externo que habría
 * que mantener aparte en el droplet.
 *
 * El registro en push_log evita el duplicado clásico: si el contenedor se
 * reinicia dentro de la ventana horaria, el aviso ya está marcado como enviado.
 */
/**
 * Deja constancia de cómo acabó el aviso de un día. El motivo va en `titulo`
 * cuando no se envió: antes, "ya había estudiado" y "el envío falló" dejaban
 * exactamente la misma fila vacía con enviados=0, y desde fuera no había forma
 * de distinguir un día bien resuelto de uno roto.
 */
function registrarAviso(fecha, titulo, cuerpo, enviados, tipo = 'diario') {
  return db(
    `INSERT INTO push_log (profile_id, fecha, tipo, titulo, cuerpo, enviados)
     VALUES ($1, $2, $6, $3, $4, $5)
     ON CONFLICT (profile_id, fecha, tipo) DO UPDATE
       SET titulo = EXCLUDED.titulo, cuerpo = EXCLUDED.cuerpo, enviados = EXCLUDED.enviados`,
    [PROFILE_ID, fecha, titulo, cuerpo, enviados, tipo]);
}

// Un envío lento no puede solaparse con el tic siguiente. Antes esto lo cubría
// el INSERT del candado; ahora que el candado se pone al final, hace falta.
let _avisoEnCurso = false;

function arrancarPlanificador() {
  if (!avisos.estaConfigurado()) {
    console.log('· Avisos:   SIN CLAVES — pon VAPID_PUBLIC/VAPID_PRIVATE o un vapid.json');
    return;
  }
  console.log(`· Avisos:   ACTIVOS — cada minuto, en hora de ${fechas.ZONA}`);
  setInterval(async () => {
    if (_avisoEnCurso) return;
    _avisoEnCurso = true;
    try {
      const cfg = await leerConfig(['push_hora', 'tetris_activo', 'tetris_hora_manana', 'tetris_hora_almohada']);
      if (avisos.tocaAvisar(cfg.push_hora || '20:30')) await avisoDiario();
      // Los dos del modo Tetris. Cada uno con su propio candado en push_log
      // (tipo distinto), así que ninguno tapa al otro ni al diario.
      if (cfg.tetris_activo !== '0') {
        if (avisos.tocaAvisar(cfg.tetris_hora_manana || '08:00'))   await avisoTetris('despertar');
        if (avisos.tocaAvisar(cfg.tetris_hora_almohada || '22:30')) await avisoTetris('almohada');
      }
    } catch (e) {
      console.error('[avisos] planificador:', e?.message || e);
    } finally {
      _avisoEnCurso = false;
    }
  }, 60_000);
}

/** El aviso de siempre: cinco minutos, con lo que toca hoy. */
async function avisoDiario() {
  const hoy = todayStr();

  // ¿Ya se resolvió el aviso de hoy? Se CONSULTA, no se reserva. Reservar
  // antes de enviar significaba que un fallo de red se llevaba por delante
  // el aviso del día entero: la fila ya existía, así que el reintento del
  // minuto siguiente se daba por hecho y nadie recibía nada.
  const { rows: yaHay } = await db(
    "SELECT 1 FROM push_log WHERE profile_id=$1 AND fecha=$2 AND tipo='diario'", [PROFILE_ID, hoy]);
  if (yaHay.length) return;

  // Si ya ha estudiado hoy, no se le da la lata.
  const { rows: hecho } = await db(
    `SELECT 1 FROM daily_goals WHERE profile_id=$1 AND date=$2
       AND (vocab_done>0 OR grammar_done OR speaking_done)`, [PROFILE_ID, hoy]);
  if (hecho.length) return registrarAviso(hoy, 'sin enviar: ya había estudiado', '', 0);

  const { rows: subs } = await db('SELECT * FROM push_subscriptions WHERE profile_id=$1', [PROFILE_ID]);
  if (!subs.length) return registrarAviso(hoy, 'sin enviar: ningún dispositivo suscrito', '', 0);

  const payload = { ...avisos.componerAviso(await datosDelAviso()), url: '/?sesion=1' };
  const { ok, caducadas } = await avisos.enviar(subs, payload);
  await limpiarCaducadas(caducadas);

  // El candado se pone DESPUÉS de que el envío haya salido. Si no salió, no
  // se escribe nada y el minuto siguiente lo vuelve a intentar mientras dure
  // la ventana de 15 minutos.
  if (!ok) return console.error('[avisos] ningún envío aceptado, se reintenta al minuto');
  await registrarAviso(hoy, payload.titulo, payload.cuerpo, ok);
  console.log(`[avisos] enviado a ${ok} dispositivo(s): ${payload.cuerpo}`);
}

/**
 * Los avisos del modo Tetris: 'despertar' (el test de la mañana) y 'almohada'
 * (el último repaso y el modo noche). Mismo esquema que el diario: se consulta
 * el candado, se envía, y sólo si salió se escribe.
 */
async function avisoTetris(tipo) {
  const hoy = todayStr();
  const { rows: yaHay } = await db(
    'SELECT 1 FROM push_log WHERE profile_id=$1 AND fecha=$2 AND tipo=$3', [PROFILE_ID, hoy, tipo]);
  if (yaHay.length) return;

  const lang = await idiomaActivo();
  const dia  = tetris.diaDeEstudio();
  let palabras = 0;

  if (tipo === 'despertar') {
    const pend = await despertarPendiente(lang, dia);
    if (!pend) return registrarAviso(hoy, 'sin enviar: no hay test pendiente', '', 0, tipo);
    palabras = pend.n;
  } else {
    const { rows: td } = await db(
      'SELECT almohada_at FROM tetris_dias WHERE profile_id=$1 AND fecha=$2 AND lang=$3',
      [PROFILE_ID, dia, lang]);
    if (td[0]?.almohada_at) return registrarAviso(hoy, 'sin enviar: ya había repasado', '', 0, tipo);
    palabras = (await palabrasDelDia(lang, dia)).length;
  }

  const { rows: subs } = await db('SELECT * FROM push_subscriptions WHERE profile_id=$1', [PROFILE_ID]);
  if (!subs.length) return registrarAviso(hoy, 'sin enviar: ningún dispositivo suscrito', '', 0, tipo);

  const payload = {
    ...avisos.componerAvisoTetris(tipo, { palabras, idioma: lang }),
    // Sin palabras de hoy, el aviso de la noche propone una ronda: que el
    // toque abra la ronda y no un repaso vacío.
    url: tipo === 'almohada' && !palabras ? '/?sesion=1' : `/?tetris=${tipo}`,
    tag: `tutoringles-${tipo}`,
  };
  const { ok, caducadas } = await avisos.enviar(subs, payload);
  await limpiarCaducadas(caducadas);
  if (!ok) return console.error(`[avisos] ${tipo}: ningún envío aceptado, se reintenta al minuto`);
  await registrarAviso(hoy, payload.titulo, payload.cuerpo, ok, tipo);
  console.log(`[avisos] ${tipo} enviado a ${ok} dispositivo(s): ${payload.cuerpo}`);
}

// ── Arranque ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`TutorIngles Backend v1.0 · :${PORT}`);
  console.log(`· Auth:     ${APP_TOKEN ? 'ACTIVADA (APP_TOKEN)' : 'DESACTIVADA — define APP_TOKEN en producción'}`);
  console.log(`· Usuario:  ${APP_USER_NAME}`);
  console.log(`· DB:       ${process.env.DATABASE_URL ? 'DATABASE_URL configurada' : 'SIN DATABASE_URL'}`);
  arrancarPlanificador();
});
