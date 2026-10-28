// Who can sign in, and which practice set each person gets.
// To add someone: add their email here and point it to a profile in profiles.ts.

export const LEARNERS: Record<string, { name: string; profileId: string }> = {
  // Scott Thomas, CEO de Thriviti.
  'scott@thriviti.com': { name: 'Scott', profileId: 'scott' },

  // Rodrigo, para probar la app viendo exactamente lo mismo que Scott.
  'rodrigo@harmat.es': { name: 'Rodrigo', profileId: 'scott' },
};

export function findLearner(email: string) {
  return LEARNERS[email.trim().toLowerCase()] ?? null;
}
