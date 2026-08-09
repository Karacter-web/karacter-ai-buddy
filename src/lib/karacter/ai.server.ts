/**
 * Karacter's AI entry point. The public interface is deliberately unchanged
 * (AI_GATEWAY_IMPLEMENTATION.md §14) — callers still use `chatJson` and
 * `readAiConfig`; only the implementation moved behind the provider gateway.
 *
 * Why production was failing: this module used to talk to the Lovable gateway
 * directly and required LOVABLE_API_KEY. The Cloudflare Worker serving
 * karacterhub.xyz has no such key, so every planner call threw. Production now
 * routes Gemini -> Mistral from its own Cloudflare secrets, with Lovable kept
 * as a dev/preview-only adapter.
 */

import { detectEnvironment, missingCredentialHint } from "./gateway/config";
import { AiProviderError, AiUnavailableError } from "./gateway/errors";
import { availableProviderIds, hasProvider, routeChat } from "./gateway/router";
import type { ChatMessage } from "./providers/types";

export { AiUnavailableError };
export type { ChatMessage };

export type AiConfig = { environment: string; providers: string[] };

/** Non-throwing probe used by best-effort callers (e.g. memory distillation). */
export function readAiConfig(): AiConfig | null {
  const providers = availableProviderIds();
  if (!providers.length) return null;
  return { environment: detectEnvironment(), providers };
}

export function requireAiConfig(): AiConfig {
  const config = readAiConfig();
  if (!config) throw new AiUnavailableError(missingCredentialHint());
  return config;
}

/** Requests a JSON object response and returns the raw assistant content. */
export async function chatJson(messages: ChatMessage[], model?: string): Promise<string> {
  if (!hasProvider()) throw new AiUnavailableError(missingCredentialHint());

  try {
    const response = await routeChat({
      messages,
      ...(model !== undefined ? { model } : {}),
      responseFormat: "json",
    });
    return response.content || "{}";
  } catch (error) {
    if (error instanceof AiProviderError) {
      if (error.kind === "auth") {
        throw new AiUnavailableError(
          "The AI provider rejected this deployment's credentials. Check the API keys in the Cloudflare Worker secrets and redeploy.",
        );
      }
      if (error.kind === "rate_limit") throw new Error("Karacter is rate limited. Try again shortly.");
      throw new Error(`Karacter's AI brain is temporarily unavailable (${error.kind}).`);
    }
    throw error;
  }
}
