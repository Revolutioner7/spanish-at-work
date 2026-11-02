/**
 * Intermediario de Thrivlingo en Cloudflare Workers (basado en el de Tavola).
 *
 * - POST /v1/messages: pasa la petición a Claude con la clave guardada (ANTHROPIC_API_KEY).
 * - GET  /v1/tts?text=...&voice=...&rate=...: devuelve el audio MP3 de la voz de Google
 *   (Chirp 3 HD, español de EE. UU.) usando GOOGLE_TTS_KEY. Cada frase se guarda en caché,
 *   así repetirla no gasta caracteres de Google.
 * Solo acepta peticiones con la clave propia de la app (THRIVLINGO_APP_KEY) y de un email
 * de la lista ALLOWED_EMAILS.
 */

export interface Env {
  ANTHROPIC_API_KEY: string;
  THRIVLINGO_APP_KEY: string;
  GOOGLE_TTS_KEY?: string;
  ALLOWED_EMAILS: string;
}

const ALLOWED_MODELS = new Set(["claude-haiku-5-5", "claude-sonnet-5-5"]);
const MAX_TOKENS_LIMIT = 2000;
const VOICE_RE = /^es-US-Chirp3-HD-[A-Za-z]+$/;
const MAX_TTS_CHARS = 600;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, tts: Boolean(env.GOOGLE_TTS_KEY) });
    }

    if (!env.THRIVLINGO_APP_KEY || request.headers.get("x-thrivlingo-key") !== env.THRIVLINGO_APP_KEY) {
      return json({ error: "unauthorized" }, 401);
    }
    const email = (request.headers.get("x-learner-email") || "").trim().toLowerCase();
    const allowed = (env.ALLOWED_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes(email)) {
      return json({ error: "unknown_learner" }, 403);
    }

    if (request.method === "GET" && url.pathname === "/v1/tts") {
      return tts(url, env, ctx);
    }

    if (request.method !== "POST" || url.pathname !== "/v1/messages") {
      return json({ error: "not_found" }, 404);
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    if (!ALLOWED_MODELS.has(body?.model)) {
      return json({ error: "model_not_allowed" }, 400);
    }
    body.max_tokens = Math.min(Number(body.max_tokens) || 400, MAX_TOKENS_LIMIT);
    delete body.stream;

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  },
};

async function tts(url: URL, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (!env.GOOGLE_TTS_KEY) return json({ error: "tts_not_configured" }, 503);
  const text = (url.searchParams.get("text") || "").trim();
  const voice = url.searchParams.get("voice") || "es-US-Chirp3-HD-Kore";
  const rate = Math.min(Math.max(Number(url.searchParams.get("rate")) || 1, 0.5), 1.5);
  if (!text || text.length > MAX_TTS_CHARS) return json({ error: "bad_text" }, 400);
  if (!VOICE_RE.test(voice)) return json({ error: "bad_voice" }, 400);

  // Caché por frase, voz y velocidad (ni la clave ni el email forman parte de la clave de caché)
  const cacheKey = new Request(`https://tts-cache.thrivlingo/${encodeURIComponent(voice)}/${rate}/${encodeURIComponent(text)}`);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const g = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${env.GOOGLE_TTS_KEY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "es-US", name: voice },
      audioConfig: { audioEncoding: "MP3", speakingRate: rate },
    }),
  });
  if (!g.ok) {
    const detail = await g.text().catch(() => "");
    return json({ error: "google_error", status: g.status, detail: detail.slice(0, 300) }, 502);
  }
  const data: any = await g.json();
  const bytes = Uint8Array.from(atob(data.audioContent || ""), (c) => c.charCodeAt(0));
  const res = new Response(bytes, {
    headers: { "content-type": "audio/mpeg", "cache-control": "public, max-age=31536000" },
  });
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
