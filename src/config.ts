// Conexión con el intermediario de Cloudflare (worker/).
// API_URL: rellenar con la dirección que da Cloudflare al publicar el Worker.
// APP_KEY: la misma que se guarda en Cloudflare como secreto THRIVLINGO_APP_KEY.
// Este repositorio es privado: si algún día se hace público, hay que cambiar la clave.
export const API_URL = "https://thrivlingo-api.REPLACE-ME.workers.dev";
export const APP_KEY = "4q3JMg4rWFxgqoCOwUND3vh2rqpR5KvA";

export const MODEL_CONVERSATION = "claude-haiku-5-5";
export const MODEL_DEBRIEF = "claude-sonnet-5-5";

export const CONVERSATION_MINUTES = 12; // duración objetivo de una conversación
export const WRAP_UP_MINUTES = 10; // a partir de aquí se avisa al personaje de que cierre

// Idioma que se practica y voces de Google (Chirp 3 HD solo existe en español para es-US y es-ES).
export const TARGET_LANG = "es-US"; // reconocimiento de voz y voz del iPhone de reserva
export const LEARNER_LANG = "en-US"; // para «How do I say…?»
