// TutorIngles — lib/intro-pronunciacion.js
// La introducción que se lee UNA vez y deja sabiendo leer la figurada.
//
// La guía de sonidos (lib/guia-sonidos.js) es material de consulta: se va a
// mirar cuando surge la duda. Esto es otra cosa: un recorrido corto y en orden
// que enseña el sistema entero de una sentada.
//
// El orden no es alfabético ni por dificultad, sino por RENTABILIDAD: primero
// lo que cambia cómo suena una frase entera (el golpe de voz, las palabras que
// se comen), después los sonidos sueltos. Alguien que solo lea los tres
// primeros pasos ya habrá ganado lo más importante.
//
// Cada paso puede llevar:
//   demo      → ejemplo grande, con audio al tocarlo
//   compara   → dos columnas enfrentadas (español / inglés, mal / bien)
//   prueba    → pregunta de comprobación con respuesta correcta

const PASOS = [
  {
    id: 'que-es',
    titulo: 'Debajo de cada frase, cómo suena',
    texto: 'A partir de ahora, cada palabra en inglés lleva debajo su pronunciación escrita con letras que ya sabes leer. No hay que aprender ningún alfabeto raro: se lee como si fuera español, salvo unas pocas marcas que verás en dos minutos.',
    compara: {
      izq: { et: 'Lo que está escrito', v: "Here's your receipt." },
      der: { et: 'Cómo se dice',        v: 'HI-əs yə ri-SIIT.' },
    },
    demo: { en: "Here's your receipt.", fig: 'HI-əs yə ri-SIIT.' },
  },
  {
    id: 'golpe-de-voz',
    titulo: 'Las MAYÚSCULAS son el golpe de voz',
    texto: 'En inglés, dentro de cada palabra hay una sílaba que manda: suena más fuerte y más larga. Esa va en mayúsculas. Las demás se dicen flojas y rápidas. Equivocar la sílaba fuerte es lo que más cuesta entender al de enfrente, más incluso que un sonido mal hecho.',
    demo: { en: 'receipt', fig: 'ri-SIIT' },
    compara: {
      izq: { et: 'Si lo dices plano', v: 're-ceipt', mal: true },
      der: { et: 'Con el golpe bien', v: 'ri-SIIT' },
    },
    nota: 'El guion o el punto solo separan sílabas para leer mejor. No se pronuncian.',
  },
  {
    id: 'palabras-que-se-comen',
    titulo: 'Lo pequeño y gris se dice de pasada',
    texto: 'El inglés se apoya en las palabras que tienen contenido y pasa de puntillas por el relleno: the, of, to, you, a. Esas van escritas en minúscula y más claritas. Si las pronuncias todas con la misma fuerza, suena a robot aunque los sonidos estén bien.',
    demo: { en: 'The fitting rooms are over there.', fig: 'də FI-ting RUUMS ə OU-və deə.' },
    nota: 'Fíjate: solo cuatro palabras llevan fuerza de verdad. El resto se desliza.',
  },
  {
    id: 'schwa',
    titulo: 'La ə es el sonido de no hacer nada',
    texto: 'Es una e del revés, pero no es una e. Es lo que sale con la boca entreabierta, la lengua plana y cero esfuerzo. Es la vocal de dudar: ese "eeeh…" de cuando piensas. Es el sonido más repetido del inglés — y nunca la verás en mayúscula, porque nunca lleva la fuerza.',
    compara: {
      izq: { et: 'En español', v: 'ba-NA-na', pie: 'las tres "a" suenan igual de claras' },
      der: { et: 'En inglés',  v: 'bə-NAA-nə', pie: 'solo la del medio es una vocal de verdad' },
    },
    demo: { en: 'customer', fig: 'KA-stə-mə' },
    nota: 'En inglés solo la sílaba fuerte tiene vocal de verdad. Las demás se desploman en ə.',
    prueba: {
      pregunta: '¿Cómo se dice "colour"?',
      opciones: ['ko-LOR', 'KA-lə', 'KO-lour'],
      correcta: 1,
      porque: 'La segunda sílaba no tiene vocal clara: tiene un ruidito. Y el golpe va en la primera.',
      escuchar: 'colour',
    },
  },
  {
    id: 'vocal-larga',
    titulo: 'Vocal doblada = vocal estirada',
    texto: 'Cuando veas ii, uu, aa u oo, esa vocal dura casi el doble. No es un adorno: en inglés la longitud distingue palabras enteras. Y hay una quinta, la ëë, que es la ə de antes pero larga y con fuerza: work es UËËK.',
    compara: {
      izq: { et: 'corta', v: 'SHIP',  pie: 'barco' },
      der: { et: 'larga', v: 'SHIIP', pie: 'oveja' },
    },
    nota: 'La corta además es más floja: la i se cae un poco hacia la e. Y ojo con la ëë: es una e sin boca de sonrisa, y en británico se come la r que está escrita (work, shirt, first).',
    prueba: {
      pregunta: 'Un cliente busca zapatillas baratas. ¿Qué dice?',
      opciones: ['CHIP', 'CHIIP'],
      correcta: 1,
      porque: '"cheap" (barato) lleva vocal larga. "chip" con la corta es una patata frita.',
      escuchar: 'cheap',
    },
  },
  {
    id: 'ae',
    titulo: 'La æ, entre la a y la e',
    texto: 'El otro símbolo nuevo, y el último. Se hace a medio camino entre nuestra a y nuestra e, con la boca bien abierta y la mandíbula baja. Di una "a" y ábrela más.',
    demo: { en: 'black', fig: 'BLÆK' },
    compara: {
      izq: { et: 'con a española', v: 'BLAK', mal: true, pie: 'suena a "block"' },
      der: { et: 'con æ',          v: 'BLÆK' },
    },
  },
  {
    id: 'colores',
    titulo: 'El azul avisa: eso no existe en español',
    texto: 'Las letras en azul son sonidos que hay que hacer distinto. Las negras se leen tal cual. Las moradas son las vocales largas. No hace falta memorizarlo: el color te avisa en el momento, y tocando la palabra la oyes.',
    lista: [
      ['sh', 'el "shhh" de mandar callar'],
      ['dj', 'la j de John: una ch con voz'],
      ['ng', 'la n de "tengo", sin la g'],
      ['v',  'labio de abajo contra los dientes, nunca una b'],
      ['r',  'la r inglesa NO vibra: la lengua no toca nada'],
      ['h',  'un soplo suave: aquí la h SÍ suena, pero no es la j de "jamón"'],
      ['u',  'la u de "hueso"'],
      ['s',  'cuando va en azul, zumba como una abeja'],
    ],
    demo: { en: 'Would you like it gift-wrapped?', fig: 'uud yu LAIK it GUIFT-ræpt?' },
  },
  {
    id: 'gratis',
    titulo: 'Dos que ya sabes hacer',
    texto: 'Aquí juegas con ventaja por ser de España. Las dos th del inglés son sonidos que ya tienes: la z de "zapato" y la d de "cada". Un latinoamericano tiene que aprenderlas desde cero.',
    lista: [
      ['z', 'la z de "zapato" — es la th de think'],
      ['d', 'la d suave de "cada" — es la th de this'],
    ],
    demo: { en: 'I think this one is better.', fig: 'ai ZINGK DIS UON is BE-tə.' },
  },
  {
    id: 'listo',
    titulo: 'Ya sabes leerla',
    texto: 'Eso es todo el sistema. A partir de aquí lo verás debajo de cada palabra del vocabulario y de cada frase de tu sector. Si alguna letra se te olvida, la guía completa está siempre en esta pantalla, y tocando cualquier ejemplo lo oyes.',
    demo: { en: "It runs a bit small, so you might want to size up.", fig: 'it RANS ə BIT SMOOL, sou yu mait UONT tə SAIS AP.' },
    cierre: true,
  },
];

module.exports = { PASOS };
