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
