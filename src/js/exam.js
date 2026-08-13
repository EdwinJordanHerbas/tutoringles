// TutorIngles — exam.js
// Módulo de simulacros Cambridge CAE
// TODO: Implementar tests interactivos completos, temporizador, corrección

// ── STATE ───────────────────────────────────────────────
let _examInited   = false;
let _examAttempts = [];

// Formato oficial del C1 Advanced (cambridgeenglish.org).
// Reading y Use of English son UN SOLO paper de 8 partes, 56 preguntas y 90 min:
//   partes 1-4 = Use of English (30 preguntas) · partes 5-8 = Reading (26 preguntas)
// Cada una de las cinco destrezas pesa un 20% de la nota final.
const EXAM_SECTIONS = [
  { id: 'reading',   icon: '<img src="src/img/icons/vocab.png" alt="" class="ico">', name: 'Reading',   desc: 'Partes 5-8 · 26 preguntas · dentro de los 90 min' },
  { id: 'writing',   icon: '<img src="src/img/icons/writing.png" alt="" class="ico">', name: 'Writing',   desc: '2 tareas · 220-260 palabras cada una · 90 min' },
  { id: 'listening', icon: '<img src="src/img/icons/headphones.png" alt="" class="ico">', name: 'Listening', desc: '4 partes · 30 preguntas · unos 40 min' },
  { id: 'speaking',  icon: '<img src="src/img/icons/speak.png" alt="" class="ico">', name: 'Speaking',  desc: '4 partes · en pareja · 15 min' },
];

// Partes auto-corregibles del Use of English (banco exam_questions)
const UOE_PARTS = [
  { id: 'mc_cloze',                short: 'MC Cloze',     desc: 'Elige la palabra correcta (A-D)' },
  { id: 'open_cloze',              short: 'Open Cloze',   desc: 'Escribe la palabra que falta' },
  { id: 'word_formation',          short: 'Word Form',    desc: 'Transforma la palabra dada' },
  { id: 'key_word_transformation', short: 'Key Word',     desc: 'Reformula con la palabra clave' },
];

let _quiz = { part: null, questions: [] };

// ── INIT ─────────────────────────────────────────────────
async function initExam() {
  const container = document.getElementById('exam-content');
  if (!container || _examInited) return;
  _examInited = true;

  container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

  try {
    _examAttempts = await apiGet('/exam-attempts') || [];
    renderExamDashboard();
  } catch (e) {
    container.innerHTML = cajaError(e);
  }
}

function renderExamDashboard() {
  const container = document.getElementById('exam-content');

  // Calcular promedio por sección
  const avgBySection = {};
  EXAM_SECTIONS.forEach(s => {
    const attempts = _examAttempts.filter(a => a.section === s.id);
    if (attempts.length) {
      const avg = attempts.reduce((sum, a) => sum + (a.score / a.max_score * 100), 0) / attempts.length;
      avgBySection[s.id] = Math.round(avg);
    }
  });

  container.innerHTML = `
    <div class="glass-card-accent anim-fade-in" style="margin-bottom:14px">
      <div class="card-title">PRACTICAR · USE OF ENGLISH</div>
      <p style="font-size:0.72rem;color:var(--text-3);margin-bottom:10px">Test interactivo con corrección automática. Elige una parte:</p>
      <div class="uoe-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${UOE_PARTS.map(p => `
          <button class="quick-btn" style="align-items:flex-start;text-align:left;padding:12px" onclick="startQuiz('${p.id}')">
            <span style="font-size:0.8rem;font-weight:700;color:var(--text)">${p.short}</span>
            <span style="font-size:0.62rem;color:var(--text-3);line-height:1.3">${p.desc}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="glass-card-accent anim-fade-in" style="margin-bottom:14px">
      <div class="card-title">PRACTICAR · READING</div>
      <p style="font-size:0.72rem;color:var(--text-3);margin-bottom:10px">Partes 5 a 8 del mismo paper. Textos completos con corrección automática:</p>
      <div id="reading-tasks"><div class="empty-state" style="padding:8px 0"><div class="spinner"></div></div></div>
    </div>

    <div class="glass-card-accent anim-fade-in" style="margin-bottom:14px">
      <div class="card-title">PRACTICAR · LISTENING</div>
      <p style="font-size:0.72rem;color:var(--text-3);margin-bottom:10px">4 partes, 30 preguntas. Recuerda: en el examen se escucha dos veces:</p>
      <div id="listening-tasks"><div class="empty-state" style="padding:8px 0"><div class="spinner"></div></div></div>
    </div>

    <!-- Writing y Speaking ya NO se pintan aquí. Estaban dentro de esta pantalla
         y esta pantalla salió de la barra el 2-ago: como este fichero era lo
         único que las cargaba, las 6 tareas escritas y las 5 del oral se
         quedaron sin puerta y sus tablas llevaban a cero desde julio. Writing
         tiene sección propia (ESCRIBIR) y Speaking está en HABLAR. -->
    <div class="glass-card anim-fade-in" style="margin-bottom:14px">
      <div class="card-title">LAS OTRAS DOS DESTREZAS</div>
      <div class="quick-grid quick-grid-2" style="margin-top:8px">
        <button class="quick-btn" onclick="goTo('escribir')">
          <span class="quick-icon">${ico('writing', 22)}</span><span>Escribir</span>
        </button>
        <button class="quick-btn" onclick="goTo('speak')">
          <span class="quick-icon">${ico('mic', 22)}</span><span>Hablar</span>
        </button>
      </div>
    </div>

    <div class="glass-card anim-fade-in" style="margin-bottom:14px">
      <div class="card-title">SECCIONES CAE</div>
      <div class="exam-sections">
        ${EXAM_SECTIONS.map(s => `
          <div class="exam-section-card" onclick="openExamSection('${s.id}')">
            <div class="exam-section-icon">${s.icon}</div>
            <div class="exam-section-name">${s.name.toUpperCase()}</div>
            <div class="exam-section-avg" style="color:${avgBySection[s.id] ? getScoreColor(avgBySection[s.id]) : 'var(--text-3)'}">
              ${avgBySection[s.id] != null ? avgBySection[s.id] + '%' : '—'}
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="glass-card">
      <div class="card-title">REGISTRAR RESULTADO</div>
      <div class="field">
        <label>Sección</label>
        <select class="field-input" id="exam-section-sel">
          ${EXAM_SECTIONS.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="field">
          <label>Puntuación</label>
          <input class="field-input" type="number" id="exam-score" min="0" placeholder="0" inputmode="numeric">
        </div>
        <div class="field">
          <label>Máximo</label>
          <input class="field-input" type="number" id="exam-max" min="1" value="100" inputmode="numeric">
        </div>
      </div>
      <div class="field">
        <label>Notas</label>
        <input class="field-input" type="text" id="exam-notes" placeholder="Qué fue difícil...">
      </div>
      <button class="btn btn-primary" onclick="saveExamResult()">GUARDAR RESULTADO</button>
    </div>

    ${_examAttempts.length ? `
    <div class="glass-card" style="margin-top:8px">
      <div class="card-title">HISTORIAL</div>
      ${_examAttempts.slice(0, 10).map(a => {
        const pct = Math.round(a.score / a.max_score * 100);
        const secInfo = EXAM_SECTIONS.find(s => s.id === a.section) || {};
        return `<div class="exam-history-item">
          <span class="exam-history-date">${new Date(a.date).toLocaleDateString('es-ES', {day:'2-digit',month:'short'})}</span>
          <span class="exam-history-section">${secInfo.icon || ''} ${a.section}</span>
          ${a.notes ? `<span style="font-size:0.65rem;color:var(--text-3);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.notes}</span>` : '<span style="flex:1"></span>'}
          <span class="exam-history-score" style="color:${getScoreColor(pct)}">${pct}%</span>
        </div>`;
      }).join('')}
    </div>` : ''}
  `;

  // Las tareas se cargan aparte, sin bloquear el pintado del panel.
  loadReadingTasks();
  if (typeof loadListeningTasks === 'function') loadListeningTasks();
}

// ══════════════════════ READING (partes 5-8) ══════════════════════
const READING_PARTS = {
  reading_mc:  { n: 5, nombre: 'Multiple choice',            desc: 'Un texto largo, 6 preguntas de opción múltiple' },
  cross_text:  { n: 6, nombre: 'Cross-text matching',        desc: 'Cuatro opiniones que hay que comparar entre sí' },
  gapped_text: { n: 7, nombre: 'Gapped text',                desc: 'Encajar los párrafos que faltan; sobra uno' },
  multi_match: { n: 8, nombre: 'Multiple matching',          desc: 'Localizar información en varias secciones' },
};

let _reading = { task: null };

async function loadReadingTasks() {
  const box = document.getElementById('reading-tasks');
  if (!box) return;
  try {
    const tasks = await apiGet('/reading/tasks') || [];
    if (!tasks.length) {
      box.innerHTML = '<div class="empty-state" style="padding:8px 0">Aún no hay textos de Reading.</div>';
      return;
    }
    box.innerHTML = tasks.map(t => {
      const info = READING_PARTS[t.part] || { n: '?', nombre: t.part, desc: '' };
      return `
        <button class="topic-item" style="width:100%;margin-bottom:6px" onclick="startReading('${t.slug}')">
          <div class="topic-item-info">
            <div class="topic-item-title">Parte ${info.n} · ${info.nombre}</div>
            <div class="topic-item-meta">${info.desc} · ${t.questions} preguntas</div>
          </div>
          <span class="badge badge-c1">C1</span>
        </button>`;
    }).join('');
  } catch (e) {
    box.innerHTML = cajaError(e);
  }
}

async function startReading(slug) {
  const container = document.getElementById('exam-content');
  container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    _reading.task = await apiGet(`/reading/task/${slug}`);
    renderReading();
  } catch (e) {
    container.innerHTML = cajaError(e);
  }
}

function renderReading() {
  const t = _reading.task;
  const info = READING_PARTS[t.part] || { n: '?', nombre: t.part };
  const container = document.getElementById('exam-content');

  // Los huecos [1]…[n] del enunciado se convierten en marcas visibles.
  const cuerpo = _esc(t.body).replace(/\[(\d+)\]/g,
    '<div class="reading-gap">— hueco $1 —</div>');

  // Textos sueltos: opiniones (parte 6), párrafos (parte 7) o secciones (parte 8)
  const extras = Array.isArray(t.extras) ? t.extras : [];
  const extrasHtml = extras.length ? `
    <div class="glass-card" style="margin-bottom:12px">
      <div class="card-title">${t.part === 'gapped_text' ? 'PÁRRAFOS DISPONIBLES' : 'TEXTOS'}</div>
      ${extras.map(x => `
        <div class="reading-extra">
          <span class="reading-extra-letter">${x.letter}</span>
          <span>${_esc(x.text)}</span>
        </div>`).join('')}
    </div>` : '';

  container.innerHTML = `
    <button class="btn btn-subtle btn-sm" onclick="renderExamDashboard()" style="margin-bottom:12px">← VOLVER</button>

    <div class="glass-card-accent anim-slide-up" style="margin-bottom:12px">
      <div class="card-title">PARTE ${info.n} · ${info.nombre.toUpperCase()}</div>
      <div style="font-size:0.8rem;font-weight:600;color:var(--text);margin-bottom:4px">${_esc(t.title)}</div>
      <div style="font-size:0.72rem;color:var(--text-3)">${_esc(t.intro || '')}</div>
    </div>

    <div class="glass-card" style="margin-bottom:12px">
      <div class="reading-body">${cuerpo}</div>
    </div>

    ${extrasHtml}

    <div class="glass-card">
      <div class="card-title">PREGUNTAS</div>
      ${t.questions.map((q, i) => {
        const opts = Array.isArray(q.options) ? q.options : [];
        // Con letras (A-G) se pintan como botones; si son textos largos, como lista.
        const soloLetras = opts.every(o => typeof o === 'string' && o.length <= 2);
        return `
          <div class="reading-q" data-qid="${q.id}">
            <div class="reading-q-prompt"><b>${i + 1}.</b> ${_esc(q.prompt)}</div>
            <div class="${soloLetras ? 'reading-letters' : 'reading-options'}">
              ${opts.map((o, j) => {
                const val = soloLetras ? o : String.fromCharCode(65 + j);
                return `<button class="reading-opt" data-qid="${q.id}" data-val="${val}"
                          onclick="pickReading(${q.id}, '${val}', this)">
                          ${soloLetras ? o : `<b>${val}.</b> ${_esc(o)}`}
                        </button>`;
              }).join('')}
            </div>
          </div>`;
      }).join('')}
      <button class="btn btn-primary" onclick="submitReading()" style="margin-top:12px">CORREGIR</button>
    </div>
  `;
  _reading.answers = {};
}

function pickReading(qid, val, btn) {
  _reading.answers = _reading.answers || {};
  _reading.answers[qid] = val;
  document.querySelectorAll(`.reading-opt[data-qid="${qid}"]`)
    .forEach(b => b.classList.toggle('selected', b === btn));
}

async function submitReading() {
  const t = _reading.task;
  const answers = t.questions.map(q => ({ id: q.id, response: (_reading.answers || {})[q.id] || '' }));
  const sinResponder = answers.filter(a => !a.response).length;
  if (sinResponder && !confirm(`Quedan ${sinResponder} preguntas sin responder. ¿Corregir igualmente?`)) return;

  try {
    const r = await apiPost('/exam-quiz/grade', { answers });
    // Reading cuenta como sección 'reading' en el historial
    await apiPost('/exam-attempts', {
      section: 'reading', score: r.aciertos, max_score: r.total,
      notes: `Parte ${READING_PARTS[t.part]?.n || ''} · ${t.title}`
    });
    await apiPost('/study-sessions', { type: 'reading', score: r.score, duration_minutes: 15 });
    renderReadingResults(r);
  } catch (e) {
    toastError(e);
  }
}

function renderReadingResults(r) {
  const container = document.getElementById('exam-content');
  container.innerHTML = `
    <div class="glass-card-accent anim-scale-in" style="text-align:center;padding:24px 16px">
      <div style="font-family:var(--font-mono);font-size:2.2rem;font-weight:700;color:${getScoreColor(r.score)}">${r.score}%</div>
      <div style="font-size:0.8rem;color:var(--text-2)">${r.aciertos} de ${r.total} correctas</div>
    </div>
    <div class="glass-card" style="margin-top:10px">
      <div class="card-title">REVISIÓN</div>
      ${r.detail.map((d, i) => `
        <div class="reading-review ${d.correct ? 'ok' : 'ko'}">
          <div style="font-size:0.76rem;color:var(--text);margin-bottom:3px"><b>${i + 1}.</b> ${_esc(d.prompt)}</div>
          <div style="font-size:0.7rem;color:var(--text-3)">
            Tu respuesta: <b style="color:${d.correct ? 'var(--success)' : 'var(--danger)'}">${_esc(d.your) || '—'}</b>
            ${d.correct ? '' : ` · Correcta: <b style="color:var(--success)">${_esc(d.answer)}</b>`}
          </div>
          ${d.explanation ? `<div style="font-size:0.68rem;color:var(--text-3);margin-top:5px;line-height:1.5">${_esc(d.explanation)}</div>` : ''}
        </div>`).join('')}
      <button class="btn btn-primary" onclick="renderExamDashboard()" style="margin-top:12px">VOLVER</button>
    </div>`;
  _examInited = false;
}

function getScoreColor(pct) {
  if (pct >= 80) return 'var(--success)';
  if (pct >= 60) return 'var(--accent)';
  if (pct >= 40) return 'var(--warning)';
  return 'var(--danger)';
}

function openExamSection(sectionId) {
  const sec = EXAM_SECTIONS.find(s => s.id === sectionId);
  if (!sec) return;
  const container = document.getElementById('exam-content');
  const attempts  = _examAttempts.filter(a => a.section === sectionId);
  const avgPct    = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + a.score / a.max_score * 100, 0) / attempts.length)
    : null;

  container.innerHTML = `
    <button class="btn btn-subtle btn-sm" onclick="renderExamDashboard()" style="margin-bottom:14px">← VOLVER</button>
    <div class="glass-card-accent anim-slide-up">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <span style="font-size:2rem">${sec.icon}</span>
        <div>
          <div style="font-family:var(--font-mono);font-size:1rem;font-weight:700;color:var(--text)">${sec.name.toUpperCase()}</div>
          <div style="font-size:0.7rem;color:var(--text-3)">${sec.desc}</div>
        </div>
      </div>
      ${avgPct != null ? `
        <div style="text-align:center;padding:12px 0">
          <div style="font-family:var(--font-mono);font-size:2rem;font-weight:700;color:${getScoreColor(avgPct)}">${avgPct}%</div>
          <div style="font-size:0.65rem;color:var(--text-3);letter-spacing:2px">PROMEDIO · ${attempts.length} INTENTOS</div>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${avgPct}%;background:${getScoreColor(avgPct)}"></div></div>
      ` : '<div style="text-align:center;color:var(--text-3);font-size:0.8rem;padding:12px 0">Sin intentos todavía</div>'}
    </div>
    <div class="glass-card" style="margin-top:8px">
      <div class="card-title">TIPS PARA ${sec.name.toUpperCase()}</div>
      <div style="font-size:0.78rem;color:var(--text-2);line-height:1.8">
        ${getExamTips(sectionId)}
      </div>
    </div>
  `;
}

function getExamTips(section) {
  const tips = {
    reading:   '• Reading va dentro del mismo paper que Use of English: 90 min para las 8 partes<br>• Reserva unos 50 min para las partes 5-8 y deja 40 para Use of English<br>• Part 6 (cross-text) compara opiniones entre cuatro textos: subraya quién opina qué<br>• Part 7 (gapped text) se resuelve por cohesión: pronombres y conectores<br>• Los textos son auténticos — practica con artículos del Guardian',
    writing:   '• Part 1 es obligatoria y siempre es un essay a partir de un texto dado<br>• Part 2 eliges entre carta/email, propuesta, informe o reseña<br>• <b>220-260 palabras</b> por tarea: pasarse o quedarse corto penaliza<br>• Essay: argumenta ambos lados antes de dar tu opinión<br>• Proposal e informe: usa encabezados y registro formal',
    listening: '• Cada grabación se escucha <b>dos veces</b><br>• La primera escucha es para contexto; la segunda para respuestas<br>• Part 2 es sentence completion: copia las palabras exactas que oigas<br>• Part 4 son cinco monólogos con dos tareas a la vez: no te quedes atrás<br>• Practica con podcasts de BBC World Service',
    speaking:  '• Part 2 en C1 son <b>tres fotos</b>, no dos: eliges dos y las comparas<br>• Habla 1 minuto seguido sin parar — practica en alto con cronómetro<br>• Part 3 es colaborativa: hay que negociar y llegar a una decisión<br>• Usa fórmulas: "One aspect I find interesting is..."<br>• No te corrijas a mitad de frase — sigue fluyendo'
  };
  return tips[section] || '';
}

// ══════════════════════ QUIZ INTERACTIVO ══════════════════════
const _esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Del `prompt` crudo de exam_questions a las piezas que se pintan.
 *
 * El banco guarda la transformación entera en una sola cadena:
 *   "It's possible that she forgot." || She ____ about it. [HAVE]
 * y la palabra que hay que escribir es sólo el trozo del hueco ("may have
 * forgotten"), porque la corrección compara la cadena exacta.
 *
 * Vive aquí y no dentro de quizQuestionHtml porque el test de nivel pinta las
 * mismas preguntas: cuando lo pintaba por su cuenta salían con el `||` y el
 * `[HAVE]` a la vista y sin decir cuánto había que escribir, y quien contestaba
 * la frase entera fallaba aunque se la supiera. Un cuarto de las preguntas del
 * diagnóstico son de este tipo: era medir el formato de la pantalla, no el
 * inglés de quien la usa.
 */
function uoePartes(q) {
  const prompt = String(q?.prompt ?? '');

  if (q?.part === 'key_word_transformation') {
    const [orig, rest = ''] = prompt.split('||');
    const keyMatch = rest.match(/\[([^\]]+)\]/);
    return {
      intro: orig.replace(/\|\|/g, '').trim(),
      frase: rest.replace(/\[[^\]]+\]/, '').trim(),
      clave: keyMatch ? keyMatch[1] : (q.given_word || ''),
      etiqueta: 'Palabra clave (no la cambies)',
      ayuda: 'escribe sólo las 3-6 palabras que faltan',
    };
  }

  if (q?.part === 'word_formation') {
    return {
      intro: '', frase: prompt, clave: q.given_word || '',
      etiqueta: 'Base', ayuda: 'transforma la palabra dada',
    };
  }

  return {
    intro: '', frase: prompt, clave: '', etiqueta: '',
    ayuda: q?.part === 'open_cloze' ? 'una sola palabra' : '',
  };
}

// Resalta el hueco. Recibe texto YA escapado, porque mete HTML.
const uoeHueco = (html) => String(html ?? '').replace('____', '<span class="quiz-gap">____</span>');

async function startQuiz(part) {
  const container = document.getElementById('exam-content');
  container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const qs = await apiGet(`/exam-questions/quiz?part=${part}&n=8`);
    if (!qs || !qs.length) {
      container.innerHTML = '<button class="btn btn-subtle btn-sm" onclick="renderExamDashboard()" style="margin-bottom:14px">← VOLVER</button><div class="empty-state">No hay preguntas de esta parte todavía.</div>';
      return;
    }
    _quiz = { part, questions: qs };
    renderQuiz();
  } catch (e) {
    container.innerHTML = cajaError(e);
  }
}

// Pinta el enunciado de una pregunta según su tipo.
function quizQuestionHtml(q, i) {
  const meta = UOE_PARTS.find((p) => p.id === q.part) || {};
  let body = '';

  const p = uoePartes(q);

  if (q.part === 'mc_cloze') {
    const opts = Array.isArray(q.options) ? q.options : [];
    body = `<p class="quiz-prompt">${uoeHueco(_esc(p.frase))}</p>
      <div class="quiz-options">
        ${opts.map((o) => `
          <label class="quiz-opt">
            <input type="radio" name="q${q.id}" value="${_esc(o)}"> <span>${_esc(o)}</span>
          </label>`).join('')}
      </div>`;
  } else if (q.part === 'key_word_transformation') {
    body = `<p class="quiz-prompt" style="color:var(--text-3)">${_esc(p.intro)}</p>
      <p class="quiz-prompt">${uoeHueco(_esc(p.frase))}</p>
      <div class="quiz-hint">${p.etiqueta}: <strong>${_esc(p.clave)}</strong> · ${p.ayuda}</div>
      <input class="field-input quiz-input" type="text" data-qid="${q.id}" placeholder="las palabras que faltan" autocapitalize="none" autocomplete="off">`;
  } else {
    // open_cloze y word_formation
    body = `<p class="quiz-prompt">${uoeHueco(_esc(p.frase))}</p>
      ${p.clave ? `<div class="quiz-hint">${p.etiqueta}: <strong>${_esc(p.clave)}</strong> · ${p.ayuda}</div>` : ''}
      <input class="field-input quiz-input" type="text" data-qid="${q.id}" placeholder="tu respuesta" autocapitalize="none" autocomplete="off">`;
  }

  return `<div class="glass-card quiz-q" style="margin-bottom:10px">
    <div style="font-size:0.62rem;color:var(--text-3);letter-spacing:1px;margin-bottom:8px">PREGUNTA ${i + 1} · ${(meta.short || '').toUpperCase()}</div>
    ${body}
  </div>`;
}

function renderQuiz() {
  const container = document.getElementById('exam-content');
  const meta = UOE_PARTS.find((p) => p.id === _quiz.part) || {};
  container.innerHTML = `
    <button class="btn btn-subtle btn-sm" onclick="renderExamDashboard()" style="margin-bottom:14px">← SALIR</button>
    <div class="glass-card-accent" style="margin-bottom:12px">
      <div class="card-title">${(meta.short || '').toUpperCase()}</div>
      <p style="font-size:0.72rem;color:var(--text-3)">${meta.desc || ''} · ${_quiz.questions.length} preguntas</p>
    </div>
    ${_quiz.questions.map((q, i) => quizQuestionHtml(q, i)).join('')}
    <button class="btn btn-primary" onclick="submitQuiz()" style="margin-top:6px">CORREGIR →</button>
  `;
}

async function submitQuiz() {
  const answers = _quiz.questions.map((q) => {
    let response = '';
    if (q.part === 'mc_cloze') {
      response = document.querySelector(`input[name="q${q.id}"]:checked`)?.value || '';
    } else {
      response = document.querySelector(`.quiz-input[data-qid="${q.id}"]`)?.value.trim() || '';
    }
    return { id: q.id, response };
  });

  const container = document.getElementById('exam-content');
  container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const res = await apiPost('/exam-quiz/grade', { answers });
    // El Use of English cuenta como parte del paper de Reading en el CAE.
    await apiPost('/exam-attempts', { section: 'reading', score: res.score, max_score: 100, notes: `Use of English · ${_quiz.part}` });
    await apiPost('/study-sessions', { type: 'exam', score: res.score });
    showXpPop(25);
    renderQuizResults(res);
  } catch (e) {
    container.innerHTML = cajaError(e);
  }
}

function renderQuizResults(res) {
  const container = document.getElementById('exam-content');
  const color = getScoreColor(res.score);
  container.innerHTML = `
    <button class="btn btn-subtle btn-sm" onclick="renderExamDashboard()" style="margin-bottom:14px">← VOLVER</button>
    <div class="glass-card-accent" style="margin-bottom:14px;text-align:center">
      <div style="font-family:var(--font-mono);font-size:2.4rem;font-weight:700;color:${color}">${res.score}%</div>
      <div style="font-size:0.68rem;color:var(--text-3);letter-spacing:1px">${res.aciertos} / ${res.total} CORRECTAS</div>
    </div>
    ${res.detail.map((d) => `
      <div class="glass-card" style="margin-bottom:8px;border-left:3px solid ${d.correct ? 'var(--success)' : 'var(--danger)'}">
        <p style="font-size:0.78rem;color:var(--text-2);margin-bottom:6px">${_esc((d.prompt || '').replace(/\|\|/g, ' → ').replace(/\[[^\]]+\]/, ''))}</p>
        <div style="font-size:0.74rem;display:flex;flex-wrap:wrap;gap:6px 14px">
          <span style="color:${d.correct ? 'var(--success)' : 'var(--danger)'}">${d.correct ? '✓' : '✗'} Tu respuesta: <strong>${_esc(d.your) || '—'}</strong></span>
          ${!d.correct ? `<span style="color:var(--success)">Correcta: <strong>${_esc(d.answer)}</strong></span>` : ''}
        </div>
        ${d.explanation ? `<p style="font-size:0.68rem;color:var(--text-3);margin-top:6px;line-height:1.5">${_esc(d.explanation)}</p>` : ''}
      </div>
    `).join('')}
    <button class="btn btn-primary" onclick="startQuiz('${_quiz.part}')" style="margin-top:6px">OTRA RONDA →</button>
  `;
  // Refrescar historial subyacente
  apiGet('/exam-attempts').then((a) => { _examAttempts = a || []; }).catch(() => {});
}

async function saveExamResult() {
  const section  = document.getElementById('exam-section-sel')?.value;
  const score    = parseInt(document.getElementById('exam-score')?.value, 10);
  const max      = parseInt(document.getElementById('exam-max')?.value, 10) || 100;
  const notes    = document.getElementById('exam-notes')?.value.trim();
  if (!section || isNaN(score)) { toast('Rellena sección y puntuación', 'error'); return; }
  try {
    const result = await apiPost('/exam-attempts', { section, score, max_score: max, notes: notes || '' });
    _examAttempts.unshift(result);
    toast('Resultado guardado', 'success');
    await apiPost('/study-sessions', { type: 'exam', score: Math.round(score / max * 100) });
    showXpPop(25);
    renderExamDashboard();
  } catch (e) {
    toastError(e);
  }
}
