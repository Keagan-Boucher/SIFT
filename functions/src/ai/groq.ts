import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";

/** Set with `firebase functions:secrets:set GROQ_API_KEY`. Every function that calls Groq must list it in `secrets`. */
export const GROQ_API_KEY = defineSecret("GROQ_API_KEY");

/** The 20b is faster, but blocked on this Groq org; enable it at console.groq.com/settings/limits to switch. */
const MODEL = "openai/gpt-oss-120b";

/** A search must never wait long on a helper: past this it carries on without one. */
const TIMEOUT_MS = 8000;

/**
 * One JSON-mode chat completion. Returns null on any failure (no key, timeout,
 * rate limit, bad JSON) so every caller falls back to the deterministic path.
 * The secret is exposed to the runtime as an env var; reading it there keeps
 * tests, which have no key, silently on the fallback.
 */
export async function groqJson<T>(system: string, user: string): Promise<T | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      logger.warn(`groq ${response.status}: ${(await response.text()).slice(0, 200)}`);
      return null;
    }
    const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = body.choices?.[0]?.message?.content;
    return content ? (JSON.parse(content) as T) : null;
  } catch (error) {
    logger.warn("groq call failed", error);
    return null;
  }
}
