// TutorIngles — settings.js
// Ajustes: fecha del examen, meta diaria de vocabulario, nivel objetivo y plan.

let _settingsInited = false;

async function initSettings() {
  const container = document.getElementById('settings-content');
  if (!container) return;
  container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const [examDate, vocabTarget, level, planStart] = await Promise.all([
      apiGet('/config/target_exam_date'),
      apiGet('/config/daily_vocab_target'),
      apiGet('/config/user_level'),
      apiGet('/config/plan_start_date'),
    ]);
    renderSettings2({
      exam_date: examDate?.value || '',
      vocab_target: vocabTarget?.value || '20',
      level: level?.value || 'B1',
      plan_start: planStart?.value || null,
    });
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

function renderSettings2(s) {
  const container = document.getElementById('settings-content');
  const levels = ['A2', 'B1', 'B2', 'C1'];
  container.innerHTML = `
    <div class="glass-card">
      <div class="card-title">EXAMEN OBJETIVO</div>
      <div class="field">
        <label>Fecha del examen CAE</label>
        <input class="field-input" type="date" id="set-exam-date" value="${s.exam_date}">
      </div>
      <div class="field">
        <label>Nivel actual</label>
        <select class="field-input" id="set-level">
          ${levels.map((l) => `<option value="${l}" ${l === s.level ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Meta diaria de vocabulario</label>
        <input class="field-input" type="number" id="set-vocab-target" min="5" max="100" value="${s.vocab_target}" inputmode="numeric">
      </div>
      <button class="btn btn-primary" onclick="saveSettings()">GUARDAR AJUSTES</button>
    </div>

    <div class="glass-card" style="margin-top:8px">
      <div class="card-title">PLAN DE 30 DÍAS</div>
      <p style="font-size:0.76rem;color:var(--text-3);margin-bottom:12px">
        ${s.plan_start ? `Iniciado el ${new Date(s.plan_start).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}.` : 'Aún no has empezado el plan.'}
      </p>
      <button class="btn btn-subtle" onclick="restartPlan()">${s.plan_start ? 'REINICIAR PLAN (día 1 hoy)' : 'EMPEZAR PLAN HOY'}</button>
    </div>

    <button class="btn btn-ghost" onclick="goTo('hoy')" style="margin-top:12px">← VOLVER A HOY</button>
  `;
}

async function saveSettings() {
  const examDate = document.getElementById('set-exam-date')?.value;
  const level    = document.getElementById('set-level')?.value;
  const target   = document.getElementById('set-vocab-target')?.value;
  try {
    await Promise.all([
      examDate ? apiPut('/config/target_exam_date', { value: examDate }) : Promise.resolve(),
      apiPut('/config/user_level', { value: level }),
      apiPut('/config/daily_vocab_target', { value: String(target || 20) }),
    ]);
    toast('✅ Ajustes guardados', 'success');
  } catch (e) {
    toast(`Error: ${e.message}`, 'error');
  }
}

async function restartPlan() {
  try {
    await apiPost('/plan/start', {});
    toast('🚀 Plan reiniciado en el día 1', 'success');
    initSettings();
  } catch (e) {
    toast(`Error: ${e.message}`, 'error');
  }
}
