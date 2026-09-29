// TutorIngles — sons.js
// SONIDOS con el francés activo: los contrastes que un hispanohablante no oye.
//
// Todo pron.js (figurada, pares mínimos, trampas) es del inglés. El francés
// tiene sus propios problemas, y son pocos y muy concretos: vocales que el
// español no tiene (u, eu), las nasales, la s sonora y la b/v. Cada uno cambia
// palabras enteras, y dos cambian la gramática: "ils sont / ils ont" (son /
// tienen) y "le / les" (el / los).
//
// Es material didáctico y no datos de usuario, así que va aquí y no en una
// migración, igual que lib/guia-sonidos.js. El progreso se guarda en el
// navegador: es una ayuda para ver la mejor ronda, no una meta de la app, y no
// marca nada en HOY.
//
// Suena con la voz FRANCESA del móvil (voz.js la elige). Con la española, la b
// y la v son el mismo sonido y la ronda no tendría respuesta posible: es lo que
// pasó con el inglés en agosto. Por eso se avisa si no hay voz francesa.

const SONS_FR = [
  {
    slug: 'u-ou', titulo: 'u / ou', a: 'u', b: 'ou',
    porque: 'El español no tiene la u francesa. Si la dices como nuestra u, «tu» (tú) suena a «tout» (todo) y «dessus» (encima) a «dessous» (debajo).',
    como: 'Pon los labios como para decir «u» y, sin moverlos, di «i». Eso es la u francesa. La «ou» es nuestra u de siempre.',
    pares: [['tu', 'tú', 'tout', 'todo'], ['vu', 'visto', 'vous', 'usted'], ['rue', 'calle', 'roue', 'rueda'],
            ['dessus', 'encima', 'dessous', 'debajo'], ['lu', 'leído', 'loup', 'lobo'], ['su', 'sabido', 'sous', 'bajo']],
  },
  {
    slug: 's-z', titulo: 's / z', a: 's', b: 'z',
    porque: 'En español la s nunca vibra. En francés una s entre vocales suena z, y cambia la palabra: poisson es pescado y poison, veneno. Y «ils sont» (son) frente a «ils ont» (tienen) es sólo eso.',
    como: 'Di «sss» y, sin mover la lengua, haz vibrar la garganta como una abeja: «zzz». Con la mano en el cuello, la z tiene que vibrar.',
    pares: [['poisson', 'pescado', 'poison', 'veneno'], ['dessert', 'postre', 'désert', 'desierto'],
            ['coussin', 'cojín', 'cousin', 'primo'], ['basse', 'baja', 'base', 'base'],
            ['ils sont', 'ellos son', 'ils ont', 'ellos tienen'], ['russe', 'ruso', 'ruse', 'astucia']],
  },
  {
    slug: 'b-v', titulo: 'b / v', a: 'b', b: 'v',
    porque: 'En español b y v suenan igual. En francés son dos sonidos distintos: «bol» es un cuenco y «vol», un vuelo.',
    como: 'La v se hace apoyando los dientes de arriba en el labio de abajo y soplando con voz, como una f que vibra. La b, con los dos labios cerrados.',
    pares: [['bol', 'cuenco', 'vol', 'vuelo'], ['boire', 'beber', 'voir', 'ver'], ['bain', 'baño', 'vin', 'vino'],
            ['bu', 'bebido', 'vu', 'visto'], ['banc', 'banco', 'vent', 'viento'], ['base', 'base', 'vase', 'jarrón']],
  },
  {
    slug: 'e-e', titulo: 'le / les', a: 'e', b: 'é',
    porque: 'Es la diferencia entre singular y plural: «le livre» / «les livres», «de» / «des». Si las dices igual, quien escucha no sabe si hablas de uno o de varios.',
    como: 'La de «le, de, ce» es una vocal relajada, con los labios un poco redondos. La de «les, des, ces» es una e muy cerrada, sonriendo.',
    pares: [['le', 'el', 'les', 'los'], ['de', 'de', 'des', 'unos'], ['ce', 'este', 'ces', 'estos'],
            ['me', 'me', 'mes', 'mis'], ['te', 'te', 'tes', 'tus']],
  },
  {
    slug: 'an-on', titulo: 'an / on', a: 'an', b: 'on',
    porque: 'Las vocales nasales no existen en español, y se tiende a decir «an» con una n al final. «lent» (lento) y «long» (largo) sólo se distinguen por la vocal.',
    como: 'Ninguna lleva n: la vocal sale a la vez por la nariz. «an» con la boca abierta, como una a; «on» con los labios redondos, casi una o cerrada.',
    pares: [['lent', 'lento', 'long', 'largo'], ['blanc', 'blanco', 'blond', 'rubio'], ['sans', 'sin', 'son', 'sonido'],
            ['vent', 'viento', 'vont', 'van'], ['temps', 'tiempo', 'thon', 'atún'], ['banc', 'banco', 'bon', 'bueno']],
  },
  {
    slug: 'in-an', titulo: 'in / an', a: 'in', b: 'an',
    porque: 'Otra pareja de nasales: «vin» (vino) y «vent» (viento), «pain» (pan) y «paon» (pavo real). Para un hispanohablante suelen sonar igual.',
    como: '«in» con la boca más cerrada y estirada, casi una e por la nariz. «an», con la boca abierta.',
    pares: [['vin', 'vino', 'vent', 'viento'], ['pain', 'pan', 'paon', 'pavo real'], ['lin', 'lino', 'lent', 'lento'],
            ['main', 'mano', 'ment', 'miente'], ['bain', 'baño', 'banc', 'banco'], ['fin', 'fin', 'faon', 'cervatillo']],
  },
  {
    slug: 'ch-j', titulo: 'ch / j', a: 'ch', b: 'j',
    porque: 'La j francesa no es nuestra j ni una ch: es un sonido que el español no tiene. «chou» (col) y «joue» (mejilla) sólo se distinguen en eso.',
    como: 'La «ch» es el «sh» de mandar callar. La «j» es lo mismo pero vibrando, como la «y» de un argentino.',
    pares: [['chou', 'col', 'joue', 'mejilla'], ['cache', 'esconde', 'cage', 'jaula'], ['bouche', 'boca', 'bouge', 'se mueve'],
            ['chant', 'canto', 'gens', 'gente'], ['hache', 'hacha', 'âge', 'edad']],
  },
  {
    slug: 'eu-ou', titulo: 'eu / ou', a: 'eu', b: 'ou',
    porque: '«deux» (dos) y «doux» (suave), «peu» (poco) y «pou» (piojo). La «eu» no existe en español y acaba saliendo «ou» o «e».',
    como: 'Di «e» y, sin mover la lengua, redondea los labios como para silbar: eso es «eu».',
    pares: [['deux', 'dos', 'doux', 'suave'], ['feu', 'fuego', 'fou', 'loco'], ['peu', 'poco', 'pou', 'piojo'],
            ['jeu', 'juego', 'joue', 'mejilla'], ['ceux', 'aquellos', 'sous', 'bajo']],
  },
  {
    slug: 'u-i', titulo: 'u / i', a: 'u', b: 'i',
    porque: 'Cuando la u francesa no sale, a veces sale una i: «lu» (leído) y «lit» (cama), «pure» (pura) y «pire» (peor).',
    como: 'La misma lengua que para la i, pero con los labios redondos, como para dar un beso.',
    pares: [['lu', 'leído', 'lit', 'cama'], ['vu', 'visto', 'vie', 'vida'], ['rue', 'calle', 'riz', 'arroz'],
            ['pure', 'pura', 'pire', 'peor'], ['dur', 'duro', 'dire', 'decir']],
  },
];

const SONS_RONDA = 8;
const SONS_CLAVE = 'sons_fr';

let _sonsActual = null;
let _sonsRonda = [];
let _sonsIdx = 0;
let _sonsAciertos = 0;
let _sonsRespondida = false;

const sonsProgreso = () => { try { return JSON.parse(localStorage.getItem(SONS_CLAVE) || '{}'); } catch { return {}; } };
function sonsGuardar(slug, pct) {
  try {
    const p = sonsProgreso();
    p[slug] = { mejor: Math.max(p[slug]?.mejor ?? 0, pct), rondas: (p[slug]?.rondas || 0) + 1 };
    localStorage.setItem(SONS_CLAVE, JSON.stringify(p));
  } catch {}
}

const sonsCaja = () => document.getElementById('pron-content');
const sonsJs = (x) => JSON.stringify(x).replace(/"/g, '&quot;');
const sonsDecir = (palabra, btn) => vozDecir(palabra, { btn, lang: 'fr-FR' });

function initSons() {
  const c = sonsCaja();
  if (!c) return;
  const prog = sonsProgreso();
  const sinVoz = typeof hayVozDe === 'function' && !hayVozDe('fr-FR');
  c.innerHTML = `
    <div class="glass-card-accent anim-slide-up">
      <div class="card-title">LOS SONIDOS DEL FRANCÉS</div>
      <p style="font-size:0.78rem;color:var(--text-2);line-height:1.55">
        Nueve parejas que un hispanohablante no distingue de oído, y que cambian
        palabras enteras. Dos cambian hasta la gramática: <b>ils sont / ils ont</b>
        (son / tienen) y <b>le / les</b> (el / los). Primero el oído: lo que no se
        oye no se puede decir.
      </p>
      ${sinVoz ? `<div class="pron-honestidad" style="margin-top:10px">
        Tu móvil no tiene voz francesa instalada. Con la española la b y la v
        suenan igual y esta ronda no tendría respuesta: instálala en Ajustes ›
        Accesibilidad › Contenido hablado › Voces.</div>` : ''}
    </div>
    <div id="sons-lista">
      ${SONS_FR.map((s) => {
        const p = prog[s.slug];
        return `
        <div class="topic-item" onclick="abrirSon('${s.slug}')">
          <div class="topic-item-info">
            <div class="topic-item-title">${escaparHtml(s.titulo)}</div>
            <div class="topic-item-meta">${escaparHtml(s.pares[0][0])} / ${escaparHtml(s.pares[0][2])} · ${s.pares.length} pares${p ? ` · mejor ronda ${p.mejor} %` : ''}</div>
          </div>
          <div class="topic-check">${p && p.mejor >= 85 ? '✓' : ''}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="glass-card" style="margin-top:8px">
      <div class="card-title">Y LA R</div>
      <div style="font-size:0.78rem;color:var(--text-2);line-height:1.6">
        La r francesa se hace al fondo de la garganta, donde nuestra j, pero
        suave y con voz: casi una gárgara. No forma parejas que se confundan,
        así que no hay ronda de oído: se entrena diciéndola. Una r española
        vibrante se entiende perfectamente, sólo suena a acento.
      </div>
    </div>`;
}

function abrirSon(slug) {
  const s = SONS_FR.find((x) => x.slug === slug);
  const c = sonsCaja();
  if (!s || !c) return;
  _sonsActual = s;
  c.innerHTML = `
    <button class="btn btn-ghost btn-sm" onclick="initSons()" style="margin-bottom:10px">← Sonidos</button>
    <div class="glass-card-accent anim-slide-up">
      <div class="card-title">${escaparHtml(s.titulo)}</div>
      <p style="font-size:0.8rem;color:var(--text-2);line-height:1.55;margin-bottom:8px">${escaparHtml(s.porque)}</p>
      <p style="font-size:0.78rem;color:var(--text-2);line-height:1.55"><b>Cómo se hace:</b> ${escaparHtml(s.como)}</p>
    </div>
    <div class="glass-card">
      <div class="card-title">LOS PARES</div>
      ${s.pares.map(([a, ea, b, eb]) => `
        <div class="sons-par">
          <button class="sons-pal" onclick="sonsDecir(${sonsJs(a)}, this)">
            <span class="sons-pal-fr">${escaparHtml(a)}</span><span class="sons-pal-es">${escaparHtml(ea)}</span>
          </button>
          <span class="pron-vs">/</span>
          <button class="sons-pal" onclick="sonsDecir(${sonsJs(b)}, this)">
            <span class="sons-pal-fr">${escaparHtml(b)}</span><span class="sons-pal-es">${escaparHtml(eb)}</span>
          </button>
        </div>`).join('')}
      <p class="field-pista" style="margin-top:8px">Toca cada palabra para oírla. Después, la ronda: oyes una y eliges cuál era.</p>
    </div>
    <button class="btn btn-primary" onclick="sonsEmpezarRonda()" style="margin-top:4px">RONDA DE OÍDO</button>
    <div id="sons-quiz" style="margin-top:12px"></div>`;
}

function sonsEmpezarRonda() {
  const s = _sonsActual;
  if (!s) return;
  _sonsRonda = Array.from({ length: SONS_RONDA }, () => {
    const par = s.pares[Math.floor(Math.random() * s.pares.length)];
    return { par, correcta: Math.random() < 0.5 ? 'a' : 'b' };
  });
  _sonsIdx = 0;
  _sonsAciertos = 0;
  sonsPregunta();
}

function sonsPregunta() {
  const caja = document.getElementById('sons-quiz');
  if (!caja) return;
  const q = _sonsRonda[_sonsIdx];
  if (!q) return sonsFin();
  _sonsRespondida = false;
  const [a, , b] = q.par;
  const objetivo = q.correcta === 'a' ? a : b;
  const pct = Math.round((_sonsIdx / _sonsRonda.length) * 100);
  caja.innerHTML = `
    <div class="glass-card anim-slide-up">
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="progress-label">${_sonsIdx + 1} de ${_sonsRonda.length} · ${_sonsAciertos} aciertos</div>
      <div class="pron-q-tit">¿Cuál has oído?</div>
      <button class="btn btn-subtle" onclick="sonsDecir(${sonsJs(objetivo)}, this)" style="margin:6px 0 12px">
        <img src="src/img/icons/listen.png" alt="" class="ico"> OÍR OTRA VEZ
      </button>
      <div class="sons-opciones">
        <button class="sons-op" id="sons-op-a" onclick="sonsResponder('a')">${escaparHtml(a)}</button>
        <button class="sons-op" id="sons-op-b" onclick="sonsResponder('b')">${escaparHtml(b)}</button>
      </div>
      <div id="sons-fb"></div>
    </div>`;
  setTimeout(() => sonsDecir(objetivo), 250);
}

function sonsResponder(eleccion) {
  if (_sonsRespondida) return;
  _sonsRespondida = true;
  const q = _sonsRonda[_sonsIdx];
  const bien = eleccion === q.correcta;
  if (bien) _sonsAciertos++;
  document.getElementById(`sons-op-${q.correcta}`)?.classList.add('bien');
  if (!bien) document.getElementById(`sons-op-${eleccion}`)?.classList.add('mal');
  const [a, ea, b, eb] = q.par;
  document.getElementById('sons-fb').innerHTML = `
    <div class="sons-fb ${bien ? 'bien' : 'mal'}">
      ${bien ? 'Bien.' : 'No.'} Era <b>${escaparHtml(q.correcta === 'a' ? a : b)}</b>
      (${escaparHtml(q.correcta === 'a' ? ea : eb)}).
    </div>
    <button class="btn btn-subtle" onclick="sonsOirLasDos(this)" style="margin-top:8px">
      <img src="src/img/icons/listen.png" alt="" class="ico"> LAS DOS SEGUIDAS
    </button>
    <button class="btn btn-primary" onclick="_sonsIdx++;sonsPregunta()" style="margin-top:8px">SIGUIENTE</button>`;
}

// Las dos palabras del par, con pausa, en llamadas separadas: de una pieza el
// sintetizador les pone entonación de lista y la segunda no suena como la primera.
function sonsOirLasDos(btn) {
  const q = _sonsRonda[_sonsIdx];
  if (!q) return;
  const [a, , b] = q.par;
  sonsDecir(a, btn);
  setTimeout(() => sonsDecir(b), 900);
}

function sonsFin() {
  const caja = document.getElementById('sons-quiz');
  const pct = Math.round((_sonsAciertos / _sonsRonda.length) * 100);
  sonsGuardar(_sonsActual.slug, pct);
  // Con dos opciones, un 50 % es tirar una moneda: se dice en esos términos.
  const lectura = pct >= 85 ? 'Lo oyes. Ahora toca decirlo: repite cada par en alto.'
                : pct > 60  ? 'Lo vas oyendo, pero todavía no siempre. Otra ronda mañana.'
                : 'Con dos opciones, esto es casi como tirar una moneda: todavía no lo oyes. Normal al principio; escucha los pares otra vez y vuelve.';
  caja.innerHTML = `
    <div class="glass-card-accent anim-scale-in" style="text-align:center">
      <div style="font-family:var(--font-mono);font-size:1.3rem;color:var(--accent)">${pct} %</div>
      <div style="font-size:0.8rem;color:var(--text-2);margin:6px 0 12px">${_sonsAciertos} de ${_sonsRonda.length}. ${lectura}</div>
      <button class="btn btn-subtle" onclick="sonsEmpezarRonda()">OTRA RONDA</button>
    </div>`;
}
