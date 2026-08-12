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
    if (typeof cargarPushCfg === 'function') await cargarPushCfg();
    renderSettings2({
      exam_date: examDate?.value || '',
      vocab_target: vocabTarget?.value || '8',
      level: level?.value || 'B1',
      plan_start: planStart?.value || null,
    });
  } catch (e) {
    container.innerHTML = cajaError(e);
  }
}

function renderSettings2(s) {
  const container = document.getElementById('settings-content');
  const levels = ['A2', 'B1', 'B2', 'C1'];
  container.innerHTML = `
    ${typeof renderAvisos === 'function' ? renderAvisos() : ''}

    <div class="glass-card" style="margin-top:8px">
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
        <input class="field-input" type="number" id="set-vocab-target" min="4" max="100" value="${s.vocab_target}" inputmode="numeric">
        <div class="field-pista">
          Ocho al día se hacen en una cola del súper. Subirla es la forma más
          rápida de dejar de hacerla.
        </div>
      </div>
      <button class="btn btn-primary" onclick="saveSettings()">GUARDAR AJUSTES</button>
    </div>

    ${renderVozAjustes()}

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

// ── VOZ DEL MÓVIL ────────────────────────────────────────
// La app elige sola la mejor voz inglesa que encuentra, puntuando por nombre.
// Pero cada teléfono trae un juego distinto y la heurística no puede oírlas:
// si en un iPhone la elegida suena peor que otra, hay que poder cambiarla sin
// esperar a que alguien toque el código. También se dice CUÁL está usando, que
// es lo primero que hace falta saber cuando "suena raro".
function renderVozAjustes() {
  if (typeof vozListar !== 'function') return '';
  const voces  = vozListar();
  const actual = typeof mejorVoz === 'function' ? mejorVoz() : null;

  if (!voces.length) {
    return `
      <div class="glass-card" style="margin-top:8px">
        <div class="card-title">VOZ DEL MÓVIL</div>
        <div class="field-pista">
          Este móvil no tiene ninguna voz inglesa instalada, así que el inglés
          se lee con la voz del sistema y suena mal. En iPhone se añaden en
          Ajustes › Accesibilidad › Contenido hablado › Voces.
        </div>
      </div>`;
  }

  return `
    <div class="glass-card" style="margin-top:8px">
      <div class="card-title">VOZ DEL MÓVIL</div>
      <div class="field">
        <label>Voz para leer el inglés</label>
        <select class="field-input" id="set-voz" onchange="cambiarVoz(this.value)">
          ${voces.map((v) => `
            <option value="${escaparAttr(v.voiceURI)}" ${actual && v.voiceURI === actual.voiceURI ? 'selected' : ''}>
              ${escaparHtml(v.name)} · ${escaparHtml(v.lang)}
            </option>`).join('')}
        </select>
        <div class="field-pista">
          Solo afecta a lo que lee el móvil. Las frases de tu sector tienen voz
          grabada y no cambian.
        </div>
      </div>
      <button class="btn btn-subtle" onclick="probarVoz(this)">PROBAR ESTA VOZ</button>
    </div>`;
}

function cambiarVoz(voiceURI) {
  const v = vozElegir(voiceURI);
  toast(v ? `Voz: ${v.name}` : 'No se pudo cambiar', v ? 'success' : 'error');
  probarVoz();
}

function probarVoz(btn) {
  vozDecir('Would you like to try them on? Here is your receipt.', { btn });
}

async function saveSettings() {
  const examDate = document.getElementById('set-exam-date')?.value;
  const level    = document.getElementById('set-level')?.value;
  const target   = document.getElementById('set-vocab-target')?.value;
  try {
    await Promise.all([
      examDate ? apiPut('/config/target_exam_date', { value: examDate }) : Promise.resolve(),
      apiPut('/config/user_level', { value: level }),
      apiPut('/config/daily_vocab_target', { value: String(target || 8) }),
    ]);
    toast('Ajustes guardados', 'success');
  } catch (e) {
    toastError(e);
  }
}

async function restartPlan() {
  try {
    await apiPost('/plan/start', {});
    toast('Plan reiniciado en el día 1', 'success');
    initSettings();
  } catch (e) {
    toastError(e);
  }
}
