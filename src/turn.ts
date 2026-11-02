import { callClaude, parseJson } from "./api";
import { MODEL_CONVERSATION } from "./config";
import { addVocab } from "./db";
import { learner } from "./learners";

/**
 * Análisis de cada turno, en paralelo a la voz del personaje (no añade espera):
 * - qué dijo mal el alumno y cómo se dice bien (para marcar la reformulación),
 * - qué palabras no sabía o usó mal (van a los juegos de palabras),
 * - qué cosas concretas de la respuesta del personaje se pueden enseñar con una imagen.
 */

export type Visual = { palabra: string; lemma: string; emoji: string; image?: string };
export type TurnAnalysis = {
  correccion: { dijo: string; mejor: string } | null;
  visual: Visual[];
};

function system() {
  const name = learner().name;
  return `You analyze one turn of a spoken Spanish practice conversation (natural Mexican Spanish).
${name} is a beginner; their native language is English. Their sentence is an automatic transcript of their voice: when they don't know a word they say it in English, and it shows up distorted as if it were Spanish (for example "kitchen" may appear as "quiche en").

Return only this JSON, no text around it:
{"correccion":null,"palabras":[],"imagenes":[]}

- correccion: if ${name} said something wrong or in English, {"dijo":"the fragment as they said it","mejor":"how to say it correctly in Spanish, with the smallest change"}. Only the most important thing. null if it's fine or looks like a recognition glitch.
- palabras: Spanish words ${name} didn't know (said them in English) or used wrongly. Each: {"lemma":"base form in Spanish","emoji":"1 to 3 emoji that show it, or empty","wiki":"exact title of the es.wikipedia.org page that illustrates it with a photo, or empty"}.
- imagenes: up to 3 concrete things you can see (food, objects, animals, places, clear actions) mentioned in the character's answer that a beginner would benefit from seeing. Each: {"palabra":"the word as it appears in the answer","lemma":"base form","emoji":"1 to 3 emoji","wiki":"exact es.wikipedia title or empty"}. No abstract or very basic words (hola, sí, bien).
Never write English in the Spanish fields.`;
}

type Raw = {
  correccion: { dijo: string; mejor: string } | null;
  palabras?: { lemma: string; emoji?: string; wiki?: string }[];
  imagenes?: { palabra: string; lemma: string; emoji?: string; wiki?: string }[];
};

const imageCache = new Map<string, string | null>();

/** Foto de la Wikipedia en español para una palabra (gratis, sin clave). */
export async function wikiImage(title: string): Promise<string | undefined> {
  const t = title.trim();
  if (!t) return undefined;
  if (imageCache.has(t)) return imageCache.get(t) ?? undefined;
  try {
    const r = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.replace(/ /g, "_"))}`, {
      headers: { accept: "application/json" },
    });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const src: string | undefined = j.type === "standard" ? j.thumbnail?.source : undefined;
    imageCache.set(t, src ?? null);
    return src;
  } catch {
    imageCache.set(t, null);
    return undefined;
  }
}

export async function analyzeTurn(userText: string, reply: string): Promise<TurnAnalysis> {
  const name = learner().name;
  const text = await callClaude({
    model: MODEL_CONVERSATION,
    systemStatic: system(),
    messages: [{ role: "user", content: `${name} said: ${userText}\n\nThe character answered: ${reply}` }],
    maxTokens: 500,
  });
  const raw = parseJson<Raw>(text);

  for (const p of raw.palabras ?? []) {
    const image = p.wiki ? await wikiImage(p.wiki) : undefined;
    addVocab({ lemma: p.lemma, emoji: p.emoji, imageUrl: image, source: "conversacion" });
  }

  const visual: Visual[] = [];
  for (const v of (raw.imagenes ?? []).slice(0, 3)) {
    const image = v.wiki ? await wikiImage(v.wiki) : undefined;
    if (!image && !v.emoji) continue;
    visual.push({ palabra: v.palabra, lemma: v.lemma, emoji: v.emoji ?? "", image });
  }

  const c = raw.correccion;
  return {
    correccion: c && c.dijo && c.mejor && c.dijo.trim() !== c.mejor.trim() ? c : null,
    visual,
  };
}
