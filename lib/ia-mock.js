// TutorIngles — lib/ia-mock.js
// Respuestas de ejemplo de /ia/* para el modo ?mock=1.
//
// Sin esto, el mock genérico devolvía `{ok, mock, ...body}` a cualquier POST y
// las pantallas de IA no tenían nada que pintar. Con esto se pueden construir
// y probar sin base de datos y sin gastar un céntimo de crédito. Tienen la misma
// forma que las respuestas reales (los esquemas de lib/ia-prompts.js).

const errorEjemplo = (lang) => (lang === 'en'
  ? { tipo: 'gramatica', clave: 'present perfect frente a past simple', mal: 'I have seen him yesterday', bien: 'I saw him yesterday', traduccion: 'lo vi ayer', explicacion: 'Con un momento terminado (yesterday) va el past simple.' }
  : { tipo: 'gramatica', clave: 'género de los sustantivos', mal: 'le baguette', bien: 'la baguette', traduccion: 'la barra de pan', explicacion: 'Baguette es femenino en francés.' });

const ESTADO = {
  disponible: true, origen_clave: 'ajustes', clave_final: 'ab12', modelo: 'claude-opus-5-5',
  modelos: [
    { id: 'claude-opus-5-5', nombre: 'Claude Opus 5.5', entrada: 4, salida: 20 },
    { id: 'claude-sonnet-5-5', nombre: 'Claude Sonnet 5.5', entrada: 2, salida: 10 },
    { id: 'claude-haiku-5-5', nombre: 'Claude Haiku 5.5', entrada: 0.1, salida: 0.5 },
  ],
  tope_mes: 15, gasto_mes: 1.84, gasto_total: 3.12, credito: 100, credito_restante: 96.88,
  llamadas_mes: 143, sin_token: false,
};

function iaMock(ruta, metodo, cuerpo = {}) {
  const lang = cuerpo.lang === 'en' ? 'en' : 'fr';
  if (ruta === '/ia/estado' && metodo === 'GET') return ESTADO;

  if (ruta === '/ia/pronunciacion' && metodo === 'POST') {
    return {
      entendido: false, puntuacion: 60,
      resumen: lang === 'en'
        ? 'Se entiende casi todo, pero "ship" salió como "sheep": la i corta se te alarga.'
        : 'Se entiende casi todo, pero "dessous" salió como "dessus": la ou se te cierra en u.',
      palabras: [lang === 'en'
        ? { palabra: 'ship', oido: 'sheep', problema: '/ɪ/ corta', consejo: 'Relaja la lengua y corta la vocal: es más breve y más abierta que la i española.', figurada: 'SHIP' }
        : { palabra: 'dessous', oido: 'dessus', problema: 'ou frente a u', consejo: 'Para "ou", labios redondeados y lengua atrás, como la u española.' }],
      ejercicio: lang === 'en' ? 'Di tres veces seguidas: ship – sheep, ship – sheep.' : 'Di tres veces: dessus – dessous, dessus – dessous.',
      errores: [], coste: 0.004, tarjetas: [],
    };
  }

  if (ruta === '/ia/conversacion' && metodo === 'POST') {
    const primero = !cuerpo.mensaje;
    return {
      respuesta: lang === 'en' ? (primero ? 'Hi there! Could you help me find these trainers in a size 9?' : 'Great, thanks. Do you have them in black?')
        : (primero ? 'Bonjour ! Qu\'est-ce que je vous sers ?' : 'Très bien. Et avec ceci ?'),
      traduccion: primero ? (lang === 'en' ? '¡Hola! ¿Me ayudas a encontrar estas zapatillas en un 43?' : '¡Buenos días! ¿Qué le pongo?') : (lang === 'en' ? 'Genial, gracias. ¿Las tienes en negro?' : 'Muy bien. ¿Algo más?'),
      correccion: primero ? { hay_error: false, dijiste: '', mejor: '', explicacion: '' }
        : { hay_error: true, dijiste: cuerpo.mensaje, mejor: lang === 'en' ? 'Of course, let me check for you.' : 'Je voudrais une baguette, s\'il vous plaît.', explicacion: lang === 'en' ? '"Let me check" suena más natural en tienda.' : 'Baguette es femenino: une baguette.' },
      sugerencias: lang === 'en' ? ['Let me check in the stockroom.', 'We have them in grey, would that work?'] : ['Ce sera tout, merci.', 'Je prendrai aussi deux croissants.'],
      terminado: false, errores: primero ? [] : [errorEjemplo(lang)], coste: 0.012, tarjetas: [],
    };
  }

  if (ruta === '/ia/escritura' && metodo === 'POST') {
    return {
      notas: { content: 4, achievement: 3, organisation: 3, language: 3 }, total: 13, nivel_estimado: 'B1',
      comentario: 'Cumples la consigna y el registro es adecuado, pero los conectores se repiten y hay errores de concordancia que un lector nota.',
      puntos_fuertes: ['Saludo y despedida correctos', 'Pides la información con claridad'],
      correcciones: [{ original: 'je suis arrivé le 1 octobre', corregido: 'je suis arrivé le 1er octobre', explicacion: 'El primer día del mes se escribe 1er.', tipo: 'ortografia' }],
      version_mejorada: 'Madame, Monsieur,\n\nJe me permets de vous écrire…',
      siguiente_paso: 'Varía los conectores: en outre, par ailleurs, cependant.',
      errores: [errorEjemplo(lang)], coste: 0.06, tarjetas: [],
    };
  }

  if (ruta === '/ia/oral' && metodo === 'POST') {
    return {
      id: 1, notas: { gramatica: 3, lexico: 3, discurso: 2, tarea: 3 }, total: 11, nivel_estimado: 'B1',
      comentario: 'Respondes a la pregunta, pero hablas poco para el tiempo que había y las ideas van en lista.',
      puntos_fuertes: ['Pronunciación inteligible: el reconocedor entendió casi todo'],
      correcciones: [{ original: 'je suis d\'accord avec', corregido: 'je suis d\'accord avec cette idée', explicacion: 'Completa el complemento.', tipo: 'gramatica' }],
      frases_utiles: lang === 'en' ? ['On the one hand…', 'That said,…', 'All things considered,…'] : ['D\'une part…, d\'autre part…', 'Cela dit,…', 'En définitive,…'],
      siguiente_paso: 'Anuncia un plan de dos partes al empezar.',
      errores: [], coste: 0.05, tarjetas: [],
    };
  }

  if (ruta === '/ia/perfil' && metodo === 'GET') {
    return {
      errores: [
        { id: 1, ...errorEjemplo(lang), veces: 4, ultima: new Date().toISOString(), superado: false, word_id: 12, origen: 'conversacion' },
        { id: 2, tipo: 'pronunciacion', clave: lang === 'en' ? '/ɪ/ corta frente a /iː/ larga' : 'ou frente a u', mal: lang === 'en' ? 'sheep' : 'dessus', bien: lang === 'en' ? 'ship' : 'dessous', traduccion: '', explicacion: '', veces: 3, ultima: new Date().toISOString(), superado: false, word_id: null, origen: 'pronunciacion' },
      ],
      por_tipo: { gramatica: 1, pronunciacion: 1 }, tarjetas: 1,
    };
  }

  if (ruta === '/ia/consejo' && metodo === 'POST') {
    return {
      diagnostico: 'Llevas 5 días seguidos con la sesión, pero TRABAJO lleva una semana sin abrirse y el género de los sustantivos sale en 4 de tus correcciones.',
      prioridades: [
        { titulo: 'Una conversación al día', por_que: 'Hablas poco fuera del guion.', como: '10 minutos en CONVERSAR, la panadería y la estación.', seccion: 'conversar' },
        { titulo: 'El género, en el repaso', por_que: '4 errores de género.', como: 'Las tarjetas de errores ya están en tu sesión: no te las saltes.', seccion: 'sesion' },
      ],
      frase_semana: 'Je voudrais une baguette bien cuite, s\'il vous plaît.',
      frase_semana_es: 'Quería una barra bien hecha, por favor.',
      coste: 0.02,
    };
  }

  if (ruta === '/ia/prueba' && metodo === 'POST') return { ok: true, modelo: 'claude-opus-5-5', coste: 0.004, ms: 2100 };
  // Sin esto caía en el genérico y "YA NO LO FALLO" no hacía nada en el mock.
  const perfilId = ruta.match(/^\/ia\/perfil\/(\d+)$/);
  if (perfilId && metodo === 'PUT') return { id: Number(perfilId[1]), superado: !!cuerpo.superado };
  if (ruta.startsWith('/ia/')) return { ok: true, mock: true };
  return null;
}

module.exports = { iaMock };
