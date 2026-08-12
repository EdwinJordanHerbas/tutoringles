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

// ── ICONOS ──────────────────────────────────────────────
// Set propio en src/img/icons. Se dejaron de usar emojis porque cada sistema
// operativo los dibuja a su manera y no son un lenguaje visual propio.
//
// ico('vocab')      → tamaño por defecto (20px)
// ico('trophy', 32) → tamaño concreto
function ico(nombre, size = 20, extra = '') {
  return `<img src="src/img/icons/${nombre}.png" alt="" class="ico" width="${size}" height="${size}"${extra ? ' ' + extra : ''}>`;
}

// ── ERRORES EN PANTALLA ─────────────────────────────────
// Un fallo de red o de base de datos no es culpa de quien estudia, así que no se
// le enseña el mensaje técnico: se le dice qué ha pasado y cómo reintentar.
// El detalle queda en la consola por si hay que mirarlo.
//
//   cajaError(e, 'renderExam')   → HTML para meter en el contenedor de la sección
//
// `reintento` es el nombre de la función a llamar al pulsar el botón. Si no se
// pasa ninguna, el botón recarga la aplicación.
function cajaError(e, reintento = '') {
  console.error('[error]', e);
  const sinRed = !navigator.onLine;
  const texto  = sinRed
    ? 'Sin conexión. Comprueba el wifi o los datos y vuelve a intentarlo.'
    : 'No se han podido cargar los datos.';
  const accion = reintento ? `${reintento}()` : 'location.reload()';
  return `<div class="empty-state" style="padding:20px 0">
    <div style="margin-bottom:12px">${texto}</div>
    <button class="btn" onclick="${accion}">REINTENTAR</button>
  </div>`;
}

// Misma idea para los avisos flotantes.
function toastError(e) {
  console.error('[error]', e);
  toast(navigator.onLine ? 'No se ha podido guardar. Inténtalo otra vez.'
                         : 'Sin conexión. No se ha guardado.', 'error');
}

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
// Las cinco pestañas de la barra inferior, en el orden en que se ven. El
// deslizamiento con el dedo recorre exactamente esta lista.
//
// PRONUNCIACIÓN entró aquí y EXAMEN salió. El motivo no es de gusto: a los once
// días en producción, `pron_progress` tenía CERO filas. Estaba escondida detrás
// de un botón dentro de HABLAR, así que el motor de figurada, la introducción y
// los 71 pares mínimos no los había visto nadie. El examen es en diciembre; el
// mostrador es mañana. Examen y Reglas se abren desde HOY.
const NAV_SECTIONS = ['hoy', 'work', 'vocab', 'pron', 'speak'];
const NAV_COUNT    = NAV_SECTIONS.length;

// Todas las secciones a las que se puede ir. Estas no tienen pestaña propia:
// 'gram' y 'exam' se entran desde HOY, y 'progreso' y 'ajustes' desde la
// cabecera.
const SECTIONS = [...NAV_SECTIONS, 'gram', 'exam', 'progreso', 'ajustes'];

// Secciones que son "hijas" de una pestaña: mientras estás dentro, la pestaña
// madre se queda marcada para no perder de vista dónde estás. Gramática y
// Examen ya no cuelgan de ninguna: son destinos sueltos y la barra se apaga.
const PESTANA_MADRE = {};

function goTo(sec) {
  if (!SECTIONS.includes(sec)) return;
  const anterior = _activeSection;
  _activeSection = sec;

  // Secciones
  document.querySelectorAll('.sec').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`sec-${sec}`);
  if (target) {
    // La pantalla entra por el lado que corresponde según el orden de la barra:
    // hacia una pestaña de la derecha, entra por la derecha. Da igual si has
    // pulsado el botón o arrastrado el dedo; el movimiento es el mismo.
    const desde = NAV_SECTIONS.indexOf(PESTANA_MADRE[anterior] || anterior);
    const hasta = NAV_SECTIONS.indexOf(PESTANA_MADRE[sec] || sec);

    target.classList.remove('entra-izq', 'entra-der');
    void target.offsetWidth;              // reinicia la animación
    if (desde !== -1 && hasta !== -1 && desde !== hasta) {
      target.classList.add(hasta > desde ? 'entra-der' : 'entra-izq');
    }
    target.classList.add('active');
  }

  // Nav buttons
  const marcada = PESTANA_MADRE[sec] || sec;
  const lens    = document.getElementById('nav-lens');
  let enLaBarra = false;
  document.querySelectorAll('.nb').forEach((b) => {
    const isActive = b.dataset.sec === marcada;
    b.classList.toggle('active', isActive);
    if (isActive) enLaBarra = true;
  });
  // En Progreso y Ajustes no hay pestaña que resaltar: se esconde el resaltador
  // en vez de dejarlo señalando una pestaña en la que no estás.
  if (lens) lens.style.opacity = enLaBarra ? '0.5' : '0';
  colocarLente();

  // Disparar render de sección si existe
  const renders = { work: renderWork, vocab: renderVocab, speak: renderSpeak, pron: renderPron, gram: renderGrammar, exam: renderExam, progreso: renderProgress, ajustes: renderSettings };
  if (renders[sec]) renders[sec]();
}

// ── BARRA DESLIZANTE ────────────────────────────────────
// El resaltador se desliza de un botón a otro, y además puedes arrastrar el
// dedo POR ENCIMA DE LA BARRA para elegir: el resaltador sigue al dedo, el
// botón que hay debajo se enciende, y al soltar entras en esa sección.
//
// Está copiado del planteamiento de OkiroSport, donde ya funciona en este mismo
// iPhone. La diferencia clave con lo que yo había hecho antes son los eventos:
// aquí se usan Pointer Events (pointerdown/move/up) con setPointerCapture, no
// eventos táctiles. Son los mismos para dedo, ratón y lápiz, y la captura hace
// que el gesto siga siendo nuestro aunque el dedo se salga del elemento — que
// es justo donde Safari se quedaba los eventos táctiles y el gesto moría.
function colocarLente() {
  const nav  = document.getElementById('nav');
  const lens = document.getElementById('nav-lens');
  if (!nav || !lens) return;
  const btn = nav.querySelector('.nb.active') || nav.querySelector('.nb');
  if (!btn) return;
  lens.style.width     = btn.offsetWidth + 'px';
  lens.style.transform = `translateX(${btn.offsetLeft}px)`;
}

function initNavDeslizante() {
  const nav  = document.getElementById('nav');
  const lens = document.getElementById('nav-lens');
  if (!nav || !lens) return;
  const btns = Array.from(nav.querySelectorAll('.nb'));
  if (!btns.length) return;

  // Qué botón cae bajo una posición horizontal de la pantalla
  const botonEnX = (clientX) => {
    const r = nav.getBoundingClientRect();
    const x = clientX - r.left;
    for (const b of btns) {
      if (x >= b.offsetLeft && x <= b.offsetLeft + b.offsetWidth) return b;
    }
    return x <= btns[0].offsetLeft ? btns[0] : btns[btns.length - 1];
  };

  // El resaltador va centrado en el dedo, sin salirse de la barra
  const seguirAlDedo = (clientX) => {
    const r   = nav.getBoundingClientRect();
    const w   = lens.offsetWidth || btns[0].offsetWidth;
    const min = btns[0].offsetLeft;
    const max = btns[btns.length - 1].offsetLeft;
    const x   = Math.max(min, Math.min(max, clientX - r.left - w / 2));
    lens.style.transform = `translateX(${x}px)`;
  };

  // Cada botón se enciende según lo cerca que tenga el dedo, de 0 a 1: a un
  // ancho de botón de distancia está apagado del todo, y justo encima al máximo.
  // Como los dos botones vecinos se solapan en el reparto, mientras cruzas de
  // uno a otro se ve cómo uno se apaga a la vez que el otro se enciende, en vez
  // de un cambio de golpe. El valor lo lee el CSS en la variable --cerca.
  const iluminarPorCercania = (clientX) => {
    const x = clientX - nav.getBoundingClientRect().left;
    btns.forEach(b => {
      const centro = b.offsetLeft + b.offsetWidth / 2;
      const cerca  = Math.max(0, 1 - Math.abs(x - centro) / b.offsetWidth);
      b.style.setProperty('--cerca', cerca.toFixed(3));
    });
  };

  const apagarTodos = () => btns.forEach(b => b.style.setProperty('--cerca', '0'));

  let arrastrando = false, xInicial = 0, huboArrastre = false;

  nav.addEventListener('pointerdown', (e) => {
    arrastrando  = true;
    huboArrastre = false;
    xInicial     = e.clientX;
    nav.classList.add('dragging');
    try { nav.setPointerCapture(e.pointerId); } catch {}
    iluminarPorCercania(e.clientX);
  });

  nav.addEventListener('pointermove', (e) => {
    if (!arrastrando) return;
    if (Math.abs(e.clientX - xInicial) > 6) huboArrastre = true;
    if (!huboArrastre) return;         // un dedo quieto no mueve el resaltador
    seguirAlDedo(e.clientX);
    iluminarPorCercania(e.clientX);
  });

  const soltar = (e) => {
    if (!arrastrando) return;
    arrastrando = false;
    nav.classList.remove('dragging');
    apagarTodos();

    // Si solo fue un toque, de la navegación se encarga el onclick del botón.
    // Actuar aquí también cargaría la sección dos veces en cada pulsación.
    if (!huboArrastre) { colocarLente(); return; }

    const btn = botonEnX(e.clientX);
    if (btn && !btn.classList.contains('active')) goTo(btn.dataset.sec);
    else colocarLente();
  };

  nav.addEventListener('pointerup', soltar);
  nav.addEventListener('pointercancel', () => {
    arrastrando = false;
    nav.classList.remove('dragging');
    apagarTodos();
    colocarLente();
  });

  window.addEventListener('resize', colocarLente);
  requestAnimationFrame(colocarLente);
}

// ── DESLIZAR ENTRE PESTAÑAS ─────────────────────────────
// Gesto horizontal para cambiar de pestaña, como en Instagram o WhatsApp.
//
// Dos cosas que hay que hacer sí o sí para que funcione en un móvil de verdad,
// y que en la primera versión faltaban:
//
//  1. Escuchar 'touchmove' y, en cuanto se sabe que el gesto es horizontal,
//     llamar a preventDefault(). #cnt tiene scroll propio: si no le quitamos el
//     gesto, el navegador lo reclama para hacer scroll y dispara 'touchcancel'
//     en lugar de 'touchend'. Sin esto el deslizamiento no ocurre nunca en el
//     teléfono, aunque en pruebas de escritorio parezca que sí.
//     preventDefault() exige que el listener NO sea pasivo.
//
//  2. Mover el contenido con el dedo. Si no se ve nada hasta soltar, el gesto
//     no se siente: no sabes si la app te está haciendo caso.
//
// El eje se decide en los primeros 12 px: si el dedo va más en vertical, no se
// toca nada y el scroll sigue siendo del navegador. Un elemento con su propio
// arrastre puede marcarse con data-no-swipe para quedar excluido.
function initSwipe() {
  const zona = document.getElementById('cnt');
  if (!zona) return;

  const UMBRAL   = 60;    // recorrido mínimo para que el gesto cuente
  const DECISION  = 12;   // px antes de decidir si el gesto es horizontal
  const TOPE     = 140;   // hasta dónde se deja arrastrar

  let x0 = 0, y0 = 0, eje = null, activa = null;

  function soltarEstilos(sec) {
    if (!sec) return;
    sec.style.transition = 'transform 0.22s cubic-bezier(.4,0,.2,1), opacity 0.22s';
    sec.style.transform  = '';
    sec.style.opacity    = '';
    setTimeout(() => { sec.style.transition = ''; sec.style.willChange = ''; }, 240);
  }

  // Registro del último gesto, para poder verlo en Ajustes desde el propio
  // teléfono. Diagnosticar esto a ciegas, sin saber qué eventos llegan de
  // verdad al dispositivo, sale carísimo en intentos fallidos.
  window._ultimoGesto = { estado: 'todavía no has arrastrado' };

  document.addEventListener('touchstart', (e) => {
    eje = null;
    activa = null;
    if (e.touches.length !== 1) return;
    const dentro = e.target.closest?.('#cnt');
    if (!dentro || e.target.closest?.('[data-no-swipe]')) return;
    x0 = e.touches[0].clientX;
    y0 = e.touches[0].clientY;
    activa = document.querySelector('.sec.active');
    window._ultimoGesto = { inicio: 'sí', moves: 0, cancelables: 0, eje: '—', dx: 0, dy: 0, fin: '—' };
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!activa || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - x0;
    const dy = e.touches[0].clientY - y0;

    const g = window._ultimoGesto;
    g.moves++;
    if (e.cancelable) g.cancelables++;
    g.dx = Math.round(dx);
    g.dy = Math.round(dy);

    if (!eje) {
      if (Math.abs(dx) < DECISION && Math.abs(dy) < DECISION) return;
      eje = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'h' : 'v';
      g.eje = eje;
      if (eje === 'h') {
        activa.style.transition = 'none';
        activa.style.willChange = 'transform';
      }
    }
    if (eje !== 'h') return;

    // A partir de aquí el gesto es nuestro: sin esto el navegador lo cancela.
    // Safari solo lo permite si el evento es cancelable; si no lo es, el
    // registro de arriba lo deja por escrito en vez de fallar en silencio.
    if (e.cancelable) e.preventDefault();

    // Si no hay pestaña a ese lado, el arrastre va con freno: se nota el tope
    // en vez de dejarte tirar del vacío.
    const arrastre = pestanaVecina(dx < 0 ? 1 : -1) ? dx : dx / 4;
    const limitado = Math.max(-TOPE, Math.min(TOPE, arrastre));
    activa.style.transform = `translateX(${limitado}px)`;
    activa.style.opacity   = String(1 - Math.min(Math.abs(limitado) / (TOPE * 2), 0.35));
  }, { passive: false });

  // `completar` distingue soltar el dedo de que el gesto se vaya al traste.
  function terminar(e, completar) {
    const sec = activa;
    activa = null;
    const g = window._ultimoGesto;
    if (g && g.inicio) g.fin = completar ? 'soltado' : 'cancelado por el sistema';
    if (!sec) return;
    soltarEstilos(sec);
    if (!completar || eje !== 'h') return;

    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - x0;
    const dy = t.clientY - y0;
    if (Math.abs(dx) < UMBRAL || Math.abs(dx) < Math.abs(dy)) return;
    if (g) g.fin += ' → cambia de pestaña';
    irAPestanaVecina(dx < 0 ? 1 : -1);
  }

  document.addEventListener('touchend', (e) => terminar(e, true), { passive: true });

  // Si el sistema se queda el gesto (una llamada entrante, el gesto de "atrás"
  // del borde, un segundo dedo) llega touchcancel y NO touchend. Dos cosas:
  // la sección vuelve a su sitio en vez de quedarse torcida, y NO se cambia de
  // pestaña — a nadie le hace gracia que una llamada le mueva de pantalla.
  document.addEventListener('touchcancel', (e) => terminar(e, false), { passive: true });

  // En escritorio no hay dedo, pero las flechas hacen lo mismo.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
    if (escribiendo) return;
    irAPestanaVecina(e.key === 'ArrowRight' ? 1 : -1);
  });
}

// Qué pestaña hay al lado, o null si estás en un extremo (o en una sección que
// no está en la barra, como Progreso).
function pestanaVecina(direccion) {
  const actual = PESTANA_MADRE[_activeSection] || _activeSection;
  const i = NAV_SECTIONS.indexOf(actual);
  if (i === -1) return null;
  return NAV_SECTIONS[i + direccion] || null;
}

// Salta a la pestaña de al lado. No da la vuelta al llegar al extremo: en la
// primera y en la última, el gesto simplemente no hace nada, que es lo que
// espera cualquiera que venga de usar Instagram.
function irAPestanaVecina(direccion) {
  const destino = pestanaVecina(direccion);
  if (!destino) return;
  goTo(destino);   // la animación de entrada la pone goTo, venga de donde venga
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
      // El respaldo es 8, que es la meta de verdad (`daily_vocab_target`). Con
      // 20 la pantalla prometía una tarea dos veces y media más larga de la que
      // hay, justo lo que se decidió no hacer al bajar la meta.
      document.getElementById('vocab-target').textContent = goals.vocab_target  || 8;
      document.getElementById('streak-count').innerHTML = `<img src="src/img/icons/streak.png" alt="" class="ico"> ${goals.streak || 0}`;
      _streak = goals.streak || 0;

      // Chequear metas completadas
      const vocabDone = (goals.vocab_done || 0) >= (goals.vocab_target || 8);
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

    // Palabras vencidas hoy.
    //
    // Se enseña lo que toca HOY, no el montón entero. El SRS marca como vencida
    // toda palabra que no se ha visto nunca, así que al empezar salían "209
    // pendientes" con una meta de 8: un número que sólo dice "vas fatal" y que
    // no se corresponde con ningún trabajo real: la sesión reparte 8 al día y el
    // resto va llegando solo. El total se sigue viendo, pero de acompañamiento.
    const due  = await apiGet('/user-words?due=1');
    const cnt  = due?.length || 0;
    const meta = goals?.vocab_target || 8;
    const hoy  = Math.min(cnt, meta);
    document.getElementById('due-count').textContent =
      cnt > meta ? `${hoy} para hoy · ${cnt} en total` : `${cnt} pendientes`;
    const preview = document.getElementById('hoy-due-preview');
    if (cnt === 0) {
      preview.innerHTML = '<div class="empty-state" style="padding:16px 0"><img src="src/img/icons/done.png" alt="" class="ico"> ¡Sin pendientes! Vuelve mañana.</div>';
    } else {
      const sample = due.slice(0, 3);
      preview.innerHTML = sample.map(w =>
        `<div class="word-item" style="margin-bottom:6px">
          <div class="word-status-dot ${w.status}"></div>
          <div class="word-item-main">
            <div class="word-item-en">${w.word}</div>
            <div class="word-item-es">${w.translation || ''}</div>
          </div>
          ${w.level ? `<span class="badge badge-${w.level.toLowerCase()}">${w.level}</span>` : ''}
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

  // Activación del aviso diario, lo primero de la pantalla mientras haga falta
  if (typeof pintarAvisoHoy === 'function') pintarAvisoHoy();
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
    // Sin datos suficientes no se inventa un nivel: se muestra un guion.
    const lvl = document.getElementById('lvl-badge');
    lvl.textContent = stats.estimated_level || '—';
    lvl.title = stats.estimated_level
      ? `Estimado a partir de ${stats.level_evidence} destreza(s) con datos`
      : 'Aún no hay datos suficientes para estimar tu nivel';
    if (stats.streak !== undefined) {
      _streak = stats.streak;
      document.getElementById('streak-count').innerHTML = `<img src="src/img/icons/streak.png" alt="" class="ico"> ${stats.streak}`;
    }
  } catch (e) {
    console.warn('loadStats error:', e.message);
  }
}

// ── STUBS (rellenados por cada módulo) ─────────────────
function renderWork()     { if (typeof initWork     === 'function') initWork();     }
function renderVocab()    { if (typeof initVocab    === 'function') initVocab();    }
function renderSpeak()    { if (typeof initSpeak    === 'function') initSpeak();    }
function renderPron()     { if (typeof initPron     === 'function') initPron();     }
function renderGrammar()  { if (typeof initGrammar  === 'function') initGrammar();  }
function renderExam()     { if (typeof initExam     === 'function') initExam();     }
function renderProgress() { if (typeof initProgress === 'function') initProgress(); }
function renderSettings() {
  if (typeof initSettings === 'function') initSettings();
  pintarVersion();   // se refresca al entrar, para leer el último gesto hecho
}

// ── SERVICE WORKER ──────────────────────────────────────
// Ojo con el ciclo de vida: el service worker que controla ESTA carga es el
// anterior. Aunque el nuevo se instale y se active al instante (skipWaiting),
// los archivos que ya se han descargado siguen siendo los viejos hasta la
// siguiente carga. Resultado: tras desplegar un cambio hacía falta abrir la app
// dos veces para verlo, y la primera vez parecía que el cambio no existía.
//
// Por eso, cuando entra un service worker nuevo se recarga la página una sola
// vez. El guardia evita el bucle infinito si el navegador vuelve a avisar.
function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargando) return;
    recargando = true;
    location.reload();
  });

  navigator.serviceWorker.register('/sw.js')
    .then(reg => reg.update?.())      // busca versión nueva en cada arranque
    .catch(() => {});
}

// ── INIT ─────────────────────────────────────────────────
async function initApp() {
  // Los accesos directos del manifest abren la app en una sección concreta
  // (/?s=work). Si no viene nada, o viene algo raro, se arranca en HOY.
  const pedida = new URLSearchParams(location.search).get('s');
  goTo(SECTIONS.includes(pedida) ? pedida : 'hoy');

  // Cargar datos del dashboard
  await Promise.allSettled([
    loadStats(),
    loadHoyData()
  ]);

  // Si se ha entrado desde la notificación diaria (/?sesion=1), la sesión se
  // abre sola: quien viene de un aviso ya ha decidido que quiere estudiar, y
  // hacerle buscar el botón es perder justo ahí a la mitad de la gente.
  if (typeof autoAbrirSesion === 'function') autoAbrirSesion();
}

// Se sube a mano en cada despliegue que cambie el frontend. Se ve en Ajustes,
// para poder comprobar qué está corriendo el móvil sin adivinarlo.
const APP_VERSION = 'v18 · 2-ago-2026';

function pintarVersion() {
  const el = document.getElementById('version-app');
  if (!el) return;
  const sw = navigator.serviceWorker?.controller ? 'activo' : 'sin service worker';

  // Aquí se pintaba el diagnóstico del deslizamiento —toques recibidos, eje
  // detectado, píxeles recorridos—, que servía para arreglar el swipe y se
  // quedó puesto. Al usuario no le dice nada y ensucia la única pantalla donde
  // hay que encontrar cosas. Si hay que volver a depurarlo, está en el git.
  el.innerHTML = `${APP_VERSION} · ${sw}`;
  el.style.cssText = 'text-align:center;font-family:var(--font-mono);font-size:0.55rem;' +
                     'letter-spacing:0.5px;color:var(--text-3);' +
                     'margin-top:22px;padding-bottom:8px';
}

async function boot() {
  setupOfflineIndicator();
  registerSW();
  initNavDeslizante();
  initSwipe();
  pintarVersion();

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
