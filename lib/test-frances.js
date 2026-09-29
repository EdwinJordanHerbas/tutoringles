// TutorIngles — lib/test-frances.js
// El test de nivel del francés: de dónde se parte, medido y no supuesto.
//
// El nivel del francés era "A2" porque lo dijo él. Es un buen punto de partida,
// pero el plan por fases se apoya en ese dato y la app tiene una regla: sin
// medición, no hay nivel (la cabecera enseña "—"). Esto lo mide.
//
// No sirve el test del inglés: aquel son 24 preguntas de Use of English de
// nivel C1, pensadas para decir cuánto falta para APROBAR un examen. Aquí hace
// falta lo contrario, UBICAR a alguien que puede estar en A2: preguntas en
// cuatro franjas (A2, B1, B2, C1), seis por franja, de fácil a difícil.
//
// El nivel es la franja más alta superada con 4 de 6 o más **y todas las de
// debajo también**. Con cuatro opciones, adivinar da un 25 %: pedir 4 de 6 por
// franja hace muy improbable subir de nivel por suerte, y exigir las franjas
// de debajo evita que un acierto suelto en C1 invente un C1. Cada pregunta
// trae además "No lo sé", que cuenta como fallo pero no ensucia la medida
// adivinando.
//
// Es material didáctico, como lib/guia-sonidos.js: vive aquí y no en una
// migración, y las respuestas no salen nunca del servidor.

const FRANJAS = ['A2', 'B1', 'B2', 'C1'];
const POR_FRANJA = 6;
const MINIMO = 4;
const NO_LO_SE = 'No lo sé';

// Cada pregunta: franja, tipo (gramática, léxico o conectores), el enunciado
// con ___ en el hueco, las cuatro opciones y la buena. Revisadas una a una para
// que sólo haya UNA opción defendible: un test de ubicación con dos respuestas
// buenas mide mala suerte.
const PREGUNTAS = [
  // ── A2 ──
  { id: 1,  franja: 'A2', tipo: 'gramática', enunciado: 'Je ___ espagnol, je viens de Madrid.',
    opciones: ['suis', 'ai', 'es', 'être'], correcta: 'suis' },
  { id: 2,  franja: 'A2', tipo: 'gramática', enunciado: 'Hier, nous ___ au cinéma.',
    opciones: ['sommes allés', 'avons allé', 'allons', 'irons'], correcta: 'sommes allés' },
  { id: 3,  franja: 'A2', tipo: 'gramática', enunciado: 'J\'habite ___ Suisse depuis un mois.',
    opciones: ['en', 'au', 'à', 'dans'], correcta: 'en' },
  { id: 4,  franja: 'A2', tipo: 'gramática', enunciado: 'Tu veux ___ café ? — Oui, merci.',
    opciones: ['du', 'de la', 'des', 'un peu'], correcta: 'du' },
  { id: 5,  franja: 'A2', tipo: 'gramática', enunciado: 'Vous pouvez ___ la fenêtre, s\'il vous plaît ?',
    opciones: ['fermer', 'fermez', 'fermé', 'ferme'], correcta: 'fermer' },
  { id: 6,  franja: 'A2', tipo: 'léxico', enunciado: 'À la caisse : « C\'est combien ? » — « ___ »',
    opciones: ['Ça fait vingt francs.', 'Il est vingt heures.', 'J\'ai vingt ans.', 'C\'est le vingt.'],
    correcta: 'Ça fait vingt francs.' },

  // ── B1 ──
  { id: 7,  franja: 'B1', tipo: 'gramática', enunciado: 'Quand j\'étais petit, je ___ au football tous les samedis.',
    opciones: ['jouais', 'ai joué', 'jouerai', 'joue'], correcta: 'jouais' },
  { id: 8,  franja: 'B1', tipo: 'gramática', enunciado: 'Je cherche ma clé, mais je ne ___ trouve pas.',
    opciones: ['la', 'le', 'lui', 'en'], correcta: 'la' },
  { id: 9,  franja: 'B1', tipo: 'gramática', enunciado: 'Des collègues suisses ? Oui, j\'___ ai trois.',
    opciones: ['en', 'y', 'les', 'leur'], correcta: 'en' },
  { id: 10, franja: 'B1', tipo: 'gramática', enunciado: 'Si j\'avais le temps, je ___ plus de sport.',
    opciones: ['ferais', 'fais', 'ferai', 'aurais fait'], correcta: 'ferais' },
  { id: 11, franja: 'B1', tipo: 'gramática', enunciado: 'La réunion ___ commence à dix heures est annulée.',
    opciones: ['qui', 'que', 'dont', 'où'], correcta: 'qui' },
  { id: 12, franja: 'B1', tipo: 'gramática', enunciado: 'Il faut que tu ___ à l\'heure demain.',
    opciones: ['sois', 'es', 'seras', 'être'], correcta: 'sois' },

  // ── B2 ──
  { id: 13, franja: 'B2', tipo: 'gramática', enunciado: 'C\'est le collègue ___ je t\'ai parlé hier.',
    opciones: ['dont', 'que', 'qui', 'où'], correcta: 'dont' },
  { id: 14, franja: 'B2', tipo: 'gramática', enunciado: 'Bien qu\'il ___ malade, il est venu travailler.',
    opciones: ['soit', 'est', 'était', 'sera'], correcta: 'soit' },
  { id: 15, franja: 'B2', tipo: 'gramática', enunciado: 'J\'espère que tu ___ nous voir bientôt.',
    opciones: ['viendras', 'viennes', 'viendrais', 'venir'], correcta: 'viendras' },
  { id: 16, franja: 'B2', tipo: 'gramática', enunciado: 'Si j\'avais su, je ___ venu plus tôt.',
    opciones: ['serais', 'aurais', 'suis', 'étais'], correcta: 'serais' },
  { id: 17, franja: 'B2', tipo: 'léxico', enunciado: 'Le contrat prévoit une période ___ de trois mois.',
    opciones: ['d\'essai', 'd\'épreuve', 'de test', 'd\'examen'], correcta: 'd\'essai' },
  { id: 18, franja: 'B2', tipo: 'conectores', enunciado: 'Le projet est intéressant ; ___, il coûte beaucoup trop cher.',
    opciones: ['cependant', 'donc', 'puisque', 'ainsi'], correcta: 'cependant' },

  // ── C1 ──
  { id: 19, franja: 'C1', tipo: 'conectores', enunciado: '___ la situation actuelle, nous avons décidé de reporter la réunion.',
    opciones: ['Compte tenu de', 'Malgré', 'Afin de', 'Bien que'], correcta: 'Compte tenu de' },
  { id: 20, franja: 'C1', tipo: 'gramática', enunciado: 'Quand bien même il ___ raison, il aurait dû nous prévenir.',
    opciones: ['aurait', 'a', 'ait', 'avait'], correcta: 'aurait' },
  { id: 21, franja: 'C1', tipo: 'conectores', enunciado: '« Il n\'en demeure pas moins que… » sert à ___.',
    opciones: ['maintenir une idée malgré ce qui vient d\'être dit', 'tirer la conclusion du raisonnement',
               'ajouter un exemple', 'changer de sujet'],
    correcta: 'maintenir une idée malgré ce qui vient d\'être dit' },
  { id: 22, franja: 'C1', tipo: 'gramática', enunciado: 'La solution à ___ nous avons pensé est trop coûteuse.',
    opciones: ['laquelle', 'quoi', 'qui', 'lequel'], correcta: 'laquelle' },
  { id: 23, franja: 'C1', tipo: 'léxico', enunciado: 'Il faut ___ ces résultats : ils ne concernent qu\'un petit échantillon.',
    opciones: ['nuancer', 'nier', 'rehausser', 'accentuer'], correcta: 'nuancer' },
  { id: 24, franja: 'C1', tipo: 'conectores', enunciado: 'Tous les candidats doivent parler allemand. ___, Marc ne le parle pas : il ne peut donc pas postuler.',
    opciones: ['Or', 'Donc', 'Car', 'Ainsi'], correcta: 'Or' },
];

const TEXTOS = {
  'A1': 'Todavía por debajo de A2 en lo que reconoces por escrito. La fase 1 del plan es exactamente para ti: frases de rescate y lo básico de Suiza.',
  'A2': 'A2, como decías. La fase 1 es la tuya: explicarte aunque falte la palabra, y lo que es de allí.',
  'B1': 'B1 en gramática y léxico: reconoces más de lo que produces. La fase 1 irá rápida; el trabajo de verdad está en decirlo en voz alta.',
  'B2': 'B2 en lo que reconoces. Si al hablar no llegas a eso —que es lo normal—, el hueco es de producción, no de conocimiento.',
  'C1': 'C1 en gramática, léxico y conectores. Lo que queda para el DALF es la producción: síntesis, ensayo y el oral.',
};

/** Fisher-Yates, con el generador inyectable para los tests. */
function barajar(lista, rnd = Math.random) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Las preguntas sin la respuesta: esto es lo único que ve el cliente.
 *
 * Las opciones se barajan en cada petición. Escritas a mano, la buena iba
 * SIEMPRE la primera: a la tercera pregunta cualquiera lo habría notado, y el
 * test habría medido eso en vez de francés. "No lo sé" va siempre al final.
 * La corrección compara el texto, así que el orden no le afecta.
 */
function preguntasParaCliente(rnd = Math.random) {
  return PREGUNTAS.map(({ correcta, ...q }) => ({ ...q, opciones: [...barajar(q.opciones, rnd), NO_LO_SE] }));
}

/** Nivel a partir de los aciertos por franja: la más alta superada, sin saltos. */
function nivelDesdeFranjas(aciertos) {
  let nivel = 'A1';
  for (const f of FRANJAS) {
    if ((aciertos[f] || 0) >= MINIMO) nivel = f;
    else break;
  }
  return nivel;
}

/**
 * Corrige. `respuestas` = [{ id, response }]. Lo que no llegue, o llegue como
 * "No lo sé", es fallo: dejar en blanco también es un dato.
 */
function corregir(respuestas) {
  const dadas = new Map((respuestas || []).map((r) => [Number(r.id), String(r.response ?? '')]));
  const detalle = PREGUNTAS.map((q) => {
    const tuya = dadas.get(q.id) ?? '';
    return {
      id: q.id, franja: q.franja, tipo: q.tipo, enunciado: q.enunciado,
      tuya, correcta: q.correcta, bien: tuya === q.correcta,
    };
  });

  const porFranja = Object.fromEntries(FRANJAS.map((f) => [f, { total: 0, aciertos: 0 }]));
  const porTipo = {};
  for (const d of detalle) {
    porFranja[d.franja].total++;
    porTipo[d.tipo] ??= { total: 0, aciertos: 0 };
    porTipo[d.tipo].total++;
    if (d.bien) { porFranja[d.franja].aciertos++; porTipo[d.tipo].aciertos++; }
  }

  const aciertos = detalle.filter((d) => d.bien).length;
  const nivel = nivelDesdeFranjas(Object.fromEntries(FRANJAS.map((f) => [f, porFranja[f].aciertos])));
  return {
    total: detalle.length,
    aciertos,
    pct: Math.round((aciertos / detalle.length) * 100),
    nivel,
    texto: TEXTOS[nivel],
    porFranja,
    porTipo,
    detalle,
  };
}

module.exports = { FRANJAS, POR_FRANJA, MINIMO, NO_LO_SE, PREGUNTAS, preguntasParaCliente, nivelDesdeFranjas, corregir };
