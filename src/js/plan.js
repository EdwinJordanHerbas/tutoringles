// TutorIngles — plan.js
// Plan de 30 días: muestra la lección de hoy en la pantalla HOY.

async function loadPlanToday() {
  const card = document.getElementById('plan-card');
  if (!card) return;
  // El plan de 30 días es del inglés (examen con fecha). El francés va por
  // fases sin calendario: ver lib/fases.js.
  if (typeof _idioma !== 'undefined' && _idioma === 'fr') return pintarFasesFrances(card);
  try {
    const p = await apiGet('/curriculum/today');
    if (!p) return;

    // Aún no ha empezado el plan → invitación a arrancar.
    if (!p.started) {
      card.innerHTML = `
        <div class="card-title">PLAN DE 30 DÍAS</div>
        <p style="font-size:0.8rem;color:var(--text-2);line-height:1.6;margin-bottom:14px">
          Un sprint guiado: cada día una situación real de tu trabajo, un lote de vocabulario, un foco de gramática y una tarea de speaking, con mini-simulacros por el camino.
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
        ${p.situation_title ? `
        <button class="quick-btn ${p.situation_done ? 'done' : ''}" style="flex-direction:row;justify-content:flex-start;gap:10px;padding:11px 14px" onclick="goTo('work')">
          <span><img src="src/img/icons/work.png" alt="" class="ico"></span>
          <span style="font-size:0.76rem;flex:1;text-align:left">Tu trabajo · ${p.situation_title}</span>
          ${p.situation_done ? '<span style="color:var(--success);font-size:0.8rem">✓</span>' : ''}
        </button>` : ''}
        <button class="quick-btn" style="flex-direction:row;justify-content:flex-start;gap:10px;padding:11px 14px" onclick="goTo('vocab')">
          <span><img src="src/img/icons/vocab.png" alt="" class="ico"></span><span style="font-size:0.76rem">Vocabulario · ${p.vocab_target || 15} palabras</span>
        </button>
        ${p.grammar_title ? `
        <button class="quick-btn" style="flex-direction:row;justify-content:flex-start;gap:10px;padding:11px 14px" onclick="goTo('gram')">
          <span><img src="src/img/icons/gram.png" alt="" class="ico"></span><span style="font-size:0.76rem">Gramática · ${p.grammar_title}</span>
        </button>` : ''}
        ${p.speaking_task ? `
        <div class="quick-btn" style="flex-direction:row;justify-content:flex-start;gap:10px;padding:11px 14px;cursor:default;align-items:flex-start">
          <span><img src="src/img/icons/speak.png" alt="" class="ico"></span><span style="font-size:0.74rem;color:var(--text-2);line-height:1.4">${p.speaking_task}</span>
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
    toast('¡Plan iniciado! Día 1 de 30', 'success');
    loadPlanToday();
  } catch (e) {
    toastError(e);
  }
}

// ── EL PLAN DEL FRANCÉS: FASES, NO DÍAS ─────────────────
// Tres fases con objetivos medibles. Se pasa de una a otra cuando los datos lo
// dicen, no cuando lo dice el calendario: la marcha a Suiza es "en torno a un
// mes" y un plan de N días habría sido inventarse un ritmo.
async function pintarFasesFrances(card) {
  try {
    const r = await apiGet('/plan/fases');
    if (!r?.fases) return;
    const actual = r.fases.find((f) => f.estado === 'actual') || r.fases[r.fases.length - 1];
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
        <div class="card-title" style="margin:0">FRANCÉS · FASE ${actual.id} DE 3</div>
        <span style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-3)">${actual.nivel}</span>
      </div>
      <div class="fase-tit">${actual.titulo}</div>
      <p class="fase-idea">${actual.idea}</p>
      <div class="fase-objs">
        ${actual.objetivos.map((o) => `
          <div class="fase-obj${o.pendienteApp ? ' pendiente' : ''}">
            <div class="fase-obj-cab">
              <span>${o.texto}</span>
              <span class="fase-obj-num">${o.pendienteApp ? 'aún no está en la app' : `${o.hechas} / ${o.meta}`}</span>
            </div>
            ${o.pendienteApp ? '' : `<div class="progress-bar"><div class="progress-fill" style="width:${o.pct}%"></div></div>`}
          </div>`).join('')}
      </div>
      <div class="fase-mapa">
        ${r.fases.map((f) => `<span class="fase-chip ${f.estado}">${f.id} · ${f.titulo}</span>`).join('')}
      </div>
      <div class="fase-pie">
        Consolidada = FSRS calcula que la recuerdas al menos una semana. Acertarla
        una vez no cuenta. Has visto ${r.vistas} de ${r.total} palabras.
      </div>
      <div class="plan-tasks" style="display:flex;gap:8px;margin-top:12px">
        <button class="quick-btn" style="flex:1;flex-direction:row;justify-content:center;gap:8px;padding:10px" onclick="goTo('work')">
          <img src="src/img/icons/work.png" alt="" class="ico"><span style="font-size:0.74rem">Situaciones</span>
        </button>
        <button class="quick-btn" style="flex:1;flex-direction:row;justify-content:center;gap:8px;padding:10px" onclick="goTo('gram')">
          <img src="src/img/icons/gram.png" alt="" class="ico"><span style="font-size:0.74rem">Gramática</span>
        </button>
      </div>`;
  } catch (e) {
    card.innerHTML = `<div class="card-title">FRANCÉS</div><div class="empty-state" style="padding:8px 0">No se pudo cargar el plan</div>`;
  }
}
