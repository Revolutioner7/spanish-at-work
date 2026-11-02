import { learner } from "../learners";
import type { Character } from "./types";

export type CharacterId = string;
export type { Character };

export function allCharacters(): Character[] {
  return learner().profile.characters;
}

export function getCharacter(id: CharacterId): Character {
  const c = allCharacters().find((x) => x.id === id);
  if (!c) throw new Error(`Unknown character: ${id}`);
  return c;
}

export function settingContext(): string {
  return learner().profile.setting;
}
