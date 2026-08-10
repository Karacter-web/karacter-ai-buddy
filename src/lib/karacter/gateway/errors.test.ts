import { describe, expect, it } from "vitest";
import { classifyStatus } from "@/lib/karacter/gateway/errors";

/**
 * Failure classification decides whether the router may fall through to the
 * next AI provider — a security/cost boundary, so it is tested explicitly for
 * both fall-through and terminal cases.
 */
describe("classifyStatus", () => {
  it("treats credential failures as terminal auth errors", () => {
    expect(classifyStatus(401, "")).toBe("auth");
    expect(classifyStatus(403, "")).toBe("auth");
  });

  it("classifies transient upstream conditions", () => {
    expect(classifyStatus(429, "")).toBe("rate_limit");
    expect(classifyStatus(500, "")).toBe("upstream");
    expect(classifyStatus(504, "")).toBe("timeout");
    expect(classifyStatus(404, "")).toBe("not_found");
  });

  it("detects context-limit failures from the body", () => {
    expect(classifyStatus(400, "context length exceeded")).toBe("context_limit");
    expect(classifyStatus(413, "")).toBe("context_limit");
  });

  it("falls back to invalid_request for other 4xx", () => {
    expect(classifyStatus(422, "bad payload")).toBe("invalid_request");
  });
});
