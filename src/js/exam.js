// TutorIngles — exam.js
// Módulo de simulacros Cambridge CAE
// TODO: Implementar tests interactivos completos, temporizador, corrección

// ── STATE ───────────────────────────────────────────────
let _examInited   = false;
let _examAttempts = [];

const EXAM_SECTIONS = [
  { id: 'reading',   icon: '📖', name: 'Reading',   desc: '4 parts · 36 questions · 75 min' },
  { id: 'writing',   icon: '✍️', name: 'Writing',   desc: '2 parts · essays/reports · 90 min' },
  { id: 'listening', icon: '🎧', name: 'Listening', desc: '4 parts · 30 questions · 40 min' },
  { id: 'speaking',  icon: '🗣️', name: 'Speaking',  desc: '4 parts · paired exam · 15 min' },
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
    container.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
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
    reading:   '• Lee el texto completo antes de las preguntas<br>• Los textos son auténticos — practica con artículos del Guardian<br>• En Part 5 (gap fill) busca cohesión y coherencia<br>• Administra 75 minutos: ~18 min por parte',
    writing:   '• Essay: argumenta ambos lados antes de dar tu opinión<br>• Report: usa headings y lenguaje formal<br>• 240-280 palabras por tarea — ni más, ni menos<br>• Revisa gramática y variedad léxica siempre',
    listening: '• La primera escucha es para contexto; la segunda para respuestas<br>• En Part 3 (multiple matching) el orden puede engañar<br>• Practica con podcasts de BBC World Service<br>• Escribe mientras escuchas, no después',
    speaking:  '• En Part 2 habla 1 minuto sin parar — practica en voz alta<br>• Usa language chunks: "One aspect I find interesting is..."<br>• Pregunta la opinión de tu compañero en la discusión<br>• No te corrijas a mitad de frase — sigue fluyendo'
  };
  return tips[section] || '';
}

// ══════════════════════ QUIZ INTERACTIVO ══════════════════════
const _esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
    container.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

// Pinta el enunciado de una pregunta según su tipo.
function quizQuestionHtml(q, i) {
  const meta = UOE_PARTS.find((p) => p.id === q.part) || {};
  let body = '';

  if (q.part === 'mc_cloze') {
    const prompt = _esc(q.prompt).replace('____', '<span class="quiz-gap">____</span>');
    const opts = Array.isArray(q.options) ? q.options : [];
    body = `<p class="quiz-prompt">${prompt}</p>
      <div class="quiz-options">
        ${opts.map((o) => `
          <label class="quiz-opt">
            <input type="radio" name="q${q.id}" value="${_esc(o)}"> <span>${_esc(o)}</span>
          </label>`).join('')}
      </div>`;
  } else if (q.part === 'key_word_transformation') {
    // Formato: "original" || segunda con ____ [KEY]
    const [orig, rest = ''] = q.prompt.split('||');
    const keyMatch = rest.match(/\[([^\]]+)\]/);
    const key = keyMatch ? keyMatch[1] : (q.given_word || '');
    const second = _esc(rest.replace(/\[[^\]]+\]/, '').trim()).replace('____', '<span class="quiz-gap">____</span>');
    body = `<p class="quiz-prompt" style="color:var(--text-3)">${_esc(orig.replace(/\|\|/g, '').trim())}</p>
      <p class="quiz-prompt">${second}</p>
      <div class="quiz-hint">Palabra clave (no la cambies): <strong>${_esc(key)}</strong> · usa 3-6 palabras</div>
      <input class="field-input quiz-input" type="text" data-qid="${q.id}" placeholder="las palabras que faltan" autocapitalize="none" autocomplete="off">`;
  } else {
    // open_cloze y word_formation
    const prompt = _esc(q.prompt).replace('____', '<span class="quiz-gap">____</span>');
    body = `<p class="quiz-prompt">${prompt}</p>
      ${q.given_word ? `<div class="quiz-hint">Base: <strong>${_esc(q.given_word)}</strong></div>` : ''}
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
    container.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
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
    toast('✅ Resultado guardado', 'success');
    await apiPost('/study-sessions', { type: 'exam', score: Math.round(score / max * 100) });
    showXpPop(25);
    renderExamDashboard();
  } catch (e) {
    toast(`Error: ${e.message}`, 'error');
  }
}
