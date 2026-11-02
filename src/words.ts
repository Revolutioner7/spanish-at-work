import { callClaude, parseJson } from "./api";
import { MODEL_CONVERSATION } from "./config";
import { addVocab, saveLookedUpWord } from "./db";
import { wikiImage } from "./turn";

export type WordExplanation = {
  lemma: string;
  emoji: string;
  explicacion: string;
  ejemplo: string;
  contrario: string;
  gesto: string;
  wiki?: string;
  image?: string;
};

// Sin traducciones: la palabra se explica en español sencillísimo, con emoji, ejemplo, contrario y gesto.
const SYSTEM = `Eres profesor de español para principiantes absolutos (nivel A1) que hablan inglés. Explicas palabras SOLO en español sencillo de México: está prohibido traducir o usar otro idioma, ni una sola palabra.

Te dan una palabra y la frase donde aparece. Explica el significado que tiene en ESA frase.

Devuelve solo este JSON:
{"lemma":"","emoji":"","explicacion":"","ejemplo":"","contrario":"","gesto":"","wiki":""}

- lemma: la forma base (infinitivo para los verbos, masculino singular para sustantivos y adjetivos).
- emoji: de 1 a 3 emoji que muestren el significado. Cadena vacía si no hay un emoji claro.
- explicacion: máximo 12 palabras, español muy sencillo, palabras muy frecuentes. Nunca definas una palabra con ella misma.
- ejemplo: una frase corta y distinta, con la palabra.
- contrario: el contrario, si ayuda a entender. Si no, cadena vacía.
- gesto: si existe un gesto típico mexicano o una mímica sencilla que muestre el significado, descríbelo en máximo 10 palabras sencillas (ej. "Mueve la mano hacia la boca, como cuando comes"). Si no, cadena vacía.
- wiki: si es una cosa concreta que se puede ver, el título exacto de la página de es.wikipedia.org con una foto que la muestre. Si no, cadena vacía.`;

const cache = new Map<string, WordExplanation>();

/** Limpia la palabra tocada (sin signos de puntuación, también ¿ y ¡). */
export function cleanWord(raw: string): string {
  return raw.replace(/^[^\p{L}']+|[^\p{L}']+$/gu, "");
}

export async function explainWord(word: string, sentence: string): Promise<WordExplanation> {
  const key = `${word.toLowerCase()}|${sentence}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const text = await callClaude({
    model: MODEL_CONVERSATION,
    systemStatic: SYSTEM,
    messages: [{ role: "user", content: `Palabra: ${word}\nFrase: ${sentence}` }],
    maxTokens: 300,
  });
  const data = parseJson<WordExplanation>(text);
  if (data.wiki) data.image = await wikiImage(data.wiki);
  cache.set(key, data);
  try {
    addVocab({ lemma: data.lemma || word, emoji: data.emoji, imageUrl: data.image, explanation: data.explicacion, source: "tocada" });
  } catch {}
  try {
    saveLookedUpWord(data.lemma || word, sentence, data.emoji, data.explicacion);
  } catch {}
  return data;
}
