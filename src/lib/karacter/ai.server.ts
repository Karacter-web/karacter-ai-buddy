/**
 * Shared Lovable AI Gateway access for Karacter server functions.
 *
 * Why this exists: on the Lovable preview the gateway key is injected for us,
 * but a self-hosted deployment (Cloudflare Workers on karacterhub.xyz) has its
 * own environment. If the key is not copied into the Worker's secrets, every
 * planner call fails with an opaque 500 and the assistant looks "dead" even
 * though auth and the database still work. We therefore:
 *   1. read the key at call time (Workers inject env per request),
 *   2. accept an alternate variable name for non-Lovable hosts,
 *   3. fail with an actionable message instead of a generic error.
 */

const DEFAULT_GATEWAY = "https://ai.gateway.lovable.dev/v1";

export type AiConfig = { key: string; baseUrl: string };

export function readAiConfig(): AiConfig | null {
  const key =
    process.env["LOVABLE_API_KEY"] ||
    process.env["AI_GATEWAY_API_KEY"] ||
    "";
  if (!key) return null;
  const baseUrl = (process.env["AI_GATEWAY_URL"] || DEFAULT_GATEWAY).replace(/\/$/, "");
  return { key, baseUrl };
}

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export function requireAiConfig(): AiConfig {
  const config = readAiConfig();
  if (!config) {
    throw new AiUnavailableError(
      "Karacter's AI brain is not configured on this deployment. Add LOVABLE_API_KEY as an encrypted secret to the Cloudflare Worker (Settings → Variables and Secrets) and redeploy.",
    );
  }
  return config;
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** Calls the gateway and returns the raw assistant message content. */
export async function chatJson(messages: ChatMessage[], model = "google/gemini-3.6-flash") {
  const { key, baseUrl } = requireAiConfig();

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({ model, response_format: { type: "json_object" }, messages }),
    });
  } catch (error) {
    throw new AiUnavailableError(
      `Could not reach the AI gateway from this deployment: ${
        error instanceof Error ? error.message : "network error"
      }`,
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new AiUnavailableError(
      "The AI gateway rejected this deployment's key. Rotate LOVABLE_API_KEY and set the new value in the Cloudflare Worker secrets.",
    );
  }
  if (response.status === 429) throw new Error("Karacter is rate limited. Try again shortly.");
  if (response.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
  if (!response.ok) {
    throw new Error(`AI gateway error ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content ?? "{}";
}
