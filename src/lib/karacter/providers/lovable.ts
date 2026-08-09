import { chatViaOpenAiCompatible } from "./openai-compatible";
import type { ChatRequest, ProviderAdapter, ProviderConfig } from "./types";

/**
 * Lovable AI Gateway — DEVELOPMENT / PREVIEW ONLY.
 *
 * The registry never enables this adapter when the runtime resolves to
 * production, so the production request path has no Lovable dependency
 * (AI_GATEWAY_IMPLEMENTATION.md §1.2).
 */
export function createLovableAdapter(config: ProviderConfig): ProviderAdapter {
  return {
    id: "lovable",
    capabilities: () => config.capabilities,
    chat: (request: ChatRequest) =>
      chatViaOpenAiCompatible(
        {
          id: "lovable",
          baseUrl: config.baseUrl,
          defaultModel: config.defaultModel,
          headers: { "Lovable-API-Key": config.apiKey },
          resolveModel: (requested, fallback) => requested || fallback,
        },
        request,
      ),
  };
}
