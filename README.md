# Thrivlingo

Spanish voice practice for the Thriviti team. Each person signs in with their work email and gets
conversations built around their own interests. Every conversation has the same structure
(a situation, a character, a goal), only the topics change.

## How it is organised

- `App.tsx`: sign-in, list of conversations.
- `src/Practice.tsx`: the voice conversation and the final review (at most three corrections).
- `src/data/learners.ts`: who can sign in and which practice set they get.
- `src/data/profiles.ts`: the practice sets (one per person).
- `worker/`: small Cloudflare service that keeps the AI key off the phone.
  Haiku plays the character, Sonnet writes the final review.

## Adding a person

1. Add their email in `src/data/learners.ts`.
2. Add their practice set in `src/data/profiles.ts`.
3. Add their email to `ALLOWED_EMAILS` in `worker/wrangler.toml`.

## Settings the server needs (set in the Cloudflare dashboard, never in the code)

- `ANTHROPIC_API_KEY`
- `APP_TOKEN` (same value as `EXPO_PUBLIC_APP_TOKEN` in `eas.json`)
