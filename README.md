# TutorInglés

PWA personal para aprender inglés y francés **del día a día primero, y del examen después**.
Desde septiembre de 2026 el francés (Suiza romanda) va por delante, y hay un **modo Tetris**:
rondas cortas de día, repaso antes de dormir, pistas de audio durmiendo y un test por la mañana
que mide si la noche sirve.

> **En producción:** https://tutoringles.tinafusion.com

---

## Misión

Que hables inglés en tu trabajo y en tu vida diaria desde la primera semana, entrenando
lo que de verdad vas a decir — no lo que viene en el temario.

## Visión

Un tutor personal que arranca del sector de cada uno (dependiente, hostelería, sanidad,
oficina) y lo lleva de ahí hasta un C1 de Cambridge, sin que el alumno note dónde acaba
el inglés útil y empieza el del examen.

## Valores

1. **Producir antes que reconocer.**
   Nada de elegir la respuesta correcta de una lista. Si no lo has dicho o escrito tú,
   no cuenta. Es el fallo documentado de las apps gamificadas: entrenan reconocimiento
   cuando la comunicación real es casi toda producción.

2. **Primero tu mostrador, luego el mundo.**
   El vocabulario entra por la situación que vas a vivir mañana, no por orden alfabético
   ni por nivel teórico.

3. **La boca importa tanto como la regla.**
   Pronunciación medida de verdad, fonema a fonema. Nada de aprobados de cortesía por
   comparar texto transcrito.

4. **Gramática la justa**, y siempre al servicio de una frase que ibas a decir igualmente.

5. **El C1 no es otra asignatura.**
   Es el mismo inglés con formato de examen encima.

6. **Honestidad con el progreso.**
   Si no sabes algo, la app te lo dice. Sin rachas que maquillen, y sin niveles
   inventados: cuando no hay datos, se dice que no hay datos.

---

## Los dos carriles

La app entrena en paralelo, con un solo sistema de repaso compartido:

| Carril | Qué es | Para qué |
|---|---|---|
| **Diario** | Situaciones reales de tu sector (`tracks`) | Hablar mañana en el trabajo |
| **C1** | Las 5 destrezas del Cambridge C1 Advanced | Sacarse el título |

El plan de 30 días reparte entre ambos: cada día trae su situación de trabajo,
su lote de vocabulario, su foco de gramática y su tarea de speaking.

---

## Arquitectura

```
Navegador (PWA)
   │  HTTPS
nginx (Certbot/Let's Encrypt)
   │  proxy_pass 127.0.0.1:3401
Docker: tutoringles (node:20-alpine)  ← Express, server.js
   │
Docker: postgres:16                   ← base "tutoringles"
```

- **Backend:** Node 18+ / Express / `pg`. API en `server.js`, lógica de repaso en `lib/`.
- **Frontend:** PWA vanilla, sin framework. `index.html` + `src/js/*` + `src/css/*`.
- **Auth:** clave única (`APP_TOKEN`) por cabecera `Authorization: Bearer` o `?token=`.
  Sin `APP_TOKEN` la API queda abierta (modo desarrollo).
- **Host:** droplet DigitalOcean (Ámsterdam), compartido con n8n y otros servicios.
  UFW abre solo 22/80/443; Postgres nunca se expone a internet.

## Estructura

| Archivo | Qué hace |
|---|---|
| `server.js` | API completa |
| `lib/fsrs.js` | Motor de repetición espaciada (FSRS) |
| `src/js/app.js` | Init, auth, navegación, XP, helper `ico()` |
| `src/js/work.js` | **Carril diario**: sectores, situaciones, role-play |
| `src/js/vocab.js` | Flashcards + SRS con cuatro grados |
| `src/js/speak.js` | Práctica de pronunciación |
| `src/js/grammar.js` | Lecciones |
| `src/js/exam.js` | Panel de simulacros + Reading |
| `src/js/listening.js` | Listening: audio, transcripción y corrección |
| `src/js/writing.js` | Writing (rúbrica de Cambridge) y Speaking (cronómetro) |
| `src/js/plan.js` | Plan de 30 días (inglés) y plan por fases (francés) |
| `src/js/tetris.js` | **Modo Tetris**: rondas, almohada, modo noche y test del despertar |
| `src/js/sons.js` | SONIDOS con el francés: contrastes para hispanohablantes |
| `lib/tetris.js` | Lógica del modo Tetris (día de estudio, reparto, veredicto) |
| `lib/fases.js` | Fases del plan del francés |
| `lib/idiomas.js` | Los dos idiomas |
| `lib/test-frances.js` | Test de nivel del francés (A2 → C1) |
| `src/js/progress.js` | Estadísticas y nivel estimado |

### Migraciones

Se aplican en orden. Todas son idempotentes: se pueden reejecutar sin romper nada.

```bash
docker exec -i postgres psql -U postgres -d tutoringles -v ON_ERROR_STOP=1 < migration_XX.sql
```

| Migración | Contenido |
|---|---|
| `migration.sql` | Esquema base |
| `migration_02_userwords_backfill.sql` | Backfill de `user_words` |
| `migration_03_content.sql` | Gramática y vocabulario inicial |
| `migration_04_engine.sql` | Motor de examen + plan de 30 días |
| `migration_05_vocab_bank.sql` | Banco de vocabulario |
| `migration_06_exam_bank.sql` | Banco Use of English (partes 1–4) |
| `migration_07_tracks.sql` | Sectores, situaciones y perfiles |
| `migration_08_retail_content.sql` | Contenido: dependiente / tienda |
| `migration_09_plan_retail.sql` | El plan de 30 días incorpora el carril diario |
| `migration_10_fsrs.sql` | SRS: de SM-2 a FSRS |
| `migration_11_reading.sql` | Reading C1 (partes 5–8) |
| `migration_12_iconos.sql` | Los iconos dejan de ser emojis |
| `migration_13_writing_speaking.sql` | Writing y Speaking C1 |
| `migration_14_listening.sql` | Listening C1 |
| `migration_15` … `_23` | Iconos, pronunciación, avisos, pares, tandas, test de nivel |
| `migration_24_idiomas_y_tetris.sql` | Columna `lang` y tablas del modo Tetris |
| `migration_25_frances_vocabulario.sql` | 217 palabras y frases de francés |
| `migration_26_frances_situaciones.sql` | 12 situaciones de la Suiza romanda |
| `migration_27_frances_gramatica.sql` | 8 lecciones de gramática francesa |
| `migration_28_ingles_c1.sql` | 116 entradas más de inglés C1 |
| `migration_29_escribir_y_oral_por_idioma.sql` | Idioma y nivel en tareas y notas |
| `migration_30_frances_escribir_y_oral.sql` | Correos para Suiza, síntesis y ensayo del DALF, y el oral |
| `migration_31_comprension_por_idioma_y_sin_fecha.sql` | Idioma en Reading/Listening; el CAE sin fecha |
| `migration_32_frances_comprension.sql` | Comprensión oral y escrita en francés, B1 → C1 |

**Ojo:** desde la 07, todo el progreso cuelga de `profile_id` y los índices únicos
son compuestos. Cualquier `ON CONFLICT` nuevo debe nombrar las dos columnas
(`ON CONFLICT (profile_id, date)`), nunca solo una.

---

## Desarrollo local

```bash
npm install
createdb -U odoo tutoringles
psql -U odoo -d tutoringles -f migration.sql   # y el resto en orden
iniciar-local.cmd                              # o: npm start
```

Sin base de datos: abre `http://localhost:3400?mock=1`.

## Tests

```bash
npm test        # unitarios; los de API se saltan solos si no hay servidor

TUTOR_URL=https://tutoringles.tinafusion.com TUTOR_TOKEN=xxx npm test   # incluye la API
```

Los tests de FSRS no comprueban números concretos —eso solo verificaría que la
fórmula es la que es—, sino las **propiedades** que el algoritmo debe cumplir:
que acertar consolide y fallar no, que repasar tarde consolide más que repasar
pronto, que la dificultad no se salga de 1–10 y que ningún estado dé `NaN`.

Los de API comprueban, entre otras cosas, que las tareas **nunca envían la
respuesta correcta al cliente** y que Reading y Listening tienen exactamente el
número de preguntas del examen real.

## Despliegue

```bash
scp <archivos> droplet:/opt/tutoringles/...
ssh droplet 'docker restart tutoringles'
```

`/opt/tutoringles` está montado dentro del contenedor en `/app`.

**Cuidado con el orden:** si un cambio añade un archivo nuevo que `server.js`
requiere (por ejemplo `lib/`), hay que subir ese archivo **antes** que
`server.js`, o el contenedor arranca roto.

Al crear tablas nuevas como `postgres`, hay que dar permisos al usuario de la
app o responderá `permission denied for table X`:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "tutoringles";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "tutoringles";
```

---

## Diseño

Los iconos son propios (`src/img/icons`), generados con Higgsfield y recortados
con `higgsfield/recortar_iconos.ps1`. **No se usan emojis**: cada sistema
operativo los dibuja a su manera y no forman un lenguaje visual propio.

Para poner un icono desde JavaScript:

```js
ico('trophy')       // 20 px
ico('trophy', 32)   // tamaño concreto
```

Los tamaños por contexto (barra de navegación, logros, botones) están definidos
en `components.css`; no hace falta pasarlos a mano.

---

## Estado

- [x] Desplegado con SSL y funcionando
- [x] Vocabulario con SRS · gramática · plan de 30 días
- [x] Carril diario: sector retail, integrado en el plan de 30 días
- [x] **Las cinco destrezas del C1 cubiertas**
- [x] SRS con **FSRS**: cuatro grados, previsión de intervalos e historial de repasos
- [x] Set de iconos propio, sin emojis · icono de PWA nuevo
- [x] Niveles honestos: sin datos, no se inventa un nivel
- [x] Tests (`npm test`)
- [ ] Pronunciación fonema a fonema — **bloqueado**: falta la clave de Azure Speech F0
- [ ] Minimal pairs para hispanohablantes + shadowing
- [ ] Audio grabado del Listening y de las 148 frases de retail
- [ ] Más sectores (hostelería, recepción, sanidad)

### Cobertura del examen

| Destreza | Contenido | Corrección |
|---|---|---|
| Use of English (partes 1–4) | 48 preguntas | Automática |
| Reading (partes 5–8) | 4 textos · **26 preguntas** | Automática |
| Listening (4 partes) | 4 grabaciones · **30 preguntas** | Automática |
| Writing (2 partes) | 6 tareas | Rúbrica de Cambridge, autoevaluada |
| Speaking (4 partes) | 5 tareas con cronómetro | Autoevaluada |

Reading y Listening tienen exactamente el número de preguntas del examen real, y
hay un test que lo verifica en cada ejecución.
