import { learner } from "../learners";
import { allCharacters, CharacterId } from "./characters";
import type { Tappa } from "./types";

/**
 * El recorrido: etapas con una misión de conversación cada una.
 * Se empieza solo con el primer personaje; cada personaje aparece al llegar a su primera etapa.
 * La misión la ve el alumno (en inglés, es una instrucción) y la recibe el personaje
 * para llevar la conversación hacia ella sin decirlo. El repaso final decide si se ha cumplido.
 */

export type { Tappa };

export function tappe(): Tappa[] {
  return learner().profile.tappe;
}

export function getTappa(id: string | undefined): Tappa | undefined {
  return id ? tappe().find((t) => t.id === id) : undefined;
}

/** Índice de la etapa actual (la primera sin superar). tappe().length si ya están todas. */
export function currentIndex(completed: Set<string>): number {
  const i = tappe().findIndex((t) => !completed.has(t.id));
  return i === -1 ? tappe().length : i;
}

/** Personajes disponibles: los que tienen alguna etapa ya alcanzada. */
export function unlockedCharacters(completed: Set<string>): CharacterId[] {
  const reached = tappe().slice(0, currentIndex(completed) + 1);
  return allCharacters()
    .filter((c) => reached.some((t) => t.characterId === c.id))
    .map((c) => c.id);
}

/** Si superar esta etapa abre un personaje nuevo, lo devuelve. */
export function characterUnlockedBy(tappaId: string): CharacterId | undefined {
  const list = tappe();
  const i = list.findIndex((t) => t.id === tappaId);
  const next = list[i + 1];
  if (!next) return undefined;
  const firstOfNext = list.findIndex((t) => t.characterId === next.characterId);
  return firstOfNext === i + 1 ? next.characterId : undefined;
}
