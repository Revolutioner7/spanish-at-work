// Thrivlingo intermediary. Keeps the Anthropic key off the phone.
// Two jobs:
//   POST /chat   -> the character's next line (fast, cheap model)
//   POST /review -> up to three corrections at the end (stronger model)

export interface Env {
  ANTHROPIC_API_KEY: string; // secret: wrangler secret put ANTHROPIC_API_KEY
  APP_TOKEN: string; // secret: same value as EXPO_PUBLIC_APP_TOKEN in the app
  ALLOWED_EMAILS: string; // comma-separated, set in wrangler.toml
}

const CHAT_MODEL = 'claude-haiku-5-5';
const REVIEW_MODEL = 'claude-sonnet-5-5';

type Turn = { role: 'character' | 'learner'; text: string };
type Scenario = {
  situation: string;
  character: { name: string; role: string };
  goal: string;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') return json({ error: 'not found' }, 404);

    if (request.headers.get('x-app-token') !== env.APP_TOKEN) {
      return json({ error: 'unauthorized' }, 401);
    }
    const email = (request.headers.get('x-learner-email') ?? '').trim().toLowerCase();
    const allowed = env.ALLOWED_EMAILS.split(',').map((e) => e.trim().toLowerCase());
    if (!allowed.includes(email)) return json({ error: 'unknown learner' }, 403);

    const body = (await request.json()) as { scenario: Scenario; turns: Turn[] };
    const path = new URL(request.url).pathname;

    try {
      if (path === '/chat') return json(await chat(env, body.scenario, body.turns));
      if (path === '/review') return json(await review(env, body.scenario, body.turns));
      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: String(e) }, 502);
    }
  },
};

async function chat(env: Env, s: Scenario, turns: Turn[]) {
  const system = `You are ${s.character.name}, a ${s.character.role}, in a short Spanish practice role-play.
Situation (for context): ${s.situation}
The learner's goal: ${s.goal}

The learner is an English-speaking adult who is a beginner in Spanish.
Rules:
- Speak natural Mexican Spanish, as a friendly real person would. Use "usted" unless the character is a friend.
- Keep every reply to one or two short, simple sentences. Common words only.
- Stay in character. Never correct the learner during the conversation; if you don't understand, ask again in simpler words, like a patient native speaker.
- Help the learner reach the goal with your questions, but don't do it for them.
- When the goal has clearly been reached, close the scene naturally and set "done" to true.
- Also write a short suggestion of something the learner could say next, in Spanish with its English meaning.

Answer ONLY with JSON, no other text:
{"reply": "...", "translation": "English translation of reply", "suggestion": {"es": "...", "en": "..."}, "done": false}`;

  const messages = toMessages(turns);
  const text = await callClaude(env, CHAT_MODEL, system, messages, 400);
  return parseJson(text);
}

async function review(env: Env, s: Scenario, turns: Turn[]) {
  const transcript = turns
    .map((t) => `${t.role === 'learner' ? 'LEARNER' : s.character.name.toUpperCase()}: ${t.text}`)
    .join('\n');

  const system = `You review a beginner's Spanish practice conversation (Mexican Spanish).
The learner is an English speaker. Their words come from phone speech recognition, so ignore
punctuation, capital letters, and anything that looks like a recognition glitch rather than a real mistake.

Pick AT MOST three mistakes, the ones that matter most for being understood. Fewer is fine.
For each one, give the smallest possible fix (change only what is wrong) and a one-sentence
explanation in plain English, no grammar jargon. If something was correct, don't list it.
Also name one thing the learner did well, in one short English sentence.

Answer ONLY with JSON, no other text:
{"corrections": [{"said": "...", "better": "...", "why": "..."}], "wellDone": "..."}`;

  const text = await callClaude(
    env,
    REVIEW_MODEL,
    system,
    [{ role: 'user', content: `Scenario: ${s.situation}\nGoal: ${s.goal}\n\n${transcript}` }],
    700,
  );
  return parseJson(text);
}

// The conversation is sent to the model with the learner as "user" and the character as "assistant".
// The model API needs the first message to be from the user, so the character's opener is folded in.
function toMessages(turns: Turn[]) {
  const messages: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const t of turns) {
    const role = t.role === 'learner' ? 'user' : 'assistant';
    if (messages.length === 0 && role === 'assistant') {
      messages.push({ role: 'user', content: '(The scene starts.)' });
    }
    const last = messages[messages.length - 1];
    if (last && last.role === role) last.content += `\n${t.text}`;
    else messages.push({ role, content: t.text });
  }
  return messages;
}

async function callClaude(
  env: Env,
  model: string,
  system: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      // The instructions repeat on every turn, so they are cached to cut cost.
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages,
    }),
  });
  if (!res.ok) throw new Error(`model error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  return data.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('');
}

function parseJson(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('model did not return JSON');
  return JSON.parse(text.slice(start, end + 1));
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
