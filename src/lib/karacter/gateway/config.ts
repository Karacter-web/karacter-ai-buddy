/**
 * Runtime configuration for the Karacter AI gateway
 * (AI_GATEWAY_IMPLEMENTATION.md §9, §10, §11).
 *
 * Everything is read at call time: Cloudflare Workers inject env per request,
 * so a module-scope read would resolve to undefined and make production look
 * "broken" while dev works fine — the exact failure this file fixes.
 */

import type { ProviderConfig, ProviderId } from "../providers/types";

export type Environment = "development" | "preview" | "production";

const DEFAULTS: Record<ProviderId, { baseUrl: string; model: string; name: string }> = {
  gemini: {
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
  },
  mistral: {
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    model: "mistral-large-latest",
  },
};

const env = (name: string) => process.env[name]?.trim() || "";

export function detectEnvironment(): Environment {
  const explicit = env("AI_ENVIRONMENT");
  if (explicit === "development" || explicit === "preview" || explicit === "production") {
    return explicit;
  }
  // A deployment holding its own provider credentials is production by nature.
  if (env("GEMINI_API_KEY") || env("MISTRAL_API_KEY")) return "production";
  return "development";
}

/** Parses AI_ROUTING_POLICY ("gemini:1,mistral:2") into priorities. */
function routingPriorities(): Partial<Record<ProviderId, number>> {
  const raw = env("AI_ROUTING_POLICY");
  if (!raw) return {};
  const out: Partial<Record<ProviderId, number>> = {};
  for (const entry of raw.split(",")) {
    const [id, priority] = entry.split(":").map((part) => part.trim());
    if (id === "gemini" || id === "mistral") {
      const parsed = Number(priority);
      out[id] = Number.isFinite(parsed) ? parsed : 1;
    }
  }
  return out;
}

const CAPABILITIES = {
  chat: true,
  structuredOutput: true,
  streaming: false,
  toolCalling: false,
};

/** Providers that actually have credentials in this runtime, priority-sorted. */
export function loadProviderConfigs(): ProviderConfig[] {
  const environment = detectEnvironment();
  const overrides = routingPriorities();

  const candidates: Array<ProviderConfig> = [
    {
      id: "gemini",
      name: DEFAULTS.gemini.name,
      enabled: true,
      priority: overrides.gemini ?? 1,
      baseUrl: env("GEMINI_BASE_URL") || DEFAULTS.gemini.baseUrl,
      defaultModel: env("GEMINI_MODEL") || DEFAULTS.gemini.model,
      apiKey: env("GEMINI_API_KEY"),
      capabilities: CAPABILITIES,
    },
    {
      id: "mistral",
      name: DEFAULTS.mistral.name,
      enabled: true,
      priority: overrides.mistral ?? 2,
      baseUrl: env("MISTRAL_BASE_URL") || DEFAULTS.mistral.baseUrl,
      defaultModel: env("MISTRAL_MODEL") || DEFAULTS.mistral.model,
      apiKey: env("MISTRAL_API_KEY"),
      capabilities: CAPABILITIES,
    },
  ];

  return candidates
    .filter((provider) => provider.enabled && provider.apiKey.length > 0)
    .sort((a, b) => a.priority - b.priority);
}

export function missingCredentialHint(): string {
  return detectEnvironment() === "production"
    ? "No production AI provider is configured. Add GEMINI_API_KEY (and optionally MISTRAL_API_KEY) as encrypted Cloudflare Worker secrets for karacterhub.xyz, then redeploy."
    : "No AI provider is configured for this environment. Set GEMINI_API_KEY and/or MISTRAL_API_KEY.";
}
