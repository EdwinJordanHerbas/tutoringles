// TutorIngles — writing.js
// Writing y Speaking del C1. Son las dos destrezas que ninguna clave de
// respuestas puede corregir, así que se usa el mismo sistema que un examinador:
// la rúbrica oficial de Cambridge, y tú te puntúas contra ella.
//
// Criterios de Writing (0-5 cada uno, 20 en total):
//   Content · Communicative Achievement · Organisation · Language

// ── STATE ───────────────────────────────────────────────
let _wrTask   = null;
let _spTasks  = [];
let _spTimer  = null;

const RUBRICA = [
  { key: 'content',      nombre: 'Content',
    desc: '¿Has hecho lo que pedía la tarea, todo y solo eso?' },
  { key: 'achievement',  nombre: 'Communicative Achievement',
    desc: '¿El registro y el tono son los que pide el género?' },
  { key: 'organisation', nombre: 'Organisation',
    desc: '¿Se sigue con facilidad? ¿Párrafos y conectores?' },
  { key: 'language',     nombre: 'Language',
    desc: '¿Vocabulario variado y estructuras de nivel, sin errores que estorben?' },
];

// ══════════════════════ WRITING ══════════════════════
async function loadWritingTasks() {
  const box = document.getElementById('writing-tasks');
  if (!box) return;
  try {
    const tasks = await apiGet('/writing/tasks') || [];
    if (!tasks.length) {
      box.innerHTML = '<div class="empty-state" style="padding:8px 0">Aún no hay tareas de Writing.</div>';
      return;
    }
    box.innerHTML = tasks.map(t => `
      <button class="topic-item" style="width:100%;margin-bottom:6px" onclick="openWriting('${t.slug}')">
        <div class="topic-item-info">
          <div class="topic-item-title">Part ${t.part} · ${t.title}</div>
          <div class="topic-item-meta">${t.kind} · ${t.word_min}-${t.word_max} palabras${t.attempts ? ` · escrita ${t.attempts}×` : ''}</div>
        </div>
        ${t.attempts ? '<div class="topic-check">✓</div>' : ''}
      </button>`).join('');
  } catch (e) {
    box.innerHTML = cajaError(e);
  }
}

// Writing tiene sección propia (ESCRIBIR) desde el 12-ago, así que ya no pinta
// dentro del panel de SIMULACROS: escribe en su propio contenedor y la lista de
// tareas se esconde mientras se redacta.
const _wrCaja = () => document.getElementById('writing-editor');
function _wrListaVisible(visible) {
  const lista = document.getElementById('writing-tasks')?.closest('.glass-card-accent');
  if (lista) lista.style.display = visible ? '' : 'none';
}

async function openWriting(slug) {
  const c = _wrCaja();
  if (!c) return;
  _wrListaVisible(false);
  c.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    _wrTask = await apiGet(`/writing/tasks/${slug}`);
    renderWriting();
  } catch (e) {
    c.innerHTML = cajaError(e);
  }
}

/** Cierra el editor y vuelve a la lista de tareas. */
function cerrarWriting() {
  const c = _wrCaja();
  if (c) c.innerHTML = '';
  _wrListaVisible(true);
  loadWritingTasks();
}

function renderWriting() {
  const t = _wrTask;
  const guia = Array.isArray(t.guidance) ? t.guidance : [];
  const c = _wrCaja();
  if (!c) return;

  c.innerHTML = `
    <button class="btn btn-subtle btn-sm" onclick="cerrarWriting()" style="margin-bottom:12px">← VOLVER</button>

    <div class="glass-card-accent anim-slide-up">
      <div class="card-title">WRITING · PART ${t.part} · ${t.kind.toUpperCase()}</div>
      <div style="font-size:0.85rem;font-weight:600;color:var(--text);margin-bottom:8px">${_esc(t.title)}</div>
      <div style="font-size:0.8rem;color:var(--text-2);line-height:1.6">${_esc(t.instructions)}</div>
    </div>

    ${t.input_text ? `
      <div class="glass-card">
        <div class="card-title">TEXTO DE PARTIDA</div>
        <div class="reading-body" style="font-size:0.8rem">${_esc(t.input_text)}</div>
      </div>` : ''}

    <div class="glass-card">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
        TU RESPUESTA
        <span id="wr-count" class="badge">0 palabras</span>
      </div>
      <textarea id="wr-body" class="field-input" rows="16"
        style="resize:vertical;line-height:1.6;font-size:0.85rem"
        placeholder="Escribe aquí tu texto en inglés..."
        oninput="countWriting()"></textarea>
      <div id="wr-range" style="font-size:0.68rem;color:var(--text-3);margin-top:6px">
        Objetivo: ${t.word_min}-${t.word_max} palabras. Pasarse o quedarse corto penaliza.
      </div>
    </div>

    <div class="glass-card">
      <div class="card-title">QUÉ SE ESPERA</div>
      <ul style="margin:0;padding-left:18px;font-size:0.76rem;color:var(--text-2);line-height:1.7">
        ${guia.map(g => `<li>${_esc(g)}</li>`).join('')}
      </ul>
    </div>

    <div class="glass-card">
      <div class="card-title">AUTOEVALUACIÓN · RÚBRICA DE CAMBRIDGE</div>
      <p style="font-size:0.7rem;color:var(--text-3);margin-bottom:12px">
        Puntúate de 0 a 5 en cada criterio. Sé honesto: un 5 regalado no te acerca al C1.
      </p>
      ${RUBRICA.map(r => `
        <div class="wr-criterio">
          <div>
            <div class="wr-criterio-nombre">${r.nombre}</div>
            <div class="wr-criterio-desc">${r.desc}</div>
          </div>
          <div class="wr-escala">
            ${[0,1,2,3,4,5].map(n => `
              <button class="wr-punto" data-crit="${r.key}" data-val="${n}"
                      onclick="pickRubrica('${r.key}', ${n}, this)">${n}</button>`).join('')}
          </div>
        </div>`).join('')}
      <div class="field" style="margin-top:12px">
        <label>Notas para ti (opcional)</label>
        <input class="field-input" id="wr-notes" placeholder="Qué te ha costado, qué repetirías...">
      </div>
      <button class="btn btn-primary" onclick="saveWriting()">GUARDAR</button>
    </div>
  `;
  _wrTask._scores = {};
}

function countWriting() {
  const ta = document.getElementById('wr-body');
  const el = document.getElementById('wr-count');
  if (!ta || !el) return;
  const n = ta.value.trim().split(/\s+/).filter(Boolean).length;
  el.textContent = `${n} palabras`;
  // Aviso visual al salirse del rango exigido
  const dentro = n >= _wrTask.word_min && n <= _wrTask.word_max;
  el.style.color = n === 0 ? '' : dentro ? 'var(--success)' : 'var(--warning)';
}

function pickRubrica(crit, val, btn) {
  _wrTask._scores = _wrTask._scores || {};
  _wrTask._scores[crit] = val;
  document.querySelectorAll(`.wr-punto[data-crit="${crit}"]`)
    .forEach(b => b.classList.toggle('selected', b === btn));
}

async function saveWriting() {
  const body = document.getElementById('wr-body')?.value.trim();
  if (!body) { toast('Escribe algo antes de guardar', 'error'); return; }
  const s = _wrTask._scores || {};
  try {
    const r = await apiPost('/writing/submissions', {
      task_id: _wrTask.id,
      body,
      content:      s.content      ?? null,
      achievement:  s.achievement  ?? null,
      organisation: s.organisation ?? null,
      language:     s.language     ?? null,
      notes: document.getElementById('wr-notes')?.value.trim() || null,
    });
    const completa = Object.keys(s).length === 4;
    toast(completa
      ? `Guardado · ${Object.values(s).reduce((a, b) => a + b, 0)}/20`
      : `Guardado · ${r.word_count} palabras`, 'success');
    showXpPop(25);
    cerrarWriting();
  } catch (e) {
    toastError(e);
  }
}

// ══════════════════════ SPEAKING ══════════════════════
async function loadSpeakingTasks() {
  const box = document.getElementById('speaking-tasks');
  if (!box) return;
  try {
    _spTasks = await apiGet('/speaking/tasks') || [];
    if (!_spTasks.length) {
      box.innerHTML = '<div class="empty-state" style="padding:8px 0">Aún no hay tareas de Speaking.</div>';
      return;
    }
    box.innerHTML = _spTasks.map(t => `
      <button class="topic-item" style="width:100%;margin-bottom:6px" onclick="openSpeaking('${t.slug}')">
        <div class="topic-item-info">
          <div class="topic-item-title">${t.title}</div>
          <div class="topic-item-meta">${Math.round(t.seconds / 60 * 10) / 10} min</div>
        </div>
      </button>`).join('');
  } catch (e) {
    box.innerHTML = cajaError(e);
  }
}

function openSpeaking(slug) {
  const t = _spTasks.find(x => x.slug === slug);
  if (!t) return;
  // Estas tareas se pintan ahora dentro de HABLAR, que es donde tienen sentido.
  const c = document.getElementById('speak-content');
  if (!c) return;
  const tips = Array.isArray(t.tips) ? t.tips : [];
  const p = t.prompts;

  // Part 2 llega como objeto (pregunta + fotos); el resto, como lista de preguntas.
  let cuerpo = '';
  if (Array.isArray(p)) {
    cuerpo = `<ol class="sp-prompts">${p.map(q => `<li>${_esc(q)}</li>`).join('')}</ol>`;
  } else {
    cuerpo = `
      <div class="sp-question">${_esc(p.question || '')}</div>
      ${p.photos ? `
        <div class="card-title" style="margin-top:14px">LAS TRES ESCENAS · ELIGE DOS</div>
        <ol class="sp-photos">${p.photos.map(f => `<li>${_esc(f)}</li>`).join('')}</ol>` : ''}
      ${p.options ? `
        <div class="card-title" style="margin-top:14px">OPCIONES</div>
        <ul class="sp-prompts">${p.options.map(o => `<li>${_esc(o)}</li>`).join('')}</ul>` : ''}
      ${p.decision ? `<div class="sp-decision">${_esc(p.decision)}</div>` : ''}
      ${p.follow_up ? `<div class="sp-followup">Pregunta de seguimiento: ${_esc(p.follow_up)}</div>` : ''}`;
  }

  c.innerHTML = `
    <button class="btn btn-subtle btn-sm" onclick="initSpeak(true)" style="margin-bottom:12px">← VOLVER</button>

    <div class="glass-card-accent anim-slide-up">
      <div class="card-title">SPEAKING · PARTE ${t.part}</div>
      <div style="font-size:0.85rem;font-weight:600;color:var(--text);margin-bottom:8px">${_esc(t.title)}</div>
      <div style="font-size:0.78rem;color:var(--text-2);line-height:1.6">${_esc(t.instructions)}</div>
    </div>

    <div class="glass-card">
      <div class="card-title">LA TAREA</div>
      ${cuerpo}
    </div>

    <div class="glass-card" style="text-align:center">
      <div class="card-title">CRONÓMETRO</div>
      <div id="sp-clock" class="sp-clock">${fmtClock(t.seconds)}</div>
      <div style="font-size:0.68rem;color:var(--text-3);margin-bottom:14px">
        Habla en alto todo el tiempo. El silencio es lo que más penaliza.
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" style="flex:1" id="sp-start" onclick="startSpeakingTimer(${t.seconds})">EMPEZAR</button>
        <button class="btn btn-subtle" style="flex:1" onclick="stopSpeakingTimer(${t.seconds})">REINICIAR</button>
      </div>
    </div>

    ${tips.length ? `
      <div class="glass-card">
        <div class="card-title">CLAVES</div>
        <ul style="margin:0;padding-left:18px;font-size:0.76rem;color:var(--text-2);line-height:1.7">
          ${tips.map(x => `<li>${_esc(x)}</li>`).join('')}
        </ul>
      </div>` : ''}
  `;
}

function fmtClock(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function startSpeakingTimer(total) {
  stopSpeakingTimer(total);
  let queda = total;
  const el  = document.getElementById('sp-clock');
  const btn = document.getElementById('sp-start');
  if (btn) btn.textContent = 'EN MARCHA';
  _spTimer = setInterval(() => {
    queda--;
    if (el) {
      el.textContent = fmtClock(Math.max(0, queda));
      // Último 20%: aviso de que hay que ir cerrando
      el.classList.toggle('warning', queda <= total * 0.2 && queda > 0);
    }
    if (queda <= 0) {
      clearInterval(_spTimer);
      _spTimer = null;
      if (el) { el.textContent = 'TIEMPO'; el.classList.remove('warning'); }
      if (btn) btn.textContent = 'EMPEZAR';
      toast('Se acabó el tiempo', '');
      // Registrar la práctica
      apiPost('/study-sessions', { type: 'speaking', duration_minutes: Math.round(total / 60) }).catch(() => {});
    }
  }, 1000);
}

function stopSpeakingTimer(total) {
  if (_spTimer) { clearInterval(_spTimer); _spTimer = null; }
  const el  = document.getElementById('sp-clock');
  const btn = document.getElementById('sp-start');
  if (el)  { el.textContent = fmtClock(total); el.classList.remove('warning'); }
  if (btn) btn.textContent = 'EMPEZAR';
}
