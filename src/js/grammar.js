// TutorIngles — grammar.js
// Módulo de gramática: lista de temas, lecciones, progreso
// TODO: Implementar visor de contenido HTML, ejercicios interactivos

// ── STATE ───────────────────────────────────────────────
let _gramInited = false;
let _gramTopics = [];

// ── INIT ─────────────────────────────────────────────────
async function initGrammar() {
  const container = document.getElementById('gram-content');
  if (!container || _gramInited) return;
  _gramInited = true;

  container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

  try {
    _gramTopics = await apiGet('/grammar-topics') || [];
    renderGrammarList();
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

function renderGrammarList() {
  const container = document.getElementById('gram-content');
  if (!_gramTopics.length) {
    container.innerHTML = '<div class="empty-state">No hay temas disponibles.</div>';
    return;
  }

  // Agrupar por nivel
  const byLevel = { B1: [], B2: [], C1: [] };
  _gramTopics.forEach(t => {
    if (byLevel[t.level]) byLevel[t.level].push(t);
  });

  const completedCount = _gramTopics.filter(t => t.completed).length;
  const pct = Math.round((completedCount / _gramTopics.length) * 100);

  container.innerHTML = `
    <div class="glass-card anim-fade-in" style="margin-bottom:14px">
      <div class="card-title" style="display:flex;justify-content:space-between">
        PROGRESO GRAMÁTICA
        <span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--accent)">${completedCount}/${_gramTopics.length}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="progress-label">${pct}% completado</div>
    </div>
    ${Object.entries(byLevel).map(([level, topics]) => topics.length ? `
      <div style="margin-bottom:16px">
        <div style="font-family:var(--font-mono);font-size:0.55rem;letter-spacing:3px;color:var(--text-3);margin-bottom:8px">
          NIVEL ${level} <span class="badge badge-${level.toLowerCase()}">${topics.filter(t=>t.completed).length}/${topics.length}</span>
        </div>
        <div class="topic-list">
          ${topics.map(t => `
            <div class="topic-item${t.completed ? ' completed' : ''} anim-slide-up" onclick="openTopic(${t.id})">
              <div class="topic-item-info">
                <div class="topic-item-title">${t.title}</div>
                <div class="topic-item-meta">${t.description || ''}</div>
              </div>
              ${t.score != null ? `<span class="badge badge-${t.score >= 70 ? 'success' : 'danger'}">${t.score}%</span>` : ''}
              <div class="topic-check">${t.completed ? '✓' : ''}</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '').join('')}
  `;
}

function openTopic(topicId) {
  const topic = _gramTopics.find(t => t.id === topicId);
  if (!topic) return;

  const container = document.getElementById('gram-content');
  container.innerHTML = `
    <button class="btn btn-subtle btn-sm" onclick="initGrammar(); _gramInited=false; initGrammar();" style="margin-bottom:14px">
      ← VOLVER A LA LISTA
    </button>
    <div class="glass-card-accent anim-slide-up">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <h2 style="font-size:1rem;font-weight:600;color:var(--text);flex:1">${topic.title}</h2>
        <span class="badge badge-${topic.level.toLowerCase()}">${topic.level}</span>
      </div>
      ${topic.description ? `<p style="font-size:0.78rem;color:var(--text-3);margin-bottom:16px">${topic.description}</p>` : ''}
      <div style="font-size:0.85rem;color:var(--text-2);line-height:1.7;min-height:120px;margin-bottom:16px">
        ${topic.content_html || '<p style="color:var(--text-3);font-style:italic">Contenido de la lección próximamente.<br>Por ahora estudia con tu material de Cambridge CAE.</p>'}
      </div>
      <div style="border-top:1px solid var(--surface-2);padding-top:14px;display:flex;gap:10px">
        <button class="btn btn-ghost" onclick="markTopicDone(${topic.id}, false)" style="flex:1">
          MARCAR INCOMPLETO
        </button>
        <button class="btn btn-primary" onclick="markTopicDone(${topic.id}, true)" style="flex:1">
          ✓ COMPLETADO
        </button>
      </div>
    </div>
  `;
}

async function markTopicDone(topicId, completed) {
  try {
    await apiPost('/grammar-progress', { topic_id: topicId, completed, score: completed ? 100 : null });
    toast(completed ? '✅ Tema completado' : 'Marcado como pendiente', completed ? 'success' : '');
    if (completed) {
      showXpPop(20);
      // Marcar meta grammar del día
      const today = new Date().toISOString().split('T')[0];
      await apiPut(`/daily-goals/${today}`, { grammar_done: true });
      await apiPost('/study-sessions', { type: 'grammar', score: 100 });
    }
    // Recargar lista
    _gramInited = false;
    _gramTopics = [];
    initGrammar();
  } catch (e) {
    toast(`Error: ${e.message}`, 'error');
  }
}
