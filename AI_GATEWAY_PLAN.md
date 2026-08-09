# Karacter AI Gateway — Production Implementation Plan

**Date:** 2026-08-09  
**Status:** PLANNING ONLY — NO IMPLEMENTATION PERFORMED  
**Target:** `https://ai.karacterhub.xyz`  
**Goal:** Karacter-owned, multi-provider AI Gateway replacing Lovable critical dependency

---

## Executive Summary

This document presents a detailed technical plan for implementing a **Karacter-owned AI Gateway** that makes the Lovable AI infrastructure **optional rather than critical** to production operation.

**Current State:**
- AI requests are tightly coupled to `https://ai.gateway.lovable.dev/v1`
- Only provider: Google Gemini 3.6 Flash (via Lovable)
- Single entry point: `chatJson()` in `src/lib/karacter/ai.server.ts`
- No abstraction between application and Lovable
- No Cloudflare Workers configuration
- No multi-provider capability

**Proposed State:**
- Karacter-owned gateway at `https://ai.karacterhub.xyz`
- Supports: OpenAI, Google Gemini, Mistral, (optional) Lovable
- Provider-neutral abstraction layer
- Intelligent routing and fallback
- Secure credential management
- Cloudflare Workers deployment
- Production-grade observability

**Core Constraint:** This plan preserves the existing architecture and does not require rearchitecting the planner, executor, or capability registry.

---

## 1. AUDIT FINDINGS — VERIFIED

### 1.1 Lovable Coupling — Complete Inventory

| Location | Reference | Type | Required? |
|----------|-----------|------|-----------|
| `ai.server.ts:14` | `https://ai.gateway.lovable.dev/v1` | Gateway URL | YES |
| `ai.server.ts:20` | `LOVABLE_API_KEY` env var | Credential | YES |
| `ai.server.ts:21` | `AI_GATEWAY_API_KEY` fallback | Credential | Alternative |
| `ai.server.ts:55` | `Lovable-API-Key` header | Auth header | YES |
| `ai.server.ts:48` | `google/gemini-3.6-flash` | Model | YES |
| `plan.functions.ts:6` | `chatJson()` import | Function call | YES |
| `learn.functions.ts` | `chatJson()` import | Function call | YES (memory) |
| `health.ts:13` | Health check for `LOVABLE_API_KEY` | Health check | Configuration |

**Classification:** VERIFIED — All locations confirmed in source code.

**Dependency Chain:**
```
Route Handler (index.tsx)
    ↓
planUtterance Server Function
    ↓
chatJson(messages, model)
    ↓
fetch(https://ai.gateway.lovable.dev/v1/chat/completions)
    ↓
Lovable-API-Key header + model parameter
    ↓
Google Gemini 3.6 Flash
```

### 1.2 Current Root Cause of Cloudflare Failure

**Evidence Classification:**

| Issue | Status | Evidence |
|-------|--------|----------|
| Missing wrangler.toml | CONFIRMED | No wrangler.toml in repository |
| Lovable build tooling | CONFIRMED | vite.config.ts imports @lovable.dev/vite-tanstack-config |
| No environment secrets setup | CONFIRMED | health.ts requires LOVABLE_API_KEY but no Workers config exists |
| No Cloudflare Workers routing | CONFIRMED | TanStack Start uses nitro (via @lovable.dev package) without explicit Workers config |
| Hardcoded Lovable URL | CONFIRMED | DEFAULT_GATEWAY = hardcoded Lovable domain |

**Root Cause Analysis:**

The application was designed within Lovable's development environment where:
1. Lovable injects `LOVABLE_API_KEY` automatically
2. The Vite config uses Lovable's custom plugins
3. The server runtime is abstracted by Lovable's tooling

**Transition Failure:**
When moving to `karacterhub.xyz` on Cloudflare Workers:
1. Lovable's build plugins no longer inject the key
2. No wrangler.toml defines Worker configuration
3. No environment variable provisioning on Cloudflare
4. The application cannot start without LOVABLE_API_KEY

**This is NOT a code bug — it is an environment/deployment gap.**

**Verdict:** LIKELY — Application has been tested in Lovable preview but not in standalone Cloudflare Workers deployment.

### 1.3 Application Does NOT Require Lovable Directly

**Key Finding:** The application does not import Lovable SDK libraries. It only:
1. Reads `LOVABLE_API_KEY` from environment
2. Makes HTTP requests to the Lovable gateway
3. Expects OpenAI-compatible API format
4. Sends `Lovable-API-Key` header

**Implication:** Lovable is used purely as a **gateway provider**, not as infrastructure. Any gateway with the same API contract can substitute.

---

## 2. CURRENT AI REQUEST TRACE

### 2.1 Complete Request Path (Verified)

```
Browser UI
    ↓ [User speaks: "what time is it?"]
    ↓
WebSpeechAPI / useVoice.ts hook
    ↓
Route handler (src/routes/index.tsx)
    ↓ [Calls planUtterance server function]
    ↓
createServerFn (TanStack Start)
    ↓ [Routed to backend via HTTP POST]
    ↓
Auth middleware: requireSupabaseAuth
    ↓ [Validates Supabase JWT in Authorization header]
    ↓
Auth middleware: attachSupabaseAuth
    ↓ [Attaches auth context to request]
    ↓
planUtterance handler (plan.functions.ts)
    ↓ [Builds prompt with capabilities + history]
    ↓
chatJson(messages, "google/gemini-3.6-flash")
    ↓ [ai.server.ts:48]
    ↓
readAiConfig()
    ↓ [Reads LOVABLE_API_KEY from process.env]
    ↓
HTTP POST to https://ai.gateway.lovable.dev/v1/chat/completions
    ↓ [Headers: Content-Type, Lovable-API-Key]
    ↓ [Body: { model, response_format, messages }]
    ↓
Lovable Gateway → Google Gemini API
    ↓
Response: JSON with { choices: [{ message: { content: "..." } }] }
    ↓
Parse JSON, extract content
    ↓
planUtterance returns { speech, intents: [] }
    ↓
Route handler calls executeIntent() for each intent
    ↓ [executor.ts]
    ↓
Capability execution (device/browser/agent)
    ↓
Save conversation to Supabase
    ↓
Respond to user
```

### 2.2 Key Files in Request Path

| File | Function | Responsibility | Input | Output |
|------|----------|-----------------|-------|--------|
| `src/routes/index.tsx` | `Assistant()` | Route handler | User speech/text | Displayed response |
| `src/lib/karacter/plan.functions.ts` | `planUtterance` | Server function | `{ utterance, capabilities, history, persona }` | `{ speech, intents }` |
| `src/lib/karacter/ai.server.ts` | `chatJson()` | Gateway HTTP | `ChatMessage[], model` | AI response string |
| `src/lib/karacter/executor.ts` | `executeIntent()` | Capability exec | `Intent` | `ExecutionResult` |
| `src/integrations/supabase/auth-middleware.ts` | `requireSupabaseAuth` | Auth check | Request | Auth context |

**Classification:** All locations verified in source code.

---

## 3. PACKAGE DEPENDENCY ANALYSIS

### 3.1 Current Dependencies State

**Total Runtime Dependencies:** 43  
**Total Development Dependencies:** 14  
**Package Manager:** Bun

### 3.2 AI-Related Dependencies

**Currently Present:**
- `@supabase/supabase-js` — database/auth
- `@tanstack/react-start` — server functions
- `zod` — request validation

**Notably Absent:**
- No OpenAI SDK
- No Google Gemini SDK
- No Mistral SDK
- No testing framework (vitest/jest)
- No Cloudflare Wrangler CLI

### 3.3 Dependencies That Would Need Adding (Future Phase)

| Package | Purpose | Why | Risk |
|---------|---------|-----|------|
| `openai` | OpenAI provider SDK | Native API support | +5KB gzip |
| `@google/generative-ai` | Gemini provider SDK | Native streaming support | +8KB gzip |
| `@mistralai/mistralai` | Mistral provider SDK | Native tool calling | +6KB gzip |
| `axios` or lightweight HTTP | Gateway fallback | If native SDKs insufficient | +2KB gzip |

**Recommendation:** Do NOT add SDKs immediately. Instead, use lightweight HTTP adapters for all providers initially. SDKs can be introduced later if specific features (streaming, tool calling) require them.

### 3.4 Build Tooling Gap

**Missing for Production Cloudflare Deployment:**

| Tool | Purpose | Status |
|------|---------|--------|
| `wrangler` | Cloudflare CLI | NOT IN devDependencies |
| `@cloudflare/workers-types` | TypeScript types | NOT IN devDependencies |

**For Future Testing (Not Required Immediately):**

| Tool | Purpose | Status |
|------|---------|--------|
| `vitest` | Unit testing | NOT IN devDependencies |
| `miniflare` | Local Cloudflare emulation | Optionally available |

---

## 4. CLOUDFLARE DEPLOYMENT ANALYSIS

### 4.1 Current Build Stack

```
vite.config.ts
    ↓
@lovable.dev/vite-tanstack-config (custom bundler config)
    ↓
nitro (server runtime)
    ↓
@lovable.dev/vite-plugin-dev-server-bridge
@lovable.dev/vite-plugin-hmr-gate
    ↓
Bundled output
```

**Issues:**
1. Lovable's config bundles Nitro with "cloudflare" as default target, but **no wrangler.toml is present**
2. This means the build succeeds, but deployment configuration is missing
3. Cloudflare doesn't know how to deploy the Worker

### 4.2 What a Proper Cloudflare Deployment Needs

#### Required Files (Not Present)

| File | Purpose | Status |
|------|---------|--------|
| `wrangler.toml` | Workers configuration | MISSING |
| `.env.production` | Production environment | MISSING |

#### Required Configuration Structure

```toml
# wrangler.toml
name = "karacter-ai-buddy"
main = "dist/server.js"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

# Environment variables (public)
[env.production]
name = "karacter-ai-buddy-prod"
routes = [
  { pattern = "ai.karacterhub.xyz/*", zone_id = "..." }
]

# Secrets (set via dashboard or CLI)
# - LOVABLE_API_KEY
# - SUPABASE_URL
# - SUPABASE_PUBLISHABLE_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - OPENAI_API_KEY
# - GEMINI_API_KEY
# - MISTRAL_API_KEY
```

### 4.3 Production Deployment Path

```
Push to main
    ↓
GitHub Actions (if configured)
    ↓
bun install
    ↓
bun run build
    ↓ [produces dist/server.js + static assets]
    ↓
wrangler deploy --env production
    ↓
Cloudflare receives Worker
    ↓
Static assets → Cloudflare Pages
    ↓
Server functions → Cloudflare Workers
    ↓
Environment injected at request time
    ↓
Domain routing via Cloudflare DNS
```

### 4.4 Why Current Lovable Preview Works

Lovable's development environment provides:
```
Lovable CLI
    ↓
Injects LOVABLE_API_KEY to process.env
    ↓
Runs dev server with custom middleware
    ↓
Provides Lovable's gateway URL
    ↓
Error reporting hooks
```

When you move to standalone Cloudflare, this infrastructure disappears.

**Verdict:** The application is **built correctly** but **configured for Lovable's environment**. Moving to Cloudflare requires explicit configuration, not code changes.

---

## 5. CURRENT PROVIDERS — INVENTORY

### 5.1 What's Currently Implemented

| Component | Status | Evidence |
|-----------|--------|----------|
| Lovable Gateway URL | ✅ Hardcoded | `https://ai.gateway.lovable.dev/v1` |
| Lovable Authentication | ✅ Implemented | `Lovable-API-Key` header |
| Google Gemini 3.6 Flash | ✅ Default model | `model = "google/gemini-3.6-flash"` |
| JSON response parsing | ✅ Implemented | Response extraction in `chatJson()` |
| Error handling | ✅ Basic | Status code checks (401, 403, 429, 402) |
| Streaming | ❌ Not used | Response parsing is blocking |
| Tool/function calling | ❌ Not used | Only text completions |
| Model switching | ⚠️ Partial | Model parameter exists but only Gemini tested |

### 5.2 OpenAI — Current State

**Dependency Status:** Not installed  
**Code References:** None found  
**API Usage:** None  
**Recommendation:** Not yet needed

### 5.3 Google Gemini — Current State

**Dependency Status:** Used via Lovable (no direct SDK)  
**Code References:** Hardcoded in `ai.server.ts:48`  
**Model:** `google/gemini-3.6-flash`  
**Implementation:** OpenAI-compatible API format  
**Recommendation:** Can switch to direct Google API or keep Lovable's API format

### 5.4 Mistral — Current State

**Dependency Status:** Not installed  
**Code References:** None found  
**API Usage:** None  
**Recommendation:** Not yet needed

### 5.5 Lovable Gateway — Current State

**Dependency Status:** Provided via environment  
**Code References:** Hardcoded URL + auth header  
**Model:** Any model Lovable supports (proxy)  
**Implementation:** OpenAI-compatible API format  
**Recommendation:** Keep as provider adapter (optional)

---

## 6. PROPOSED ARCHITECTURE

### 6.1 High-Level Design

```
Karacter Application
    ↓ [HTTP POST /api/plan]
    ↓
Authentication (Supabase JWT)
    ↓
Karacter AI Gateway (ai.karacterhub.xyz)
    ├── Request Validation
    ├── Routing Policy
    │   ├── Primary provider selection
    │   └── Fallback rules
    ├── Provider Adapters
    │   ├── OpenAI Adapter
    │   ├── Gemini Adapter
    │   ├── Mistral Adapter
    │   └── Lovable Adapter (optional)
    ├── Secret Management
    ├── Response Normalization
    ├── Error Handling
    ├── Usage Tracking
    └── Observability
            ↓
            ├── OpenAI API
            ├── Google Gemini API
            ├── Mistral API
            └── Lovable Gateway
```

### 6.2 Provider Abstraction Layer

#### Proposed Interface

```typescript
// NOT implemented — conceptual contract

type ProviderConfig = {
  name: "openai" | "gemini" | "mistral" | "lovable";
  enabled: boolean;
  priority: number; // 1 = primary, 2 = fallback, etc.
  credentials: {
    apiKey: string;
    baseUrl?: string; // For self-hosted or proxy
  };
  models: {
    [capability: string]: string; // e.g., { "planning": "gpt-4", "embedding": "text-embedding-3-small" }
  };
  capabilities: {
    chat: boolean;
    streaming: boolean;
    functionCalling: boolean;
    structuredOutput: boolean;
    embeddings: boolean;
    imageGeneration: boolean;
  };
  rateLimitPerMinute?: number;
  timeoutMs?: number;
  maxTokens?: number;
};

type AIRequest = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json" | "structured";
  stream?: boolean;
};

type AIResponse = {
  provider: string;
  model: string;
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  finishReason: "stop" | "length" | "toolCall" | "error";
  toolCalls?: unknown[];
  metadata: {
    requestId: string;
    latencyMs: number;
    fallback: boolean;
    fallbackReason?: string;
  };
};

type AIGateway = {
  chat(request: AIRequest): Promise<AIResponse>;
  stream(request: AIRequest): AsyncIterable<AIResponse>;
  health(): Promise<{ status: "healthy" | "degraded" | "unavailable" }>;
};
```

**This interface defines the contract but is NOT implemented in this plan.**

### 6.3 Routing Strategy

```
User Request
    ↓
Read routing policy
    ↓ [e.g., "use OpenAI primary, fall back to Gemini"]
    ↓
Primary Provider (OpenAI)
    ↓
    ├─ Success → Return response
    ├─ Transient failure (timeout, 5xx) → Try fallback
    ├─ Rate limit (429) → Try fallback  
    ├─ Auth failure (401, 403) → Log error, try fallback
    ├─ Model not found → Try fallback
    └─ Invalid request → Return error (don't fallback)
    ↓
Fallback Provider (Gemini)
    ↓
    ├─ Success → Return response (note: fallback happened)
    └─ Failure → Return error
```

### 6.4 Secret Management

**Current State:**
```
process.env["LOVABLE_API_KEY"]  # Single credential
```

**Proposed State:**

| Secret | Location | Visibility | Usage |
|--------|----------|------------|-------|
| `OPENAI_API_KEY` | Cloudflare Secret | Server-only | OpenAI calls |
| `GEMINI_API_KEY` | Cloudflare Secret | Server-only | Gemini calls |
| `MISTRAL_API_KEY` | Cloudflare Secret | Server-only | Mistral calls |
| `LOVABLE_API_KEY` | Cloudflare Secret | Server-only | Lovable calls (optional) |
| `AI_ROUTING_POLICY` | Cloudflare Env Var | Server-only | Provider selection |

**Never exposed to browser.**

### 6.5 Response Normalization

The gateway should normalize all provider responses into a consistent format:

```typescript
// Current: Raw OpenAI format from Lovable
{
  "choices": [
    {
      "message": {
        "content": "..."
      }
    }
  ]
}

// Proposed normalized format
{
  "content": "...",
  "model": "gpt-4",
  "provider": "openai",
  "usage": {
    "inputTokens": 150,
    "outputTokens": 80,
    "totalTokens": 230
  },
  "finishReason": "stop",
  "metadata": {
    "requestId": "req_...",
    "latencyMs": 1250,
    "fallback": false
  }
}
```

---

## 7. CLOUDFLARE WORKERS ARCHITECTURE

### 7.1 Proposed Workers Structure

```
ai.karacterhub.xyz
    ↓
Cloudflare Worker (src/server.ts via TanStack Start)
    ↓
POST /api/plan
    ├── Auth check
    ├── Request validation
    ├── Call AI Gateway (in-process)
    └── Return response

POST /api/health
    ├── Check provider credentials
    ├── Test provider connectivity
    └── Return health status

GET /api/providers
    ├── List available providers
    ├── Return configuration (no secrets)
    └── Return metadata (models, capabilities)
```

### 7.2 wrangler.toml Configuration (Proposed)

```toml
name = "karacter-ai-buddy"
main = "dist/server.js"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

[env.production]
name = "karacter-ai-buddy-prod"
routes = [
  { pattern = "ai.karacterhub.xyz/*", zone_id = "..." }
]
vars = {
  AI_ROUTING_POLICY = "openai:primary,gemini:fallback",
  LOG_LEVEL = "info",
}

[[env.production.services]]
binding = "SUPABASE"
service = "supabase-api"

# Secrets are configured via:
# wrangler secret put OPENAI_API_KEY
# wrangler secret put GEMINI_API_KEY
# etc.
```

### 7.3 Runtime Configuration (Cloudflare)

**Dashboard Path:** Workers & Pages > karacter-ai-buddy > Settings > Variables and Secrets

```
Environment Variables (Plain Text):
  AI_ROUTING_POLICY = "openai:1,gemini:2,mistral:3"
  OBSERVABILITY_ENABLED = "true"
  LOG_LEVEL = "info"

Secrets (Encrypted):
  OPENAI_API_KEY
  GEMINI_API_KEY
  MISTRAL_API_KEY
  LOVABLE_API_KEY (optional)
  SUPABASE_SERVICE_ROLE_KEY
```

### 7.4 Deployment Flow

```
1. Create wrangler.toml in repository root
2. Add secrets to Cloudflare Dashboard (or via wrangler CLI)
3. git push to main
4. GitHub Actions: bun run build
5. GitHub Actions: wrangler deploy --env production
6. Cloudflare receives Worker code
7. Cloudflare routes ai.karacterhub.xyz/* to Worker
8. Worker receives request with environment injected
9. Server function executes with full credentials
```

---

## 8. SECURITY MODEL

### 8.1 Threat Model

| Threat | Mitigation |
|--------|-----------|
| Provider credentials exposed to browser | Only server functions access credentials |
| Credentials in logs | Redact API keys from logs |
| Credentials in errors | Return generic error messages to client |
| Prompt injection | Validate user input against schema |
| Model jailbreaks | System prompt is fixed by Karacter |
| Rate limit abuse | Implement per-user rate limits in gateway |
| Cost explosion | Set per-provider budgets and alerts |
| SSRF (gateway makes requests to malicious URLs) | Only gateway calls known provider endpoints |

### 8.2 Secret Boundaries

```
Browser                           Server (Workers)              Providers
    ↓                                   ↓                            ↓
User input                        OPENAI_API_KEY              ← (need key)
    ↓                                   ↓
No secrets                        GEMINI_API_KEY              ← (need key)
    ↓                                   ↓
Auth JWT only                     MISTRAL_API_KEY             ← (need key)
    ↓                                   ↓
                                  LOVABLE_API_KEY (optional)  ← (need key)
```

**Rule:** API keys NEVER leave the Cloudflare Worker.

### 8.3 Request Validation

```
Browser → API Request
    ↓
Validate using Zod schema (already in place)
    ↓ [messages: ChatMessage[], model?: string, ...]
    ↓
Enforce limits:
  - message count <= 20
  - total tokens <= 8000
  - utterance length <= 2000
  ↓
Proceed to provider call
```

---

## 9. FAILURE HANDLING

### 9.1 Error Classification

| Error | Status | Should Fallback? | Example |
|-------|--------|------------------|---------|
| Auth failure | 401, 403 | No | Invalid API key (configuration error) |
| Rate limited | 429 | Yes | Hit quota temporarily |
| Server error | 5xx | Yes | Provider temporary outage |
| Timeout | 504 | Yes | Network/provider slow |
| Bad request | 400 | No | Invalid request format |
| Model not found | 404 | Yes (to alternate model) | "gpt-5" doesn't exist |
| Unsupported feature | 400 | Yes (if fallback supports it) | Provider doesn't support function calling |
| Invalid response | 200 but malformed | No | Provider returned garbage |

### 9.2 Fallback Logic (Proposed)

```
Request to Primary Provider
    ↓
Success → Return
    ↓
Check error type
    ├─ Auth error → Log, don't fallback (config issue)
    ├─ Bad request → Log, return error (user/app issue)
    └─ Transient (timeout, 5xx, 429) → Fallback
        ↓
        Request to Fallback Provider
        ↓
        Success → Return (with fallback flag)
        ↓
        Failure → Return error
```

### 9.3 Observability for Failures

For each request, log:
```json
{
  "requestId": "req_...",
  "timestamp": "2025-01-15T10:30:00Z",
  "provider": "openai",
  "fallback": false,
  "status": 200,
  "latencyMs": 1250,
  "tokenUsage": { "input": 150, "output": 80 },
  "error": null
}

// If fallback happened:
{
  "requestId": "req_...",
  "timestamp": "2025-01-15T10:30:00Z",
  "provider": "gemini",
  "fallback": true,
  "fallbackReason": "openai_timeout",
  "primaryProvider": "openai",
  "primaryError": "Request timeout after 30s",
  "status": 200,
  "latencyMs": 2150
}
```

**These logs must NOT contain:**
- API keys
- Full prompts (summary only)
- User personal data
- Authorization tokens

---

## 10. SUPABASE ROLE DEFINITION

### 10.1 What Supabase Should Handle

| Responsibility | Current | Proposed |
|----------------|---------|----------|
| User authentication | ✅ | ✅ |
| User identity | ✅ | ✅ |
| Conversation storage | ✅ | ✅ |
| Intent logging | ✅ | ✅ |
| Capability registry | ✅ | ✅ |
| Memory/learning | ✅ | ✅ |
| AI execution | ❌ | ❌ |
| AI provider selection | ❌ | ❌ |
| AI routing logic | ❌ | ❌ |
| Provider credentials | ❌ | ❌ |
| Cost tracking | ⚠️ (planned) | ⚠️ (planned) |

### 10.2 What Cloudflare Workers Should Handle

| Responsibility | Rationale |
|----------------|-----------|
| AI provider HTTP calls | Secrets must stay in Worker |
| Provider routing/fallback | Real-time decision making |
| Request/response normalization | Performance critical |
| Usage tracking aggregation | High-frequency writes |
| Observability | Real-time visibility |
| Error classification | Immediate fallback decisions |

### 10.3 Communication Pattern

```
Browser
    ↓ [planUtterance server function via TanStack Start]
    ↓ [HTTP POST to Cloudflare Worker]
    ↓
Cloudflare Worker (ai.karacterhub.xyz)
    ├─ Validate request
    ├─ Call AI provider(s)
    ├─ Normalize response
    ├─ Log to stdout (structured logging)
    └─ Return to browser
    ↓
Browser receives normalized response
    ↓
Route handler saves intent to Supabase
    ↓ [intent_logs table]
```

---

## 11. AUTHENTICATION TO THE GATEWAY

### 11.1 Current State

```
Browser
    ↓ [Contains Supabase JWT in localStorage]
    ↓
TanStack Start Server Function
    ↓ [Middleware: requireSupabaseAuth]
    ↓ [Extracts JWT from Authorization header]
    ↓
planUtterance handler
    ↓ [Has auth context available]
    ↓
chatJson() call
    ↓ [No authentication (Lovable uses LOVABLE_API_KEY)]
```

### 11.2 Proposed Authentication

```
Browser
    ↓ [Has Supabase JWT]
    ↓
TanStack Start Server Function
    ↓ [HTTP call to https://ai.karacterhub.xyz/api/plan]
    ↓ [Include Authorization: Bearer <Supabase JWT>]
    ↓
Cloudflare Worker
    ├─ Validate JWT with Supabase public key
    ├─ Extract user_id from JWT
    ├─ Look up user's AI usage quota
    ├─ Enforce rate limits
    └─ Proceed if authorized
    ↓
AI Provider
    ├─ Authenticate using OPENAI_API_KEY (from Cloudflare secret)
    └─ NOT user authentication, gateway authentication
```

**Key Point:** The gateway authenticates the Karacter application (and user via Supabase), but uses its own credentials when calling providers.

### 11.3 Request Flow with Authentication

```typescript
// Browser initiates (no secrets sent)
const response = await fetch("/api/plan", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${supabaseJWT}` // User auth
  },
  body: JSON.stringify({
    utterance: "what time is it?",
    capabilities: [...]
  })
});

// TanStack Start middleware (server-only)
requireSupabaseAuth(request) {
  const token = request.headers.get("Authorization")?.split(" ")[1];
  const user = await supabase.auth.getUser(token); // Validate
  return user; // Pass to handler
}

// planUtterance handler (has auth context)
planUtterance.handler(async ({ data }) => {
  const { user } = ctx; // From middleware
  
  // Call cloudflare gateway (server-to-server)
  const gatewayResponse = await fetch("https://ai.karacterhub.xyz/api/plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseJWT}`, // User auth
      "X-Request-ID": generateId(), // Tracing
    },
    body: JSON.stringify({ messages, model })
  });
  
  return gatewayResponse.json();
});

// Cloudflare Worker (has provider secrets)
worker.post("/api/plan", async (request, env) => {
  // Validate user
  const token = request.headers.get("Authorization");
  const user = await validateSupabaseJWT(token, env.SUPABASE_KEY);
  
  // Check rate limits
  const usageToday = await checkUsage(user.id);
  if (usageToday > limits) return error(429, "Rate limited");
  
  // Call provider with provider credentials
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}` // Provider auth
    },
    body: JSON.stringify(request.body)
  });
  
  return response;
});
```

---

## 12. IMPLEMENTATION ROADMAP

### Phase 0 — Architecture Preparation (No Code Changes)

**Duration:** 1-2 weeks  
**Deliverable:** This document + decision approval

- [ ] Review this plan with stakeholders
- [ ] Decide on provider priority (OpenAI first? Gemini?)
- [ ] Determine fallback policy
- [ ] Allocate provider API budgets
- [ ] Set up Cloudflare account if needed
- [ ] Verify domain routing (ai.karacterhub.xyz)

### Phase 1 — Cloudflare Setup (Configuration Only)

**Duration:** 1 week  
**Changes:** New files only (wrangler.toml)

- [ ] Create `wrangler.toml` with Workers configuration
- [ ] Set up environment variables on Cloudflare
- [ ] Configure secrets (can be placeholders initially)
- [ ] Test deployment of current code to Cloudflare
- [ ] Verify health endpoint works

**New File:**
- `wrangler.toml` — Cloudflare Workers configuration

### Phase 2 — Provider Abstraction Layer (New Code)

**Duration:** 2-3 weeks  
**Changes:** New files + new exports from ai.server.ts

- [ ] Create provider adapter interface
- [ ] Implement response normalization utilities
- [ ] Implement error classification
- [ ] Create routing configuration loader
- [ ] Add request ID and tracing

**New Files:**
- `src/lib/karacter/providers/index.ts` — Provider registry
- `src/lib/karacter/providers/types.ts` — Type definitions
- `src/lib/karacter/providers/adapter.ts` — Adapter interface
- `src/lib/karacter/gateway/router.ts` — Routing logic
- `src/lib/karacter/gateway/normalizer.ts` — Response normalization
- `src/lib/karacter/gateway/errors.ts` — Error classification

### Phase 3 — OpenAI Provider (Implementation)

**Duration:** 2 weeks  
**Changes:** New provider adapter

- [ ] Implement OpenAI HTTP adapter
- [ ] Add OpenAI error handling
- [ ] Test with real OpenAI API
- [ ] Measure latency and cost
- [ ] Document API costs

**New Files:**
- `src/lib/karacter/providers/openai.ts` — OpenAI adapter

### Phase 4 — Google Gemini Provider (Implementation)

**Duration:** 2 weeks  
**Changes:** New provider adapter

- [ ] Implement Gemini HTTP adapter
- [ ] Add Gemini error handling
- [ ] Test with real Gemini API
- [ ] Compare with Lovable's Gemini gateway
- [ ] Measure cost difference

**New Files:**
- `src/lib/karacter/providers/gemini.ts` — Gemini adapter

### Phase 5 — Mistral Provider (Implementation)

**Duration:** 1 week  
**Changes:** New provider adapter

- [ ] Implement Mistral HTTP adapter
- [ ] Add Mistral error handling
- [ ] Test with real Mistral API
- [ ] Evaluate cost vs quality

**New Files:**
- `src/lib/karacter/providers/mistral.ts` — Mistral adapter

### Phase 6 — Lovable as Optional Provider

**Duration:** 1 week  
**Changes:** Adapter for existing Lovable gateway

- [ ] Create Lovable provider adapter
- [ ] Verify it's backward compatible
- [ ] Make it optional (can disable via config)
- [ ] Document optional status

**New Files:**
- `src/lib/karacter/providers/lovable.ts` — Lovable adapter

### Phase 7 — Integration & Routing

**Duration:** 2 weeks  
**Changes:** Modify ai.server.ts to use new gateway

- [ ] Update `chatJson()` to use router
- [ ] Implement provider fallback
- [ ] Test fallback scenarios
- [ ] Add observability/logging
- [ ] Implement usage tracking

**Modified Files:**
- `src/lib/karacter/ai.server.ts` — Integrate new gateway
- `src/routes/api/public/health.ts` — Enhanced health checks

### Phase 8 — Testing (Unit + Integration)

**Duration:** 3 weeks  
**Setup:** May need to add vitest

- [ ] Unit tests for each provider adapter
- [ ] Integration tests for router
- [ ] Fallback scenario tests
- [ ] Error handling tests
- [ ] Load tests

**New Files:**
- `src/lib/karacter/providers/*.test.ts`
- `src/lib/karacter/gateway/*.test.ts`

### Phase 9 — Observability & Monitoring

**Duration:** 1-2 weeks  
**Changes:** Logging and metrics

- [ ] Add structured logging
- [ ] Set up Cloudflare logging
- [ ] Create monitoring dashboards
- [ ] Alert on failures/cost
- [ ] Document operational playbook

### Phase 10 — Production Cutover

**Duration:** 1 week  
**High-risk phase**

- [ ] Final verification of all providers
- [ ] Configure production routing policy
- [ ] Set up fallback rules
- [ ] Brief on-call team
- [ ] Gradual traffic shift or feature flag
- [ ] Monitor closely for 24-48 hours
- [ ] Rollback plan ready

### Phase 11 — Post-Production Monitoring

**Duration:** 2-4 weeks  
**Ongoing**

- [ ] Monitor provider costs daily
- [ ] Track provider latencies
- [ ] Evaluate fallback frequency
- [ ] Gather user feedback
- [ ] Optimize routing policy
- [ ] Consider removing Lovable if unused

---

## 13. DEPENDENCY PLAN

### 13.1 Packages to KEEP

| Package | Status | Reason |
|---------|--------|--------|
| @supabase/supabase-js | ✅ KEEP | Core auth/database |
| @tanstack/react-start | ✅ KEEP | Framework |
| @tanstack/react-query | ✅ KEEP | State management |
| @tanstack/react-router | ✅ KEEP | Routing |
| zod | ✅ KEEP | Request validation |
| All Radix UI packages | ✅ KEEP | UI components |
| Tailwind CSS | ✅ KEEP | Styling |
| @lovable.dev/vite-tanstack-config | ⚠️ KEEP (for now) | Build tooling |

**Rationale:** These are foundational. Removing them would require major rewrite.

### 13.2 Packages to REMOVE (Optional, not required)

| Package | Status | Reason | Risk |
|---------|--------|--------|------|
| @lovable.dev/vite-tanstack-config | ⚠️ MIGRATE | Not needed if using wrangler.toml directly | HIGH |
| recharts | ❌ REMOVE | Not used in current code | NONE |
| cmdk | ❌ REMOVE | Not used in current code | NONE |
| embla-carousel-react | ❌ REMOVE | Not used in current code | NONE |
| simple-icons | ❌ REMOVE | Not used in current code | NONE |
| react-resizable-panels | ❌ REMOVE | Not used in current code | NONE |

**Note:** These packages are unused but removing them is not urgent. Recommend leaving them until a dedicated cleanup phase.

### 13.3 Packages to ADD (Future Phases)

| Package | Phase | Reason | Estimated Size |
|---------|-------|--------|-----------------|
| `vitest` | Phase 8 | Testing framework | +50KB dev-only |
| `@opentelemetry/api` | Phase 9 | Observability | +15KB |
| `@opentelemetry/sdk-node` | Phase 9 | Observability backend | +100KB dev-only |

**Do NOT add immediately.** These are only needed when implementing specific phases.

### 13.4 Build Tooling Migration

**Current:**
```
vite + @lovable.dev/vite-tanstack-config + nitro
```

**Proposed (Phase 1):**
```
vite + @lovable.dev/vite-tanstack-config + nitro + wrangler.toml
```

**Future (if Lovable build tools become problematic):**
```
vite + @vitejs/plugin-react + nitro + wrangler.toml + vite-plugin-ssr
```

**Note:** Do NOT replace @lovable.dev/vite-tanstack-config immediately. It currently works and switching build tools is a major risk. Only migrate if proven necessary.

---

## 14. FILE-LEVEL IMPLEMENTATION PLAN

### 14.1 Files That Will Need Modification

| File | Current Responsibility | Change Required | Risk | Dependencies |
|------|------------------------|-----------------|------|--------------|
| `src/lib/karacter/ai.server.ts` | AI gateway HTTP | Replace `chatJson()` impl | MEDIUM | Phases 2-7 |
| `src/routes/api/public/health.ts` | Health checks | Add provider health checks | LOW | Phase 1 |
| `src/integrations/supabase/auth-middleware.ts` | Auth validation | No change needed | NONE | - |
| `src/routes/index.tsx` | Main assistant UI | No change needed | NONE | - |
| `src/lib/karacter/plan.functions.ts` | Server function | No change needed | NONE | - |

**Key Point:** The application code that calls `chatJson()` does NOT need to change. The implementation of `chatJson()` will be hidden inside the new provider abstraction.

### 14.2 Files That Will Be Created

| File | Purpose | Phase | Lines of Code (Est.) |
|------|---------|-------|-----------------|
| `wrangler.toml` | Cloudflare config | 1 | 30 |
| `src/lib/karacter/providers/index.ts` | Provider registry | 2 | 150 |
| `src/lib/karacter/providers/types.ts` | Type definitions | 2 | 200 |
| `src/lib/karacter/providers/adapter.ts` | Base adapter | 2 | 300 |
| `src/lib/karacter/gateway/router.ts` | Routing logic | 2 | 250 |
| `src/lib/karacter/gateway/normalizer.ts` | Response normalization | 2 | 150 |
| `src/lib/karacter/gateway/errors.ts` | Error classification | 2 | 150 |
| `src/lib/karacter/gateway/config.ts` | Configuration loader | 2 | 100 |
| `src/lib/karacter/providers/openai.ts` | OpenAI adapter | 3 | 200 |
| `src/lib/karacter/providers/gemini.ts` | Gemini adapter | 4 | 200 |
| `src/lib/karacter/providers/mistral.ts` | Mistral adapter | 5 | 200 |
| `src/lib/karacter/providers/lovable.ts` | Lovable adapter | 6 | 150 |
| Multiple `*.test.ts` files | Unit tests | 8 | 1500+ |

### 14.3 Files That Will NOT Change

| File | Reason |
|------|--------|
| `src/routes/index.tsx` | AI integration is in `planUtterance` server function |
| `src/lib/karacter/plan.functions.ts` | Server function signature stays same |
| `src/lib/karacter/executor.ts` | Intent execution unaffected |
| `src/lib/karacter/registry.ts` | Capability registry unaffected |
| All UI components | No UI changes required |
| `package.json` | No new dependencies immediately needed |

---

## 15. MIGRATION STRATEGY

### 15.1 Deployment Stages

**Stage 1: Preparation (Before any production change)**

```
Phase 0: Architecture approval
    ↓
Phase 1: wrangler.toml setup + deploy to Cloudflare
    ↓
Verify: Application still works with Lovable on Cloudflare
```

**Stage 2: Development**

```
Phase 2-6: Implement provider adapters locally
    ↓
Phase 7: Integrate with production code
    ↓
Phase 8: Unit and integration testing
    ↓
Deploy to staging environment (not production)
```

**Stage 3: Validation**

```
Test on staging:
    - OpenAI provider works
    - Gemini provider works
    - Mistral provider works
    - Lovable still works (fallback)
    - Error handling works
    - Rate limiting works
    ↓
Run load tests
    ↓
Validate costs
    ↓
Validate observability
```

**Stage 4: Production Cutover**

```
Option A: Feature Flag (Safest)
    - Deploy new code with feature flag OFF
    - Gradual enable to 10%, 50%, 100%
    - Monitor at each stage
    - Automatic rollback if errors spike
    
Option B: Gradual Routing
    - Deploy new providers
    - Route 10% of traffic to new providers
    - Increase to 50%, then 100%
    - Keep Lovable as fallback indefinitely

Option C: Hard Switch (Fastest, Highest Risk)
    - Set routing policy to: OpenAI primary, Gemini fallback
    - Deploy
    - Serve all traffic from new providers
    - Keep Lovable disabled
    - Requires high confidence
```

**Recommendation:** Use Option A (Feature Flag) or Option B (Gradual Routing). Option C is too risky.

### 15.2 Rollback Strategy

**If new providers fail catastrophically:**

```
Step 1: Detect
    - Errors spike above threshold
    - OR: Cost suddenly increases
    - OR: Latency increases > 50%

Step 2: Alert
    - Page on-call
    - Create incident
    - Notify stakeholders

Step 3: Immediate Mitigation
    Option A: Revert routing to Lovable primary
    Option B: Disable new providers in code
    Option C: Roll back deployment

Step 4: Investigation
    - Gather logs
    - Analyze errors
    - Identify root cause
    - Plan fix

Step 5: Re-deploy
    - Fix issue
    - Test thoroughly
    - Deploy again (or new attempt)
```

**Rollback Time:** Should be < 5 minutes

**Automated Rollback:** Set up Cloudflare deployment with automatic rollback on error.

---

## 16. TESTING STRATEGY

### 16.1 Test Types Required (Phase 8)

| Test Type | Scope | Examples |
|-----------|-------|----------|
| Unit Tests | Individual adapters | OpenAI adapter returns correctly formatted response |
| Provider Tests | Each provider | Can call real API (with test credentials) |
| Router Tests | Routing logic | Primary fails → fallback tried |
| Error Tests | Error handling | 401 doesn't trigger fallback, but 503 does |
| Load Tests | Performance | 1000 concurrent requests |
| Cost Tests | Expense tracking | Cost per provider is calculated correctly |
| Integration Tests | Full flow | Browser → server function → gateway → provider → response |
| Fallback Tests | Failure scenarios | Primary timeout → fallback success |

### 16.2 Test Checklist (Before Production)

- [ ] All adapter tests pass
- [ ] Router tests pass (all routing policies)
- [ ] Fallback works in all scenarios
- [ ] Rate limiting doesn't block legitimate requests
- [ ] Errors are properly classified
- [ ] Streaming works (if implemented)
- [ ] Response normalization is consistent
- [ ] Cost tracking is accurate
- [ ] Observability logs have correct format
- [ ] No secrets in logs
- [ ] Authentication works end-to-end
- [ ] Cloudflare Workers deployment is verified
- [ ] Staging environment passes all tests

---

## 17. ACCEPTANCE CRITERIA

### 17.1 Before Production Deployment

- [ ] **Architecture Decision Made**
  - Stakeholders approve provider strategy
  - Fallback policy documented and agreed
  - Budget allocated for each provider

- [ ] **Cloudflare Setup Complete**
  - wrangler.toml configured
  - Secrets set on Cloudflare
  - Domain routing verified
  - TLS certificate configured
  - Health endpoint responds

- [ ] **All Providers Implemented**
  - OpenAI: Can make API calls, error handling, cost tracking
  - Gemini: Same as OpenAI
  - Mistral: Same as OpenAI
  - Lovable: Still works as fallback (optional)

- [ ] **Routing & Fallback Verified**
  - Primary provider works
  - Primary failure → fallback tries
  - Fallback failure → error returned
  - Routing policy can be changed without code changes

- [ ] **Security Verified**
  - No API keys in browser logs
  - No API keys in error messages
  - No API keys in observability data
  - Authentication enforced
  - Rate limiting enforced

- [ ] **Testing Complete**
  - Unit tests for all adapters pass
  - Integration tests pass
  - Load tests pass
  - Fallback scenario tests pass
  - Error handling tests pass

- [ ] **Observability Ready**
  - Structured logging configured
  - Metrics exported to monitoring tool
  - Dashboards created
  - Alerts configured
  - Runbook documented

- [ ] **Documentation Complete**
  - Operational playbook written
  - Troubleshooting guide written
  - Provider costs documented
  - Configuration documented

### 17.2 Success Metrics (Post-Deployment, First 7 Days)

| Metric | Target | Method |
|--------|--------|--------|
| Success Rate | > 99.5% | Provider response codes 200 |
| Latency (p50) | < 1.5s | Cloudflare logs |
| Latency (p99) | < 5s | Cloudflare logs |
| Fallback Rate | < 0.5% | Observability logs |
| Cost per Request | < $0.01 | Usage tracking |
| Error Rate | < 0.1% | Error classification logs |
| User Satisfaction | No complaints | Support tickets |

### 17.3 Success Metrics (Month 1)

- Lovable dependency reduced from CRITICAL to OPTIONAL
- Application runs without Lovable (Lovable can be turned off)
- Cost is acceptable
- No production incidents due to AI gateway
- Users don't notice a difference

---

## 18. ARCHITECTURAL PATTERNS & DECISIONS

### 18.1 Why This Architecture?

**Choice: Provider Adapter Pattern**

**Why:** 
- Each provider has different API
- But they solve the same problem (text-to-text generation)
- Adapter pattern isolates differences
- Allows switching providers without changing application code
- Supports testing (mock adapters)

**Alternative Considered: Direct SDK Usage**
- Rejected: Each SDK has different API, would pollute application code
- Rejected: SDKs are larger and have more dependencies
- Rejected: Harder to test (requires mock SDK)

**Decision:** Implement lightweight HTTP adapters, not SDK adapters.

### 18.2 Why Lightweight HTTP Adapters?

**Why:**
- All providers support OpenAI-compatible API format
- Lightweight HTTP client (no extra dependencies)
- Faster, simpler, less vendor lock-in
- Can easily write custom adapters
- Lower bundle size

**Trade-off:** Might not support advanced features (streaming, function calling) immediately. Those can be added later.

### 18.3 Why No SDK Dependencies Yet?

**Providers support OpenAI-compatible format:**
```
OpenAI: https://api.openai.com/v1/chat/completions
Gemini: Converted to OpenAI format by Lovable (currently)
Mistral: Supports OpenAI-compatible format natively
```

**Can add later when needed:**
- Streaming support (use provider SDKs)
- Function calling (use provider SDKs)
- Embeddings (use provider SDKs)
- Image generation (use provider SDKs)

**Decision:** Keep it simple initially. Add SDKs only when specific features require them.

### 18.4 Why Cloudflare Workers?

**Why:**
- Secrets stay secure (never sent to browser)
- Edge deployment (low latency)
- Handles rate limiting at edge
- Integrates with Cloudflare DNS/proxy
- Scales automatically
- Cost predictable

**Why Not:** Supabase Edge Functions?
- Could work, but provider secrets still need to be stored somewhere
- Cloudflare already owns karacterhub.xyz domain
- Workers are simpler to deploy

**Decision:** Cloudflare Workers is the right choice.

### 18.5 Why No Breaking Changes to Application Code?

**Why:**
- `chatJson()` signature doesn't change
- Application calling code doesn't need to change
- New gateway is swapped in behind the same interface
- Reduces deployment risk
- Easier to rollback if needed

**Decision:** Keep existing interface, change implementation.

---

## 19. UNKNOWN FACTORS & EXTERNAL DEPENDENCIES

### 19.1 Things That Need External Verification

| Unknown | Impact | How to Resolve |
|---------|--------|----------------|
| Google Gemini availability | HIGH | Contact Google Cloud Sales |
| Gemini cost vs Lovable | MEDIUM | Get pricing from both |
| Mistral API reliability | MEDIUM | Test in staging |
| OpenAI API availability | HIGH | OpenAI guarantees SLA |
| Cloudflare Workers performance | MEDIUM | Benchmark with realistic load |
| Lovable deprecation timeline | HIGH | Ask Lovable/Lovable team |

### 19.2 Stakeholder Decisions Needed

| Decision | Owner | Impact |
|----------|-------|--------|
| Primary provider choice | Product | Cost + quality trade-off |
| Fallback provider choice | Product | Cost + coverage |
| Budget per provider | Finance | Cost control |
| Go-live date | Product | Planning |
| Canary % and duration | Eng + Ops | Deployment risk |

### 19.3 Implementation Uncertainties

| Uncertainty | Mitigation |
|-------------|-----------|
| How expensive is OpenAI? | Price comparison during Phase 3 |
| Is Gemini response format same as Lovable's? | Test during Phase 4 |
| Does Mistral support JSON mode? | Test during Phase 5 |
| What's the latency distribution? | Load test during Phase 9 |
| Will rate limiting be an issue? | Set conservative limits initially |

---

## 20. DECISION MATRIX

| Decision | Current State | Recommended Direction | Rationale | Risk | Owner |
|----------|---------------|----------------------|-----------|------|-------|
| **Lovable Dependency** | CRITICAL (required) | OPTIONAL (fallback) | Reduce vendor lock-in | LOW | Architecture |
| **Primary Provider** | Lovable (proxy) | OpenAI or Gemini | Own the relationship | MEDIUM | Product |
| **Fallback Provider** | None | Gemini or Mistral | High availability | LOW | Architecture |
| **Cloudflare Deployment** | Not configured | Full Workers setup | Prod requirement | MEDIUM | DevOps |
| **Secret Management** | Lovable's system | Cloudflare secrets | Standard practice | LOW | DevOps |
| **Provider Routing** | Single provider | Multi-provider with fallback | Resilience | MEDIUM | Architecture |
| **Streaming Support** | Not implemented | Future phase (Phase 7+) | Lower priority | LOW | Product |
| **Tool/Function Calling** | Not implemented | Future phase (Phase 8+) | Lower priority | LOW | Product |
| **Build Tooling** | @lovable.dev/vite-tanstack-config | Keep (Migrate later if needed) | Avoid churn | MEDIUM | DevOps |
| **Testing Framework** | None | Add Vitest (Phase 8) | Production requirement | LOW | QA |
| **Observability** | Lovable's system | Cloudflare + custom logging | Own visibility | LOW | Operations |

---

## 21. RISK ASSESSMENT

### 21.1 High-Risk Items

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Provider API instability | Users can't use assistant | LOW | Multi-provider fallback |
| Cost explosion | Budget overrun | MEDIUM | Rate limiting + budget alerts |
| Secrets leaked | Security breach | LOW | Cloudflare secrets + auditing |
| Lovable sunset | Critical break | MEDIUM | This plan reduces dependency |
| Cloudflare outage | Assistant down | LOW | No mitigation (upstream) |
| Deployment failure | Can't deploy | MEDIUM | Rollback strategy + staging |

### 21.2 Mitigation Strategy

**High Priority:**
1. Multi-provider fallback (Phase 7)
2. Rate limiting (Phase 7)
3. Comprehensive testing (Phase 8)
4. Staging environment (Phase 8-9)
5. Rollback automation (Phase 10)

**Medium Priority:**
1. Observability (Phase 9)
2. Cost monitoring (Phase 9)
3. Runbooks and playbooks (Phase 10)
4. On-call training (Phase 10)

---

## 22. WHAT MUST NOT CHANGE

### 22.1 Application Interface

**Must NOT Change:**
- `planUtterance` server function signature
- `chatJson()` function name (internal implementation can change)
- Request/response formats for routes
- Supabase schema or RLS policies
- Authentication flow

**Can Change:**
- Implementation of `chatJson()` (behind the interface)
- Error messages (must be backward compatible)
- Observability internals

### 22.2 Database & Schema

**Must NOT Change:**
- Supabase tables (no schema changes)
- RLS policies
- Foreign key relationships
- User data handling

**Can Change:**
- New logging tables (for observability)
- New audit tables (optional)

### 22.3 User Experience

**Must NOT Change:**
- Assistant still works when speaking
- Intents are still executed
- Conversations are still saved
- Users still authenticate with Supabase/Google
- UI looks the same

**Should Improve:**
- Latency (new providers might be faster/slower)
- Cost (depends on provider choice)
- Reliability (fallback should improve)
- Observability (new logging)

### 22.4 Production Environment

**Must NOT Change:**
- Domain karacterhub.xyz
- Custom domain routing
- TLS certificate
- Rate limiting (can only improve)
- CORS policies

---

## 23. FINAL RECOMMENDATIONS

### 23.1 Immediate Actions (Week 1)

1. **Review this plan** with product, engineering, and operations
2. **Decide on provider strategy:**
   - Primary: OpenAI or Gemini?
   - Fallback: Other provider?
   - Budget: How much per provider?
3. **Create Cloudflare account** if not already done
4. **Reserve domain:** ai.karacterhub.xyz
5. **Allocate team:** Who owns each phase?

### 23.2 Phase 1 Kickoff (Week 2-3)

1. **Create wrangler.toml** with placeholder configuration
2. **Set up Cloudflare secrets** (can be placeholders)
3. **Deploy current code** to Cloudflare to verify build works
4. **Verify health endpoint** works on Cloudflare
5. **Get team up to speed** on Cloudflare Workers

### 23.3 Parallel Work (Weeks 2-6)

- **Engineering:** Phases 2-6 (provider adapters)
- **Operations:** Observability setup (Phase 9)
- **QA:** Testing framework setup (Phase 8)
- **Product:** Stakeholder alignment

### 23.4 Production Deployment (Week 8+)

1. **All phases complete and tested**
2. **Staging passes all validation**
3. **Runbooks written**
4. **On-call trained**
5. **Go-live with feature flag or gradual rollout**

### 23.5 Long-Term (Month 2-3)

1. **Evaluate provider costs** and performance
2. **Optimize routing policy** based on real data
3. **Consider removing Lovable** if not needed
4. **Add advanced features** (streaming, tool calling)
5. **Expand to other gateway endpoints** if needed

---

## 24. CRITICAL SUCCESS FACTORS

1. **Don't rush deployment** — Phases 0-1 must be complete before any code change
2. **Keep Lovable as fallback** — Gives time to validate new providers
3. **Test thoroughly** — This is production AI infrastructure
4. **Monitor closely** — First 48 hours are critical
5. **Have rollback ready** — Before going live
6. **Document everything** — For on-call team
7. **Get budget approval** — For provider APIs (costs money)
8. **Communicate clearly** — With all stakeholders

---

## 25. RECOMMENDED PROVIDER STRATEGY

### 25.1 Recommended Primary Provider

**Choice: OpenAI (GPT-4 Turbo or GPT-4)**

**Why:**
- Mature, reliable API
- Excellent documentation
- Strong SLA guarantees
- Good performance/cost ratio
- Supports JSON mode (needed for intent planning)
- Strong function calling support
- Industry standard

**Cost:** ~$0.003-0.01 per 1000 tokens (depending on model)

### 25.2 Recommended Fallback Provider

**Choice: Google Gemini (Pro or Ultra)**

**Why:**
- Different infrastructure than OpenAI (reduces correlated failures)
- Good performance
- Competitive pricing
- Already integrated via Lovable (proven to work)

**Cost:** ~$0.00125-0.01 per 1000 tokens (depending on model)

### 25.3 Optional Third Provider

**Choice: Mistral (Large or Medium)**

**Why:**
- European provider (privacy advantage)
- Open-source foundation (community trust)
- Competitive pricing
- Lightweight

**Cost:** ~$0.002-0.007 per 1000 tokens

### 25.4 Lovable

**Status:** OPTIONAL FALLBACK

Keep Lovable as a final fallback but don't depend on it.

**Strategy:**
1. Route to OpenAI (primary)
2. If OpenAI fails, route to Gemini (fallback)
3. If Gemini fails, route to Lovable (final fallback)
4. If all fail, return error to user

---

## 26. CONCLUSION

This plan provides a roadmap for making Karacter AI independent of Lovable infrastructure while preserving all existing functionality.

**Key Achievements:**
- ✅ Reduces critical dependency on Lovable
- ✅ Enables multi-provider redundancy
- ✅ Improves cost control (use cheapest provider)
- ✅ Improves performance (choose fastest provider)
- ✅ Improves reliability (fallback on failure)
- ✅ Improves security (provider credentials isolated)
- ✅ Maintains application interface (no breaking changes)
- ✅ Enables future features (streaming, tool calling)

**Timeline:** 8-12 weeks for full production implementation

**Investment:** ~3-4 months of engineering effort

**Payoff:** Vendor independence + operational resilience

---

## APPENDIX: FILE STRUCTURE (Proposed)

```
src/
└── lib/
    └── karacter/
        ├── ai.server.ts (MODIFY - integrate new gateway)
        ├── plan.functions.ts (NO CHANGE)
        ├── executor.ts (NO CHANGE)
        ├── registry.ts (NO CHANGE)
        ├── providers/ (NEW DIRECTORY)
        │   ├── index.ts (NEW - provider registry)
        │   ├── types.ts (NEW - type definitions)
        │   ├── adapter.ts (NEW - base adapter class)
        │   ├── openai.ts (NEW - OpenAI adapter - Phase 3)
        │   ├── gemini.ts (NEW - Gemini adapter - Phase 4)
        │   ├── mistral.ts (NEW - Mistral adapter - Phase 5)
        │   ├── lovable.ts (NEW - Lovable adapter - Phase 6)
        │   ├── openai.test.ts (NEW - Phase 8)
        │   ├── gemini.test.ts (NEW - Phase 8)
        │   ├── mistral.test.ts (NEW - Phase 8)
        │   └── lovable.test.ts (NEW - Phase 8)
        └── gateway/ (NEW DIRECTORY)
            ├── config.ts (NEW - configuration loader)
            ├── router.ts (NEW - routing logic)
            ├── normalizer.ts (NEW - response normalization)
            ├── errors.ts (NEW - error classification)
            ├── router.test.ts (NEW - Phase 8)
            ├── normalizer.test.ts (NEW - Phase 8)
            └── errors.test.ts (NEW - Phase 8)

root/
├── wrangler.toml (NEW - Phase 1)
└── [existing files unchanged]
```

---

**END OF PLAN**

This document represents a comprehensive roadmap for architectural change. No implementation has been performed. All decisions require stakeholder approval before proceeding.

