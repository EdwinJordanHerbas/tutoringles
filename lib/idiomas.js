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
};

/**
 * ¿Es un código de idioma de la app? Con `hasOwnProperty` y no con
 * `IDIOMAS[x]`: esto último da por bueno "constructor" o "toString", que
 * existen en cualquier objeto.
 */
const esIdioma = (x) => typeof x === 'string' && Object.prototype.hasOwnProperty.call(IDIOMAS, x);

/** Devuelve un código válido. Lo desconocido cae al inglés, que es lo que había. */
const normalizarIdioma = (x) => (esIdioma(x) ? x : 'en');

module.exports = { IDIOMAS, esIdioma, normalizarIdioma };
