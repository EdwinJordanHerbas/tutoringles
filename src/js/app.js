// TutorIngles — app.js
// Init, auth, navegación, helpers de API, XP, sistema gamificado

// ── CONFIG ─────────────────────────────────────────────
const APP_NAME = 'TutorIngles';
const TOKEN_KEY = 'ti_token';
const API_BASE  = '';               // mismo origen que el servidor

// XP por nivel (sistema idéntico al de OkiroSport)
const XP_LEVELS = [
  { rank: 'D', label: 'Beginner',     xp: 0    },
  { rank: 'C', label: 'Elementary',   xp: 100  },
  { rank: 'B', label: 'Intermediate', xp: 500  },
  { rank: 'A', label: 'Advanced',     xp: 1500 },
  { rank: 'S', label: 'Cambridge',    xp: 4000 },
];

// ── STATE ───────────────────────────────────────────────
let _token       = localStorage.getItem(TOKEN_KEY) || '';
let _xpTotal     = 0;
let _streak      = 0;
let _activeSection = 'hoy';

// ── HELPERS API ─────────────────────────────────────────

/**
 * apiFetch: wrapper sobre fetch que añade el token y gestiona errores.
 * @param {string} path - ruta relativa, ej. '/words'
 * @param {RequestInit} opts - opciones fetch
 */
async function apiFetch(path, opts = {}) {
  const url    = API_BASE + path;
  const isMock = new URLSearchParams(location.search).get('mock') === '1';
  const sep    = url.includes('?') ? '&' : '?';
  const fullUrl = isMock ? `${url}${sep}mock=1` : url;

  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;

  const res = await fetch(fullUrl, { ...opts, headers });
  if (res.status === 401) { showLock(); return null; }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const apiGet  = (path)         => apiFetch(path);
const apiPost = (path, body)   => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) });
const apiPut  = (path, body)   => apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) });
const apiDel  = (path)         => apiFetch(path, { method: 'DELETE' });

// ── TOAST ───────────────────────────────────────────────
function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast${type ? ' ' + type : ''}`;
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ── XP POP ─────────────────────────────────────────────
function showXpPop(amount, el) {
  const pop = document.createElement('div');
  pop.className = 'xp-pop';
  pop.textContent = `+${amount} XP`;
  const rect = (el || document.getElementById('xp-bar')).getBoundingClientRect();
  pop.style.left = rect.left + rect.width / 2 + 'px';
  pop.style.top  = rect.top + 'px';
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 1300);
}

// ── XP & RANK ──────────────────────────────────────────
function calcRank(xp) {
  let rank = XP_LEVELS[0];
  let next = XP_LEVELS[1];
  for (let i = 0; i < XP_LEVELS.length - 1; i++) {
    if (xp >= XP_LEVELS[i].xp) { rank = XP_LEVELS[i]; next = XP_LEVELS[i + 1]; }
  }
  if (xp >= XP_LEVELS[XP_LEVELS.length - 1].xp) {
    rank = XP_LEVELS[XP_LEVELS.length - 1];
    next = null;
  }
  return { rank, next };
}

function updateXpBar(xp) {
  _xpTotal = xp;
  const { rank, next } = calcRank(xp);
  const pct = next ? Math.min(100, ((xp - rank.xp) / (next.xp - rank.xp)) * 100) : 100;
  document.getElementById('xp-fill').style.width = pct + '%';
  document.getElementById('xp-text').textContent  = next
    ? `${xp.toLocaleString()} / ${next.xp.toLocaleString()} XP`
    : `${xp.toLocaleString()} XP · MAX`;
  const chip = document.getElementById('rank-chip');
  chip.textContent = rank.rank;
  chip.className   = `rank-badge rank-${rank.rank.toLowerCase()}`;
}

// ── NAVIGACIÓN ──────────────────────────────────────────
const SECTIONS  = ['hoy', 'vocab', 'speak', 'gram', 'exam', 'progreso'];
const NAV_COUNT = SECTIONS.length;

function goTo(sec) {
  // 'ajustes' es válida pero no está en la nav inferior (se abre por el ⚙).
  if (!SECTIONS.includes(sec) && sec !== 'ajustes') return;
  _activeSection = sec;

  // Secciones
  document.querySelectorAll('.sec').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`sec-${sec}`);
  if (target) target.classList.add('active');

  // Nav buttons
  const btns = document.querySelectorAll('.nb');
  btns.forEach((b, i) => {
    const isActive = b.dataset.sec === sec;
    b.classList.toggle('active', isActive);
    if (isActive) {
      // Mover el lens
      const lens = document.getElementById('nav-lens');
      if (lens) lens.style.left = `calc(${(100 / NAV_COUNT) * i}%)`;
    }
  });

  // Disparar render de sección si existe
  const renders = { vocab: renderVocab, speak: renderSpeak, gram: renderGrammar, exam: renderExam, progreso: renderProgress, ajustes: renderSettings };
  if (renders[sec]) renders[sec]();
}

// ── AUTH ────────────────────────────────────────────────
function showLock() {
  localStorage.removeItem(TOKEN_KEY);
  _token = '';
  document.getElementById('lock').style.display = 'flex';
}

async function unlock() {
  const input = document.getElementById('lock-input');
  const err   = document.getElementById('lock-err');
  const token = input.value.trim();
  if (!token) { err.textContent = 'Introduce tu clave'; return; }

  // Guardar token temporalmente para el check
  _token = token;
  try {
    const data = await apiFetch('/auth/check');
    if (data?.ok) {
      localStorage.setItem(TOKEN_KEY, token);
      document.getElementById('lock').style.display = 'none';
      initApp();
    } else {
      err.textContent = 'Clave incorrecta';
      _token = '';
    }
  } catch (e) {
    err.textContent = 'Error de conexión';
    _token = '';
  }
}

// ── OFFLINE ────────────────────────────────────────────
function setupOfflineIndicator() {
  const banner = document.getElementById('offline-banner');
  const show = () => banner.classList.add('visible');
  const hide = () => banner.classList.remove('visible');
  window.addEventListener('offline', show);
  window.addEventListener('online',  hide);
  if (!navigator.onLine) show();
}

// ── HOY: cargar metas del día ──────────────────────────
async function loadHoyData() {
  const today = new Date().toISOString().split('T')[0];

  // Actualizar fecha en header
  const opts = { weekday: 'long', day: 'numeric', month: 'long' };
  document.getElementById('hdr-date').textContent =
    new Date().toLocaleDateString('es-ES', opts).toUpperCase();

  try {
    // Metas diarias
    const goals = await apiGet(`/daily-goals/${today}`);
    if (goals) {
      document.getElementById('vocab-done').textContent   = goals.vocab_done    || 0;
      document.getElementById('vocab-target').textContent = goals.vocab_target  || 20;
      document.getElementById('streak-count').textContent = `🔥 ${goals.streak || 0}`;
      _streak = goals.streak || 0;

      // Chequear metas completadas
      const vocabDone = (goals.vocab_done || 0) >= (goals.vocab_target || 20);
      document.getElementById('goal-vocab').classList.toggle('done', vocabDone);
      document.getElementById('goal-grammar-check').textContent = goals.grammar_done ? '✓' : '';
      document.getElementById('goal-grammar').classList.toggle('done', goals.grammar_done);
      document.getElementById('grammar-status').textContent = goals.grammar_done ? 'Completado' : 'Pendiente';
      document.getElementById('goal-speaking-check').textContent = goals.speaking_done ? '✓' : '';
      document.getElementById('goal-speaking').classList.toggle('done', goals.speaking_done);
      document.getElementById('speaking-status').textContent = goals.speaking_done ? 'Completado' : 'Pendiente';

      // Barra de progreso diaria
      const done  = (vocabDone ? 1 : 0) + (goals.grammar_done ? 1 : 0) + (goals.speaking_done ? 1 : 0);
      const pct   = Math.round((done / 3) * 100);
      document.getElementById('daily-progress-fill').style.width = pct + '%';
      document.getElementById('daily-progress-pct').textContent  = pct + '%';
    }

    // Palabras vencidas hoy
    const due = await apiGet('/user-words?due=1');
    const cnt = due?.length || 0;
    document.getElementById('due-count').textContent = `${cnt} pendientes`;
    const preview = document.getElementById('hoy-due-preview');
    if (cnt === 0) {
      preview.innerHTML = '<div class="empty-state" style="padding:16px 0">✅ ¡Sin pendientes! Vuelve mañana.</div>';
    } else {
      const sample = due.slice(0, 3);
      preview.innerHTML = sample.map(w =>
        `<div class="word-item" style="margin-bottom:6px">
          <div class="word-status-dot ${w.status}"></div>
          <div class="word-item-main">
            <div class="word-item-en">${w.word}</div>
            <div class="word-item-es">${w.translation}</div>
          </div>
          <span class="badge badge-${w.level?.toLowerCase()}">${w.level}</span>
        </div>`
      ).join('') + (cnt > 3 ? `<div style="text-align:center;font-size:0.7rem;color:var(--text-3);margin-top:6px">y ${cnt - 3} más…</div>` : '');
    }

  } catch (e) {
    console.warn('loadHoyData error:', e.message);
  }

  // Plan de 30 días
  if (typeof loadPlanToday === 'function') loadPlanToday();

  // Racha semanal (últimos 7 días pintados)
  loadStreakWeek();
}

async function loadStreakWeek() {
  // Comprueba qué días de la semana actual tienen sesión registrada
  try {
    const sessions = await apiGet('/study-sessions');
    const today    = new Date();
    const dayMap   = { L: 1, M: 2, X: 3, J: 4, V: 5, S: 6, D: 0 };
    const doneDays = new Set((sessions || []).map(s => new Date(s.date).getDay()));
    document.querySelectorAll('.streak-day-dot').forEach(dot => {
      const dayIdx  = dayMap[dot.dataset.day];
      const isToday = today.getDay() === dayIdx;
      dot.classList.toggle('done',  doneDays.has(dayIdx) && !isToday);
      dot.classList.toggle('today', isToday);
    });
  } catch {}
}

// ── STATS: XP y nivel en header ────────────────────────
async function loadStats() {
  try {
    const stats = await apiGet('/stats');
    if (!stats) return;
    updateXpBar(stats.xp_total || 0);
    document.getElementById('lvl-badge').textContent = stats.estimated_level || 'A2';
    if (stats.streak !== undefined) {
      _streak = stats.streak;
      document.getElementById('streak-count').textContent = `🔥 ${stats.streak}`;
    }
  } catch (e) {
    console.warn('loadStats error:', e.message);
  }
}

// ── STUBS (rellenados por cada módulo) ─────────────────
function renderVocab()    { if (typeof initVocab    === 'function') initVocab();    }
function renderSpeak()    { if (typeof initSpeak    === 'function') initSpeak();    }
function renderGrammar()  { if (typeof initGrammar  === 'function') initGrammar();  }
function renderExam()     { if (typeof initExam     === 'function') initExam();     }
function renderProgress() { if (typeof initProgress === 'function') initProgress(); }
function renderSettings() { if (typeof initSettings === 'function') initSettings(); }

// ── SERVICE WORKER ──────────────────────────────────────
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

// ── INIT ─────────────────────────────────────────────────
async function initApp() {
  // Inicializar navegación en HOY
  goTo('hoy');

  // Cargar datos del dashboard
  await Promise.allSettled([
    loadStats(),
    loadHoyData()
  ]);
}

async function boot() {
  setupOfflineIndicator();
  registerSW();

  // Ocultar splash tras 1.3s (la animación del splash-fill dura 1.2s)
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) splash.classList.add('hidden');
  }, 1350);

  // Verificar auth
  if (!_token) {
    // Sin token: mostrar lock directamente (o abrir si no hay APP_TOKEN en servidor)
    try {
      const check = await apiFetch('/auth/check');
      if (check?.ok) {
        initApp();
      } else {
        setTimeout(() => { document.getElementById('lock').style.display = 'flex'; }, 1400);
      }
    } catch {
      // Sin conexión o sin token: pedir token
      setTimeout(() => { document.getElementById('lock').style.display = 'flex'; }, 1400);
    }
    return;
  }

  // Con token: verificar que sigue siendo válido
  try {
    const check = await apiFetch('/auth/check');
    if (check?.ok) {
      initApp();
    } else {
      showLock();
    }
  } catch {
    // Red caída pero hay token: cargar igualmente (modo offline)
    initApp();
  }
}

// Arranque
document.addEventListener('DOMContentLoaded', boot);
