// Quién puede entrar y qué recorrido recibe cada persona.
// Para añadir a alguien: su email aquí, su perfil en src/brain/profiles/ y su email en
// ALLOWED_EMAILS de worker/wrangler.jsonc.
import { PROFILES, type Profile } from "./brain/profiles";

type LearnerEntry = { name: string; profileId: keyof typeof PROFILES };

const LEARNERS: Record<string, LearnerEntry> = {
  "scott@thriviti.com": { name: "Scott", profileId: "scott" },
  // Rodrigo, para probar la app viendo lo mismo que Scott.
  "rodrigo@harmat.es": { name: "Rodrigo", profileId: "scott" },
};

export type Learner = { email: string; name: string; profile: Profile };

export function findLearner(rawEmail: string): Learner | null {
  const email = rawEmail.trim().toLowerCase();
  const entry = LEARNERS[email];
  return entry ? { email, name: entry.name, profile: PROFILES[entry.profileId] } : null;
}

// La persona que está usando la app ahora. Se fija al entrar, antes de mostrar ninguna pantalla.
let current: Learner | null = null;
export function setLearner(l: Learner | null) {
  current = l;
}
export function learner(): Learner {
  if (!current) throw new Error("Nobody is signed in.");
  return current;
}
