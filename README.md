# Thrivlingo

App para que el equipo de Thriviti practique español hablado. Cada persona entra con su email
y encuentra su recorrido ya preparado: la misma estructura para todos, con temas sacados de sus aficiones.
Proyecto separado de Tavola, aunque está construido sobre lo que ya funciona allí.

## Versión 1.0.0

- Entrada con email. Si entra otra persona en el mismo iPhone, se borra lo anterior para no mezclar datos.
- Recorrido de 12 etapas, cada una con una misión. Los personajes aparecen al llegar a su primera etapa
  (Lupita, Toño, Mariana y Don Ramón, en El Patio, un café mexicano inventado de Austin).
- Sin traducciones: cada palabra del personaje se puede tocar y se explica en español sencillo,
  con emoji, foto de la Wikipedia en español, un ejemplo, el contrario y un gesto.
- «How do I say…?»: lo dices en inglés y la app te da solo la frase en español para repetirla.
- «Ayuda»: el personaje lo dice más fácil, con un ejemplo o dos opciones.
- Reformulación: el personaje repite bien lo que dijiste mal, sin cortar la conversación.
- Repaso final: hasta tres errores con explicación en inglés, una cosa bien hecha, frases para quedarse
  y si se ha cumplido la misión. Los personajes recuerdan lo que les cuentas.
- Libro de errores, «Tell Lupita» (4/3/2 con métricas de fluidez) y dos juegos de repaso espaciado.
- Voz natural de Google (Chirp 3 HD, español de EE. UU.) con la voz del iPhone de reserva.
- Turnos sin botones: el personaje termina, la app te escucha y envía cuando haces una pausa.

Lecciones de Tavola ya aplicadas: razonamiento interno apagado (si no, respuestas vacías),
actualizaciones publicadas en el canal y no en una rama, la clave nunca en un repositorio público.

## Piezas

- `App.tsx` y `src/`: la app (Expo, SDK 58).
- `src/learners.ts`: quién puede entrar y qué perfil recibe.
- `src/brain/profiles/`: un perfil por persona (personajes, etapas, temas del 4/3/2).
- `src/brain/`: interferencias del inglés, instrucciones para la IA.
- `src/config.ts`: dirección del intermediario y clave de la app.
- `worker/`: intermediario en Cloudflare Workers.
- `.eas/workflows/deploy.yml`: despliegue automático.

## Añadir a una persona

1. Su email en `src/learners.ts`.
2. Su perfil en `src/brain/profiles/` y en `src/brain/profiles/index.ts`.
3. Su email en `ALLOWED_EMAILS` de `worker/wrangler.jsonc`.

## Secretos del intermediario (en Cloudflare, nunca en el código)

- `ANTHROPIC_API_KEY`: clave de la consola de Claude.
- `THRIVLINGO_APP_KEY`: la misma que `APP_KEY` en `src/config.ts`.
- `GOOGLE_TTS_KEY`: clave de Google Cloud con Text-to-Speech activado.

## Cómo llegan los cambios al iPhone

Se suben a GitHub (rama main). Si no hace falta app nueva, llega como actualización por el aire;
si hace falta, Expo compila y la envía a TestFlight.
