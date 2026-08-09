/**
 * Failure classification (AI_GATEWAY_IMPLEMENTATION.md §12).
 *
 * Only transient failures may fall through to the next provider. Config/auth
 * and malformed-request failures must surface immediately so a broken
 * deployment is visible instead of silently burning the fallback provider.
 */

import type { ProviderId } from "../providers/types";

export type AiFailureKind =
  | "auth" // 401/403 — credentials wrong for this provider
  | "invalid_request" // 400 — our request is malformed
  | "context_limit"
  | "not_found" // 404 — model missing on this provider
  | "rate_limit" // 429
  | "timeout"
  | "network"
  | "upstream" // 5xx
  | "application";

const TRANSIENT: ReadonlySet<AiFailureKind> = new Set<AiFailureKind>([
  "not_found",
  "rate_limit",
  "timeout",
  "network",
  "upstream",
]);

export class AiProviderError extends Error {
  readonly kind: AiFailureKind;
  readonly provider: ProviderId;
  readonly status?: number;

  constructor(
    provider: ProviderId,
    kind: AiFailureKind,
    message: string,
    status?: number,
  ) {
    super(message);
    this.name = "AiProviderError";
    this.provider = provider;
    this.kind = kind;
    if (status !== undefined) this.status = status;
  }

  get transient() {
    return TRANSIENT.has(this.kind);
  }
}

/** Raised when no provider is configured at all — a deployment/config error. */
export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export function classifyStatus(status: number, body: string): AiFailureKind {
  if (status === 401 || status === 403) return "auth";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limit";
  if (status === 408 || status === 504) return "timeout";
  if (status >= 500) return "upstream";
  if (status === 413 || /context length|too many tokens|too long/i.test(body)) {
    return "context_limit";
  }
  if (status >= 400) return "invalid_request";
  return "application";
}
