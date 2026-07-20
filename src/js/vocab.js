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
          <div style="font-size:2rem;margin-bottom:12px">✅</div>
          <div style="font-size:0.9rem;color:var(--text-2);margin-bottom:6px">¡Sin pendientes por hoy!</div>
          <div style="font-size:0.75rem;color:var(--text-3)">Vuelve mañana para seguir la racha.</div>
        </div>
        <button class="btn btn-ghost" onclick="setVocabFilter('all')" style="margin-top:8px">Ver todas las palabras</button>
      `;
      return;
    }
    renderFlashCard();
  } catch (e) {
    main.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
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
        <div style="font-size:2rem;margin-bottom:12px">${pct >= 70 ? '🎉' : '💪'}</div>
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
      <div id="card-hint" style="font-size:0.7rem;color:var(--text-3);margin-top:4px">
        ${_currentCard.audio_hint ? `/${_currentCard.audio_hint}/` : 'Toca para revelar'}
      </div>
      <div id="card-back" style="display:none">
        <div class="flash-translation">${_currentCard.translation}</div>
        ${_currentCard.example_sentence ? `<div class="flash-example">"${_currentCard.example_sentence}"</div>` : ''}
      </div>
    </div>
    <div id="review-actions" style="display:none">
      <div class="review-btns">
        <button class="btn-wrong"   onclick="submitReview(false)">✗ FALLÉ</button>
        <button class="btn-correct" onclick="submitReview(true)">✓ SABÍA</button>
      </div>
    </div>
    <div id="reveal-hint" style="text-align:center;font-size:0.7rem;color:var(--text-4);margin-top:8px">
      Toca la tarjeta para ver la traducción
    </div>
  `;
}

function revealCard() {
  if (_cardRevealed) return;
  _cardRevealed = true;
  document.getElementById('card-back').style.display    = 'block';
  document.getElementById('card-hint').style.display    = 'none';
  document.getElementById('review-actions').style.display = 'block';
  document.getElementById('reveal-hint').style.display  = 'none';
  document.getElementById('flash-card').classList.add('flipped');
}

async function submitReview(correct) {
  if (!_currentCard) return;
  _reviewQueue.shift();
  if (correct) _sessionCorrect++;
  else         _sessionWrong++;

  // Animar feedback
  const card = document.getElementById('flash-card');
  if (card) card.classList.add(correct ? 'flash-correct' : 'flash-wrong');

  // Llamar a la API SRS
  try {
    await apiPost(`/user-words/${_currentCard.id}/review`, { correct });
    if (correct) showXpPop(5, card);
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
    main.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
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
    toast('✅ Palabra guardada', 'success');
    setVocabFilter('all');
  } catch (e) {
    toast(`Error: ${e.message}`, 'error');
  }
}
