// TutorIngles — vocab.js
// Módulo de vocabulario con SRS (Spaced Repetition System)
// TODO: implementar tarjetas, filtros por nivel/categoría, estadísticas

// ── STATE ───────────────────────────────────────────────
let _vocabMode      = 'review';   // 'review' | 'browse' | 'add'
let _reviewQueue    = [];
let _currentCard    = null;
let _cardRevealed   = false;
let _sessionCorrect = 0;
let _sessionWrong   = 0;

// ── INIT ─────────────────────────────────────────────────
async function initVocab() {
  const container = document.getElementById('vocab-content');
  if (!container) return;

  // Solo cargar una vez por sesión (si ya tiene contenido real)
  if (container.querySelector('.vocab-filters')) return;

  container.innerHTML = `
    <div class="vocab-filters" id="vocab-filters">
      <button class="filter-chip active" data-filter="due"      onclick="setVocabFilter('due')">Pendientes</button>
      <button class="filter-chip"        data-filter="all"      onclick="setVocabFilter('all')">Todas</button>
      <button class="filter-chip"        data-filter="new"      onclick="setVocabFilter('new')">Nuevas</button>
      <button class="filter-chip"        data-filter="mastered" onclick="setVocabFilter('mastered')">Dominadas</button>
      <button class="filter-chip"        data-filter="add"      onclick="setVocabFilter('add')">+ Añadir</button>
    </div>
    <div id="vocab-main"></div>
  `;

  await loadVocabDue();
}

function setVocabFilter(filter) {
  document.querySelectorAll('#vocab-filters .filter-chip').forEach(c =>
    c.classList.toggle('active', c.dataset.filter === filter)
  );

  if (filter === 'due')      loadVocabDue();
  else if (filter === 'all') loadVocabList('all');
  else if (filter === 'new') loadVocabList('new');
  else if (filter === 'mastered') loadVocabList('mastered');
  else if (filter === 'add') showAddWordForm();
}

// ── REPASO (SRS) ────────────────────────────────────────
async function loadVocabDue() {
  const main = document.getElementById('vocab-main');
  main.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    _reviewQueue  = await apiGet('/user-words?due=1') || [];
    _sessionCorrect = 0;
    _sessionWrong   = 0;
    if (_reviewQueue.length === 0) {
      main.innerHTML = `
        <div class="glass-card" style="text-align:center;padding:32px 16px">
          <div style="font-size:2rem;margin-bottom:12px"><img src="src/img/icons/done.png" alt="" class="ico"></div>
          <div style="font-size:0.9rem;color:var(--text-2);margin-bottom:6px">¡Sin pendientes por hoy!</div>
          <div style="font-size:0.75rem;color:var(--text-3)">Vuelve mañana para seguir la racha.</div>
        </div>
        <button class="btn btn-ghost" onclick="setVocabFilter('all')" style="margin-top:8px">Ver todas las palabras</button>
      `;
      return;
    }
    renderFlashCard();
  } catch (e) {
    main.innerHTML = cajaError(e);
  }
}

function renderFlashCard() {
  const main = document.getElementById('vocab-main');
  if (_reviewQueue.length === 0) {
    // Sesión completada
    const total = _sessionCorrect + _sessionWrong;
    const pct   = total > 0 ? Math.round((_sessionCorrect / total) * 100) : 0;
    main.innerHTML = `
      <div class="glass-card-accent anim-scale-in" style="text-align:center;padding:28px 16px">
        <div style="font-size:2rem;margin-bottom:12px">${pct >= 70 ? '<img src="src/img/icons/star.png" alt="" class="ico">' : '<img src="src/img/icons/muscle.png" alt="" class="ico">'}</div>
        <div style="font-family:var(--font-mono);font-size:1.2rem;color:var(--accent);margin-bottom:8px">${pct}%</div>
        <div style="font-size:0.8rem;color:var(--text-2);margin-bottom:16px">
          ${_sessionCorrect} correctas · ${_sessionWrong} falladas
        </div>
        <button class="btn btn-primary" onclick="loadVocabDue()">REPASAR DE NUEVO</button>
      </div>
    `;
    // Guardar sesión
    apiPost('/study-sessions', { type: 'vocab', score: pct }).catch(() => {});
    // Actualizar meta diaria
    apiPut(`/daily-goals/${new Date().toISOString().split('T')[0]}`, { vocab_done: _sessionCorrect }).catch(() => {});
    updateXpBar(_xpTotal + _sessionCorrect * 5);
    return;
  }

  _currentCard   = _reviewQueue[0];
  _cardRevealed  = false;
  const total    = _sessionCorrect + _sessionWrong + _reviewQueue.length;
  const done     = _sessionCorrect + _sessionWrong;
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0;

  main.innerHTML = `
    <div style="margin-bottom:8px">
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="progress-label">${done} / ${total} · ${_reviewQueue.length} restantes</div>
    </div>
    <div class="flash-card anim-slide-up" id="flash-card" onclick="revealCard()">
      <div style="position:relative;width:100%">
        <span class="badge badge-${(_currentCard.level||'b1').toLowerCase()}" style="position:absolute;top:0;right:0">${_currentCard.level || ''}</span>
        <span class="badge" style="position:absolute;top:0;left:0;font-size:0.5rem">${_currentCard.category || ''}</span>
      </div>
      <div class="flash-word">${_currentCard.word}</div>
      <!-- La figurada va en la CARA DE DELANTE a propósito: hay que verla
           antes de decir la palabra, no después de haberla dicho mal. -->
      ${pronDeCarta(_currentCard)}
      <div id="card-hint" style="font-size:0.7rem;color:var(--text-3);margin-top:4px">
        ${_currentCard.audio_hint ? _currentCard.audio_hint : 'Toca para revelar'}
      </div>
      <div id="card-back" style="display:none">
        <div class="flash-translation">${_currentCard.translation}</div>
        ${_currentCard.example_sentence ? `<div class="flash-example">"${_currentCard.example_sentence}"</div>` : ''}
      </div>
    </div>
    <div id="review-actions" style="display:none">
      <!-- FSRS necesita cuatro grados, no dos: la diferencia entre "me ha
           costado" y "me ha salido solo" es la que ajusta la dificultad. -->
      <div class="review-btns-4">
        <button class="rev-btn rev-again" onclick="submitReview(1)">
          <span class="rev-label">Otra vez</span><span class="rev-days" id="rev-d-1">·</span>
        </button>
        <button class="rev-btn rev-hard"  onclick="submitReview(2)">
          <span class="rev-label">Difícil</span><span class="rev-days" id="rev-d-2">·</span>
        </button>
        <button class="rev-btn rev-good"  onclick="submitReview(3)">
          <span class="rev-label">Bien</span><span class="rev-days" id="rev-d-3">·</span>
        </button>
        <button class="rev-btn rev-easy"  onclick="submitReview(4)">
          <span class="rev-label">Fácil</span><span class="rev-days" id="rev-d-4">·</span>
        </button>
      </div>
    </div>
    <div id="reveal-hint" style="text-align:center;font-size:0.7rem;color:var(--text-4);margin-top:8px">
      Toca la tarjeta para ver la traducción
    </div>
  `;
}

// Bloque de pronunciación de una carta: figurada, botón de escuchar y avisos.
// El servidor manda la figurada ya troceada en `pron` (ver /user-words).
function pronDeCarta(carta) {
  if (!carta?.pron || typeof pronFrase !== 'function') return '';
  const p = carta.pron;
  const avisos = typeof pronAvisosFrase === 'function' ? pronAvisosFrase(p) : '';
  return `
    <div class="flash-pron" onclick="event.stopPropagation()">
      ${pronFrase(p)}
      <div class="flash-pron-fila">
        <button class="btn-icon" onclick="pronDecir(${JSON.stringify(carta.word).replace(/"/g, '&quot;')}, 1, this)" aria-label="Escuchar">
          <img src="src/img/icons/listen.png" alt="" class="ico">
        </button>
        <div class="flash-pron-avisos">${avisos}</div>
      </div>
      ${typeof pronLeyenda === 'function' ? pronLeyenda(p.leyenda, 'ley-carta') : ''}
    </div>`;
}

function revealCard() {
  if (_cardRevealed) return;
  _cardRevealed = true;
  document.getElementById('card-back').style.display    = 'block';
  document.getElementById('card-hint').style.display    = 'none';
  document.getElementById('review-actions').style.display = 'block';
  document.getElementById('reveal-hint').style.display  = 'none';
  document.getElementById('flash-card').classList.add('flipped');
  loadIntervalPreview();
}

// Muestra en cada botón dentro de cuánto volvería a salir la palabra.
async function loadIntervalPreview() {
  if (!_currentCard) return;
  try {
    const p = await apiGet(`/user-words/${_currentCard.id}/preview`);
    if (!p) return;
    for (const r of [1, 2, 3, 4]) {
      const el = document.getElementById(`rev-d-${r}`);
      if (el) el.textContent = fmtDays(p[r]);
    }
  } catch { /* si falla, los botones se quedan con el punto */ }
}

function fmtDays(d) {
  if (d == null)  return '·';
  if (d < 1)      return 'hoy';
  if (d === 1)    return '1 día';
  if (d < 30)     return `${d} días`;
  if (d < 365)    return `${Math.round(d / 30)} mes${Math.round(d / 30) === 1 ? '' : 'es'}`;
  return `${(d / 365).toFixed(1)} años`;
}

// rating: 1 otra vez · 2 difícil · 3 bien · 4 fácil
async function submitReview(rating) {
  if (!_currentCard) return;
  const acertada = rating > 1;
  _reviewQueue.shift();
  if (acertada) _sessionCorrect++;
  else          _sessionWrong++;

  // Animar feedback
  const card = document.getElementById('flash-card');
  if (card) card.classList.add(acertada ? 'flash-correct' : 'flash-wrong');

  // Si se falla, la palabra vuelve al final de la cola de hoy.
  if (!acertada) _reviewQueue.push(_currentCard);

  try {
    await apiPost(`/user-words/${_currentCard.id}/review`, { rating });
    if (acertada) showXpPop(5, card);
  } catch {}

  setTimeout(() => renderFlashCard(), 350);
}

// ── BROWSE LIST ─────────────────────────────────────────
async function loadVocabList(statusFilter) {
  const main = document.getElementById('vocab-main');
  main.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const param = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
    const words = await apiGet(`/user-words${param}`) || [];
    if (!words.length) {
      main.innerHTML = '<div class="empty-state">No hay palabras en esta categoría.</div>';
      return;
    }
    main.innerHTML = `<div class="word-list">${words.map(w => `
      <div class="word-item">
        <div class="word-status-dot ${w.status}"></div>
        <div class="word-item-main">
          <div class="word-item-en">${w.word}</div>
          <div class="word-item-es">${w.translation}</div>
        </div>
        <span class="badge badge-${(w.level||'b1').toLowerCase()}">${w.level}</span>
      </div>`).join('')}</div>`;
  } catch (e) {
    main.innerHTML = cajaError(e);
  }
}

// ── ADD WORD FORM ────────────────────────────────────────
function showAddWordForm() {
  const main = document.getElementById('vocab-main');
  main.innerHTML = `
    <div class="glass-card anim-slide-up">
      <div class="card-title">AÑADIR PALABRA</div>
      <div class="field">
        <label>Palabra (EN)</label>
        <input class="field-input" id="add-word"    placeholder="e.g. endeavour">
      </div>
      <div class="field">
        <label>Traducción (ES)</label>
        <input class="field-input" id="add-trans"   placeholder="e.g. esfuerzo">
      </div>
      <div class="field">
        <label>Ejemplo</label>
        <input class="field-input" id="add-example" placeholder="Frase de ejemplo en inglés">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="field">
          <label>Nivel</label>
          <select class="field-input" id="add-level">
            <option value="A2">A2</option>
            <option value="B1" selected>B1</option>
            <option value="B2">B2</option>
            <option value="C1">C1</option>
          </select>
        </div>
        <div class="field">
          <label>Categoría</label>
          <select class="field-input" id="add-cat">
            <option value="general">General</option>
            <option value="academic">Académico</option>
            <option value="business">Business</option>
            <option value="phrasal">Phrasal verb</option>
            <option value="idiom">Idiom</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary" onclick="saveNewWord()">GUARDAR PALABRA</button>
    </div>
  `;
}

async function saveNewWord() {
  const word     = document.getElementById('add-word')?.value.trim();
  const trans    = document.getElementById('add-trans')?.value.trim();
  const example  = document.getElementById('add-example')?.value.trim();
  const level    = document.getElementById('add-level')?.value;
  const category = document.getElementById('add-cat')?.value;
  if (!word || !trans) { toast('Rellena la palabra y la traducción', 'error'); return; }
  try {
    await apiPost('/words', { word, translation: trans, example_sentence: example || null, level, category });
    toast('Palabra guardada', 'success');
    setVocabFilter('all');
  } catch (e) {
    toastError(e);
  }
}
