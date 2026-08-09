/**
 * Routing and fallback (AI_GATEWAY_IMPLEMENTATION.md §11, §12).
 *
 * Tries providers in configured priority order, falling through only on
 * transient failures. Config/auth/malformed-request failures return
 * immediately so a misconfigured deployment is loud rather than silent.
 */

import { resolveProviders } from "../providers";
import type { AiResponse, ChatRequest, ProviderId } from "../providers/types";
import { missingCredentialHint } from "./config";
import { AiProviderError, AiUnavailableError } from "./errors";

export function hasProvider(): boolean {
  return resolveProviders().length > 0;
}

export function availableProviderIds(): ProviderId[] {
  return resolveProviders().map((provider) => provider.config.id);
}

export async function routeChat(request: ChatRequest): Promise<AiResponse> {
  const providers = resolveProviders();
  if (!providers.length) throw new AiUnavailableError(missingCredentialHint());

  const startedAt = Date.now();
  const primary = providers[0]!.config.id;
  const failures: string[] = [];

  for (let index = 0; index < providers.length; index += 1) {
    const { adapter } = providers[index]!;
    try {
      const response = await adapter.chat(request);
      return {
        ...response,
        metadata: {
          latencyMs: Date.now() - startedAt,
          fallback: index > 0,
          ...(index > 0
            ? { fallbackReason: failures[failures.length - 1]!, primaryProvider: primary }
            : {}),
        },
      };
    } catch (error) {
      if (!(error instanceof AiProviderError)) throw error;
      failures.push(`${error.provider}: ${error.kind}`);
      // Terminal classes never fall through to another provider.
      if (!error.transient) throw error;
      console.error(`[ai-gateway] ${error.provider} failed (${error.kind}): ${error.message}`);
    }
  }

  throw new AiProviderError(
    primary,
    "upstream",
    `All AI providers failed — ${failures.join("; ")}`,
  );
}
