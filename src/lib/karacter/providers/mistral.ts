import { chatViaOpenAiCompatible } from "./openai-compatible";
import type { ChatRequest, ProviderAdapter, ProviderConfig } from "./types";

/** Mistral's OpenAI-compatible chat API — production fallback provider. */
export function createMistralAdapter(config: ProviderConfig): ProviderAdapter {
  return {
    id: "mistral",
    capabilities: () => config.capabilities,
    chat: (request: ChatRequest) =>
      chatViaOpenAiCompatible(
        {
          id: "mistral",
          baseUrl: config.baseUrl,
          defaultModel: config.defaultModel,
          headers: { Authorization: `Bearer ${config.apiKey}` },
          resolveModel: (requested, fallback) =>
            requested && /^(mistral|open-mistral|ministral|magistral)/.test(requested)
              ? requested
              : fallback,
        },
        request,
      ),
  };
}
