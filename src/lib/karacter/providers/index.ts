import { loadProviderConfigs } from "../gateway/config";
import { createGeminiAdapter } from "./gemini";
import { createMistralAdapter } from "./mistral";
import type { ProviderAdapter, ProviderConfig } from "./types";

const FACTORIES = {
  gemini: createGeminiAdapter,
  mistral: createMistralAdapter,
} as const;

export type RegisteredProvider = { config: ProviderConfig; adapter: ProviderAdapter };

/** Priority-ordered providers available in this runtime. */
export function resolveProviders(): RegisteredProvider[] {
  return loadProviderConfigs().map((config) => ({
    config,
    adapter: FACTORIES[config.id](config),
  }));
}
