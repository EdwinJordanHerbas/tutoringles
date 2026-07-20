// TutorIngles — progress.js (NeumorphGlass Apple)
// Módulo de progreso: roadmap, stats, habilidades, countdown, logros

// ── STATE ────────────────────────────────────────────────
let _progressInited = false;

// ── INIT ─────────────────────────────────────────────────
async function initProgress() {
  const container = document.getElementById('progress-content');
  if (!container || _progressInited) return;
  _progressInited = true;

  container.innerHTML = `<div class="empty-state"><div class="spinner"></div></div>`;

  try {
    const stats = await apiGet('/stats') || {};
    renderProgressDashboard(stats);
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Error cargando progreso: ${e.message}</div>`;
  }
}

// ── DASHBOARD PRINCIPAL ───────────────────────────────────
function renderProgressDashboard(stats) {
  const container  = document.getElementById('progress-content');
  const levels     = ['A2', 'B1', 'B2', 'C1'];
  const levelColors = { A2: 'var(--level-a2)', B1: 'var(--level-b1)', B2: 'var(--level-b2)', C1: 'var(--level-c1)' };
  const currentLvl = stats.estimated_level || 'A2';
  const currentIdx = levels.indexOf(currentLvl);

  // Configuración de examen (meta)
  const targetDate = stats.exam_date || '2026-12-01';
  const now        = new Date();
  const examDt     = new Date(targetDate);
  const totalDays  = Math.ceil((examDt - new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())) / 864e5);
  const daysLeft   = Math.max(0, Math.ceil((examDt - now) / 864e5));
  const daysPct    = totalDays > 0 ? Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100)) : 0;

  // XP / Rango
  const xp       = stats.xp_total || 0;
  const rankData = calcRank ? calcRank(xp) : { rank: { rank: 'D', label: 'Principiante', xp: 0 }, next: { rank: 'C', xp: 500 } };
  const { rank, next } = rankData;
  const xpPct = next ? Math.min(100, Math.round(((xp - rank.xp) / (next.xp - rank.xp)) * 100)) : 100;

  // Habilidades (usa scores del examen o defaults)
  const skills = [
    { key: 'reading',   icon: '📖', name: 'Reading',   pct: stats.exam_scores?.reading   || 0, estLvl: 'B2' },
    { key: 'writing',   icon: '✍️',  name: 'Writing',   pct: stats.exam_scores?.writing   || 0, estLvl: 'B1' },
    { key: 'listening', icon: '🎧', name: 'Listening', pct: stats.exam_scores?.listening || 0, estLvl: 'B1' },
    { key: 'speaking',  icon: '🗣️',  name: 'Speaking',  pct: stats.exam_scores?.speaking  || 0, estLvl: 'A2' },
    { key: 'vocab',     icon: '📝', name: 'Vocabulary', pct: stats.vocab_pct || 0,              estLvl: 'A2' },
  ];

  // Logros disponibles
  const totalWords = stats.words_total || 1000;
  const achievements = [
    { icon: '🌱', name: 'Primera palabra', desc: '¡Empezaste tu viaje!', done: (stats.words_mastered || 0) >= 1 },
    { icon: '🔥', name: 'Semana de fuego', desc: '7 días de racha',      done: (stats.streak_max  || 0) >= 7 },
    { icon: '📚', name: '100 palabras',    desc: 'Vocabulario sólido',   done: (stats.words_mastered || 0) >= 100 },
    { icon: '🎯', name: 'Primer examen',   desc: 'Simulacro completado', done: (stats.exams_done  || 0) >= 1 },
    { icon: '⭐', name: 'Racha 30 días',   desc: 'Constancia legendaria', done: (stats.streak_max || 0) >= 30 },
    { icon: '🏆', name: 'Nivel B1',        desc: 'Superaste A2',         done: currentIdx > 0 },
  ];

  // Roadmap progress %
  const roadmapPct = (currentIdx / (levels.length - 1)) * 100;

  // Countdown arc (SVG — dashoffset)
  const circumference = 2 * Math.PI * 30; // r=30
  const arcFilled = circumference * (daysPct / 100);
  const dashOffset = circumference - arcFilled;

  container.innerHTML = `

    <!-- 1. ROADMAP A2→B1→B2→C1 ─────────────────────────── -->
    <div class="glass-card-accent anim-fade-in">
      <div class="card-title" style="text-align:center;margin-bottom:16px">
        🎓 CAMBRIDGE CAE — RUTA DE APRENDIZAJE
      </div>
      <div class="prg-roadmap">
        <div class="prg-roadmap-line">
          <div class="prg-roadmap-fill" style="width:${roadmapPct}%"></div>
        </div>
        ${levels.map((lvl, i) => `
          <div class="prg-node ${i < currentIdx ? 'done' : ''} ${i === currentIdx ? 'current' : ''}">
            <div class="prg-node-circle">${i < currentIdx ? '✓' : lvl}</div>
            <div class="prg-node-label">${i === currentIdx ? 'AHORA' : i < currentIdx ? 'DONE' : lvl}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 2. CARD GRANDE DE NIVEL ACTUAL ──────────────────── -->
    <div class="prg-level-card anim-slide-up">
      <div class="prg-level-tag">NIVEL ACTUAL</div>
      <div class="prg-level-badge-big" style="color:${levelColors[currentLvl]};border-color:${levelColors[currentLvl]}33;background:${levelColors[currentLvl]}18">
        ${currentLvl}
      </div>
      <div class="prg-level-subtitle">Camino al Cambridge C1 Advanced</div>

      <div class="prg-level-xp-row">
        <span class="prg-level-xp-label">${xp.toLocaleString()} XP</span>
        <div class="progress-bar" style="flex:1">
          <div class="progress-fill" style="width:${xpPct}%"></div>
        </div>
        <span class="prg-level-pct">${xpPct}%</span>
      </div>
      <div style="font-family:var(--font-mono);font-size:0.55rem;color:var(--text-muted);text-align:right;margin-top:2px">
        ${next ? `${next.xp.toLocaleString()} XP para rango ${next.rank}` : 'Rango máximo'}
      </div>

      <div style="display:flex;justify-content:center;gap:12px;margin-top:16px">
        <div style="text-align:center">
          <div style="font-family:var(--font-mono);font-size:1.2rem;font-weight:700;color:var(--warning)">🔥 ${stats.streak || 0}</div>
          <div style="font-size:0.55rem;color:var(--text-muted);letter-spacing:1.5px;margin-top:2px">RACHA ACTUAL</div>
        </div>
        <div style="width:1px;background:rgba(156,190,214,0.30)"></div>
        <div style="text-align:center">
          <div style="font-family:var(--font-mono);font-size:1.2rem;font-weight:700;color:var(--success)">${stats.words_mastered || 0}</div>
          <div style="font-size:0.55rem;color:var(--text-muted);letter-spacing:1.5px;margin-top:2px">PALABRAS DOM.</div>
        </div>
        <div style="width:1px;background:rgba(156,190,214,0.30)"></div>
        <div style="text-align:center">
          <div style="font-family:var(--font-mono);font-size:1.2rem;font-weight:700;color:var(--accent)">${stats.sessions_this_week || 0}</div>
          <div style="font-size:0.55rem;color:var(--text-muted);letter-spacing:1.5px;margin-top:2px">SES / SEMANA</div>
        </div>
      </div>
    </div>

    <!-- 3. STATS GRID (4 cards pequeñas) ────────────────── -->
    <div class="prg-stats-grid">
      <div class="prg-stat-card">
        <span class="prg-stat-icon">📚</span>
        <div class="prg-stat-value">${(stats.words_mastered || 0).toLocaleString()}</div>
        <div class="prg-stat-label">Palabras aprendidas</div>
      </div>
      <div class="prg-stat-card">
        <span class="prg-stat-icon">🔥</span>
        <div class="prg-stat-value" style="color:var(--warning)">${stats.streak || 0}</div>
        <div class="prg-stat-label">Días de racha</div>
      </div>
      <div class="prg-stat-card">
        <span class="prg-stat-icon">🎯</span>
        <div class="prg-stat-value" style="color:var(--success)">${stats.sessions_total || 0}</div>
        <div class="prg-stat-label">Sesiones totales</div>
      </div>
      <div class="prg-stat-card">
        <span class="prg-stat-icon">⭐</span>
        <div class="prg-stat-value" style="color:var(--level-c1)">${stats.best_exam_score != null ? stats.best_exam_score + '%' : '—'}</div>
        <div class="prg-stat-label">Mejor nota examen</div>
      </div>
    </div>

    <!-- 4. PROGRESO POR HABILIDAD (5 barras) ────────────── -->
    <div class="prg-skills-card anim-slide-up" style="animation-delay:0.1s">
      <div class="card-title">PROGRESO POR HABILIDAD</div>
      ${skills.map(s => `
        <div class="prg-skill-row">
          <span class="prg-skill-icon">${s.icon}</span>
          <div class="prg-skill-info">
            <div class="prg-skill-header">
              <span class="prg-skill-name">${s.name}</span>
              <span class="prg-skill-lvl skill-lvl-${s.key}">${s.estLvl}</span>
            </div>
            <div class="prg-skill-bar">
              <div class="prg-skill-fill skill-${s.key}" style="width:${s.pct}%"></div>
            </div>
          </div>
          <span style="font-family:var(--font-mono);font-size:0.62rem;color:var(--text-muted);min-width:32px;text-align:right">${s.pct}%</span>
        </div>
      `).join('')}
    </div>

    <!-- 5. COUNTDOWN AL EXAMEN ───────────────────────────── -->
    <div class="prg-countdown-card anim-slide-up" style="animation-delay:0.15s">
      <div class="prg-countdown-svg">
        <svg viewBox="0 0 72 72" width="72" height="72">
          <defs>
            <linearGradient id="cntGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#34aadc"/>
              <stop offset="100%" style="stop-color:#007aff"/>
            </linearGradient>
          </defs>
          <circle class="prg-countdown-track" cx="36" cy="36" r="30"/>
          <circle class="prg-countdown-arc" cx="36" cy="36" r="30"
            id="cnt-arc"
            style="stroke-dashoffset:${dashOffset.toFixed(1)}"/>
        </svg>
        <div class="prg-countdown-center">
          <span class="prg-countdown-days">${daysLeft}</span>
          <span class="prg-countdown-dslabel">DÍAS</span>
        </div>
      </div>
      <div class="prg-countdown-info">
        <div class="prg-countdown-title">Faltan ${daysLeft} días para el CAE</div>
        <div class="prg-countdown-subtitle">
          ${daysPct}% del tiempo de preparación completado
        </div>
        <div class="prg-countdown-date">
          ${examDt.toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' })}
        </div>
      </div>
    </div>

    <!-- 6. LOGROS RECIENTES ──────────────────────────────── -->
    <div class="glass-card anim-slide-up" style="animation-delay:0.2s">
      <div class="card-title">LOGROS</div>
      <div class="prg-achievements-grid">
        ${achievements.map(a => `
          <div class="prg-achievement ${a.done ? '' : 'locked'}">
            ${a.done ? '<div class="prg-achievement-check">✓</div>' : ''}
            <span class="prg-achievement-icon">${a.icon}</span>
            <div class="prg-achievement-text">
              <div class="prg-achievement-name">${a.name}</div>
              <div class="prg-achievement-desc">${a.desc}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Records / Best marks ──────────────────────────────── -->
    <div class="nm-card anim-slide-up" style="animation-delay:0.25s">
      <div class="card-title">RÉCORDS</div>
      <div class="prg-records-strip">
        <div class="prg-record-item">
          <div class="prg-record-value" style="color:var(--warning)">🔥 ${stats.streak_max || 0}</div>
          <div class="prg-record-label">Racha máxima</div>
        </div>
        <div style="width:1px;background:rgba(156,190,214,0.25)"></div>
        <div class="prg-record-item">
          <div class="prg-record-value" style="color:var(--accent)">${xp.toLocaleString()}</div>
          <div class="prg-record-label">XP Total</div>
        </div>
        <div style="width:1px;background:rgba(156,190,214,0.25)"></div>
        <div class="prg-record-item">
          <div class="prg-record-value" style="color:var(--success)">${daysLeft}</div>
          <div class="prg-record-label">Días para CAE</div>
        </div>
      </div>
    </div>

  `;

  // Animar el arco SVG con un pequeño delay para la transición
  requestAnimationFrame(() => {
    const arc = document.getElementById('cnt-arc');
    if (arc) {
      arc.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)';
    }
  });
}

// ── XP / RANGO ────────────────────────────────────────────
// (calcRank() puede estar definido en app.js; si no, la
//  función initProgress lo maneja con un fallback)
