// TutorIngles — work.js
// Carril diario: el inglés de tu sector, por situación real.
//
// Dos modos por situación:
//   · FRASES  → las que tienes que saber decir. Escuchar, repetir, comprobar.
//   · ROLE-PLAY → la conversación entera, turno a turno. Tú contestas en alto.
//
// Nota sobre la puntuación: hasta que entre el análisis fonema a fonema, lo que
// se mide aquí es RECONOCIMIENTO (si el móvil ha entendido lo que has dicho),
// no pronunciación fina. Está etiquetado como tal a propósito.

// ── STATE ───────────────────────────────────────────────
let _wkSituations = [];
let _wkCurrent    = null;      // situación abierta
let _wkTab        = 'keys';    // 'keys' | 'roleplay'
let _wkTurn       = 0;         // turno del role-play
let _wkScores     = [];        // puntuaciones de la sesión
let _wkRec        = null;
let _wkRecording  = false;
let _wkInited     = false;

const WkSpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

// ── INIT ─────────────────────────────────────────────────
async function initWork() {
  const container = document.getElementById('work-content');
  if (!container || _wkInited) return;
  _wkInited = true;
  await loadWorkSituations();
}

// ── TEXTO A VOZ ──────────────────────────────────────────
// Estas frases son las que llevan audio grabado (src/audio/frase-<id>.mp3),
// así que se pasa el id: si existe la grabación se oye esa, y si no la voz del
// sistema. voz.js decide.
function wkSpeak(text, btn, id) {
  vozFrase(id, text, { btn });
}

// ── COMPARAR LO DICHO CON LO ESPERADO ────────────────────
// Normaliza y compara palabra a palabra. Es una medida de reconocimiento.
function wkCompare(expected, said) {
  const norm = (s) => s.toLowerCase()
    .replace(/[.,!?;:'"—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const a = norm(expected).split(' ').filter(Boolean);
  const b = norm(said).split(' ').filter(Boolean);
  if (!a.length) return 0;
  const pool = [...b];
  let hits = 0;
  for (const w of a) {
    const i = pool.indexOf(w);
    if (i !== -1) { hits++; pool.splice(i, 1); }
  }
  return Math.round((hits / a.length) * 100);
}

// ── CÓMO SE LEE CADA FRASE ───────────────────────────────
// La figurada llega del servidor en `linea.pron`, ya troceada en sílabas. Es la
// pieza que faltaba: hasta ahora había que adivinar cómo sonaba la frase o
// fiarse de la voz sintética al vuelo.
function wkPron(linea) {
  if (!linea?.pron || typeof pronFrase !== 'function') return '';
  const avisos = typeof pronAvisosFrase === 'function' ? pronAvisosFrase(linea.pron) : '';
  // Sin la leyenda, la ə y la æ salían aquí sin nada que las explicase.
  const ley = typeof pronLeyenda === 'function'
    ? pronLeyenda(linea.pron.leyenda, `ley-wk-${linea.id ?? 'x'}`) : '';
  return pronFrase(linea.pron) + (avisos ? `<div>${avisos}</div>` : '') + ley;
}

// ── LISTA DE SITUACIONES ─────────────────────────────────
async function loadWorkSituations() {
  const c = document.getElementById('work-content');
  c.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const [profile, situations] = await Promise.all([
      apiGet('/profile'),
      apiGet('/situations')
    ]);
    _wkSituations = situations || [];

    if (!_wkSituations.length) {
      c.innerHTML = `<div class="empty-state" style="padding:24px 0">
        No hay situaciones cargadas todavía.<br>
        <span style="font-size:0.7rem">Aplica la migración de contenido de tu sector.</span>
      </div>`;
      return;
    }

    const done  = _wkSituations.filter(s => s.completed).length;
    const total = _wkSituations.length;
    const pct   = Math.round((done / total) * 100);

    c.innerHTML = `
      <div class="glass-card-accent anim-slide-up">
        <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
          TU SECTOR
          <span class="badge">${ico(profile?.track_icon || 'work', 14)} ${profile?.track_name || '—'}</span>
        </div>
        <div style="font-size:0.75rem;color:var(--text-2);margin-bottom:12px">
          Situaciones reales de tu trabajo. Escúchalas, dilas en alto y practica la conversación entera.
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="progress-label">${done} de ${total} situaciones practicadas</div>
      </div>

      <div id="work-list">
        ${_wkSituations.map(s => `
          <div class="topic-item" onclick="openSituation(${s.id})">
            <div class="topic-item-info">
              <div class="topic-item-title">${s.title_es}</div>
              <div class="topic-item-meta">
                ${s.title_en} · ${s.key_count} frases${s.practiced_count ? ` · practicada ${s.practiced_count}×` : ''}
              </div>
            </div>
            <span class="badge badge-${(s.level || 'a2').toLowerCase()}">${s.level}</span>
            <div class="topic-check">${s.completed ? '✓' : ''}</div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    c.innerHTML = cajaError(e);
  }
}

// ── DETALLE DE UNA SITUACIÓN ─────────────────────────────
async function openSituation(id) {
  const c = document.getElementById('work-content');
  c.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    _wkCurrent = await apiGet(`/situations/${id}`);
    _wkTab     = 'keys';
    _wkTurn    = 0;
    _wkScores  = [];
    renderSituation();
  } catch (e) {
    c.innerHTML = cajaError(e);
  }
}

function renderSituation() {
  const s = _wkCurrent;
  if (!s) return;
  const c = document.getElementById('work-content');

  c.innerHTML = `
    <button class="btn btn-ghost btn-sm" onclick="loadWorkSituations()" style="margin-bottom:10px">← Situaciones</button>

    <div class="glass-card-accent anim-slide-up">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
        ${s.title_es}
        <span class="badge badge-${(s.level || 'a2').toLowerCase()}">${s.level}</span>
      </div>
      <div style="font-size:0.72rem;color:var(--text-3);font-family:var(--font-mono);margin-bottom:8px">
        ${s.title_en.toUpperCase()}
      </div>
      ${s.context_es ? `<div style="font-size:0.78rem;color:var(--text-2)">${s.context_es}</div>` : ''}
    </div>

    <div class="vocab-filters" style="margin:12px 0">
      <button class="filter-chip ${_wkTab === 'keys' ? 'active' : ''}"     onclick="setWorkTab('keys')">Frases clave</button>
      <button class="filter-chip ${_wkTab === 'roleplay' ? 'active' : ''}" onclick="setWorkTab('roleplay')">Role-play</button>
    </div>

    <div id="work-panel"></div>
  `;

  renderWorkPanel();
}

function setWorkTab(tab) {
  _wkTab  = tab;
  _wkTurn = 0;
  renderSituation();
}

function renderWorkPanel() {
  if (_wkTab === 'keys') renderKeyPhrases();
  else                   renderRoleplay();
}

// ── FRASES CLAVE ─────────────────────────────────────────
function renderKeyPhrases() {
  const panel = document.getElementById('work-panel');
  const keys  = _wkCurrent.keys || [];

  panel.innerHTML = `
    ${keys.map((k, i) => `
      <div class="glass-card" style="margin-bottom:10px" id="wk-line-${i}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div style="flex:1">
            <div style="font-size:0.92rem;font-weight:600;color:var(--text);line-height:1.35">${k.en}</div>
            <div style="font-size:0.78rem;color:var(--text-2);margin-top:3px">${k.es}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="btn-icon" onclick="wkSpeak(${JSON.stringify(k.en).replace(/"/g, '&quot;')}, this, ${JSON.stringify(k.id ?? null)})" title="Escuchar"><img src="src/img/icons/listen.png" alt="" class="ico"></button>
            <button class="btn-icon" onclick="wkPractice(${i}, this)" title="Repetir"><img src="src/img/icons/mic.png" alt="" class="ico"></button>
          </div>
        </div>
        ${wkPron(k)}
        ${k.note ? `<div style="font-size:0.68rem;color:var(--text-3);margin-top:8px;padding-top:8px;border-top:1px solid var(--surface-2)"><img src="src/img/icons/idea.png" alt="" class="ico"> ${k.note}</div>` : ''}
        <div id="wk-result-${i}" style="display:none;margin-top:8px"></div>
      </div>
    `).join('')}

    <button class="btn btn-primary" onclick="finishSituation()" style="margin-top:6px">
      MARCAR COMO PRACTICADA
    </button>
  `;
}

// Repetir una frase y comprobar si se ha entendido
function wkPractice(idx, btn) {
  const line = _wkCurrent.keys[idx];
  const out  = document.getElementById(`wk-result-${idx}`);
  if (!line || !out) return;

  if (!WkSpeechRec) {
    out.style.display = 'block';
    out.innerHTML = `<div style="font-size:0.7rem;color:var(--text-3)">
      Este navegador no transcribe voz (iOS lo limita en PWA instalada).
      Escucha con <img src="src/img/icons/listen.png" alt="" class="ico"> y repite en alto.</div>`;
    return;
  }

  if (_wkRecording) { _wkRec?.stop(); return; }

  _wkRec = new WkSpeechRec();
  _wkRec.lang = 'en-GB';
  _wkRec.interimResults = false;
  _wkRec.maxAlternatives = 1;

  _wkRec.onstart = () => {
    _wkRecording = true;
    btn.innerHTML = '<img src="src/img/icons/stop.png" alt="" class="ico">';
    btn.classList.add('recording');
    out.style.display = 'block';
    out.innerHTML = '<div style="font-size:0.7rem;color:var(--accent)">Escuchando… di la frase.</div>';
  };

  _wkRec.onerror = (e) => {
    out.innerHTML = `<div style="font-size:0.7rem;color:var(--danger)">
      ${e.error === 'not-allowed' ? 'Permiso de micrófono denegado' : 'Error: ' + e.error}</div>`;
  };

  _wkRec.onend = () => {
    _wkRecording = false;
    btn.innerHTML = '<img src="src/img/icons/mic.png" alt="" class="ico">';
    btn.classList.remove('recording');
  };

  _wkRec.onresult = (ev) => {
    const said  = ev.results[0][0].transcript;
    const score = wkCompare(line.en, said);
    _wkScores.push(score);
    const color = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
    out.innerHTML = `
      <div style="font-size:0.7rem;color:var(--text-3)">Te he oído: "${said}"</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
        <span style="font-size:0.62rem;color:var(--text-4)">reconocimiento</span>
        <span style="font-family:var(--font-mono);font-weight:700;color:${color}">${score}%</span>
      </div>`;
  };

  try { _wkRec.start(); }
  catch { out.innerHTML = '<div style="font-size:0.7rem;color:var(--danger)">No se pudo abrir el micrófono</div>'; }
}

// ── ROLE-PLAY ────────────────────────────────────────────
function renderRoleplay() {
  const panel = document.getElementById('work-panel');
  const turns = _wkCurrent.dialogue || [];

  if (!turns.length) {
    panel.innerHTML = '<div class="empty-state">Esta situación no tiene role-play todavía.</div>';
    return;
  }

  const visible = turns.slice(0, _wkTurn + 1);
  const current = turns[_wkTurn];
  const isLast  = _wkTurn >= turns.length - 1;

  panel.innerHTML = `
    <div class="glass-card">
      <div class="card-title">LA CONVERSACIÓN</div>
      <div id="wk-chat">
        ${visible.map((t, i) => `
          <div style="display:flex;justify-content:${t.kind === 'you' ? 'flex-end' : 'flex-start'};margin-bottom:8px">
            <div style="max-width:82%;padding:9px 12px;border-radius:14px;
                        background:${t.kind === 'you' ? 'var(--accent-dim)' : 'var(--surface-2)'};
                        ${i === _wkTurn ? 'outline:1px solid var(--accent)' : ''}">
              <div style="font-size:0.58rem;font-family:var(--font-mono);color:var(--text-4);letter-spacing:1px;margin-bottom:3px">
                ${t.kind === 'you' ? 'TÚ' : 'CLIENTE'}
              </div>
              <div style="font-size:0.85rem;color:var(--text);line-height:1.35">${t.en}</div>
              ${i === _wkTurn ? wkPron(t) : ''}
              <div style="font-size:0.72rem;color:var(--text-3);margin-top:3px">${t.es}</div>
              ${t.note && i === _wkTurn ? `<div style="font-size:0.65rem;color:var(--text-3);margin-top:6px;padding-top:6px;border-top:1px solid var(--surface-3)"><img src="src/img/icons/idea.png" alt="" class="ico"> ${t.note}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      <div id="wk-turn-result" style="display:none;margin:8px 0"></div>

      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-ghost" style="flex:1" onclick="wkSpeak(${JSON.stringify(current.en).replace(/"/g, '&quot;')}, this, ${JSON.stringify(current.id ?? null)})">
          <img src="src/img/icons/listen.png" alt="" class="ico"> Escuchar
        </button>
        ${current.kind === 'you' ? `
          <button class="btn btn-ghost" style="flex:1" onclick="wkPracticeTurn(this)"><img src="src/img/icons/mic.png" alt="" class="ico"> Decirlo</button>
        ` : ''}
        <button class="btn btn-primary" style="flex:1" onclick="${isLast ? 'finishSituation()' : 'wkNextTurn()'}">
          ${isLast ? 'TERMINAR' : 'SIGUIENTE →'}
        </button>
      </div>
      <div class="progress-bar" style="margin-top:12px">
        <div class="progress-fill" style="width:${Math.round(((_wkTurn + 1) / turns.length) * 100)}%"></div>
      </div>
      <div class="progress-label">Turno ${_wkTurn + 1} de ${turns.length}</div>
    </div>
  `;
}

function wkNextTurn() {
  const turns = _wkCurrent.dialogue || [];
  if (_wkTurn < turns.length - 1) {
    _wkTurn++;
    renderRoleplay();
    // Si el turno nuevo es del cliente, léelo solo
    const t = turns[_wkTurn];
    if (t.kind === 'customer') setTimeout(() => wkSpeak(t.en, null, t.id ?? null), 250);
  }
}

function wkPracticeTurn(btn) {
  const turns   = _wkCurrent.dialogue || [];
  const current = turns[_wkTurn];
  const out     = document.getElementById('wk-turn-result');
  if (!current || !out) return;

  if (!WkSpeechRec) {
    out.style.display = 'block';
    out.innerHTML = '<div style="font-size:0.7rem;color:var(--text-3)">Este navegador no transcribe voz. Dilo en alto igualmente.</div>';
    return;
  }

  if (_wkRecording) { _wkRec?.stop(); return; }

  _wkRec = new WkSpeechRec();
  _wkRec.lang = 'en-GB';
  _wkRec.interimResults = false;

  _wkRec.onstart = () => {
    _wkRecording = true;
    btn.innerHTML = '<img src="src/img/icons/stop.png" alt="" class="ico"> Grabando';
    out.style.display = 'block';
    out.innerHTML = '<div style="font-size:0.7rem;color:var(--accent)">Escuchando…</div>';
  };
  _wkRec.onerror = (e) => {
    out.innerHTML = `<div style="font-size:0.7rem;color:var(--danger)">
      ${e.error === 'not-allowed' ? 'Permiso de micrófono denegado' : 'Error: ' + e.error}</div>`;
  };
  _wkRec.onend = () => { _wkRecording = false; btn.innerHTML = '<img src="src/img/icons/mic.png" alt="" class="ico"> Decirlo'; };
  _wkRec.onresult = (ev) => {
    const said  = ev.results[0][0].transcript;
    const score = wkCompare(current.en, said);
    _wkScores.push(score);
    const color = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
    out.innerHTML = `
      <div style="font-size:0.7rem;color:var(--text-3)">Te he oído: "${said}"</div>
      <div style="display:flex;justify-content:space-between;margin-top:4px">
        <span style="font-size:0.62rem;color:var(--text-4)">reconocimiento</span>
        <span style="font-family:var(--font-mono);font-weight:700;color:${color}">${score}%</span>
      </div>`;
  };

  try { _wkRec.start(); } catch { /* nada */ }
}

// ── CERRAR LA SITUACIÓN ──────────────────────────────────
async function finishSituation() {
  if (!_wkCurrent) return;
  const avg = _wkScores.length
    ? Math.round(_wkScores.reduce((a, b) => a + b, 0) / _wkScores.length)
    : null;

  try {
    await apiPost(`/situations/${_wkCurrent.id}/practice`, { score: avg, completed: true });
    await apiPut(`/daily-goals/${new Date().toISOString().split('T')[0]}`, { speaking_done: true });
    toast('Situación practicada', 'success');
    showXpPop(10);
    updateXpBar(_xpTotal + 10);
    _wkInited = false;
    await loadWorkSituations();
  } catch (e) {
    toastError(e);
  }
}
