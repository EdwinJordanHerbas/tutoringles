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
//
// Dos rondas por contraste: la de OÍDO (oyes una y eliges) y DECIRLO (la dices
// tú y el reconocedor del móvil, o el dictado del teclado en el iPhone, dice
// cuál de las dos ha entendido). Ver el bloque DECIRLO al final.

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
// `...p[slug]` primero: en la misma entrada viven los campos de DECIRLO
// (decir_mejor, decir_rondas), y la ronda de oído no los puede borrar.
function sonsGuardar(slug, pct) {
  try {
    const p = sonsProgreso();
    p[slug] = { ...p[slug], mejor: Math.max(p[slug]?.mejor ?? 0, pct), rondas: (p[slug]?.rondas || 0) + 1 };
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
        oye no se puede decir. Después, DECIRLO: la dices tú y el móvil te dice
        cuál de las dos ha entendido.
      </p>
      ${sinVoz ? `<div class="pron-honestidad" style="margin-top:10px">
        Tu móvil no tiene voz francesa instalada. Con la española la b y la v
        suenan igual y esta ronda no tendría respuesta: instálala en Ajustes ›
        Accesibilidad › Contenido hablado › Voces.</div>` : ''}
    </div>
    <div id="sons-lista">
      ${SONS_FR.map((s) => {
        const p = prog[s.slug];
        const marcas = iaSonsMarcas(p);
        return `
        <div class="topic-item" onclick="abrirSon('${s.slug}')">
          <div class="topic-item-info">
            <div class="topic-item-title">${escaparHtml(s.titulo)}</div>
            <div class="topic-item-meta">${escaparHtml(s.pares[0][0])} / ${escaparHtml(s.pares[0][2])} · ${s.pares.length} pares${marcas ? ` · mejor: ${marcas}` : ''}</div>
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
  const marcas = iaSonsMarcas(sonsProgreso()[s.slug]);
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
      <p class="field-pista" style="margin-top:8px">Toca cada palabra para oírla. Después, la ronda: oyes una y eliges cuál era.
        En DECIRLO la dices tú y el móvil te dice cuál ha entendido.</p>
      ${marcas ? `<p class="field-pista" style="margin-top:4px">Tu mejor ronda: ${marcas}.</p>` : ''}
    </div>
    <button class="btn btn-primary" onclick="sonsEmpezarRonda()" style="margin-top:4px">RONDA DE OÍDO</button>
    <button class="btn btn-subtle" onclick="iaSonsDecirEmpezar()" style="margin-top:8px">
      <img src="src/img/icons/mic.png" alt="" class="ico"> DECIRLO
    </button>
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
// Sin `a`/`b`, las de la pregunta en curso de la ronda de oído; DECIRLO pasa
// las suyas (la que tocaba decir primero).
function sonsOirLasDos(btn, a, b) {
  if (a === undefined) {
    const q = _sonsRonda[_sonsIdx];
    if (!q) return;
    [a, , b] = q.par;
  }
  sonsDecir(a, btn);
  setTimeout(() => sonsDecir(b), 900);
}

function sonsFin() {
  const caja = document.getElementById('sons-quiz');
  const pct = Math.round((_sonsAciertos / _sonsRonda.length) * 100);
  sonsGuardar(_sonsActual.slug, pct);
  // Con dos opciones, un 50 % es tirar una moneda: se dice en esos términos.
  const lectura = pct >= 85 ? 'Lo oyes. Ahora toca decirlo: en DECIRLO el móvil te dice cuál de las dos ha entendido.'
                : pct > 60  ? 'Lo vas oyendo, pero todavía no siempre. Otra ronda mañana.'
                : 'Con dos opciones, esto es casi como tirar una moneda: todavía no lo oyes. Normal al principio; escucha los pares otra vez y vuelve.';
  caja.innerHTML = `
    <div class="glass-card-accent anim-scale-in" style="text-align:center">
      <div style="font-family:var(--font-mono);font-size:1.3rem;color:var(--accent)">${pct} %</div>
      <div style="font-size:0.8rem;color:var(--text-2);margin:6px 0 12px">${_sonsAciertos} de ${_sonsRonda.length}. ${lectura}</div>
      <button class="btn btn-subtle" onclick="sonsEmpezarRonda()">OTRA RONDA</button>
      ${pct >= 85 ? `<button class="btn btn-subtle" onclick="iaSonsDecirEmpezar()" style="margin-top:8px">
        <img src="src/img/icons/mic.png" alt="" class="ico"> DECIRLO</button>` : ''}
    </div>`;
}

// ── DECIRLO ──────────────────────────────────────────────
//
// La ronda de oído entrena a distinguir; ésta, a producir. Es el mismo truco
// que el DECIRLO del inglés (pron.js): comparar una FRASE con lo que entendió
// el reconocedor no mide nada, porque autocorrige hacia lo que espera oír. Con
// una palabra suelta de un par mínimo, en cambio, no tiene contexto del que
// tirar: si dices «vin» y escribe «vent», se te ha ido la vocal al otro lado.
// Es un fallo objetivo, y además dice cuál.
//
// En el iPhone con la app instalada no hay reconocedor: entra por el dictado
// del teclado (en francés), que juzga igual pero da una sola hipótesis. Por eso
// el campo está siempre, haya micro o no. Nada de esto marca HABLAR ni llama a
// la API, salvo el botón «¿POR QUÉ?», que pide el diagnóstico a la IA.
//
// Todos los nombres nuevos llevan el prefijo ia: los scripts comparten ámbito.

const IA_SONS_DECIR_MAX = 8;

// El reconocedor escribe palabras, no sonidos. Si dices «vin» perfecto puede
// escribir «vingt» o «20», y si dices «sans», «cent»: suenan exactamente igual.
// Sin esta tabla un acierto salía como «no te ha pillado». Sólo homófonos de
// verdad (y formas de la misma palabra que suenan igual: plurales, femeninos,
// verbos), y NINGUNO coincide con la otra palabra de su par ni con sus
// homófonos: si coincidiera, el veredicto mentiría. Lo comprueba
// iaSonsHomofonosCruzados() (ver más abajo).
const iaSonsHomofonos = {
  // u / ou
  tu: ['tue', 'tues'], tout: ['toux', 'tous'], vu: ['vue', 'vues', 'vus'], vous: ['voue'],
  rue: ['rues', 'ru'], roue: ['roues', 'roux'], lu: ['lue', 'lus', 'lues'],
  loup: ['loups', 'loue', 'loues', 'louent'], su: ['sue', 'sus'], sous: ['sou', 'soûl', 'saoul'],
  // s / z
  poisson: ['poissons'], poison: ['poisons'], dessert: ['desserts', 'desserre'], désert: ['déserts'],
  coussin: ['coussins'], cousin: ['cousins'], basse: ['basses'], base: ['bases'],
  russe: ['russes'], ruse: ['ruses'],
  // b / v
  bol: ['bols'], vol: ['vols', 'vole', 'voles', 'volent'], voir: ['voire'], bain: ['bains'],
  vin: ['vins', 'vingt', '20', 'vain', 'vains', 'vint'], bu: ['bue', 'bus', 'but'],
  banc: ['bancs', 'ban', 'bans'], vent: ['vents', 'vend', 'vends'], vase: ['vases'],
  // le / les: la e cerrada de «les» se escribe a menudo como la abierta de «lait»
  les: ['lait', 'laid'], des: ['dès', 'dé', 'dés'], ce: ['se'],
  ces: ['ses', "c'est", 'sait', 'sais'], mes: ['mais', 'met', 'mets', 'mai'], tes: ['thé', "t'es"],
  // an / on · in / an
  lent: ['lents', "l'an"], long: ['longs', "l'on"], blanc: ['blancs'], blond: ['blonds'],
  sans: ['cent', '100', 'sang', 'sent', "s'en"], son: ['sont', 'sons'],
  temps: ['tant', 'tend', 'tends', 'taon', "t'en"], thon: ['thons', 'ton', 'tons', 'tond', 'tonds'],
  bon: ['bons', 'bond', 'bonds'], pain: ['pains', 'pin', 'pins', 'peint', 'peins'],
  paon: ['paons', 'pan', 'pans', 'pend', 'pends'], main: ['mains', 'maint'], ment: ['mens'],
  fin: ['fins', 'faim', 'feint', 'feins'], faon: ['faons', 'fend', 'fends'],
  // ch / j
  chou: ['choux'], joue: ['joues', 'jouent'], cache: ['caches', 'cachent', 'cash'], cage: ['cages'],
  bouche: ['bouches', 'bouchent'], bouge: ['bouges', 'bougent'], chant: ['chants', 'champ', 'champs'],
  gens: ['jean'], hache: ['haches', 'h'], âge: ['âges'],
  // eu / ou
  deux: ['2', "d'eux"], feu: ['feux'], fou: ['fous'], peu: ['peut', 'peux'], pou: ['poux', 'pouls'],
  jeu: ['jeux'],
  // u / i
  lit: ['lits', 'lie', 'lis'], vie: ['vies', 'vit', 'vis'], riz: ['ri', 'rit', 'ris'],
  pure: ['pur', 'purs', 'pures'], pire: ['pires'], dur: ['dure', 'durs', 'dures'], dire: ['dires'],
};

let iaSonsDecirRonda = [];         // [{ obj, es, otra, otraEs, contada, bien }]
let iaSonsDecirIdx = 0;
let iaSonsDecirAciertos = 0;
let iaSonsDecirUltimo = null;      // { objetivo, alternativas } del último intento: lo que lee la IA
let iaSonsDecirEscuchando = false;

/**
 * Minúsculas, apóstrofos iguales y sin puntuación, pero CON acentos: en francés
 * distinguen palabras (désert / dessert, des / dès). La elisión se separa
 * («l'âge» → «l' âge») para encontrar «âge» dentro, y se pasa a NFC para que
 * una é compuesta de dos piezas sea la misma é de la tabla.
 */
function iaSonsNorm(s) {
  return String(s ?? '').normalize('NFC').toLowerCase()
    .replace(/[’‘ʼ´`]/g, "'")
    .replace(/(\p{L})'(?=\p{L})/gu, '$1\u0001 ')   // la elisión, marcada aparte
    .replace(/'/g, ' ')                              // cualquier otro apóstrofo es una comilla
    .replace(/[^\p{L}\p{M}\p{N}\u0001 ]+/gu, ' ')
    .replace(/\u0001/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * El veredicto, sin tocar la pantalla (se puede probar en node).
 * `alternativas`: [{transcript}] o textos, en el orden del reconocedor.
 *   'bien' — la primera es la palabra (o un homófono suyo)
 *   'otra' — la primera es la OTRA del par: justo el sonido que falla
 *   'casi' — la palabra sale, pero más abajo
 *   'nada' — ninguna de las dos, o las dos a la vez: no cuenta
 */
function iaSonsVeredicto(alternativas, objetivo, otra) {
  const alts = (Array.isArray(alternativas) ? alternativas : [])
    .map((a) => String((typeof a === 'string' ? a : a?.transcript) ?? '').trim())
    .map((crudo) => ({ crudo, norm: iaSonsNorm(crudo) }))
    .filter((a) => a.norm);
  const formas = (w) => [...new Set([w, ...(iaSonsHomofonos[iaSonsNorm(w)] || [])].map(iaSonsNorm))]
    .filter(Boolean);
  const fObj = formas(objetivo);
  const fOtra = formas(otra);
  // Como palabra (o frase, para «ils sont») entera: « vin » no está en « vingt ».
  const encuentra = (a, fs) => (a ? fs.find((f) => ` ${a.norm} `.includes(` ${f} `)) || null : null);
  const puesto = (fs) => alts.findIndex((a) => encuentra(a, fs));
  const pObj = puesto(fObj);
  const pOtra = puesto(fOtra);

  let tipo = 'nada';
  if (pObj === 0 && pOtra === 0) tipo = 'nada';
  else if (pObj === 0) tipo = 'bien';
  else if (pOtra === 0) tipo = 'otra';
  else if (pObj > 0) tipo = 'casi';

  // Si lo que escribió es un homófono se dice: «Bien dicho» con «vingt» debajo
  // parecería un error de la app.
  const forma = tipo === 'bien' ? encuentra(alts[0], fObj) : tipo === 'otra' ? encuentra(alts[0], fOtra) : null;
  const base = tipo === 'bien' ? fObj[0] : fOtra[0];
  return {
    tipo,
    cuenta: tipo !== 'nada',
    pObj, pOtra,
    lasDos: pObj === 0 && pOtra === 0,
    primera: alts[0]?.crudo || '',
    oidas: alts.slice(0, 3).map((a) => a.crudo),
    homofono: forma && forma !== base ? forma : null,
  };
}

/**
 * Pares cuya tabla de homófonos se pisa con la otra palabra (debe dar []).
 * No se usa en pantalla: es la comprobación de que la tabla no hace mentir al
 * veredicto, para correrla en node si se añaden pares.
 */
function iaSonsHomofonosCruzados() {
  const formas = (w) => [w, ...(iaSonsHomofonos[iaSonsNorm(w)] || [])].map(iaSonsNorm);
  const malos = [];
  for (const s of SONS_FR) {
    for (const [a, , b] of s.pares) {
      const fa = formas(a), fb = formas(b);
      const dentro = (x, y) => ` ${x} `.includes(` ${y} `);
      if (fa.some((x) => fb.some((y) => dentro(x, y) || dentro(y, x)))) malos.push(`${s.slug}: ${a} / ${b}`);
    }
  }
  return malos;
}

/** "oído 88 % · dicho 63 %" con lo que haya del progreso de un contraste. */
function iaSonsMarcas(p) {
  if (!p) return '';
  const m = [];
  if (Number.isFinite(p.mejor)) m.push(`oído ${p.mejor} %`);
  if (Number.isFinite(p.decir_mejor)) m.push(`dicho ${p.decir_mejor} %`);
  return m.join(' · ');
}

function iaSonsGuardarDecir(slug, pct) {
  try {
    const p = sonsProgreso();
    const antes = p[slug] || {};
    p[slug] = {
      ...antes,
      decir_mejor: Math.max(antes.decir_mejor ?? 0, pct),
      decir_rondas: (antes.decir_rondas || 0) + 1,
      decir_ultima: pct,
    };
    localStorage.setItem(SONS_CLAVE, JSON.stringify(p));
  } catch {}
}

function iaSonsDecirEmpezar() {
  const s = _sonsActual;
  if (!s) return;
  if (typeof iaPararMicro === 'function') iaPararMicro();
  // Cada palabra de cada par una vez, con la otra del par al lado: es la que
  // no tiene que salir.
  const vistas = new Set();
  const todas = [];
  for (const [a, ea, b, eb] of s.pares) {
    if (!vistas.has(a)) { vistas.add(a); todas.push({ obj: a, es: ea, otra: b, otraEs: eb }); }
    if (!vistas.has(b)) { vistas.add(b); todas.push({ obj: b, es: eb, otra: a, otraEs: ea }); }
  }
  for (let i = todas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [todas[i], todas[j]] = [todas[j], todas[i]];
  }
  iaSonsDecirRonda = todas.slice(0, IA_SONS_DECIR_MAX).map((x) => ({ ...x, contada: false, bien: false }));
  iaSonsDecirIdx = 0;
  iaSonsDecirAciertos = 0;
  iaSonsDecirPalabra();
  // La ronda se pinta debajo de los pares: en el móvil quedaría fuera de la
  // pantalla y parecería que el botón no hace nada.
  document.getElementById('sons-quiz')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function iaSonsDecirEtiqueta() {
  return `DECIRLO · ${iaSonsDecirIdx + 1} de ${iaSonsDecirRonda.length} · ${iaSonsDecirAciertos} bien dichas`;
}

function iaSonsDecirPalabra() {
  const caja = document.getElementById('sons-quiz');
  if (!caja) return;
  const it = iaSonsDecirRonda[iaSonsDecirIdx];
  if (!it) return iaSonsDecirFin();
  iaSonsDecirUltimo = null;
  const pct = Math.round((iaSonsDecirIdx / iaSonsDecirRonda.length) * 100);
  const hayMicro = typeof iaHayMicro === 'function' && iaHayMicro();
  // Nada de texto dentro de los onclick: un apóstrofo francés los rompería.
  // Todo se lee de la ronda por su índice.
  caja.innerHTML = `
    <div class="glass-card anim-slide-up">
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="progress-label" id="ia-sons-prog">${iaSonsDecirEtiqueta()}</div>

      <div class="pron-q-tit">Di esta palabra</div>
      <div class="decir-objetivo" lang="fr">${escaparHtml(it.obj)}</div>
      <div style="text-align:center;font-size:0.72rem;color:var(--text-3);line-height:1.5;margin-bottom:12px">
        ${escaparHtml(it.es)} · que no suene a <b lang="fr">${escaparHtml(it.otra)}</b> (${escaparHtml(it.otraEs)})
      </div>

      <div class="decir-btns">
        <button class="btn btn-subtle" onclick="iaSonsDecirOir(this)">
          <img src="src/img/icons/listen.png" alt="" class="ico"> OÍRLA
        </button>
        ${hayMicro ? `
        <button class="speak-record-btn decir-mic" id="ia-sons-mic" aria-label="Decirla al micro" onclick="iaSonsDecirMicro(this)">
          <img src="src/img/icons/mic.png" alt="" class="ico">
        </button>` : ''}
      </div>
      <div class="decir-estado" id="ia-sons-estado">${hayMicro ? 'Toca el micro y dila' : 'Díctala con el micro del teclado'}</div>

      <div class="ia-dictado">
        <div class="ia-dictado-fila">
          <input class="field-input" id="ia-sons-txt" type="text" lang="fr" autocomplete="off"
            autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done"
            aria-label="La palabra, dictada"
            placeholder="${hayMicro ? 'O díctala con el teclado' : 'Díctala con el micro del teclado'}"
            onkeydown="if(event.key==='Enter'){event.preventDefault();iaSonsDecirComprobar()}">
          <button class="btn btn-subtle btn-sm" onclick="iaSonsDecirComprobar()">COMPROBAR</button>
        </div>
        ${typeof iaHtmlPistaDictado === 'function' ? iaHtmlPistaDictado('fr') : ''}
      </div>
      <div id="ia-sons-fb"></div>
    </div>`;
  // Viniendo de leer el veredicto, la palabra nueva quedaría por encima.
  if (caja.getBoundingClientRect?.().top < 0) caja.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function iaSonsDecirOir(btn) {
  const it = iaSonsDecirRonda[iaSonsDecirIdx];
  if (!it) return;
  // Con el micro abierto, el altavoz se colaría en lo que se está juzgando.
  if (iaSonsDecirEscuchando && typeof iaPararMicro === 'function') iaPararMicro();
  sonsDecir(it.obj, btn);
}

async function iaSonsDecirMicro(btn) {
  // El mismo botón para: stop() (no abort) para que juzgue lo ya dicho.
  if (iaSonsDecirEscuchando) {
    try { iaRecActual?.stop(); } catch {}
    return;
  }
  const it = iaSonsDecirRonda[iaSonsDecirIdx];
  if (!it || typeof iaEscucharFrase !== 'function') return;
  const ronda = iaSonsDecirRonda, idx = iaSonsDecirIdx;
  const estado = document.getElementById('ia-sons-estado');
  const poner = (escuchando) => {
    iaSonsDecirEscuchando = escuchando;
    if (!btn?.isConnected) return;
    btn.classList.toggle('recording', escuchando);
    btn.innerHTML = `<img src="src/img/icons/${escuchando ? 'stop' : 'mic'}.png" alt="" class="ico">`;
  };
  if (typeof vozParar === 'function') vozParar();
  try {
    const r = await iaEscucharFrase({
      lang: 'fr', alternativas: 5,
      alEmpezar: () => { poner(true); if (estado) estado.textContent = 'ESCUCHANDO…'; },
    });
    // Si mientras tanto se ha pasado de palabra (o de pantalla), no se juzga.
    if (ronda !== iaSonsDecirRonda || idx !== iaSonsDecirIdx || !document.getElementById('ia-sons-fb')) return;
    if (estado) estado.textContent = 'Toca el micro y dila';
    iaSonsDecirJuzgar(r.alternativas, false);
  } catch (e) {
    if (estado?.isConnected) estado.textContent = e?.codigo === 'aborted' ? 'Toca el micro y dila' : (e?.message || 'No se pudo escuchar');
  } finally {
    poner(false);
  }
}

/** Lo dictado con el teclado pasa por el mismo juicio, con una sola alternativa. */
function iaSonsDecirComprobar() {
  const campo = document.getElementById('ia-sons-txt');
  if (!campo || !iaSonsDecirRonda[iaSonsDecirIdx]) return;
  const txt = String(campo.value || '').trim();
  if (!txt) {
    toast('Dicta la palabra primero', 'error');
    campo.focus();
    return;
  }
  // Se vacía porque el dictado del iPhone AÑADE a lo que ya hay: el segundo
  // intento saldría «Vin. Vent.» y no se sabría cuál juzgar. Lo que entendió se
  // ve en el veredicto. Y sin foco se cierra el teclado, que lo taparía.
  campo.value = '';
  campo.blur();
  iaSonsDecirJuzgar([{ transcript: txt, confidence: 0 }], true);
}

function iaSonsDecirJuzgar(alternativas, dictado) {
  const it = iaSonsDecirRonda[iaSonsDecirIdx];
  const fb = document.getElementById('ia-sons-fb');
  if (!it || !fb) return;
  const v = iaSonsVeredicto(alternativas, it.obj, it.otra);
  iaSonsDecirUltimo = { objetivo: it.obj, alternativas };

  // Cuenta el PRIMER intento que se pueda juzgar. Repetir sirve para
  // practicar, pero si contara, a fuerza de intentos todas saldrían bien.
  let yaContaba = false;
  if (v.cuenta) {
    if (it.contada) yaContaba = true;
    else {
      it.contada = true;
      it.bien = v.tipo === 'bien';
      if (it.bien) iaSonsDecirAciertos++;
    }
  }
  const prog = document.getElementById('ia-sons-prog');
  if (prog) prog.textContent = iaSonsDecirEtiqueta();

  const suenaIgual = v.homofono ? ` (Ha escrito «${v.homofono}», que suena igual.)` : '';
  let veredicto, clase, explica, conComo = false;
  if (v.tipo === 'bien') {
    veredicto = 'Bien dicho';
    clase = 'bien';
    explica = `Te ha entendido «${it.obj}» a la primera. Ese sonido te sale.${suenaIgual}`;
  } else if (v.tipo === 'otra') {
    veredicto = `Te ha entendido «${it.otra}»`;
    clase = 'mal';
    conComo = true;
    explica = `Querías decir «${it.obj}» (${it.es}) y ha salido «${it.otra}» (${it.otraEs}). Se te ha ido al otro sonido del par: es justo lo que hay que separar.${suenaIgual}`
      + (v.pObj > 0 ? ` Tu palabra sale más abajo, en la opción ${v.pObj + 1}: no estás lejos.` : '');
  } else if (v.tipo === 'casi') {
    veredicto = 'Casi';
    clase = 'medio';
    conComo = true;
    explica = `«${it.obj}» aparece, pero no como primera opción: antes ha entendido «${v.primera}». Marca más el sonido.`;
  } else {
    veredicto = 'No te ha pillado';
    clase = 'medio';
    explica = v.lasDos
      ? `Ha entendido las dos palabras a la vez («${v.primera}»): di sólo «${it.obj}». Este no cuenta.`
      : v.primera
        ? `Ha entendido «${v.primera}», que no es ninguna de las dos. ${dictado
          ? 'Mira que el teclado esté en francés y prueba otra vez.'
          : 'Puede ser el micro o el ruido: prueba otra vez.'} Este no cuenta.`
        : 'No ha entendido nada. Acércate al micro y repite. Este no cuenta.';
  }
  const como = conComo ? (_sonsActual?.como || '') : '';
  const ultima = iaSonsDecirIdx + 1 >= iaSonsDecirRonda.length;

  fb.innerHTML = `
    <div class="pron-fb ${clase}">
      <div class="pron-fb-tit">${escaparHtml(veredicto)}</div>
      <div class="decir-explica">${escaparHtml(explica)}</div>
      ${yaContaba ? '<div class="decir-explica" style="color:var(--text-3)">Este intento ya no cambia la ronda: cuenta el primero. Repetir sí sirve.</div>' : ''}
      ${como ? `<div class="decir-explica"><b>Cómo se hace:</b> ${escaparHtml(como)}</div>` : ''}
      <div class="decir-oidas">
        <span class="decir-oidas-et">${dictado ? 'lo que ha escrito el dictado' : 'lo que ha entendido'}</span>
        ${v.oidas.length
          ? v.oidas.map((t, i) => `<span class="decir-alt${i === 0 ? ' primera' : ''}" lang="fr">${escaparHtml(t)}</span>`).join('')
          : '<span class="decir-alt">—</span>'}
      </div>
      <div class="ia-acciones">
        <button class="btn btn-subtle btn-sm" onclick="iaSonsDecirOirLasDos(this)">
          <img src="src/img/icons/listen.png" alt="" class="ico"> OÍR LAS DOS
        </button>
        ${v.oidas.length ? '<button class="btn btn-subtle btn-sm" onclick="iaSonsDecirPorQue(this)">¿POR QUÉ? · IA</button>' : ''}
      </div>
    </div>
    <div id="ia-sons-diag"></div>
    <div class="decir-limite">
      Esto comprueba <b>un sonido</b>, el que separa «${escaparHtml(it.obj)}» de «${escaparHtml(it.otra)}».
      No es una nota de tu acento entero.
    </div>
    <button class="btn btn-primary" onclick="iaSonsDecirSiguiente()" style="margin-top:10px">
      ${ultima ? 'VER RESULTADO' : 'SIGUIENTE →'}
    </button>`;
}

function iaSonsDecirOirLasDos(btn) {
  const it = iaSonsDecirRonda[iaSonsDecirIdx];
  if (!it) return;
  if (iaSonsDecirEscuchando && typeof iaPararMicro === 'function') iaPararMicro();
  sonsOirLasDos(btn, it.obj, it.otra);
}

/**
 * «¿POR QUÉ?»: la IA lee lo que entendió el reconocedor (o el dictado) y dice
 * qué sonido falló y cómo corregirlo. Sólo detrás del botón, porque cuesta; si
 * sale bien el botón se quita, para no pagar dos veces la misma respuesta.
 */
async function iaSonsDecirPorQue(btn) {
  const u = iaSonsDecirUltimo;
  const caja = document.getElementById('ia-sons-diag');
  if (!u || !caja || typeof iaDiagnosticarPron !== 'function') return;
  await iaDiagnosticarPron({ objetivo: u.objetivo, alternativas: u.alternativas, lang: 'fr', caja, btn });
  if (caja.querySelector('.ia-caja') && btn?.isConnected) btn.remove();
}

function iaSonsDecirSiguiente() {
  if (typeof iaPararMicro === 'function') iaPararMicro();
  iaSonsDecirIdx++;
  iaSonsDecirPalabra();
}

/** Volver a oír una de las que han fallado, desde el resultado (por índice). */
function iaSonsDecirOirN(i, btn) {
  const it = iaSonsDecirRonda[i];
  if (it) sonsDecir(it.obj, btn);
}

function iaSonsDecirFin() {
  const caja = document.getElementById('sons-quiz');
  if (!caja) return;
  const ronda = iaSonsDecirRonda;
  const contadas = ronda.filter((x) => x.contada).length;
  const sinComprobar = ronda.length - contadas;
  const pct = contadas ? Math.round((iaSonsDecirAciertos / contadas) * 100) : null;
  // Sólo se guarda si hubo algo que juzgar: una ronda saltada entera no es un 0 %.
  if (pct !== null && _sonsActual) iaSonsGuardarDecir(_sonsActual.slug, pct);
  const lectura = pct === null
    ? 'No se ha podido comprobar ninguna: el móvil no ha entendido nada. Prueba en un sitio sin ruido o, si dictas, con el teclado en francés.'
    : pct >= 85 ? 'Te entiende: ese sonido ya te sale. Ahora úsalo en frases enteras.'
    : pct > 60  ? 'Casi siempre te entiende, pero no todas. Repite las que han fallado, primero exagerando y luego normal.'
    : 'Todavía se te va al otro sonido. Vuelve a «Cómo se hace», escucha los pares y repite despacio: primero exagerado, luego normal.';
  // Las que han fallado, para oírlas otra vez: es lo que hay que repetir.
  const fallidas = ronda.map((x, i) => ({ x, i })).filter(({ x }) => x.contada && !x.bien);
  caja.innerHTML = `
    <div class="glass-card-accent anim-scale-in" style="text-align:center">
      <div class="card-title">DECIRLO</div>
      <div style="font-family:var(--font-mono);font-size:1.3rem;color:var(--accent)">${pct === null ? '—' : `${pct} %`}</div>
      <div style="font-size:0.8rem;color:var(--text-2);margin:6px 0 12px;line-height:1.5">
        ${iaSonsDecirAciertos} de ${contadas} bien dichas${sinComprobar ? ` · ${sinComprobar} sin comprobar` : ''}. ${lectura}
      </div>
      ${fallidas.length ? `
        <div class="decir-oidas" style="justify-content:center">
          <span class="decir-oidas-et">para repetir · toca para oírla</span>
          ${fallidas.map(({ x, i }) => `<button class="decir-alt" lang="fr" style="border:none;cursor:pointer"
            onclick="iaSonsDecirOirN(${i}, this)">${escaparHtml(x.obj)}</button>`).join('')}
        </div>` : ''}
      <button class="btn btn-subtle" onclick="iaSonsDecirEmpezar()">OTRA RONDA</button>
    </div>`;
}
