// TutorIngles — lib/idiomas.js
// Los idiomas que entrena la app.
//
// El francés entró el 27-sep-2026: Edwin se va a trabajar a la Suiza romanda y
// el francés pasa por delante del inglés. No es otra app: es la misma, con una
// columna `lang` en el contenido y un idioma activo en `config.idioma_activo`.
//
// `voz` es la etiqueta con la que se pide la voz del sistema y el reconocimiento
// de voz. Para el francés es fr-FR y no fr-CH a propósito: casi ningún móvil
// trae voz suiza, y el francés de Francia y el de la Romandía se distinguen en
// el léxico (septante, natel, souper), que va en el contenido, no en la voz.

const IDIOMAS = {
  en: { codigo: 'en', nombre: 'inglés',  voz: 'en-GB', examen: 'Cambridge C1 Advanced' },
  fr: { codigo: 'fr', nombre: 'francés', voz: 'fr-FR', examen: 'DALF C1' },
  // El alemán entró el 3-nov-2026 (entrevista en un hotel del Tirol). Sin examen
  // todavía: el objetivo es trabajar en un hotel austriaco, no un certificado.
  de: { codigo: 'de', nombre: 'alemán',  voz: 'de-DE', examen: null },
};

// Dónde se guarda el nivel del test de cada idioma.
const CLAVE_NIVEL = { en: 'nivel_medido', fr: 'nivel_medido_fr', de: 'nivel_medido_de' };
const claveNivel = (lang) => CLAVE_NIVEL[lang] || CLAVE_NIVEL.en;

// El nivel real que Edwin declara (3-nov-2026). Manda sobre el test en la
// conversación con la IA: un B1 en inglés sería pedirle más de lo que tiene, y
// el alemán empieza de cero. El francés sigue con su test.
const NIVEL_REAL = { en: 'A2 tirando a B1', de: 'A1, principiante' };

/**
 * ¿Es un código de idioma de la app? Con `hasOwnProperty` y no con
 * `IDIOMAS[x]`: esto último da por bueno "constructor" o "toString", que
 * existen en cualquier objeto.
 */
const esIdioma = (x) => typeof x === 'string' && Object.prototype.hasOwnProperty.call(IDIOMAS, x);

/** Devuelve un código válido. Lo desconocido cae al inglés, que es lo que había. */
const normalizarIdioma = (x) => (esIdioma(x) ? x : 'en');

module.exports = { IDIOMAS, esIdioma, normalizarIdioma, claveNivel, NIVEL_REAL };
