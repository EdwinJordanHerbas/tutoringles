// TutorIngles — plan.js
// Plan de 30 días: muestra la lección de hoy en la pantalla HOY.

async function loadPlanToday() {
  const card = document.getElementById('plan-card');
  if (!card) return;
  try {
    const p = await apiGet('/curriculum/today');
    if (!p) return;

    // Aún no ha empezado el plan → invitación a arrancar.
    if (!p.started) {
      card.innerHTML = `
        <div class="card-title">PLAN DE 30 DÍAS</div>
        <p style="font-size:0.8rem;color:var(--text-2);line-height:1.6;margin-bottom:14px">
          Un sprint guiado hacia el C1: cada día un lote de vocabulario, un foco de gramática y una tarea de speaking, con mini-simulacros por el camino.
        </p>
        <button class="btn btn-primary" onclick="startPlan()">EMPEZAR PLAN →</button>`;
      return;
    }

    const pct = Math.round((p.day / 30) * 100);
    const mock = p.is_mock
      ? '<span class="badge" style="background:var(--warning);color:#111">SIMULACRO</span>' : '';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
        <div class="card-title" style="margin:0">DÍA ${p.day} / 30 ${mock}</div>
        <span style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-3)">${p.title || ''}</span>
      </div>
      <div class="progress-bar" style="margin:8px 0 12px"><div class="progress-fill" style="width:${pct}%"></div></div>
      ${p.focus ? `<p style="font-size:0.82rem;color:var(--text-2);line-height:1.55;margin-bottom:12px">${p.focus}</p>` : ''}
      <div class="plan-tasks" style="display:flex;flex-direction:column;gap:8px">
        <button class="quick-btn" style="flex-direction:row;justify-content:flex-start;gap:10px;padding:11px 14px" onclick="goTo('vocab')">
          <span>📖</span><span style="font-size:0.76rem">Vocabulario · ${p.vocab_target || 15} palabras</span>
        </button>
        ${p.grammar_title ? `
        <button class="quick-btn" style="flex-direction:row;justify-content:flex-start;gap:10px;padding:11px 14px" onclick="goTo('gram')">
          <span>📝</span><span style="font-size:0.76rem">Gramática · ${p.grammar_title}</span>
        </button>` : ''}
        ${p.speaking_task ? `
        <div class="quick-btn" style="flex-direction:row;justify-content:flex-start;gap:10px;padding:11px 14px;cursor:default;align-items:flex-start">
          <span>🗣️</span><span style="font-size:0.74rem;color:var(--text-2);line-height:1.4">${p.speaking_task}</span>
        </div>
        <button class="btn btn-subtle btn-sm" onclick="goTo('speak')">IR A SPEAKING →</button>` : ''}
        ${p.is_mock ? `
        <button class="btn btn-subtle btn-sm" onclick="goTo('exam')">HACER SIMULACRO →</button>` : ''}
      </div>`;
  } catch (e) {
    card.innerHTML = `<div class="card-title">PLAN DE 30 DÍAS</div><div class="empty-state" style="padding:8px 0">No se pudo cargar el plan</div>`;
  }
}

async function startPlan() {
  try {
    await apiPost('/plan/start', {});
    toast('🚀 ¡Plan iniciado! Día 1 de 30', 'success');
    loadPlanToday();
  } catch (e) {
    toast(`Error: ${e.message}`, 'error');
  }
}
