/**
 * Shared transport for providers exposing an OpenAI-compatible
 * `/chat/completions` endpoint (Gemini's OpenAI layer, Mistral, and the
 * Lovable gateway). Each adapter supplies only its auth headers and model
 * resolution; response normalization (§13) happens here once.
 */

import { AiProviderError, classifyStatus } from "../gateway/errors";
import type { ChatRequest, ChatResponse, ProviderId } from "./types";

const DEFAULT_TIMEOUT_MS = 30_000;

type Options = {
  id: ProviderId;
  baseUrl: string;
  defaultModel: string;
  headers: Record<string, string>;
  resolveModel: (requested: string | undefined, fallback: string) => string;
  supportsJsonMode?: boolean;
};

type OpenAiPayload = {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

export async function chatViaOpenAiCompatible(
  options: Options,
  request: ChatRequest,
): Promise<ChatResponse> {
  const model = options.resolveModel(request.model, options.defaultModel);
  const wantsJson = request.responseFormat === "json";

  const body: Record<string, unknown> = {
    model,
    messages: request.messages,
    ...(wantsJson && options.supportsJsonMode !== false
      ? { response_format: { type: "json_object" } }
      : {}),
    ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
    ...(request.maxTokens !== undefined ? { max_tokens: request.maxTokens } : {}),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${options.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...options.headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    throw new AiProviderError(
      options.id,
      aborted ? "timeout" : "network",
      aborted
        ? `${options.id} timed out after ${DEFAULT_TIMEOUT_MS}ms`
        : `${options.id} network failure: ${error instanceof Error ? error.message : "unknown"}`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const text = (await response.text().catch(() => "")).slice(0, 300);
    throw new AiProviderError(
      options.id,
      classifyStatus(response.status, text),
      `${options.id} returned ${response.status}: ${text || "no body"}`,
      response.status,
    );
  }

  let payload: OpenAiPayload;
  try {
    payload = (await response.json()) as OpenAiPayload;
  } catch {
    throw new AiProviderError(options.id, "application", `${options.id} returned malformed JSON`);
  }

  const choice = payload.choices?.[0];
  return {
    content: choice?.message?.content ?? "",
    provider: options.id,
    model,
    usage: {
      inputTokens: payload.usage?.prompt_tokens ?? 0,
      outputTokens: payload.usage?.completion_tokens ?? 0,
    },
    finishReason: choice?.finish_reason ?? "stop",
  };
}
