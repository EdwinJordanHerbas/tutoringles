// TutorIngles — listening.js
// Listening del C1: 4 partes, 30 preguntas.
//
// El audio: si la tarea trae `audio_url` se reproduce ese archivo. Si no, se
// locuta el guion con la voz del navegador. Es una solución de paso: suena
// sintético y no reproduce la variedad de acentos del examen real, y por eso
// se avisa en pantalla en vez de disimularlo.
//
// Regla del examen: cada grabación se escucha DOS VECES. Aquí se lleva la
// cuenta y se avisa, porque escuchar de más es engañarse.

let _liTask   = null;
let _liPlays  = 0;
let _liAudio  = null;

// ── LISTA ────────────────────────────────────────────────
async function loadListeningTasks() {
  const box = document.getElementById('listening-tasks');
  if (!box) return;
  try {
    const tasks = await apiGet('/listening/tasks') || [];
    if (!tasks.length) {
      box.innerHTML = '<div class="empty-state" style="padding:8px 0">Aún no hay tareas de Listening.</div>';
      return;
    }
    box.innerHTML = tasks.map(t => `
      <button class="topic-item" style="width:100%;margin-bottom:6px" onclick="openListening('${t.slug}')">
        <div class="topic-item-info">
          <div class="topic-item-title">${_esc(t.title)}</div>
          <div class="topic-item-meta">${t.questions} preguntas${t.audio_url ? ' · audio grabado' : ' · voz del navegador'}</div>
        </div>
        <span class="badge badge-c1">C1</span>
      </button>`).join('');
  } catch (e) {
    box.innerHTML = cajaError(e);
  }
}

async function openListening(slug) {
  const c = document.getElementById('exam-content');
  c.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    _liTask  = await apiGet(`/listening/task/${slug}`);
    _liPlays = 0;
    renderListening();
  } catch (e) {
    c.innerHTML = cajaError(e);
  }
}

function renderListening() {
  const t = _liTask;
  const c = document.getElementById('exam-content');
  const ex = t.extras || null;

  // Parte 4: dos tareas con sus propias listas de opciones
  const tareas = ex && ex.task1 ? [ex.task1, ex.task2].filter(Boolean) : [];

  c.innerHTML = `
    <button class="btn btn-subtle btn-sm" onclick="renderExamDashboard()" style="margin-bottom:12px">← VOLVER</button>

    <div class="glass-card-accent anim-slide-up">
      <div class="card-title">LISTENING · PARTE ${t.part}</div>
      <div style="font-size:0.85rem;font-weight:600;color:var(--text);margin-bottom:6px">${_esc(t.title)}</div>
      <div style="font-size:0.76rem;color:var(--text-2);line-height:1.55">${_esc(t.intro || '')}</div>
    </div>

    <div class="glass-card" style="text-align:center">
      <div class="card-title">AUDIO</div>
      <button class="btn btn-primary" id="li-play" onclick="playListening()">ESCUCHAR</button>
      <button class="btn btn-subtle btn-sm" onclick="stopListening()" style="margin-top:8px">PARAR</button>
      <div id="li-plays" style="font-size:0.7rem;color:var(--text-3);margin-top:10px">
        Escuchas: 0 de 2
      </div>
      ${!t.audio_url ? `
        <div style="font-size:0.66rem;color:var(--warning);margin-top:8px;line-height:1.5">
          Locutado con la voz del navegador. Suena más plano que el audio real
          del examen y no cambia de acento entre hablantes.
        </div>` : ''}
    </div>

    ${tareas.length ? tareas.map((ta, i) => `
      <div class="glass-card">
        <div class="card-title">TAREA ${i + 1} · ${_esc(ta.title)}</div>
        ${ta.options.map(o => `
          <div class="reading-extra">
            <span class="reading-extra-letter">${o.letter}</span>
            <span>${_esc(o.text)}</span>
          </div>`).join('')}
      </div>`).join('') : ''}

    <div class="glass-card">
      <div class="card-title">PREGUNTAS</div>
      ${t.questions.map((q, i) => {
        const opts = Array.isArray(q.options) ? q.options : [];
        if (!opts.length) {
          // Parte 2: hueco de texto libre
          return `
            <div class="reading-q">
              <div class="reading-q-prompt"><b>${i + 1}.</b> ${_esc(q.prompt)}</div>
              <input class="field-input li-gap" data-qid="${q.id}"
                     placeholder="una o dos palabras" autocapitalize="none" autocomplete="off">
            </div>`;
        }
        const soloLetras = opts.every(o => typeof o === 'string' && o.length <= 2);
        return `
          <div class="reading-q">
            <div class="reading-q-prompt"><b>${i + 1}.</b> ${_esc(q.prompt)}</div>
            <div class="${soloLetras ? 'reading-letters' : 'reading-options'}">
              ${opts.map((o, j) => {
                const val = soloLetras ? o : String.fromCharCode(65 + j);
                return `<button class="reading-opt" data-qid="${q.id}" data-val="${val}"
                          onclick="pickListening(${q.id}, '${val}', this)">
                          ${soloLetras ? o : `<b>${val}.</b> ${_esc(o)}`}
                        </button>`;
              }).join('')}
            </div>
          </div>`;
      }).join('')}
      <button class="btn btn-primary" onclick="submitListening()" style="margin-top:12px">CORREGIR</button>
    </div>

    <details class="glass-card" style="cursor:pointer">
      <summary class="card-title" style="margin:0">VER LA TRANSCRIPCIÓN</summary>
      <div class="reading-body" style="margin-top:12px;font-size:0.8rem">${_esc(t.script)}</div>
    </details>
  `;
  _liTask._answers = {};
}

// ── AUDIO ────────────────────────────────────────────────
function playListening() {
  const t = _liTask;
  stopListening();
  _liPlays++;
  actualizarContadorEscuchas();

  if (t.audio_url) {
    _liAudio = new Audio(t.audio_url);
    _liAudio.play().catch(() => toast('No se pudo reproducir el audio', 'error'));
    return;
  }

  // Los guiones de listening son largos, y Chrome corta la síntesis a los ~15 s
  // dejando la tarea a medias. voz.js lleva el apaño del pause/resume.
  vozDecir(t.script, { rate: 0.95, lang: t.speaker || 'en-GB' });
}

function stopListening() {
  if (_liAudio) { _liAudio.pause(); _liAudio = null; }
  vozParar();
}

function actualizarContadorEscuchas() {
  const el = document.getElementById('li-plays');
  if (!el) return;
  el.textContent = `Escuchas: ${_liPlays} de 2`;
  if (_liPlays > 2) {
    el.style.color = 'var(--warning)';
    el.textContent = `Escuchas: ${_liPlays} · en el examen solo tendrías 2`;
  }
}

// ── RESPUESTAS ───────────────────────────────────────────
function pickListening(qid, val, btn) {
  _liTask._answers = _liTask._answers || {};
  _liTask._answers[qid] = val;
  document.querySelectorAll(`.reading-opt[data-qid="${qid}"]`)
    .forEach(b => b.classList.toggle('selected', b === btn));
}

async function submitListening() {
  stopListening();
  const t = _liTask;
  const answers = t.questions.map(q => {
    // Los huecos de la parte 2 se leen del input
    const input = document.querySelector(`.li-gap[data-qid="${q.id}"]`);
    const val = input ? input.value.trim() : (t._answers || {})[q.id] || '';
    return { id: q.id, response: val };
  });

  const sinResponder = answers.filter(a => !a.response).length;
  if (sinResponder && !confirm(`Quedan ${sinResponder} sin responder. ¿Corregir igualmente?`)) return;

  try {
    const r = await apiPost('/exam-quiz/grade', { answers });
    await apiPost('/exam-attempts', {
      section: 'listening', score: r.aciertos, max_score: r.total,
      notes: `Parte ${t.part} · ${t.title}`
    });
    await apiPost('/study-sessions', { type: 'exam', score: r.score, duration_minutes: 15, notes: 'Listening' });
    renderReadingResults(r);   // el panel de resultados es el mismo
  } catch (e) {
    toastError(e);
  }
}
