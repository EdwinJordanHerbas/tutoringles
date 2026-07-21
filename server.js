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
const PUBLIC_PATHS = [/^\/health$/, /^\/auth\/check$/];
app.use((req, res, next) => {
  if (!APP_TOKEN) return next();
  if (PUBLIC_PATHS.some(r => r.test(req.path))) return next();
  // Acepta token en cabecera Authorization: Bearer <token>
  // o como query param ?token=<token> (cómodo para testing)
  const fromHeader = (req.headers.authorization || '').replace('Bearer ', '');
  const fromQuery  = req.query.token || '';
  if (fromHeader === APP_TOKEN || fromQuery === APP_TOKEN) return next();
  res.status(401).json({ error: 'No autorizado' });
});

app.get('/auth/check', (req, res) => res.json({ ok: true, user: APP_USER_NAME }));

// ── DB ───────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on('error', (e) => console.error('DB error', e.message));
const db = (q, p) => pool.query(q, p);

// ── HEALTH ───────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await db('SELECT 1');
    res.json({ ok: true, ts: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ ok: false, error: e.message });
  }
});

const todayStr = () => new Date().toISOString().split('T')[0];

// Recalcula la racha del día indicado y actualiza streak_max en config.
// Un día "cuenta" si tiene alguna meta hecha (vocab, gramática o speaking).
// La racha = racha de ayer + 1 si ayer contó; si hubo hueco, vuelve a 1.
// Antes no existía: el 🔥 se quedaba clavado en 0 para siempre.
async function recomputeStreak(date) {
  const { rows } = await db('SELECT * FROM daily_goals WHERE date=$1', [date]);
  const t = rows[0];
  const activo = !!t && (Number(t.vocab_done) > 0 || t.grammar_done === true || t.speaking_done === true);
  if (!activo) return t ? Number(t.streak) || 0 : 0;

  const { rows: ayer } = await db(
    "SELECT streak FROM daily_goals WHERE date = ($1::date - INTERVAL '1 day')", [date]
  );
  const streak = (ayer.length ? Number(ayer[0].streak) || 0 : 0) + 1;
  await db('UPDATE daily_goals SET streak=$2 WHERE date=$1', [date, streak]);
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
    const defaults = { user_level: 'B1', target_exam_date: '2026-12-01', daily_vocab_target: '20', xp_total: '340' };
    return res.json({ key, value: defaults[key] ?? null });
  }

  // Auth
  if (path === '/auth/check') {
    return res.json({ ok: true, user: APP_USER_NAME });
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
  let q = 'SELECT * FROM words WHERE 1=1';
  const params = [];
  if (level)    { params.push(level);    q += ` AND level=$${params.length}`; }
  if (category) { params.push(category); q += ` AND category=$${params.length}`; }
  q += ' ORDER BY id';
  try {
    const { rows } = await db(q, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/words/:id', async (req, res) => {
  try {
    const { rows } = await db('SELECT * FROM words WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/words', async (req, res) => {
  const { word, translation, example_sentence, level, category, audio_hint } = req.body;
  if (!word || !translation) return res.status(400).json({ error: 'word y translation requeridos' });
  try {
    const { rows } = await db(
      `INSERT INTO words (word, translation, example_sentence, level, category, audio_hint)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [word, translation, example_sentence || null, level || 'B1', category || 'general', audio_hint || null]
    );
    // Crear entrada en user_words automáticamente
    await db('INSERT INTO user_words (word_id) VALUES ($1) ON CONFLICT DO NOTHING', [rows[0].id]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════
// USER-WORDS (SRS — repetición espaciada)
// ════════════════════════════════════════════════════════
app.get('/user-words', async (req, res) => {
  const { status, due } = req.query;
  let q = `SELECT uw.*, w.word, w.translation, w.example_sentence, w.level, w.category, w.audio_hint
           FROM user_words uw JOIN words w ON w.id = uw.word_id WHERE 1=1`;
  const params = [];
  if (status) { params.push(status); q += ` AND uw.status=$${params.length}`; }
  if (due === '1') { params.push(todayStr()); q += ` AND uw.next_review_date<=$${params.length}`; }
  q += ' ORDER BY uw.next_review_date, uw.id';
  try {
    const { rows } = await db(q, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /user-words/:id/review  body: { correct: true|false }
// Implementa algoritmo SM-2 simplificado
app.post('/user-words/:id/review', async (req, res) => {
  const { correct } = req.body;
  try {
    const { rows } = await db('SELECT * FROM user_words WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    let { ease_factor, interval_days, times_correct, times_wrong, status } = rows[0];

    if (correct) {
      times_correct++;
      // SM-2: nuevo intervalo según factor de facilidad
      if (interval_days === 1)       interval_days = 3;
      else if (interval_days === 3)  interval_days = 7;
      else                           interval_days = Math.round(interval_days * ease_factor);
      ease_factor = Math.min(3.0, ease_factor + 0.1);
      status = times_correct >= 5 ? 'mastered' : 'review';
    } else {
      times_wrong++;
      interval_days = 1;
      ease_factor   = Math.max(1.3, ease_factor - 0.2);
      status = 'learning';
    }

    const next = new Date();
    next.setDate(next.getDate() + interval_days);
    const next_review_date = next.toISOString().split('T')[0];

    const { rows: updated } = await db(
      `UPDATE user_words SET ease_factor=$1, interval_days=$2, next_review_date=$3,
       times_correct=$4, times_wrong=$5, status=$6 WHERE id=$7 RETURNING *`,
      [ease_factor, interval_days, next_review_date, times_correct, times_wrong, status, req.params.id]
    );
    res.json(updated[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════
// GRAMÁTICA
// ════════════════════════════════════════════════════════
app.get('/grammar-topics', async (req, res) => {
  try {
    const { rows } = await db(
      `SELECT gt.*, gp.completed, gp.score, gp.completed_at
       FROM grammar_topics gt
       LEFT JOIN grammar_progress gp ON gp.topic_id = gt.id
       ORDER BY gt.order_index`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/grammar-topics/:id', async (req, res) => {
  try {
    const { rows } = await db('SELECT * FROM grammar_topics WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/grammar-progress', async (req, res) => {
  const { topic_id, completed, score } = req.body;
  if (!topic_id) return res.status(400).json({ error: 'topic_id requerido' });
  try {
    const { rows } = await db(
      `INSERT INTO grammar_progress (topic_id, completed, score, completed_at)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (topic_id) DO UPDATE SET completed=$2, score=$3, completed_at=$4
       RETURNING *`,
      [topic_id, completed ?? false, score ?? null, completed ? new Date().toISOString() : null]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════
// SESIONES DE ESTUDIO
// ════════════════════════════════════════════════════════
app.get('/study-sessions', async (req, res) => {
  try {
    const { rows } = await db('SELECT * FROM study_sessions ORDER BY date DESC, created_at DESC LIMIT 50');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/study-sessions', async (req, res) => {
  const { date, type, duration_minutes, score, notes } = req.body;
  if (!type) return res.status(400).json({ error: 'type requerido' });
  try {
    const { rows } = await db(
      `INSERT INTO study_sessions (date, type, duration_minutes, score, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [date || todayStr(), type, duration_minutes || 0, score ?? null, notes || '']
    );
    // Actualizar XP total (+10 por sesión, +score*0.1 si hay score)
    const xpGain = 10 + Math.round((score || 0) * 0.1);
    await db(
      `INSERT INTO config (key, value) VALUES ('xp_total', $1)
       ON CONFLICT (key) DO UPDATE SET value = (COALESCE(config.value::int, 0) + $2)::text`,
      [String(xpGain), xpGain]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════
// DAILY GOALS
// ════════════════════════════════════════════════════════
app.get('/daily-goals/:date', async (req, res) => {
  try {
    const { rows } = await db('SELECT * FROM daily_goals WHERE date=$1', [req.params.date]);
    if (!rows.length) {
      // Calcular racha
      const { rows: cfg } = await db("SELECT value FROM config WHERE key='daily_vocab_target'");
      const target = parseInt(cfg[0]?.value || '20', 10);
      return res.json({ date: req.params.date, vocab_target: target, vocab_done: 0, grammar_done: false, speaking_done: false, streak: 0 });
    }
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/daily-goals', async (req, res) => {
  const { date, vocab_target, vocab_done, grammar_done, speaking_done, streak } = req.body;
  try {
    const { rows } = await db(
      `INSERT INTO daily_goals (date, vocab_target, vocab_done, grammar_done, speaking_done, streak)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (date) DO UPDATE SET
         vocab_target=$2, vocab_done=$3, grammar_done=$4, speaking_done=$5, streak=$6
       RETURNING *`,
      [date || todayStr(), vocab_target ?? 20, vocab_done ?? 0, grammar_done ?? false, speaking_done ?? false, streak ?? 0]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
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
      `INSERT INTO daily_goals (date, vocab_target) VALUES ($1,$2)
       ON CONFLICT (date) DO NOTHING`,
      [date, target]
    );
    // 2. Aplicar solo los campos recibidos
    if (keys.length) {
      const sets = keys.map((k, i) => `${k}=$${i + 2}`).join(',');
      const vals = [date, ...keys.map((k) => fields[k])];
      await db(`UPDATE daily_goals SET ${sets} WHERE date=$1`, vals);
    }
    // 3. Recalcular la racha con el estado ya actualizado
    await recomputeStreak(date);
    const { rows } = await db('SELECT * FROM daily_goals WHERE date=$1', [date]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════
// SPEAKING
// ════════════════════════════════════════════════════════
app.post('/speaking-practice', async (req, res) => {
  const { date, phrase_en, user_transcript, score, notes } = req.body;
  if (!phrase_en) return res.status(400).json({ error: 'phrase_en requerido' });
  try {
    const { rows } = await db(
      `INSERT INTO speaking_practice (date, phrase_en, user_transcript, score, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [date || todayStr(), phrase_en, user_transcript || null, score ?? null, notes || null]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════
// SIMULACROS CAMBRIDGE
// ════════════════════════════════════════════════════════
app.get('/exam-attempts', async (req, res) => {
  try {
    const { rows } = await db('SELECT * FROM exam_attempts ORDER BY date DESC, created_at DESC LIMIT 30');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/exam-attempts', async (req, res) => {
  const { date, section, score, max_score, notes } = req.body;
  if (!section || score === undefined) return res.status(400).json({ error: 'section y score requeridos' });
  try {
    const { rows } = await db(
      `INSERT INTO exam_attempts (date, section, score, max_score, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [date || todayStr(), section, score, max_score || 100, notes || '']
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════
// STATS (resumen para el dashboard)
// ════════════════════════════════════════════════════════
app.get('/stats', async (req, res) => {
  try {
    const [xpQ, masteredQ, streakQ, sessWeekQ, examQ, sessTotalQ, wordsTotalQ, bestExamQ, examCfgQ, maxStreakQ] = await Promise.all([
      db("SELECT value FROM config WHERE key='xp_total'"),
      db("SELECT COUNT(*) AS cnt FROM user_words WHERE status='mastered'"),
      db('SELECT streak FROM daily_goals ORDER BY date DESC LIMIT 1'),
      db(`SELECT COUNT(*) AS cnt FROM study_sessions WHERE date >= CURRENT_DATE - INTERVAL '7 days'`),
      db('SELECT section, AVG(score::float/max_score*100) AS avg_pct FROM exam_attempts GROUP BY section'),
      db('SELECT COUNT(*) AS cnt FROM study_sessions'),
      db('SELECT COUNT(*) AS cnt FROM user_words'),
      db('SELECT MAX(score::float/max_score*100) AS best, COUNT(*) AS done FROM exam_attempts'),
      db("SELECT value FROM config WHERE key='target_exam_date'"),
      db('SELECT MAX(streak) AS m FROM daily_goals')
    ]);
    const xp        = parseInt(xpQ.rows[0]?.value || '0', 10);
    const mastered  = parseInt(masteredQ.rows[0]?.cnt || '0', 10);
    const streak    = parseInt(streakQ.rows[0]?.streak || '0', 10);
    const sessWeek  = parseInt(sessWeekQ.rows[0]?.cnt || '0', 10);
    const sessTotal = parseInt(sessTotalQ.rows[0]?.cnt || '0', 10);
    const wordsTotal = parseInt(wordsTotalQ.rows[0]?.cnt || '0', 10);
    const examsDone = parseInt(bestExamQ.rows[0]?.done || '0', 10);
    const bestExam  = bestExamQ.rows[0]?.best != null ? Math.round(bestExamQ.rows[0].best) : null;
    // Nivel estimado basado en XP
    let estimated_level = 'A2';
    if (xp >= 5000)       estimated_level = 'C1';
    else if (xp >= 2000)  estimated_level = 'B2';
    else if (xp >= 500)   estimated_level = 'B1';
    const streak_max = parseInt(maxStreakQ.rows[0]?.m || '0', 10);
    const exam_scores = {};
    for (const r of examQ.rows) exam_scores[r.section] = Math.round(r.avg_pct);
    // % de vocabulario dominado sobre el que se está estudiando
    const vocab_pct = wordsTotal > 0 ? Math.round((mastered / wordsTotal) * 100) : 0;
    res.json({
      xp_total: xp,
      streak, streak_max,
      words_mastered: mastered,
      words_total: wordsTotal,
      vocab_pct,
      estimated_level,
      sessions_this_week: sessWeek,
      sessions_total: sessTotal,
      exams_done: examsDone,
      best_exam_score: bestExam,
      exam_scores,
      exam_date: examCfgQ.rows[0]?.value || null,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════
app.get('/config/:key', async (req, res) => {
  try {
    const { rows } = await db('SELECT * FROM config WHERE key=$1', [req.params.key]);
    if (!rows.length) return res.json({ key: req.params.key, value: null });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Arranque ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`TutorIngles Backend v1.0 · :${PORT}`);
  console.log(`· Auth:     ${APP_TOKEN ? 'ACTIVADA (APP_TOKEN)' : 'DESACTIVADA — define APP_TOKEN en producción'}`);
  console.log(`· Usuario:  ${APP_USER_NAME}`);
  console.log(`· DB:       ${process.env.DATABASE_URL ? 'DATABASE_URL configurada' : 'SIN DATABASE_URL'}`);
});
