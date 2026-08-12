# TutorIngles

App para aprender inglés enfocada al día a día por sector (empieza por **dependiente**, que es
el trabajo de Edwin en Sprinter) y de ahí hacia el **C1 de Cambridge**.

**En producción** desde el 20-jul-2026 en `https://tutoringles.tinafusion.com`.

## Stack

**No es Astro ni Next**: PWA en JavaScript sin framework, servida por Express.

- `index.html` + `src/js/`, `src/css/`, `src/img/`
- `server.js` — backend Express
- Dependencias: `express`, `pg`. Gestor: **npm**.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | `node server.js` |
| `npm test` | `node --test` — tests nativos de Node (52, de los que 8 se saltan sin servidor) |
| `npm run test:fsrs` | tests del algoritmo de repetición espaciada |
| `node tools/generar-lexico.js` | regenera el diccionario de pronunciación |

No hay build. Para arrancar en local en Windows: `iniciar-local.cmd`.

**El service worker va por versión: al tocar cualquier JS hay que subir `VERSION` en `sw.js`**,
o los usuarios se quedan con la versión cacheada.

## Que la app se abra

**Medición a los 11 días del plan (2-ago-2026), que es la que manda sobre cualquier intuición:**
1 sesión de estudio, 11 palabras tocadas de 209, y **cero** situaciones, speaking, writing,
exámenes y pronunciación. No falta contenido —hay 12 situaciones, 148 frases, 104 preguntas, 71
pares mínimos—: falta llegar a él. Las tres causas encontradas y lo que se hizo:

- **El aviso estaba construido y apagado.** `push_activo = 0` y CERO filas en
  `push_subscriptions`: el planificador escribía en `push_log` cada noche y enviaba a nadie. Para
  activarlo había que pulsar un icono sin etiqueta de la cabecera, entrar en Ajustes, bajar y
  pulsar. Ahora se pide **en HOY** (`pintarAvisoHoy()` en `src/js/avisos.js`), lo primero de la
  pantalla, y la tarjeta se quita sola en cuanto hay suscripción. En iPhone sin instalar explica
  cómo se instala, porque ahí el permiso ni se puede pedir.
- **PRONUNCIACIÓN no estaba en la barra.** Se llegaba por un botón dentro de HABLAR, y por eso
  `pron_progress` tenía cero filas. Ahora es la pestaña **SONIDOS**, y **EXAMEN salió de la
  barra** (es en diciembre; el mostrador es mañana). Examen y Reglas se abren desde HOY.
- **HOY tenía dos botones primarios.** EMPEZAR competía con EMPEZAR REPASO, más cinco accesos
  rápidos que repetían la barra. Ahora hay **un solo `btn-primary` en toda la sección** —es una
  regla, no una casualidad— y los accesos son sólo los dos destinos sin pestaña.

Otra decisión de la misma medición: el contador de repaso decía **"209 pendientes"** con una meta
de 8, porque el SRS marca como vencida toda palabra no vista. Un número que sólo dice "vas fatal"
y que no corresponde a ningún trabajo real. Ahora dice **"8 para hoy · 209 en total"**.

A los diez días en producción había **0 sesiones de estudio, 0 situaciones practicadas y 3
palabras repasadas de 209**, con toda la app ya construida. El problema no era el contenido:
era que nada recordaba que la app existe y que al abrirla había que decidir por dónde empezar.

- **Aviso diario** — Web Push con VAPID. `lib/avisos.js` compone el texto (dice cuántas palabras
  y qué situación tocan, no un genérico) y el planificador de `server.js` mira cada minuto si es
  la hora. El candado contra duplicados es la clave única de `push_log (profile_id, fecha, tipo)`:
  sin él, un reinicio del contenedor dentro de la ventana horaria manda el aviso dos veces.
  **En iPhone solo funciona con la PWA instalada en la pantalla de inicio** (iOS 16.4+).
- **Sesión de 5 minutos** — `src/js/sesion.js`. Un botón en HOY que encadena palabras del SRS,
  una frase del sector y un par mínimo, y **acaba**. Mientras dura, el resto de HOY se oculta
  (`#sec-hoy.en-sesion`): cada elemento en pantalla es una decisión posible.
- La meta diaria bajó de 20 palabras a 8. La clave es `daily_vocab_target` (no crear otra).

**Las claves VAPID no van al repo.** Se leen de `VAPID_PUBLIC`/`VAPID_PRIVATE` o de un
`vapid.json` junto al servidor (gitignored, ya desplegado en el droplet con permisos 600). Se
admite el fichero porque el contenedor se levantó con `docker run` sin compose, y recrearlo solo
para añadir dos variables no compensa el riesgo. Para regenerarlas:
`node -e "console.log(JSON.stringify(require('web-push').generateVAPIDKeys()))"` — ojo, cambiarlas
invalida las suscripciones existentes.

## Pronunciación figurada

Cómo suena cada palabra, escrito con letras que un español ya sabe leer:
`receipt` → **ri-SIIT**. Mayúsculas = golpe de voz · `ii uu aa oo ëë` = vocal larga ·
`ə` = sonido neutro · `sh zh dj v ng r h` = sonidos que el español no tiene, en color.

**Tres reglas de notación que no se pueden romper** (las tres tienen test):

- **La `ə` nunca va en mayúscula**, ni dentro de una sílaba tónica. `'ə'.toUpperCase()` da `Ə`,
  que no parece una letra: `shirt` salía **SHƏƏT** e `Ə` afectaba al 10 % del diccionario, justo
  en la sílaba que hay que leer con fuerza. La regla está **duplicada a propósito** en
  `enMayusculas()` (lib/respelling.js) y `pronMayus()` (src/js/pron.js), porque el pintado no usa
  el `texto` que manda el servidor: recompone token a token para poder colorear cada sonido. Si
  se arregla solo el servidor, el navegador vuelve a pintar `Ə`.
- **`/ɜː/` se escribe `ëë`, no `əə`** (work → UËËK). Es tónica casi siempre, así que era el
  principal generador de `Ə`.
- **`/h/` se escribe `h` marcada, no `j`** (have → HÆV). Con `j`, todo el mundo la raspaba como
  la jota de "jamón", que es el error que la guía pide evitar. Excepción: detrás de `s` o `z`
  vuelve a ser `j`, porque `sh`/`zh` son otros sonidos en este sistema.

**La leyenda va donde se vea figurada, sin excepción.** Faltaba en la sesión de 5 min y en WORK
—que son los dos sitios donde más se usa la app— y era exactamente el problema: símbolos sin
nada que los explicase. `pronLeyenda()` se abre sola las primeras 8 veces (`pron_ley_vistas` en
localStorage) y después se pliega.

Tres piezas, todas con tests:

- `lib/respelling.js` — AFI → figurada. Silabifica, coloca la tónica y detecta letras mudas.
- `lib/ipa-uk.js` — pasa AFI americano a británico (r que no suena, grupo BATH, /ɒ/…).
- `lib/pronunciacion.js` — texto → figurada en frase, con **formas débiles**: en frase,
  `a` es /ə/ y no /eɪ/. Sin esto el ritmo sale de español.

**La figurada no se guarda en la base**: se calcula al vuelo, para poder afinar el motor sin
reimportar nada. Lo que sí está en la base es el AFI (tabla `lexicon`, 147.488 palabras).

Material didáctico, separado del motor y sin migración (es texto, no datos de usuario):

- `lib/intro-pronunciacion.js` — recorrido de 9 pasos que enseña a leer la figurada. Se abre
  solo la primera vez que se entra en PRONUNCIACIÓN; la marca de vista va en
  `config.pron_intro_vista`, no en localStorage, para que no reaparezca al cambiar de móvil.
  **Borrar esa clave vuelve a lanzarla.**
- `lib/guia-sonidos.js` — guía de consulta de los 16 sonidos y las 3 marcas.

Los dos están ordenados por rentabilidad, no por alfabeto: primero lo que cambia una frase
entera (golpe de voz, palabras reducidas), después los sonidos sueltos.

El diccionario se regenera con `node tools/generar-lexico.js` → `data/lexicon.tsv`
(no va al repo). Combina dos fuentes porque **ninguna basta sola**: el británico de ipa-dict no
trae las palabras más frecuentes (`put`, `get`, `public` faltan) y cubre el 90,2 %; con el
americano convertido sube al 99,8 %.

Correcciones a mano: tabla `pron_overrides` (mandan sobre el diccionario) y columnas
`pron_pairs.ipa_a/ipa_b` cuando una palabra tiene dos pronunciaciones (`live` = /lɪv/ o /laɪv/).

**Aviso de honestidad:** esto es la ENTRADA (saber cómo suena). La corrección de cómo hablas tú
sigue pendiente de la clave de Azure. Lo único medible hoy es el oído, con los pares mínimos.

## Audio

**Todo el audio pasa por `src/js/voz.js`.** Antes la lógica estaba copiada en pron.js, speak.js,
work.js y listening.js, y las cuatro copias tenían el mismo fallo: llamaban a `getVoices()` y
usaban lo que devolviera. **La primera llamada devuelve un array VACÍO** en Chrome, Android e
iOS —la lista llega aparte, con el evento `voiceschanged`—, así que la primera vez que se pulsaba
ESCUCHAR no se asignaba voz y el móvil locutaba el inglés **con la voz española**. De ahí venía
buena parte de "suena a IA".

- `vozDecir(texto, {rate, veces, btn, lang})` — voz del sistema. `rate` 0,9 por defecto: por
  debajo de 0,85 los sintetizadores de móvil estiran los fonemas y suenan peor, no mejor.
- `vozFrase(id, texto, opts)` — audio grabado si existe, voz del sistema si no.
- `vozParar()` — corta las dos cosas.
- La voz se **puntúa**, no se coge la primera en-GB: en el mismo aparato conviven voces
  neuronales y voces "compact" de hace quince años, y la lista no viene ordenada por calidad.
- **Y se puede cambiar a mano** desde Ajustes › VOZ DEL MÓVIL (`vozElegir()` guarda el `voiceURI`
  en `localStorage.voz_preferida`, y manda sobre la puntuación). La heurística acierta o falla
  según el móvil y no hay forma de oírla desde aquí, así que la última palabra la tiene quien
  escucha. Ajustes muestra además **qué voz está usando**, que es el primer dato que hace falta
  cuando alguien dice "suena raro".
- Chrome corta la síntesis a los ~15 s. En textos de más de 120 caracteres (los guiones de
  listening) va un `pause()`+`resume()` periódico que lo evita — **pero nunca en iOS**
  (`vozEsIOS()`). WebKit no tiene el fallo de los 15 s, y ahí ese mismo apaño deja la voz
  apagada y entrecortada: el guion de listening se oía "susurrado" en el iPhone y normal en el PC.
- **El `<audio>` se suelta al terminar** (`removeAttribute('src')` + `load()`), no sólo se pausa.
  Si se deja vivo, iOS mantiene abierta la sesión de audio de *media* y **atenúa la voz del
  sistema en todo lo que venga después**: bastaba con oír una frase en TRABAJO para que las
  palabras de VOCABULARIO sonaran apagadas hasta recargar la app.

**Ojo con los nombres globales.** Los scripts son clásicos y comparten ámbito: dos `const` con el
mismo nombre en dos ficheros **revientan el segundo entero** con "has already been declared", y
el síntoma no apunta al culpable (declarar `esIOS` en voz.js habría tumbado avisos.js, o sea la
tarjeta que activa los avisos). Por eso aquí es `vozEsIOS`. Para comprobarlo de golpe, recorrer
los `<script>` de index.html en orden y buscar identificadores repetidos: hoy son 236 y ninguno
choca.

### Los pares mínimos NO se graban, y es a propósito

Antes de grabar nada se midió si Emily contrasta los pares. **No contrasta el más importante:**
`ship` 472 ms contra `sheep` 482 ms de voz real —un 2 %— cuando en inglés la vocal larga dura
entre una vez y media y dos veces la corta. Los demás sí (`bit`/`beat` +23 %, `bus`/`buzz` +32 %,
`ban`/`van` +24 %), pero en un ejercicio que consiste EN DISTINGUIR dos sonidos, un audio que no
los distingue enseña lo contrario de lo que pretende, y encima suena convincente.

Por eso el entrenador de oído llama a **`pronDecirSinGrabar()`** (pron.js), que fuerza la voz del
sistema. No basta con no grabar los pares: el audio se busca por texto y `cheap` está grabado
como palabra del vocabulario, así que aparecería igual en el par `chip`/`cheap`. La regla vive en
quien reproduce, no en quien graba.

**Toda la app suena con la misma voz (Emily): 148 frases + 248 palabras.** Las palabras se
buscan **por texto, no por id** (`porTexto` en `index.json`, y `audioDePalabra()` en voz.js).
Eso es lo que permite que VOCABULARIO, SONIDOS y la sesión usen la voz grabada **sin tocar una
línea de esas pantallas**: todas llaman a `pronDecir("receipt")` y ninguna conoce el id de la
tabla `words`. La clave de búsqueda se calcula igual en `tools/cortar-audio.js` y en
`src/js/voz.js` —minúsculas, sin acentos ni puntuación—; si se cambia una hay que cambiar la otra.

Las palabras se preparan con `tools/preparar-palabras.js` y **hay que generarlas separadas por
línea en blanco y con `speech_rate: -3`**. Con un simple ". " el modelo lee la lista de corrido
—12 palabras en 6,5 s con cuatro pausas— y no hay manera de cortarla; con línea en blanco son
16,8 s y una pausa limpia por palabra. Un bloque que aun así no cuadre se regenera con `-4` y
tres saltos.

**Audio grabado.** El pipeline produce `src/audio/frase-<id>.mp3`, donde `<id>` es
`situation_lines.id`, y `src/audio/word-<id>.mp3` con `words.id`:

1. `node tools/preparar-audio.js frases.txt` → `data/audio/bloques.txt` + `mapa.json` (28 bloques)
2. Generar cada bloque **en higgsfield.ai con Seed Audio, nunca por MCP** (ver la regla de costes)
3. `show_generations` del MCP (listar no gasta créditos) → guardar en `data/audio/generaciones.json`
4. `node tools/cortar-audio.js` — descarga, corta por silencios y escribe `src/audio/index.json`

**Seed Audio NO está en los modelos ilimitados** (comprobado el 2-ago-2026: los 6 activos son
todos de imagen). Generar audio cuesta créditos **aunque sea por la web**, así que aquí la regla
de generar-solo-en-la-web no ahorra nada y **se puede usar el MCP** (`generate_audio`), que
además da control de `speech_rate` y permite lanzar varias en paralelo. Es la excepción: para
imagen y vídeo la regla sigue en pie, porque ahí sí hay modelos ilimitados.

El precio escala con la longitud: ~1,5-1,6 por bloque de ~215-233 caracteres, ~2,2 por uno de
317. El total de este trabajo fueron **87,7 créditos** (2.349 → 2.261), regeneraciones incluidas.
`get_cost: true` da el precio sin generar nada — usarlo antes de tandas grandes.

La voz es el preset **Emily** (`6b3e3642-f7b7-4cb8-9688-51e233c4b92f`, voice_type `preset`).
Mantenerla si hay que regenerar, o el audio sonará a dos personas distintas.

**`src/audio/index.json` es el que manda**: la app lo lee una vez y así sabe qué frases tienen
voz real sin pedir un mp3 por frase y comerse un 404 por cada una. Lo regenera `cortar-audio.js`
leyendo el directorio, así que describe lo que hay en disco de verdad. Los mp3 y el índice van al
repo (solo `data/` está gitignored), o sea que se despliegan con el `git pull` de siempre.

### Por qué cortar por silencios es difícil (y las tres cosas que hay que saber)

1. **El umbral no puede ser fijo.** La primera versión usaba 1 s, medido sobre una generación de
   tres frases. Con seis, el modelo acelera y las pausas bajan a 0,26-0,79 s: no detectaba
   ninguna. Ahora se **busca** el umbral en dos ejes (duración 0,45→0,08 s y ruido -28→-45 dB),
   porque para algunos bloques no existe ninguna duración que funcione con un ruido fijo.
2. **Pausa ≠ frase.** El modelo hace la misma pausa en cada punto, y muchas frases de la base
   tienen dos oraciones ("No worries at all. Take your time." es UNA frase). Se cuentan las
   oraciones de cada frase y se agrupan los trozos en ese reparto. También hace pausa en comas y
   guiones largos, así que si salen trozos de más se fusionan los separados por el hueco más
   corto, que son justo esos.
3. **Hay que verificar el reparto, no fiarse.** Se comprueba la velocidad de habla resultante de
   cada frase: entre 8 y 42 letras/s. Los cortes buenos caen todos en 10-27; uno mal asignado
   delata enseguida con 103 letras/s (le ha caído el audio de una frase más corta) o con 4. Un
   audio mal asignado enseña a decir mal una frase, que es peor que no tener audio, así que el
   bloque que no pasa se deja fuera entero.
4. **Los mp3 salen a 44,1 kHz aunque la fuente sea de 24 kHz**, y no es un descuido. Un MP3 por
   debajo de 32 kHz no es MPEG-1 sino **MPEG-2 Layer III**, que iOS decodifica mal: en el PC
   sonaba perfecto y en el iPhone se oía metálico y rayado. Resamplear no añade calidad —añade
   compatibilidad—, y el fichero pasa de 2,7 a 4,3 MB en total. Barato. Va con `-ar 44100
   -b:a 96k` y un fundido de 10 ms a cada lado por si algún corte cae pegado a la voz.
5. **Cada frase se sube a -16 LUFS.** Seed Audio entrega entre -21 y -24, y en el móvil eso se
   oye como si te hablaran al oído: el aviso fue literal, *"suena como si me estuviera
   susurrando"*. Se mide el loudness de cada trozo y se aplica **una ganancia fija** (`volume`),
   no el modo dinámico de `loudnorm`: la ganancia constante sube el nivel sin achatar la
   entonación, y en frases de dos segundos la diferencia se nota. El `alimiter` sólo está de red.
   Con esto las 148 quedan entre -16,7 y -15,3 LUFS y ninguna satura.

**Cómo comprobar que el audio está bien antes de darlo por bueno** — los tres números que
importan, y ninguno se ve escuchando en el PC:
`ffmpeg -i frase-N.mp3 -af loudnorm=print_format=json -f null -` → `input_i` cerca de -16,
`input_tp` por debajo de 0, y `ffprobe` diciendo `sample_rate=44100`.

### Cómo arreglar un bloque que no cuadra

El control de velocidad rechazó 13 de los 28 bloques a la primera. Lo que funcionó, por orden —
cada escalón recupera unos cuantos y hay que ir subiendo sólo con los que sigan fallando:

| Medida | Bloques recuperados |
|---|---|
| `speech_rate: -1` | 8 de 13 |
| `speech_rate: -2` | 3 de los 5 restantes |
| `speech_rate: -3` | 1 de los 2 restantes |
| partir el bloque en dos mitades de 3 frases | el último |

**`speech_rate` tiene que ser entero** (con -0.3 el backend devuelve 422). Y no cambia apenas la
duración total —el bloque de saludos duró 12,68 s con -1 frente a 12,69 s con 0— pero **sí
reparte las pausas de otra forma**, que es lo que necesita el cortador. No sirve para hablar más
despacio; sirve para que las pausas se detecten.

El que no se arregló con nada fue el más largo (308 caracteres, 11 oraciones). Ahí la solución es
partirlo: en `mapa.json` se sustituye el bloque por dos con la mitad de frases cada uno y se
generan por separado. **Seis frases por bloque es el techo cómodo; con más de 8 oraciones el
modelo empieza a comerse pausas.**

**Estado a 2-ago-2026: las 148 frases tienen audio real** (3,1 MB en `src/audio/`), verificadas
una a una: ritmo entre 7,8 y 26,5 letras/s, sin duplicados y con `index.json` cuadrando.

## Base de datos

Postgres en el droplet, base `tutoringles` con usuario propio. Esquema por **migraciones
acumulativas idempotentes**, que se aplican a mano y en orden:

`migration.sql` (base) → `_02` backfill de user_words → `_03` gramática y vocabulario →
`_04` motor (exam_questions + currículo de 30 días) → `_05` banco de 120 palabras →
`_06` banco de 48 preguntas → `_07` sectores → `_08` contenido de tienda → `_09` plan retail →
`_10` FSRS → `_11` reading → `_12` iconos → `_13` writing y speaking → `_14` listening →
`_15` iconos por sector → `_16` pronunciación → `_17` AFI por par mínimo → `_18` avisos y sesión.

Tras aplicar la `_16` hay que cargar el diccionario, que no va dentro del SQL:
```
scp data/lexicon.tsv droplet:/tmp/
ssh droplet 'docker exec -i postgres psql -U postgres -d tutoringles \
  -c "\copy lexicon(word,ipa,fuente) FROM STDIN" < /tmp/lexicon.tsv'
```

Se aplican con:
```
docker exec -i postgres psql -U tutoringles -d tutoringles < migration_XX.sql
```

## Despliegue

Contenedor Docker `tutoringles` en el droplet. **El push no despliega.** Hay que hacer:

```
ssh droplet "cd /opt/tutoringles && git pull && docker restart tutoringles"
```

Si el `git pull` se bloquea por un `package-lock.json` sin trackear, borrarlo antes en el droplet.

## Límite real del servidor

El droplet tiene ~1 GB de RAM libre y lo comparte con OkiroSport y n8n. **No proponer
self-hostear modelos** (ya se descartó wav2vec2 por esto). Para pronunciación se usa Azure en
capa gratuita F0. Detalle en las fichas `tutoringles-proyecto` y `tutoringles-deployment`.
