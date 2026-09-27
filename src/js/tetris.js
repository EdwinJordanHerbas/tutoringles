// TutorIngles — tetris.js
// El modo Tetris en pantalla: el día en rondas, el test del despertar, el
// repaso de almohada y el modo noche.
//
// La lógica que decide (qué toca ahora, cómo se reparten las pistas, cuándo el
// experimento dice algo) está en lib/tetris.js, con el porqué de cada cosa y
// sus tests. Aquí sólo se pinta, se cronometra y se habla.
//
// Regla que se mantiene: en HOY sigue habiendo UN solo botón primario. Con el
// modo Tetris ese botón hace lo que toque ahora —test, ronda, almohada o
// noche— y su subtítulo lo dice. No hay que decidir nada.

let _tt = null;            // estado de /tetris/hoy
let _ttLista = [];         // palabras del test o de la almohada
let _ttIdx = 0;
let _ttVista = false;      // la palabra actual ya se ha destapado
let _ttRes = [];           // resultados del test del despertar
let _ttNoche = null;       // { id, pistas } de la noche que se está probando
let _ttModo = null;        // 'despertar' | 'almohada'

const TT_BOTON = {
  despertar: { tit: 'TEST DEL DESPERTAR', sub: (t) => `${t.despertar?.n || 0} palabras de anoche · dos minutos` },
  ronda:     { tit: 'EMPEZAR',            sub: (t) => t.extra ? 'ronda extra · cinco minutos'
                                                              : `ronda ${t.ronda} de ${t.meta_rondas} · cinco minutos` },
  almohada:  { tit: 'REPASO DE ALMOHADA', sub: (t) => `${Math.min(t.palabras_hoy, 40)} palabras de hoy, una última vez` },
  noche:     { tit: 'MODO NOCHE',         sub: () => 'pistas de hoy mientras duermes' },
  hecho:     { tit: 'EMPEZAR',            sub: () => 'ronda extra · la noche ya está hecha' },
};

const ttIdioma = () => (typeof IDIOMA_INFO !== 'undefined' ? IDIOMA_INFO[_idioma]?.nombre : 'inglés');

// La traducción puede traer una nota detrás de " — " (un falso amigo, una
// región). En el test esa nota sobra: a veces hasta da la respuesta.
const ttPregunta = (t) => String(t || '').split(' — ')[0];

// ── EL BOTÓN GRANDE Y LA TARJETA DE HOY ──────────────────

/** Lo llama el botón EMPEZAR de HOY. */
function empezarHoy() {
  if (!_tetrisActivo || !_tt || !_tt.activo) return empezarSesion();
  switch (_tt.fase) {
    case 'despertar': return abrirDespertar();
    case 'almohada':  return abrirAlmohada();
    case 'noche':     return abrirNoche();
    default:          return empezarSesion();
  }
}

function ttBoton(t) {
  const tit = document.getElementById('btn-sesion-tit');
  const sub = document.getElementById('btn-sesion-sub');
  if (!tit || !sub) return;
  const b = t && t.activo ? TT_BOTON[t.fase] : null;
  tit.textContent = b ? b.tit : 'EMPEZAR';
  sub.textContent = b ? b.sub(t) : 'cinco minutos';
}

async function pintarTetrisHoy() {
  const caja = document.getElementById('tetris-hoy');
  if (!caja) return;
  try {
    _tt = await apiGet('/tetris/hoy');
  } catch {
    _tt = null;
  }
  ttBoton(_tt);
  if (!_tt || !_tt.activo) { caja.innerHTML = ''; return; }
  const t = _tt;

  const ahora = (id) => t.fase === id || (id === 'ronda' && t.fase === 'hecho');
  const puntos = Array.from({ length: t.meta_rondas }, (_, i) =>
    `<span class="tt-punto${i < t.rondas ? ' on' : ''}"></span>`).join('');

  // Cada paso: si está hecho, si es el de ahora, y una línea con el dato.
  const despTxt = t.despertar ? `${t.despertar.n} palabras de anoche esperando`
                : t.anoche && t.anoche.probadas ? `${t.anoche.primera} de ${t.anoche.total} a la primera`
                : 'mañana, con las palabras de esta noche';
  const nocheTxt = t.noche
    ? `${t.noche.con_pista} con pista · ${t.noche.control} de control${t.noche.pistas ? ` · ${t.noche.pistas} sonadas` : ''}`
    : `sonarán la mitad de las ${t.palabras_hoy} de hoy`;

  const pasos = [
    { id: 'despertar', ico: 'clock',      tit: 'Test del despertar', txt: despTxt,
      hecho: !t.despertar && !!t.anoche?.probadas },
    { id: 'ronda',     ico: 'rocket',     tit: 'Rondas de cinco minutos',
      txt: `<span class="tt-puntos">${puntos}</span> ${t.rondas} de ${t.meta_rondas}`,
      hecho: t.rondas >= t.meta_rondas },
    { id: 'almohada',  ico: 'books',      tit: 'Repaso de almohada',
      txt: t.almohada_hecha ? 'hecho' : `desde las ${ttHoraMenos(t.hora_almohada, 60)}`, hecho: t.almohada_hecha },
    { id: 'noche',     ico: 'headphones', tit: 'Modo noche', txt: nocheTxt, hecho: !!t.noche },
  ];

  const r = t.resultados || {};
  const barras = r.noches ? `
    <div class="tt-barras">
      ${ttBarra('Sonaron de noche', r.conPista?.pct, r.conPista?.n)}
      ${ttBarra('De control', r.control?.pct, r.control?.n)}
    </div>` : '';

  caja.innerHTML = `
    <div class="glass-card tt-card anim-fade-in">
      <div class="tt-cab">
        <div class="card-title" style="margin:0">MODO TETRIS · ${escaparHtml(ttIdioma().toUpperCase())}</div>
        <span class="tt-palabras">${t.palabras_hoy} ${t.palabras_hoy === 1 ? 'palabra' : 'palabras'} hoy</span>
      </div>
      <div class="tt-pasos">
        ${pasos.map((p) => `
          <button class="tt-paso${p.hecho ? ' hecho' : ''}${ahora(p.id) ? ' ahora' : ''}" onclick="ttIr('${p.id}')">
            <span class="tt-paso-ico">${ico(p.ico, 18)}</span>
            <span class="tt-paso-info">
              <span class="tt-paso-tit">${p.tit}</span>
              <span class="tt-paso-txt">${p.txt}</span>
            </span>
            <span class="tt-paso-marca">${p.hecho ? '✓' : ahora(p.id) ? 'AHORA' : ''}</span>
          </button>`).join('')}
      </div>
      <div class="tt-exp">
        <div class="tt-exp-tit">¿TE FUNCIONA LA NOCHE?</div>
        <div class="tt-exp-txt">${escaparHtml(r.veredicto || '')}</div>
        ${barras}
      </div>
      <details class="tt-porque">
        <summary>Qué hay detrás de esto</summary>
        <p><b>De día</b>, muchas rondas cortas: el "efecto Tetris" sale de la
        exposición intensa y repetida, no de una sesión larga. Lo que fallas
        vuelve en la ronda siguiente, no mañana.</p>
        <p><b>Antes de dormir</b>, un último repaso: lo que se estudia justo antes
        del sueño es lo que el cerebro repasa esa noche.</p>
        <p><b>Dormido</b>, las pistas: oír durante el sueño profundo una palabra
        aprendida ese día refuerza su recuerdo (reactivación dirigida). Palabras
        NUEVAS durmiendo, no: eso no funciona. Y sólo la palabra, sin traducción:
        oír la traducción detrás anula el efecto.</p>
        <p><b>Por la mañana</b>, el test a ciegas compara las que sonaron con las
        de control. Si a ti no te funciona, la app te lo dirá.</p>
      </details>
    </div>`;
}

function ttBarra(nombre, pct, n) {
  const v = pct ?? 0;
  return `
    <div class="tt-barra">
      <span class="tt-barra-et">${nombre}</span>
      <span class="tt-barra-pista"><span class="tt-barra-fill" style="width:${v}%"></span></span>
      <span class="tt-barra-val">${pct === null || pct === undefined ? '—' : `${pct} %`}</span>
      <span class="tt-barra-n">${n || 0}</span>
    </div>`;
}

/** "22:30" menos 60 minutos → "21:30". Sólo para el texto de la tarjeta. */
function ttHoraMenos(hhmm, min) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!m) return hhmm || '';
  const total = (Number(m[1]) * 60 + Number(m[2]) - min + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Un toque en un paso de la tarjeta: se puede ir a cualquiera, toque o no. */
function ttIr(paso) {
  if (paso === 'despertar') {
    if (_tt?.despertar) return abrirDespertar();
    return toast(_tt?.anoche?.probadas ? 'El test de hoy ya está hecho' : 'Aún no hay noche que probar: la primera, esta noche');
  }
  if (paso === 'almohada') return abrirAlmohada();
  if (paso === 'noche') return abrirNoche();
  return empezarSesion();
}

// ── CAJA A PANTALLA COMPLETA (la misma de la sesión) ─────

function ttAbrirCaja() {
  const caja = document.getElementById('sesion-caja');
  if (!caja) return null;
  caja.style.display = 'block';
  caja.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  document.getElementById('sec-hoy')?.classList.add('en-sesion');
  document.getElementById('cnt')?.scrollTo({ top: 0, behavior: 'smooth' });
  return caja;
}

function ttCerrarCaja() {
  if (typeof vozParar === 'function') vozParar();
  const caja = document.getElementById('sesion-caja');
  if (caja) { caja.style.display = 'none'; caja.innerHTML = ''; }
  document.getElementById('sec-hoy')?.classList.remove('en-sesion');
  if (typeof loadHoyData === 'function') loadHoyData();
}

function ttMarco(etiqueta, cuerpo, pct = null) {
  return `
    <div class="ses">
      <div class="ses-cab">
        <span class="ses-cuenta">${etiqueta}</span>
        <button class="ses-cerrar" onclick="ttCerrarCaja()" aria-label="Cerrar">✕</button>
      </div>
      ${pct === null ? '' : `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>`}
      <div class="ses-cuerpo anim-slide-up">${cuerpo}</div>
    </div>`;
}

// Oír la palabra al destaparla. Con la voz del sistema también en inglés,
// aunque haya grabación: es la misma voz que sonará de noche, y la pista
// funciona si se oyó al aprender.
function ttOir(palabra, btn) {
  vozDecir(palabra, { btn, sinGrabado: true });
}

// ── TEST DEL DESPERTAR ───────────────────────────────────

async function abrirDespertar() {
  const caja = ttAbrirCaja();
  if (!caja) return;
  try {
    const r = await apiGet('/tetris/despertar');
    if (!r?.noche || !r.palabras?.length) {
      caja.innerHTML = ttMarco('TEST DEL DESPERTAR', `
        <div class="ses-fin">
          <div class="ses-fin-tit">No hay test pendiente</div>
          <div class="ses-fin-sub">El test sale la mañana después de una noche con el modo noche.</div>
          <button class="btn btn-primary" onclick="ttCerrarCaja()" style="width:100%;margin-top:14px">CERRAR</button>
        </div>`);
      return;
    }
    _ttModo  = 'despertar';
    _ttLista = r.palabras;
    _ttNoche = r.noche;
    _ttIdx = 0; _ttVista = false; _ttRes = [];
    ttPintarPaso();
  } catch (e) {
    caja.innerHTML = cajaError(e);
  }
}

// ── REPASO DE ALMOHADA ───────────────────────────────────

async function abrirAlmohada() {
  const caja = ttAbrirCaja();
  if (!caja) return;
  try {
    const r = await apiGet('/tetris/almohada');
    if (!r?.palabras?.length) {
      caja.innerHTML = ttMarco('REPASO DE ALMOHADA', `
        <div class="ses-fin">
          <div class="ses-fin-tit">Hoy no hay nada que repasar</div>
          <div class="ses-fin-sub">El repaso de almohada es de lo estudiado hoy. Una ronda de cinco minutos y ya hay.</div>
          <button class="btn btn-primary" onclick="ttCerrarCaja();empezarSesion()" style="width:100%;margin-top:14px">UNA RONDA</button>
        </div>`);
      return;
    }
    _ttModo  = 'almohada';
    _ttLista = r.palabras;
    _ttIdx = 0; _ttVista = false;
    ttPintarPaso();
  } catch (e) {
    caja.innerHTML = cajaError(e);
  }
}

// Los dos van en la misma dirección: se ve el español y se DICE la palabra
// extranjera en alto antes de destaparla. Es la dirección difícil a propósito:
// lo que falta es producir, no reconocer.
function ttPintarPaso() {
  const caja = document.getElementById('sesion-caja');
  if (!caja) return;
  const w = _ttLista[_ttIdx];
  if (!w) return _ttModo === 'despertar' ? ttCerrarDespertar() : ttCerrarAlmohada();

  const etiqueta = _ttModo === 'despertar' ? 'TEST DEL DESPERTAR' : 'REPASO DE ALMOHADA';
  const pct = Math.round((_ttIdx / _ttLista.length) * 100);
  const palabra = JSON.stringify(w.word).replace(/"/g, '&quot;');

  const destapada = `
    <div class="ses-tras anim-scale-in">
      <div class="ses-palabra">${escaparHtml(w.word)}</div>
      <button class="btn-icon ses-oir" onclick="ttOir(${palabra}, this)" aria-label="Escuchar">
        <img src="src/img/icons/listen.png" alt="" class="ico">
      </button>
      ${w.example_sentence ? `<div class="ses-ej">"${escaparHtml(w.example_sentence)}"</div>` : ''}
    </div>`;

  const acciones = !_ttVista
    ? `<button class="btn btn-primary ses-accion" onclick="ttDestapar()">VER</button>`
    : _ttModo === 'despertar'
      ? `<div class="ses-grados tt-grados">
           <button class="rev-btn rev-again" onclick="ttCalificar(0)"><span class="rev-label">No me salía</span></button>
           <button class="rev-btn rev-hard"  onclick="ttCalificar(1)"><span class="rev-label">Con dudas</span></button>
           <button class="rev-btn rev-good"  onclick="ttCalificar(2)"><span class="rev-label">A la primera</span></button>
         </div>`
      : `<button class="btn btn-primary ses-accion" onclick="ttSiguiente()">SIGUIENTE</button>`;

  caja.innerHTML = ttMarco(`${etiqueta} · ${_ttIdx + 1} DE ${_ttLista.length}`, `
    <div class="ses-et">¿CÓMO SE DICE EN ${escaparHtml(ttIdioma().toUpperCase())}?</div>
    <div class="tt-pregunta">${escaparHtml(ttPregunta(w.translation))}</div>
    ${_ttVista ? destapada : `<div class="ses-pista">Dilo en alto antes de mirar. Aunque sea medio dormido.</div>`}
    ${acciones}`, pct);

  if (_ttVista) ttOir(w.word);
}

function ttDestapar() { _ttVista = true; ttPintarPaso(); }

function ttSiguiente() {
  _ttIdx++;
  _ttVista = false;
  ttPintarPaso();
}

function ttCalificar(recordada) {
  const w = _ttLista[_ttIdx];
  if (w) _ttRes.push({ id: w.id, recordada });
  ttSiguiente();
}

async function ttCerrarDespertar() {
  const caja = document.getElementById('sesion-caja');
  caja.innerHTML = ttMarco('TEST DEL DESPERTAR', '<div class="empty-state"><div class="spinner"></div></div>');
  try {
    const r = await apiPost('/tetris/despertar', { noche_id: _ttNoche.id, resultados: _ttRes });
    const e = r.esta_noche;
    const pocas = (r.pistas || 0) < 20;
    caja.innerHTML = ttMarco('TEST DEL DESPERTAR', `
      <div class="ses-fin">
        <div class="ses-fin-ico"><img src="src/img/icons/done.png" alt="" class="ico"></div>
        <div class="ses-fin-tit">Hecho</div>
        <div class="ses-fin-sub">Ahora sí: esto es lo que sonó anoche y lo que no.</div>
        <div class="tt-barras" style="margin-top:14px">
          ${ttBarra('Sonaron de noche', e.conPista.pct, e.conPista.n)}
          ${ttBarra('De control', e.control.pct, e.control.n)}
        </div>
        ${pocas ? `<div class="ses-nota">Anoche sonaron sólo ${r.pistas || 0} pistas (¿se bloqueó la pantalla?). El test cuenta como repaso, pero esta noche no entra en la comparación.</div>` : ''}
        <div class="ses-fin-pie">${escaparHtml(r.acumulado?.veredicto || '')}</div>
        <button class="btn btn-primary" onclick="ttCerrarCaja()" style="width:100%;margin-top:14px">CERRAR</button>
      </div>`);
    const xp = _ttRes.length * 2;
    if (xp && typeof showXpPop === 'function') { showXpPop(xp); updateXpBar(_xpTotal + xp); }
  } catch (e) {
    caja.innerHTML = cajaError(e, 'ttCerrarDespertar');
  }
}

async function ttCerrarAlmohada() {
  const caja = document.getElementById('sesion-caja');
  try { await apiPost('/tetris/almohada', {}); } catch { /* el repaso ya se ha hecho igual */ }
  caja.innerHTML = ttMarco('REPASO DE ALMOHADA', `
    <div class="ses-fin">
      <div class="ses-fin-ico"><img src="src/img/icons/done.png" alt="" class="ico"></div>
      <div class="ses-fin-tit">Ahora, a dormir con ellas</div>
      <div class="ses-fin-sub">
        Con los ojos cerrados, repasa tres de memoria. Y deja el modo noche
        puesto: la mitad sonará bajito mientras duermes.
      </div>
      <button class="btn btn-primary" onclick="ttCerrarCaja();abrirNoche()" style="width:100%;margin-top:14px">MODO NOCHE</button>
      <button class="btn btn-ghost btn-sm" onclick="ttCerrarCaja()" style="width:100%;margin-top:8px">Hoy no</button>
    </div>`);
}

// ── MODO NOCHE ───────────────────────────────────────────
//
// Pantalla negra, pantalla ENCENDIDA y pistas de audio. Tiene que ser así en
// una web: con la pantalla bloqueada, iOS congela la página y la voz del
// sistema no suena. La API Wake Lock mantiene la pantalla encendida, y en negro
// un móvil OLED apenas da luz. Se pide cargarlo, que para eso es de noche.
//
// Tres cosas que no son obvias:
//  - La primera locución tiene que salir de un toque (iOS no deja hablar a una
//    página que nadie ha tocado). Por eso EMPEZAR LA NOCHE dice algo mudo.
//  - Las pistas cuentan sólo si la página estaba visible al sonar. Si se apagó
//    la pantalla, no sonó nada, y contarlas falsearía el experimento.
//  - Se informa al servidor por tandas, para que un móvil que se queda sin
//    batería a las tres no se lleve la noche entera.

let _nc = null;

const NC_PAUSA_CICLO = 45_000;     // silencio tras cada vuelta completa a la lista
const NC_RAMPA_MS    = 5 * 60_000; // los primeros minutos, más bajo todavía

async function abrirNoche() {
  let r;
  try {
    r = await apiPost('/tetris/noche', {});
  } catch (e) {
    return toast(e.message || 'No se pudo preparar la noche', 'error');
  }
  if (!r?.pistas?.length) {
    return toast('Esta noche no hay palabras con pista: todas han caído en el grupo de control', 'error');
  }
  _nc = {
    id: r.noche.id,
    pistas: r.pistas,
    control: r.n_control,
    aj: r.ajustes,
    idx: 0,
    sonadas: 0,
    sinInformar: 0,
    estado: 'preparando',
    t: null,
    luz: null,
    avisoParar: null,
  };
  ncMontar();
  ncPintarPreparacion();
}

function ncMontar() {
  let el = document.getElementById('noche');
  if (!el) {
    el = document.createElement('div');
    el.id = 'noche';
    el.className = 'noche';
    document.body.appendChild(el);
  }
  el.onclick = null;
  document.body.classList.add('con-noche');
}

function ncPintarPreparacion() {
  const el = document.getElementById('noche');
  const a  = _nc.aj;
  const sinLuz = !('wakeLock' in navigator);
  el.innerHTML = `
    <div class="noche-prep">
      <div class="noche-tit">MODO NOCHE</div>
      <p>Sonarán <b>${_nc.pistas.length}</b> palabras de hoy, sólo en ${escaparHtml(ttIdioma())} y sin
      traducción. Otras <b>${_nc.control}</b> se quedan en silencio: son el grupo de
      control del test de mañana.</p>
      <p>Primera pista a los <b>${a.espera_min} min</b>, durante <b>${a.duracion_min} min</b>,
      una cada ~${a.intervalo_s} s.</p>
      <ul class="noche-lista">
        <li>El móvil, <b>cargando</b>.</li>
        <li>Volumen del móvil <b>bajo</b>: que se oiga apenas. Si te despierta, sobra.</li>
        <li><b>No bloquees la pantalla.</b> Se queda en negro y encendida; bloqueada, no suena nada.</li>
      </ul>
      ${sinLuz ? `<p class="noche-aviso">Este navegador no puede mantener la pantalla encendida.
        Esta noche pon el bloqueo automático en «Nunca» o las pistas se cortarán al apagarse.</p>` : ''}
      <button class="noche-btn" onclick="ncProbar(this)">PROBAR EL VOLUMEN</button>
      <button class="noche-btn noche-btn-fuerte" onclick="ncEmpezar()">EMPEZAR LA NOCHE</button>
      <button class="noche-btn noche-btn-flojo" onclick="ncCerrar()">Cancelar</button>
    </div>`;
}

function ncProbar(btn) {
  const p = _nc?.pistas?.[0];
  if (p) vozDecir(p.word, { btn, volumen: _nc.aj.volumen, rate: 0.85, sinGrabado: true });
}

async function ncEmpezar() {
  // La locución muda que "desbloquea" la voz: tiene que ir dentro del toque.
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch {}

  await ncPedirLuz();
  document.addEventListener('visibilitychange', ncVisibilidad);

  const ahora = Date.now();
  _nc.inicio = ahora + _nc.aj.espera_min * 60_000;
  _nc.fin    = _nc.inicio + _nc.aj.duracion_min * 60_000;
  _nc.estado = 'esperando';

  // Un toque en la pantalla negra enseña PARAR unos segundos; si no, nada. Un
  // botón siempre visible sería luz, y un toque sin querer no debe cortarla.
  document.getElementById('noche').onclick = ncMostrarParar;
  ncPintarOscuro();
  ncTic();
}

async function ncPedirLuz() {
  if (!('wakeLock' in navigator) || !_nc) return false;
  try {
    _nc.luz = await navigator.wakeLock.request('screen');
    _nc.luz.addEventListener?.('release', () => { if (_nc) _nc.luz = null; });
    return true;
  } catch {
    return false;
  }
}

// El sistema suelta el wake lock al ocultarse la página. Al volver, se pide
// otra vez y se retoma donde toque según el reloj, no donde se quedó.
function ncVisibilidad() {
  if (!_nc || _nc.estado === 'fin' || _nc.estado === 'preparando') return;
  if (document.visibilityState === 'visible') {
    ncPedirLuz();
    ncTic();
  }
}

function ncProgramar(ms) {
  clearTimeout(_nc.t);
  _nc.t = setTimeout(ncTic, Math.max(250, ms));
}

function ncVolumen(ahora) {
  const t = ahora - _nc.inicio;
  const factor = t < NC_RAMPA_MS ? 0.6 + 0.4 * (t / NC_RAMPA_MS) : 1;
  return Math.max(0.03, _nc.aj.volumen * factor);
}

function ncTic() {
  if (!_nc || _nc.estado === 'fin' || _nc.estado === 'preparando') return;
  const ahora = Date.now();

  if (ahora < _nc.inicio) {
    _nc.estado = 'esperando';
    ncPintarOscuro();
    return ncProgramar(Math.min(30_000, _nc.inicio - ahora));
  }
  if (ahora >= _nc.fin) return ncTerminar();

  // Vuelta completa a la lista: silencio y se baraja otra vez, para que no
  // suenen siempre en el mismo orden (el orden también se aprende).
  if (_nc.idx >= _nc.pistas.length) {
    _nc.idx = 0;
    _nc.pistas.sort(() => Math.random() - 0.5);
    _nc.estado = 'pausa';
    ncPintarOscuro();
    return ncProgramar(NC_PAUSA_CICLO);
  }

  _nc.estado = 'sonando';
  const p = _nc.pistas[_nc.idx++];
  if (document.visibilityState === 'visible') {
    vozDecir(p.word, { volumen: ncVolumen(ahora), rate: 0.85, sinGrabado: true });
    _nc.sonadas++;
    _nc.sinInformar++;
    if (_nc.sinInformar >= 20) ncInformar(false);
  }
  ncPintarOscuro();
  // Un poco de variación en el intervalo: un ritmo exacto se vuelve un
  // metrónomo, y a un metrónomo se acostumbra uno o se despierta con él.
  const jitter = (Math.random() - 0.5) * 3000;
  ncProgramar(_nc.aj.intervalo_s * 1000 + jitter);
}

function ncPintarOscuro() {
  const el = document.getElementById('noche');
  if (!el || !_nc) return;
  const ahora = Date.now();
  const min = (ms) => Math.max(1, Math.round(ms / 60_000));
  const txt =
    _nc.estado === 'esperando' ? `primera pista en ${min(_nc.inicio - ahora)} min` :
    _nc.estado === 'pausa'     ? `pausa · ${_nc.sonadas} sonadas` :
    _nc.estado === 'sonando'   ? `${_nc.sonadas} sonadas · quedan ${min(_nc.fin - ahora)} min` :
    _nc.estado === 'fin'       ? 'noche terminada · mañana, el test del despertar' : '';

  // Se monta una vez y luego sólo se cambia el texto: repintarlo todo en cada
  // pista escondería el botón de PARAR justo cuando se acaba de pedir.
  let estado = el.querySelector('.noche-estado');
  if (!estado) {
    el.innerHTML = `
      <div class="noche-oscuro">
        <div class="noche-estado"></div>
        <div class="noche-parar" id="noche-parar" style="display:none">
          <button class="noche-btn" onclick="event.stopPropagation();ncParar()">PARAR LA NOCHE</button>
        </div>
      </div>`;
    estado = el.querySelector('.noche-estado');
  }
  estado.textContent = txt;
  // Terminada, el botón se queda: ya no hay nada que cortar sin querer.
  if (_nc.estado === 'fin') {
    const b = document.getElementById('noche-parar');
    if (b) {
      b.style.display = 'block';
      b.innerHTML = '<button class="noche-btn" onclick="event.stopPropagation();ncCerrar()">CERRAR</button>';
    }
  }
}

function ncMostrarParar() {
  const b = document.getElementById('noche-parar');
  if (!b || !_nc || _nc.estado === 'fin') return;
  b.style.display = 'block';
  clearTimeout(_nc.avisoParar);
  _nc.avisoParar = setTimeout(() => { b.style.display = 'none'; }, 5000);
}

/**
 * Manda al servidor cuántas pistas han sonado desde el último envío.
 * `keepalive` deja que la petición salga aunque la página se esté cerrando, y
 * a diferencia de sendBeacon admite la cabecera de la clave: sin ella habría
 * que meter la clave en la URL, y las URLs acaban en los logs.
 */
function ncInformar(terminada) {
  if (!_nc) return Promise.resolve();
  const nuevas = _nc.sinInformar;
  if (!nuevas && !terminada) return Promise.resolve();
  _nc.sinInformar = 0;
  const headers = { 'Content-Type': 'application/json' };
  if (_token) headers.Authorization = `Bearer ${_token}`;
  return fetch(`/tetris/noche/${_nc.id}/progreso`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ nuevas, terminada: !!terminada }),
    keepalive: true,
  }).then((r) => { if (!r.ok) throw new Error(String(r.status)); })
    .catch(() => { if (_nc) _nc.sinInformar += nuevas; });
}

function ncSoltarLuz() {
  try { _nc?.luz?.release(); } catch {}
  if (_nc) _nc.luz = null;
}

async function ncTerminar() {
  if (!_nc) return;
  _nc.estado = 'fin';
  clearTimeout(_nc.t);
  await ncInformar(true);
  // Sin el wake lock la pantalla se apaga sola, como cualquier noche.
  ncSoltarLuz();
  document.removeEventListener('visibilitychange', ncVisibilidad);
  ncPintarOscuro();
}

async function ncParar() {
  if (!_nc) return;
  const empezada = _nc.estado !== 'preparando';
  clearTimeout(_nc.t);
  if (typeof vozParar === 'function') vozParar();
  if (empezada && _nc.estado !== 'fin') await ncInformar(true);
  ncCerrar();
}

function ncCerrar() {
  if (_nc) {
    clearTimeout(_nc.t);
    clearTimeout(_nc.avisoParar);
    ncSoltarLuz();
  }
  document.removeEventListener('visibilitychange', ncVisibilidad);
  _nc = null;
  document.getElementById('noche')?.remove();
  document.body.classList.remove('con-noche');
  pintarTetrisHoy();
}

// Si la página se cierra con la noche en marcha, lo sonado no se pierde.
window.addEventListener('pagehide', () => {
  if (_nc && _nc.sinInformar) ncInformar(false);
});

// ── ENTRADA DESDE LOS AVISOS ─────────────────────────────
// /?tetris=despertar y /?tetris=almohada abren directamente lo suyo: quien
// toca el aviso de las 8:00 viene a hacer el test, no a buscar un botón.
//
// El parámetro se quita de la URL DESPUÉS de abrir, no antes. Tras un
// despliegue, el service worker nuevo recarga la página en la primera visita
// (ver registerSW en app.js); si el parámetro ya se había borrado, esa recarga
// se lo llevaba y el toque en el aviso acababa en HOY sin abrir nada.
function autoAbrirTetris() {
  const params = new URLSearchParams(location.search);
  const que = params.get('tetris');
  if (!que) return;
  setTimeout(() => {
    history.replaceState(null, '', location.pathname);
    goTo('hoy');
    if (que === 'despertar') abrirDespertar();
    else if (que === 'almohada') abrirAlmohada();
    else if (que === 'noche') abrirNoche();
  }, 600);
}

// ── AJUSTES ──────────────────────────────────────────────
// Se pintan dentro de AJUSTES (settings.js los llama). Los límites de la noche
// los vuelve a aplicar el servidor: aquí sólo se ofrecen valores con sentido.
function renderTetrisAjustes(t) {
  if (!t) return '';
  const a = t.ajustes_noche || {};
  const opciones = (valores, actual, fmt = (v) => v) => valores
    .map((v) => `<option value="${v}" ${Number(actual) === v ? 'selected' : ''}>${fmt(v)}</option>`).join('');
  return `
    <div class="glass-card" style="margin-top:8px">
      <div class="card-title">MODO TETRIS</div>
      <div class="av-fila">
        <div>
          <div class="av-et">ESTADO</div>
          <div class="av-val ${t.activo ? 'on' : ''}">${t.activo ? 'Activado' : 'Desactivado'}</div>
        </div>
        <button class="btn btn-subtle btn-sm" onclick="ttActivar(${t.activo ? 'false' : 'true'})">${t.activo ? 'DESACTIVAR' : 'ACTIVAR'}</button>
      </div>
      <div class="field">
        <label>Rondas de cinco minutos al día</label>
        <select class="field-input" id="tt-rondas">${opciones([3, 4, 5, 6, 8, 10, 12], t.meta_rondas)}</select>
      </div>
      <div class="field">
        <label>Aviso del test del despertar</label>
        <input class="field-input av-hora" type="time" id="tt-manana" value="${escaparAttr(t.hora_manana)}">
      </div>
      <div class="field">
        <label>Hora del repaso de almohada</label>
        <input class="field-input av-hora" type="time" id="tt-almohada" value="${escaparAttr(t.hora_almohada)}">
        <div class="field-pista">A esa hora llega el aviso. El repaso se ofrece desde una hora antes.</div>
      </div>
      <div class="field">
        <label>Noche: espera hasta la primera pista</label>
        <select class="field-input" id="tt-espera">${opciones([15, 20, 30, 45, 60], a.espera_min, (v) => `${v} min`)}</select>
        <div class="field-pista">Lo que tardas en dormirte. Una pista antes de estar dormido molesta y no sirve.</div>
      </div>
      <div class="field">
        <label>Noche: duración de las pistas</label>
        <select class="field-input" id="tt-duracion">${opciones([30, 60, 90, 120, 150], a.duracion_min, (v) => `${v} min`)}</select>
        <div class="field-pista">El sueño profundo se concentra en la primera parte de la noche. Más tarde, el sueño es más ligero y es más fácil despertarse.</div>
      </div>
      <div class="field">
        <label>Noche: una pista cada</label>
        <select class="field-input" id="tt-intervalo">${opciones([4, 6, 8, 10, 15], a.intervalo_s, (v) => `${v} s`)}</select>
      </div>
      <div class="field">
        <label>Noche: volumen de la voz</label>
        <select class="field-input" id="tt-volumen">${opciones([0.15, 0.25, 0.35, 0.5, 0.7], a.volumen, (v) => `${Math.round(v * 100)} %`)}</select>
        <div class="field-pista">Además, baja el volumen del móvil. Si te despierta, sobra: dormir mal estropea lo aprendido en el día.</div>
      </div>
      <button class="btn btn-subtle" onclick="ttGuardarAjustes()">GUARDAR EL MODO TETRIS</button>
    </div>`;
}

async function ttGuardarAjustes() {
  const v = (id) => document.getElementById(id)?.value;
  const hora = (x) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(x || '');
  if (!hora(v('tt-manana')) || !hora(v('tt-almohada'))) return toast('Revisa las horas', 'error');
  try {
    await Promise.all([
      apiPut('/config/tetris_rondas',        { value: v('tt-rondas') }),
      apiPut('/config/tetris_hora_manana',   { value: v('tt-manana') }),
      apiPut('/config/tetris_hora_almohada', { value: v('tt-almohada') }),
      apiPut('/config/noche_espera_min',     { value: v('tt-espera') }),
      apiPut('/config/noche_duracion_min',   { value: v('tt-duracion') }),
      apiPut('/config/noche_intervalo_s',    { value: v('tt-intervalo') }),
      apiPut('/config/noche_volumen',        { value: v('tt-volumen') }),
    ]);
    toast('Modo Tetris guardado', 'success');
  } catch (e) {
    toastError(e);
  }
}

async function ttActivar(activo) {
  try {
    await apiPut('/config/tetris_activo', { value: activo ? '1' : '0' });
    _tetrisActivo = activo;
    toast(activo ? 'Modo Tetris activado' : 'Modo Tetris desactivado', 'success');
    if (typeof initSettings === 'function') initSettings();
  } catch (e) {
    toastError(e);
  }
}
