// Talks to the Thrivlingo intermediary (worker/), which holds the AI key.
import { Conversation } from './data/profiles';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? '';

export type Turn = { role: 'character' | 'learner'; text: string };

export type ChatReply = {
  reply: string;
  translation: string;
  suggestion?: { es: string; en: string };
  done?: boolean;
};

export type Review = {
  corrections: { said: string; better: string; why: string }[];
  wellDone: string;
};

async function post<T>(path: string, email: string, conversation: Conversation, turns: Turn[]) {
  if (!API_URL) throw new Error('The app is missing its server address (EXPO_PUBLIC_API_URL).');
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-app-token': APP_TOKEN,
      'x-learner-email': email,
    },
    body: JSON.stringify({
      scenario: {
        situation: conversation.situation,
        character: conversation.character,
        goal: conversation.goal,
      },
      turns,
    }),
  });
  if (!res.ok) throw new Error(`Server error (${res.status}). Please try again.`);
  return (await res.json()) as T;
}

export const nextLine = (email: string, c: Conversation, turns: Turn[]) =>
  post<ChatReply>('/chat', email, c, turns);

export const getReview = (email: string, c: Conversation, turns: Turn[]) =>
  post<Review>('/review', email, c, turns);
