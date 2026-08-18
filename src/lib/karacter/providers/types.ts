/**
 * Provider-neutral types for the Karacter AI gateway.
 *
 * Per AI_GATEWAY_IMPLEMENTATION.md §7/§8: the application never learns which
 * provider answered. Everything above the adapter boundary speaks these types.
 */

export type ProviderId = "gemini" | "mistral";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatRequest = {
  messages: ChatMessage[];
  model?: string | undefined;
  temperature?: number | undefined;
  maxTokens?: number | undefined;
  responseFormat?: "text" | "json" | undefined;
};

export type ChatResponse = {
  content: string;
  provider: ProviderId;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  finishReason: string;
};

export type AiResponse = ChatResponse & {
  metadata: {
    latencyMs: number;
    fallback: boolean;
    fallbackReason?: string;
    primaryProvider?: ProviderId;
  };
};

export type ProviderCapabilities = {
  chat: boolean;
  structuredOutput: boolean;
  streaming: boolean;
  toolCalling: boolean;
};

export type ProviderConfig = {
  id: ProviderId;
  name: string;
  enabled: boolean;
  priority: number;
  baseUrl: string;
  defaultModel: string;
  apiKey: string;
  capabilities: ProviderCapabilities;
};

export interface ProviderAdapter {
  id: ProviderId;
  chat(request: ChatRequest): Promise<ChatResponse>;
  capabilities(): ProviderCapabilities;
}
