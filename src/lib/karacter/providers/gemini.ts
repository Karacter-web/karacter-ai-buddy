import { chatViaOpenAiCompatible } from "./openai-compatible";
import type { ChatRequest, ProviderAdapter, ProviderConfig } from "./types";

/**
 * Google Gemini via its OpenAI-compatible endpoint, so the shared transport,
 * JSON mode and response shape are identical to the other providers.
 *
 * Model ids the app passes (e.g. "google/gemini-3.6-flash") are Lovable
 * gateway ids, not Google ids — they are only honoured when they already look
 * like a native Gemini id, otherwise the provider default is used.
 */
export function createGeminiAdapter(config: ProviderConfig): ProviderAdapter {
  return {
    id: "gemini",
    capabilities: () => config.capabilities,
    chat: (request: ChatRequest) =>
      chatViaOpenAiCompatible(
        {
          id: "gemini",
          baseUrl: config.baseUrl,
          defaultModel: config.defaultModel,
          headers: { Authorization: `Bearer ${config.apiKey}` },
          resolveModel: (requested, fallback) =>
            requested && /^gemini-/.test(requested) ? requested : fallback,
        },
        request,
      ),
  };
}
