# Karacter AI Gateway — Production Implementation Specification

**Date:** 2026-08-09  
**Status:** PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
**Target:** `https://ai.karacterhub.xyz`  
**Constraint:** Create ONLY this file. Do NOT implement, modify code, deploy, or change configuration.

---

## TABLE OF CONTENTS

1. [Approved Architectural Decisions](#1-approved-architectural-decisions)
2. [Domain Architecture](#2-domain-architecture)
3. [Production AI Gateway](#3-production-ai-gateway)
4. [Development/Preview Architecture](#4-developmentpreview-architecture)
5. [Current Codebase Mapping](#5-current-codebase-mapping)
6. [Current Lovable AI Path](#6-current-lovable-ai-path)
7. [Target Provider Abstraction](#7-target-provider-abstraction)
8. [Provider Adapter Contract](#8-provider-adapter-contract)
9. [Credential Architecture](#9-credential-architecture)
10. [Environment Separation](#10-environment-separation)
11. [Production Routing](#11-production-routing)
12. [Failure Classification](#12-failure-classification)
13. [Response Normalization](#13-response-normalization)
14. [Existing Karacter AI Contract](#14-existing-karacter-ai-contract)
15. [Cloudflare Deployment Design](#15-cloudflare-deployment-design)
16. [`ai.karacterhub.xyz`](#16-aikaracterhubxyz)
17. [Authentication](#17-authentication)
18. [Supabase Boundary](#18-supabase-boundary)
19. [Agents / Skills / Knowledge / Tools](#19-agents--skills--knowledge--tools)
20. [Security Requirements](#20-security-requirements)
21. [Observability](#21-observability)
22. [Testing Requirements](#22-testing-requirements)
23. [Migration Strategy](#23-migration-strategy)
24. [Rollback](#24-rollback)
25. [File Change Map](#25-file-change-map)
26. [Dependency Change Plan](#26-dependency-change-plan)
27. [Lovable Cleanup Strategy](#27-lovable-cleanup-strategy)
28. [Main Domain Ecosystem](#28-main-domain-ecosystem)
29. [Future Provider Compatibility](#29-future-provider-compatibility)
30. [Production Acceptance Criteria](#30-production-acceptance-criteria)
31. [Decisions Requiring Human Approval](#31-decisions-requiring-human-approval)

---

## 1. APPROVED ARCHITECTURAL DECISIONS

### 1.1 Production AI Providers

**APPROVED:** Initial production provider set is Google Gemini and Mistral. OpenAI is **deferred**. Open-source and local models are **future work**.

**ARCHITECTURE REQUIREMENT:** Gateway must be provider-neutral for future expansion without core redesign.

### 1.2 Lovable AI Status

**APPROVED:**
- Lovable **ALLOWED** for: Development, Preview, Lovable-hosted workflows
- Lovable **NOT ALLOWED** for: Production AI request path, Production fallback path, Production dependency

**CRITICAL:** Production Karacter AI Gateway must function **completely without Lovable**.

**APPROVED FALLBACK CHAIN:**
```
Gemini -> Mistral -> controlled failure
```
**NOT ALLOWED:**
```
Gemini -> Mistral -> Lovable
```

Lovable **may continue** behind a **development/preview provider adapter**.

---

## 2. DOMAIN ARCHITECTURE

**TARGET:** Multi-subdomain ecosystem with independent deployments:
```
https://www.karacterhub.xyz     (Primary domain)
https://karacterhub.xyz         (Alias)
  ├── app.karacterhub.xyz      (Main application)
  ├── ai.karacterhub.xyz       (AI Gateway - THIS SPECIFICATION)
  ├── auth.karacterhub.xyz     (Future)
  └── admin.karacterhub.xyz     (Future)
```

**PRINCIPLE:** Each subdomain is independently developed and deployed. Do not assume monolithic deployment.

---

## 3. PRODUCTION AI GATEWAY

### 3.1 Target Architecture

```
Karacter Application (app.karacterhub.xyz)
        │
        ▼ [HTTP POST with Supabase JWT]
        │
ai.karacterhub.xyz (Cloudflare Worker)
        │
        ├── Authentication (Supabase JWT validation)
        ├── Authorization (Rate limits, user quotas)
        ├── Request Validation (Schema, size limits)
        ├── Routing (Primary: Gemini, Fallback: Mistral)
        ├── Provider Adapters (Gemini, Mistral, [Lovable:dev])
        ├── Fallback Logic (Transient failures only)
        ├── Error Normalization
        ├── Usage Tracking
        └── Observability
                │
                ├── Google Gemini API
                └── Mistral API
```

### 3.2 Gateway Responsibilities

| Responsibility | Owned | Notes |
|----------------|-------|-------|
| Auth (Supabase JWT) | ✓ | Reuse existing middleware pattern |
| Authorization (quotas) | ✓ | Per-user rate limits |
| Request Validation | ✓ | Schema, token limits |
| Routing | ✓ | Config-driven provider selection |
| Provider Adapters | ✓ | Abstract provider APIs |
| Fallback Logic | ✓ | Transient failures only |
| Error Normalization | ✓ | Consistent format to app |
| Usage Tracking | ✓ | Token counts, cost |
| Observability | ✓ | Structured logging |
| Provider Credentials | ✓ | Cloudflare Secrets |

---

## 4. DEVELOPMENT/PREVIEW ARCHITECTURE

**REQUIREMENT:** Lovable must remain usable for development and preview.

**TARGET:**
```
Development / Preview
     │
     ▼
Karacter AI Abstraction (ai.server.ts)
     │
     ▼
Lovable Adapter (DEV/PREVIEW ONLY)
     │
     ▼
Lovable Gateway
```

**CRITICAL:** Do NOT scatter `if (lovable)`, `if (production)`, `if (cloudflare)`, `if (preview)` throughout application.

**PROPOSED:** Single clean provider/runtime abstraction with environment detection.

---

## 5. CURRENT CODEBASE MAPPING

### 5.1 AI Server Module

| Path | Current Responsibility | Relevant Symbols | Dependencies | Required Change | Risk |
|------|----------------------|------------------|--------------|----------------|------|
| `src/lib/karacter/ai.server.ts` | AI gateway client | `chatJson()`, `readAiConfig()`, `requireAiConfig()`, `DEFAULT_GATEWAY`, `AiUnavailableError` | `LOVABLE_API_KEY`, `AI_GATEWAY_API_KEY`, `AI_GATEWAY_URL` | **COMPLETE REWORK** | HIGH |
| `src/lib/karacter/plan.functions.ts` | Intent planning | `planUtterance` | `chatJson()` import | **NO CHANGE** | NONE |
| `src/lib/karacter/learn.functions.ts` | Memory distillation | `learnFromConversation`, `chatJson()`, `readAiConfig()` | Same as ai.server.ts | **NO CHANGE** | NONE |

### 5.2 Model Configuration

| Path | Symbol | Current | Future |
|------|--------|---------|--------|
| `ai.server.ts:48` | Default model | Hardcoded `"google/gemini-3.6-flash"` | Configurable |

### 5.3 Environment Variables

| File | Variable | Current Usage | Future |
|------|----------|---------------|--------|
| `ai.server.ts:20-21` | `LOVABLE_API_KEY`, `AI_GATEWAY_API_KEY` | Lovable credential | Keep for dev/preview adapter |
| `ai.server.ts:24` | `AI_GATEWAY_URL` | Gateway URL override | Add production default |
| `health.ts:13` | `LOVABLE_API_KEY` check | Health check | Extend to check all providers |

### 5.4 Authentication Files

| Path | Responsibility | Change | Risk |
|------|----------------|--------|------|
| `src/integrations/supabase/auth-middleware.ts` | Server-side auth | **NO CHANGE** | NONE |
| `src/integrations/supabase/auth-attacher.ts` | Client-side auth | **NO CHANGE** | NONE |
| `src/integrations/supabase/client.server.ts` | Admin client | **NO CHANGE** | NONE |

### 5.5 Cloudflare Configuration

| File | Status | Notes |
|------|--------|-------|
| `wrangler.toml` | **MISSING** | Required for Workers deployment |
| `.env.production` | **MISSING** | Production env vars |
| Cloudflare Secrets | **NOT IN REPO** | Dashboard/CLI only |

**CURRENT:** Uses `@lovable.dev/vite-tanstack-config` with Nitro (Cloudflare target implied but not explicit).

### 5.6 Supabase Integration

| Path | Change | Risk |
|------|--------|------|
| `src/integrations/supabase/client.ts` | **NO CHANGE** | NONE |
| `src/integrations/supabase/client.server.ts` | **NO CHANGE** | NONE |
| `src/integrations/supabase/types.ts` | **NO CHANGE** | NONE |

### 5.7 Tests

| Status | Notes |
|--------|-------|
| **ZERO automated tests** | CRITICAL GAP — Must add before production |

---

## 6. CURRENT LOVABLE AI PATH

### 6.1 Complete Request Trace (VERIFIED)

```
UI: Browser (User speaks)
  │
  ▼
WebSpeechAPI / useVoice.ts hook
  │
  ▼
Route handler (src/routes/index.tsx: Assistant component)
  │
  ▼ [calls]
planUtterance server function (plan.functions.ts:6)
  │
  ▼ [calls]
chatJson(messages, "google/gemini-3.6-flash") (ai.server.ts:48)
  │
  ▼ [calls]
readAiConfig() (ai.server.ts:18)
  │
  ├─ process.env["LOVABLE_API_KEY"]
  ├─ process.env["AI_GATEWAY_API_KEY"] (fallback)
  └─ process.env["AI_GATEWAY_URL"] || DEFAULT_GATEWAY ("https://ai.gateway.lovable.dev/v1")
  │
  ▼
HTTP POST to https://ai.gateway.lovable.dev/v1/chat/completions
  Headers: {"Content-Type": "application/json", "Lovable-API-Key": key}
  Body: {model: "google/gemini-3.6-flash", response_format: {type: "json_object"}, messages: [...]}
  │
  ▼
Lovable Gateway → Google Gemini
  │
  ▼
Response: {choices: [{message: {content: "..."}}]}
  │
  ▼ [parse]
Return payload.choices?.[0]?.message?.content ?? "{}"
  │
  ▼
planUtterance returns {speech, intents: []}
  │
  ▼
executeIntent() for each intent (executor.ts)
```

### 6.2 Lovable Coupling Points

| Location | Reference | Type | Coupling |
|----------|-----------|------|----------|
| `ai.server.ts:14` | `https://ai.gateway.lovable.dev/v1` | URL | HARD CODED |
| `ai.server.ts:20` | `LOVABLE_API_KEY` | Env var | REQUIRED |
| `ai.server.ts:21` | `AI_GATEWAY_API_KEY` | Env var | FALLBACK |
| `ai.server.ts:24` | `AI_GATEWAY_URL` | Env var | CONFIGURABLE |
| `ai.server.ts:55` | `Lovable-API-Key` | Header | REQUIRED |
| `ai.server.ts:48` | `"google/gemini-3.6-flash"` | Model | HARD CODED |
| `plan.functions.ts:3` | `chatJson()` | Call | DEPENDENT |
| `learn.functions.ts:4` | `chatJson()`, `readAiConfig()` | Calls | DEPENDENT |
| `health.ts:13` | `LOVABLE_API_KEY` check | Health | CONFIGURATION |

### 6.3 Production Independence Requirements

To remove Lovable from production path:
1. Gateway URL must be configurable per environment
2. Auth header must be provider-specific (not hardcoded `Lovable-API-Key`)
3. Model identifiers must be provider-specific
4. Response format parsing must handle multiple providers
5. Error handling must handle provider-specific errors
6. Credential sourcing must support multiple keys

---

## 7. TARGET PROVIDER ABSTRACTION

### 7.1 Conceptual Architecture

```
Karacter AI Request
     │
     ▼
Karacter AI Gateway Interface  ← Single abstraction point
     │
     ▼
PROVIDER REGISTRY
  ├── Gemini Adapter
  ├── Mistral Adapter
  └── Lovable Adapter [DEV/PREVIEW]
     │
     ▼
ROUTING & FALLBACK LOGIC
     │
     ▼
Provider APIs (Gemini, Mistral, Lovable)
```

### 7.2 Provider Registry Structure

```typescript
// src/lib/karacter/providers/types.ts

type ProviderId = 'gemini' | 'mistral' | 'lovable';

interface ProviderConfig {
  id: ProviderId;
  name: string;
  enabled: boolean;           // False in production for Lovable
  priority: number;         // 1 = primary, 2 = fallback
  baseUrl: string;           // Provider API endpoint
  defaultModel: string;      // Default model for this provider
  apiKeyEnvVar: string;     // e.g., "GEMINI_API_KEY"
  authHeaderName: string;   // e.g., "Authorization", "Lovable-API-Key"
  authHeaderFormat: 'bearer' | 'custom' | 'none';
  responseFormat: 'openai-compatible' | 'custom';
  capabilities: {
    chat: boolean;
    structuredOutput: boolean;
    streaming: boolean;
    toolCalling: boolean;
  };
}
```

---

## 8. PROVIDER ADAPTER CONTRACT

### 8.1 Required Capabilities (Based on Current Usage)

| Capability | Required | Notes |
|------------|----------|-------|
| `chat` / text completion | ✓ | With chat history |
| `structured output` (JSON mode) | ✓ | `response_format: {type: "json_object"}` |
| `streaming` | ✗ | NOT currently used |
| `tool calling` | ✗ | NOT currently used |
| `embeddings` | ✗ | NOT currently used |

**PRINCIPLE:** Only implement what's actually used.

### 8.2 Adapter Interface

```typescript
// src/lib/karacter/providers/adapter.ts

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

interface ChatResponse {
  content: string;        // Normalized content
  provider: ProviderId;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  finishReason: string;
  requestId?: string;
}

interface ProviderAdapter {
  id: ProviderId;
  chat(request: ChatRequest): Promise<ChatResponse>;
  health(): Promise<{ status: 'healthy' | 'unhealthy'; error?: string }>;
  capabilities(): ProviderCapabilities;
}
```

### 8.3 Provider Responsibilities

Each adapter MUST:
1. Translate `ChatRequest` to provider-specific format
2. Attach provider-specific authentication
3. Parse response into normalized `ChatResponse`
4. Extract token usage from provider response
5. Map provider errors to normalized error types
6. Resolve model identifiers

### 8.4 Hide Provider-Specific Formats

**CURRENT (LEAKS PROVIDER DETAILS):**
```typescript
const response = await fetch(`${baseUrl}/chat/completions`, {
  headers: { "Lovable-API-Key": key },
  body: JSON.stringify({ model, response_format: { type: "json_object" }, messages })
});
return payload.choices?.[0]?.message?.content ?? "{}";
```

**TARGET (ABSTRACTED):**
```typescript
const response = await aiGateway.chat({ messages, model, responseFormat: "json" });
return response.content;  // Provider details hidden
```

---

## 9. CREDENTIAL ARCHITECTURE

### 9.1 Production Credential Storage

**APPROVED:** Cloudflare Secrets (encrypted).

**Initial Production Credentials:**
- `GEMINI_API_KEY` (Cloudflare Secret)
- `MISTRAL_API_KEY` (Cloudflare Secret)

**Browser must NEVER receive these values.**

### 9.2 Credential Access Pattern

**PREFERRED:**
```
Provider Adapter → Runtime Secret Binding → Cloudflare Environment → process.env["GEMINI_API_KEY"]
```

**NOT ALLOWED:**
```
Provider Config → { apiKey: string } → Adapter receives key as property
```

### 9.3 Environment Variables

| Environment | Required Variables | Notes |
|-------------|-------------------|-------|
| Development | `LOVABLE_API_KEY`, `AI_GATEWAY_URL` | Optional: `GEMINI_API_KEY`, `MISTRAL_API_KEY` |
| Preview | `LOVABLE_API_KEY` | Lovable-hosted preview |
| Production | `GEMINI_API_KEY`, `MISTRAL_API_KEY` | NO Lovable in production path |

**ALL `*_API_KEY`:** Cloudflare Secrets (encrypted), never exposed to client.

### 9.4 Service Role Key

**REQUIREMENT:** Do NOT add `SUPABASE_SERVICE_ROLE_KEY` to gateway **unless verified necessary**.

**ASSESSMENT:** Gateway does NOT need service role access (no database writes, uses JWT validation).

---

## 10. ENVIRONMENT SEPARATION

### 10.1 Environment Boundaries

| Environment | Provider Strategy | Gateway URL | Auth |
|-------------|-------------------|-------------|------|
| Development | Lovable (primary) | `https://ai.gateway.lovable.dev/v1` | Supabase JWT |
| Preview | Lovable (primary) | `https://ai.gateway.lovable.dev/v1` | Supabase JWT |
| Production | Gemini (primary), Mistral (fallback) | `https://ai.karacterhub.xyz` | Supabase JWT + Rate Limits |

### 10.2 Environment Detection

```typescript
type Environment = 'development' | 'preview' | 'production';

function detectEnvironment(): Environment {
  const env = process.env['AI_ENVIRONMENT'];
  if (env === 'development' || env === 'preview' || env === 'production') return env;
  if (process.env['GEMINI_API_KEY'] && process.env['MISTRAL_API_KEY']) return 'production';
  return 'development';
}
```

### 10.3 Provider Availability

| Provider | Development | Preview | Production |
|----------|-------------|---------|------------|
| Lovable | ✓ Primary | ✓ Primary | ✗ Not in path |
| Gemini | ✓ Optional | ✓ Optional | ✓ Primary |
| Mistral | ✓ Optional | ✓ Optional | ✓ Fallback |

---

## 11. PRODUCTION ROUTING

### 11.1 Routing Policy

**REQUIREMENT:** Do NOT hard-code provider order into business logic.

**PREFERRED:** Configuration-driven.

```typescript
// AI_ROUTING_POLICY = "gemini:1,mistral:2"
export interface RoutingPolicy {
  providers: Array<{ id: ProviderId; priority: number }>;
}
```

### 11.2 Default Priority

**APPROVED INITIAL:** Gemini (primary), Mistral (fallback).

**NOTE:** This is a **configuration decision**, not hardcoded logic.

### 11.3 Routing Flow

```
User Request
  │
  ▼
Load Routing Policy (e.g., [gemini:1, mistral:2])
  │
  ▼
Sort by Priority
  │
  ▼
Try Primary (gemini)
  │
  ├─ Success → Return
  │
  ├─ Transient Failure?
  │   ├─ Yes → Try next (mistral)
  │   └─ No → Return error
  │
  └─ All failed → Return aggregated error
```

---

## 12. FAILURE CLASSIFICATION

### 12.1 Failure Decision Matrix

| Failure | Retry | Fallback | Return Immediately | Reason |
|---------|-------|----------|-------------------|--------|
| Auth failure (401, 403) | No | **NO** | Yes | Config error — gateway credentials invalid |
| Authorization failure | No | **NO** | Yes | User not authorized |
| Invalid request (400) | No | **NO** | Yes | Malformed request |
| Invalid model (404) | No | **YES** | No | Model exists on another provider |
| Rate limit (429) | No | **YES** | No | Temporary — another provider may have capacity |
| Timeout | No | **YES** | No | Transient — another provider may respond |
| Network failure | No | **YES** | No | Transient — retry with different provider |
| Provider outage (5xx) | No | **YES** | No | Transient — another provider may be healthy |
| Provider overload | No | **YES** | No | Transient |
| Context limit | No | **NO** | Yes | Request too large |
| Unsupported capability | No | **YES** | No | If fallback supports it |
| Application error | No | **NO** | Yes | Gateway bug |
| Security rejection | No | **NO** | Yes | Blocked request |

### 12.2 Fallback Rule

```
Should Fallback = (failure is transient) AND (another provider available) AND (not config/auth error)
```

**Transient failures:** timeout, 5xx errors, 429 rate limits, network failures.

---

## 13. RESPONSE NORMALIZATION

### 13.1 Current Response Handling

**CURRENT (Lovable/OpenAI format):**
```json
{"choices": [{"message": {"content": "..."}}]}
```

**CURRENT EXTRACTION:**
```typescript
return payload.choices?.[0]?.message?.content ?? "{}";
```

### 13.2 Normalized Response Contract

```typescript
// src/lib/karacter/gateway/types.ts

interface AiResponse {
  content: string;
  provider: ProviderId;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  finishReason: 'stop' | 'length' | 'error' | string;
  metadata: {
    requestId: string;
    latencyMs: number;
    fallback: boolean;
    fallbackReason?: string;
    primaryProvider?: string;
  };
}
```

**REQUIREMENT:** Application must NOT know which provider returned the response.

### 13.3 Provider-Specific Mapping

Each adapter maps native response to `AiResponse`.

**Gemini Native:** `{candidates: [{content: {parts: [{text: "..."}]}}], usageMetadata: {...}}`

**Mistral Native:** `{outputs: [{text: "...", stop_reason: "stop"}]} `  

Adapter extracts: `content`, `usage`, `finishReason`, populates normalized response.

### 13.4 Streaming

**CURRENT STATE:** NOT used by Karacter.

**DEFER:** Do not implement streaming initially.

---

## 14. EXISTING KARACTER AI CONTRACT

### 14.1 Current Interface

**EXPORTS from `src/lib/karacter/ai.server.ts`:**
```typescript
export function chatJson(messages: ChatMessage[], model?: string): Promise<string>;
export function readAiConfig(): AiConfig | null;
export function requireAiConfig(): AiConfig;
export class AiUnavailableError extends Error {}
```

**USAGE:**
```typescript
// plan.functions.ts
const raw = await chatJson([...messages], "google/gemini-3.6-flash");

// learn.functions.ts
if (!readAiConfig()) return { saved: 0 };
const raw = await chatJson([...messages]);
```

### 14.2 Preservation Requirement

**GOAL:**
```
Existing Karacter Logic → Karacter AI Interface (PRESERVED) → New Gateway
```

**NOT:**
```
Existing Karacter Logic (REWRITE ALL) → New Gateway
```

### 14.3 Adapter Boundary

**LOCATION:** Inside `ai.server.ts` — replace `chatJson()` implementation:

```typescript
// FUTURE: ai.server.ts

export function chatJson(messages: ChatMessage[], model?: string): Promise<string> {
  const gateway = getGateway();
  const response = await gateway.chat({ messages, model, responseFormat: 'json' });
  return response.content;  // Preserve existing interface
}
```

---

## 15. CLOUDFLARE DEPLOYMENT DESIGN

### 15.1 Current State

**BUILD STACK:**
- `vite.config.ts` → `@lovable.dev/vite-tanstack-config` → Nitro → Cloudflare target (implied)
- **ISSUE:** No `wrangler.toml`, no explicit Cloudflare config

**RUNTIME:**
- Framework: TanStack Start (React 19)
- Bundler: Vite 8.2.0
- Server Runtime: Nitro
- Target: Cloudflare Workers (implied, not explicit)

### 15.2 Required Files (MISSING)

| File | Purpose | Status |
|------|---------|--------|
| `wrangler.toml` | Workers configuration | **MISSING** |
| `.env.production` | Production env vars | **MISSING** |

### 15.3 Deployment Topology Decision

**OPTIONS:**
- **A:** Separate Worker at `ai.karacterhub.xyz` (clean separation)
- **B:** Same Worker as main app with `/ai/*` route (simpler)

**RECOMMENDATION:** Option B for initial implementation, migrate to A later.

---

## 16. `ai.karacterhub.xyz`

### 16.1 Routing Configuration

| Aspect | Requirement | Status |
|--------|-------------|--------|
| DNS Record | CNAME to Cloudflare | **EXTERNAL PLATFORM CONFIGURATION** |
| Cloudflare Zone | Zone for karacterhub.xyz | **EXTERNAL PLATFORM CONFIGURATION** |
| Worker Route | `ai.karacterhub.xyz/*` → Worker | **EXTERNAL PLATFORM CONFIGURATION** |
| TLS | Cloudflare universal SSL | Automatic |

**WHAT CANNOT BE VERIFIED FROM REPOSITORY:** DNS, Cloudflare zone, routing, TLS.

**LABEL:** All above are **EXTERNAL PLATFORM CONFIGURATION** — verify separately.

### 16.2 Worker Configuration

**Proposed `wrangler.toml`:**
```toml
name = "karacter-ai-gateway"
main = "dist/server.js"
compatibility_date = "2026-01-01"
compatibility_flags = ["nodejs_compat"]

[env.production]
name = "karacter-ai-gateway-prod"
routes = [{ pattern = "ai.karacterhub.xyz/*", zone_id = "REPLACE" }]

[env.production.vars]
AI_ENVIRONMENT = "production"
AI_ROUTING_POLICY = "gemini:1,mistral:2"
LOG_LEVEL = "info"
```

**Secrets (dashboard/CLI):**
- `GEMINI_API_KEY`
- `MISTRAL_API_KEY`
- `SUPABASE_JWT_SECRET` (for JWT validation)

### 16.3 Request Paths

```
https://ai.karacterhub.xyz
  ├─ POST /api/chat          (Primary endpoint)
  ├─ GET  /api/health        (Health check)
  └─ POST /api/plan          (Backward compatibility)
```

### 16.4 Gateway Authentication

**REQUEST HEADERS:**
```
Authorization: Bearer <Supabase JWT>
Content-Type: application/json
X-Request-ID: <uuid>
```

**GATEWAY VALIDATES:** Supabase JWT signature using `SUPABASE_JWT_SECRET` or Supabase API.

---

## 17. AUTHENTICATION

### 17.1 Current Flow

```
Browser (Supabase JWT) → TanStack Server Function → requireSupabaseAuth → planUtterance → chatJson() → Lovable (LOVABLE_API_KEY)
```

### 17.2 Proposed Gateway Flow

```
Browser (Supabase JWT)
  │
  ▼ POST to ai.karacterhub.xyz/api/chat
  │ Headers: Authorization: Bearer <JWT>, X-Request-ID: <uuid>
  ▼
Cloudflare Worker
  ├─ Validate JWT (Supabase public key or SUPABASE_JWT_SECRET)
  ├─ Extract user_id from claims
  ├─ Check rate limits (Workers KV)
  └─ Enforce user quotas
        │
        ▼
  Provider APIs (GEMINI_API_KEY, MISTRAL_API_KEY from secrets)
```

### 17.3 JWT Validation Options

| Option | Pros | Cons |
|--------|------|------|
| **A: Local JWT verification** | Fast, reliable | Manage secret rotation |
| **B: Call Supabase Auth API** | Managed by Supabase | Extra network hop per request |

**RECOMMENDATION:** Option A (local verification).

**DO NOT:** Introduce a second identity system.

---

## 18. SUPABASE BOUNDARY

### 18.1 Responsibility Division

**SUPABASE:**
- User authentication (JWT issuance)
- User identity (auth.users)
- Profiles, Conversations, Memory
- Capabilities registry
- All application data

**AI GATEWAY:**
- AI requests (chat completions)
- Provider routing
- Provider credentials
- Model calls
- Provider fallback
- AI observability

### 18.2 Gateway Does NOT Need

| Item | Reason |
|------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | No database writes from gateway |
| Direct database access | All data via application |
| RLS bypass | Not needed |

### 18.3 Gateway Storage Needs

| Need | Solution | Location |
|------|----------|----------|
| Rate limit tracking | Workers KV | Cloudflare |
| Usage tracking | Workers KV | Cloudflare |
| Request logs | stdout | Cloudflare Logs |

---

## 19. AGENTS / SKILLS / KNOWLEDGE / TOOLS

### 19.1 Future Architecture

```
Agent → Skills → Knowledge → Memory
  │
  └── Tools
        │
        ▼
AI Orchestration (planner)
        │
        ▼
Karacter AI Gateway (LLM only)
        │
        ▼
Provider (Gemini, Mistral)
```

### 19.2 Security Boundaries

**CRITICAL:** AI gateway must NOT be a privileged tool executor.

**SEPARATION:**
- Tool authorization: Application (Supabase RLS, permissions)
- Tool execution: Executor (browser or agent)
- AI planning: Application (using gateway for LLM)
- Gateway: LLM chat completions ONLY

---

## 20. SECURITY REQUIREMENTS

### 20.1 Threat Model Classification

| Threat | Gateway | App | Agent | Tool | Provider |
|--------|---------|-----|-------|------|----------|
| Provider secret protection | ✓ | | | | |
| Browser secret exposure | ✓ | ✓ | | | |
| Authentication | ✓ | ✓ | | | |
| Authorization | ✓ | ✓ | | | |
| Rate limiting | ✓ | | | | |
| Request validation | ✓ | ✓ | | | |
| Prompt injection | | ✓ | | | |
| Model jailbreaks | | ✓ | | | |
| Tool-call security | | | | ✓ | |
| SSRF | ✓ | | | | |
| Arbitrary URL access | ✓ | | | | |
| Sensitive logging | ✓ | ✓ | | | |
| Provider error leakage | ✓ | | | | |
| Abuse prevention | ✓ | ✓ | | | |
| Request size limits | ✓ | ✓ | | | |
| Token/context limits | ✓ | ✓ | | | |

### 20.2 Security Measures

**Provider Secret Protection:**
- Cloudflare Secrets (encrypted at rest)
- Never exposed to browser
- Redacted from logs
- Generic errors to client

**SSRF Prevention:**
- Allowlist: `api.gemini.google.com`, `api.mistral.ai`
- Block all other URLs with 403

**Request Limits:**
- Max messages: 20
- Max tokens: 8000
- Max utterance: 2000 chars
- Max body: 1MB

**Rate Limiting:**
- Per-user: 60 req/min
- Per-IP (unauth): 10 req/min
- Burst: +10 requests

---

## 21. OBSERVABILITY

### 21.1 Structured Logging

```json
{
  "level": "info", "service": "ai-gateway",
  "timestamp": "2026-08-09T10:30:00Z",
  "requestId": "req_abc123", "userId": "user_u123",
  "provider": "gemini", "model": "gemini-3.6-flash",
  "latencyMs": 1250, "status": 200,
  "fallback": false,
  "tokenUsage": {"input": 150, "output": 80},
  "estimatedCost": 0.00015
}
```

### 21.2 Metrics

| Metric | Type | Purpose |
|--------|------|---------|
| Request count | Counter | Volume |
| Latency | Histogram | Performance |
| Token usage | Counter | Cost tracking |
| Fallback count | Counter | Reliability |
| Provider errors | Counter | Health |
| Rate limit hits | Counter | Abuse |

### 21.3 NEVER Log

- API keys (any provider)
- Access tokens (Supabase JWT)
- Passwords
- Full prompts (summary/length only)
- User personal data

---

## 22. TESTING REQUIREMENTS

### 22.1 Test Categories

| Category | Scope | Tests |
|----------|-------|-------|
| Provider Adapter | Each adapter | Request formatting, response parsing, errors |
| Gateway | Router, normalizer | Routing, fallback, normalization |
| Authentication | JWT validation | Valid/expired/invalid JWT |
| Authorization | Rate limiting | Within/at/over limit |
| Fallback | Failure scenarios | Primary→fallback, primary→error |
| Timeout | Latency | Provider/gateway timeout |
| Error Normalization | Errors | All types map consistently |
| Cloudflare Integration | Deployment | Worker receives secrets |
| End-to-End | Full flow | Browser→gateway→provider→response |

### 22.2 Testing Infrastructure

**CURRENT:** No testing framework.

**REQUIRED:** Add vitest (recommended — Vite/TypeScript compatible).

### 22.3 Test File Locations

```
src/lib/karacter/providers/
  ├─ gemini.test.ts
  ├─ mistral.test.ts
  └─ lovable.test.ts

src/lib/karacter/gateway/
  ├─ router.test.ts
  ├─ normalizer.test.ts
  ├─ errors.test.ts
  └─ auth.test.ts

src/lib/karacter/ai.server.test.ts
```

**REQUIRED:** Separate test API keys (`TEST_GEMINI_API_KEY`, `TEST_MISTRAL_API_KEY`).

---

## 23. MIGRATION STRATEGY

### 23.1 Phased Sequence

| Phase | Description | Duration | Files Modified | Risk |
|-------|-------------|----------|----------------|------|
| **1** | Provider-neutral boundary in ai.server.ts | 1-2w | ai.server.ts | LOW |
| **2** | Gemini adapter | 1w | NEW: providers/gemini.ts | LOW |
| **3** | Mistral adapter | 1w | NEW: providers/mistral.ts | LOW |
| **4** | Gateway router/normalizer/errors | 2w | NEW: gateway/ | MEDIUM |
| **5** | Deploy to Cloudflare | 1w | NEW: wrangler.toml | MEDIUM |
| **6** | Configure Cloudflare Secrets | 1d | Dashboard/CLI | LOW |
| **7** | Connect production environment | 1w | ai.server.ts | HIGH |
| **8** | Verify auth | 1w | Gateway auth | HIGH |
| **9** | Verify fallback | 1w | Gateway tests | HIGH |
| **10** | Production cutover (feature flag) | 1w | Config | CRITICAL |
| **11** | Remove Lovable from production | 1d | Config | LOW |
| **12** | Retain Lovable dev/preview | N/A | Config | NONE |

### 23.2 Environment Strategy

| Phase | Development | Preview | Production |
|-------|-------------|---------|------------|
| 1-6 | Lovable + New Gateway (test) | Lovable | Lovable |
| 7-9 | Lovable + New Gateway (staging) | Lovable | Lovable + Gateway (test) |
| 10 | New Gateway (default) | Lovable | Gateway + Lovable fallback |
| 11+ | New Gateway | Lovable | Gateway (Gemini + Mistral) |

---

## 24. ROLLBACK

### 24.1 Rollback Triggers

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Error rate | >1% | Investigate |
| Error rate | >5% | **AUTOMATIC ROLLBACK** |
| Latency | >5000ms | Investigate |
| Latency | >10000ms | Rollback |
| Cost | >2x expected | Investigate |
| Cost | >10x expected | Rollback |

### 24.2 Rollback Mechanisms

| Option | Description | Time |
|--------|-------------|------|
| **A: Feature Flag (RECOMMENDED)** | `AI_USE_NEW_GATEWAY=true/false` | <1min |
| **B: Gateway URL Switch** | Change `AI_GATEWAY_URL` | <1min |
| **C: Cloudflare Rollback** | `wrangler rollback --env production` | <5min |
| **D: Provider Disablement** | `AI_ROUTING_POLICY=lovable:1` | <1min |

**TARGET ROLLBACK TIME:** < 5 minutes.

### 24.3 Rollback Verification

After rollback:
- `/api/public/health` returns `ok: true`
- AI requests work (using Lovable)
- Error rates return to normal
- Latency returns to normal

---

## 25. FILE CHANGE MAP

### 25.1 Modify Existing Files

| File | Current Role | Change | Risk | Phase |
|------|--------------|--------|------|-------|
| `src/lib/karacter/ai.server.ts` | Lovable client | Replace with gateway abstraction | HIGH | 1,7 |
| `src/routes/api/public/health.ts` | Health checks | Add provider health checks | LOW | 5 |
| `.env.example` | Env template | Add new variables | LOW | 1 |

### 25.2 Create New Files

| File | Purpose | Phase | Lines |
|------|---------|-------|-------|
| `wrangler.toml` | Cloudflare config | 5 | 30 |
| `src/lib/karacter/gateway/types.ts` | Gateway types | 1 | 100 |
| `src/lib/karacter/gateway/config.ts` | Config loader | 1 | 50 |
| `src/lib/karacter/gateway/router.ts` | Routing/fallback | 4 | 200 |
| `src/lib/karacter/gateway/normalizer.ts` | Response normalization | 4 | 150 |
| `src/lib/karacter/gateway/errors.ts` | Error classification | 4 | 100 |
| `src/lib/karacter/gateway/auth.ts` | JWT validation | 4 | 100 |
| `src/lib/karacter/providers/types.ts` | Provider types | 1 | 100 |
| `src/lib/karacter/providers/index.ts` | Provider registry | 1 | 50 |
| `src/lib/karacter/providers/adapter.ts` | Base interface | 1 | 50 |
| `src/lib/karacter/providers/gemini.ts` | Gemini adapter | 2 | 200 |
| `src/lib/karacter/providers/mistral.ts` | Mistral adapter | 3 | 200 |
| `src/lib/karacter/providers/lovable.ts` | Lovable adapter | 6 | 150 |

### 25.3 Files That Stay Untouched

| File | Reason |
|------|--------|
| `src/routes/index.tsx` | AI in server function |
| `src/lib/karacter/plan.functions.ts` | Interface preserved |
| `src/lib/karacter/learn.functions.ts` | Interface preserved |
| `src/lib/karacter/executor.ts` | Unaffected |
| `src/lib/karacter/registry.ts` | Unaffected |
| `src/lib/karacter/chat.ts` | Unaffected |
| All UI components | No UI changes |
| `src/integrations/supabase/*` | Reused, not changed |
| `src/server.ts`, `src/start.ts` | Unchanged |

### 25.4 Test Files (Phase 8)

```
src/lib/karacter/providers/*.test.ts      (Adapter tests)
src/lib/karacter/gateway/*.test.ts       (Gateway tests)
src/lib/karacter/ai.server.test.ts       (Compatibility tests)
```

---

## 26. DEPENDENCY CHANGE PLAN

### 26.1 Current Dependencies (Keep)

| Package | Reason | Decision |
|---------|--------|----------|
| `@supabase/supabase-js` | Core auth/DB | **KEEP** |
| `@tanstack/react-start` | Framework | **KEEP** |
| `@tanstack/react-query` | State | **KEEP** |
| `@tanstack/react-router` | Routing | **KEEP** |
| `zod` | Validation | **KEEP** |
| `@lovable.dev/vite-tanstack-config` | Build | **KEEP** |

### 26.2 Provider SDKs

| Package | Decision | Reason |
|---------|----------|--------|
| `openai` | **DEFER** | OpenAI deferred |
| `@google/generative-ai` | **DEFER** | Use HTTP initially |
| `@mistralai/mistralai` | **DEFER** | Use HTTP initially |
| `axios` | **DEFER** | Native fetch sufficient |

**RECOMMENDATION:** Use direct HTTP with `fetch`, no SDKs initially.

### 26.3 Testing

| Package | Phase | Reason |
|---------|-------|--------|
| `vitest` | 8 | Testing framework |

**ALL EXISTING:** No changes required.

---

## 27. LOVABLE CLEANUP STRATEGY

### 27.1 Isolation, Not Deletion

**REQUIREMENT:** Lovable must be **isolated** into a provider adapter, not removed.

### 27.2 Target State

**Development/Preview:** Lovable adapter **enabled** (primary).

**Production:** Lovable adapter **disabled** (not in routing policy).

### 27.3 Code to Isolate

| Location | Current | Target |
|----------|---------|--------|
| `ai.server.ts:14` | Hardcoded Lovable URL | Dynamic from registry |
| `ai.server.ts:20-21` | Lovable key check | Any provider key check |
| `ai.server.ts:55` | Hardcoded header | Provider-specific |
| `health.ts:13` | Lovable check | All providers check |

### 27.4 Configuration-Based Disable

```typescript
const providers: ProviderConfig[] = [
  { id: 'gemini', enabled: true, priority: 1 },
  { id: 'mistral', enabled: true, priority: 2 },
  { id: 'lovable', enabled: process.env.AI_ENVIRONMENT !== 'production', priority: 1 }
];
```

---

## 28. MAIN DOMAIN ECOSYSTEM

### 28.1 Independence Principle

**DO NOT ASSUME:** Gateway owns entire Karacter Hub.

**ECOSYSTEM:**
```
www.karacterhub.xyz
karacterhub.xyz
  ├── app.karacterhub.xyz    (Main application)
  ├── ai.karacterhub.xyz     (AI Gateway — THIS)
  ├── auth.karacterhub.xyz   (Future)
  └── admin.karacterhub.xyz   (Future)
```

### 28.2 Inter-Service Communication

**CURRENT:** All in one deployment (TanStack Start).

**FUTURE:** Independent services via HTTP.

**INTERFACE:**
- Request: JSON with messages, model, options
- Response: Normalized AiResponse
- Auth: Supabase JWT in Authorization header

---

## 29. FUTURE PROVIDER COMPATIBILITY

### 29.1 Initial Implementation

```
Providers: Gemini, Mistral
```

### 29.2 Deferred Providers

```
Future: OpenAI, Local models, Open-source models
```

### 29.3 Compatibility Verification

| Requirement | Status |
|-------------|--------|
| Dynamic provider registry | ✓ Design |
| Stable adapter interface | ✓ Design |
| Configurable routing policy | ✓ Design |
| Consistent response normalization | ✓ Design |
| Consistent error classification | ✓ Design |
| Provider-agnostic credentials | ✓ Design |

**VERDICT:** Future providers can be added without gateway redesign.

---

## 30. PRODUCTION ACCEPTANCE CRITERIA

### 30.1 Required Verification

| Criterion | Method | Status |
|-----------|--------|--------|
| Works without Lovable | End-to-end test | ❌ Not verified |
| Gemini processes requests | API test | ❌ Not verified |
| Mistral processes requests | API test | ❌ Not verified |
| Credentials server-side | Code review | ❌ Not verified |
| Cloudflare accesses credentials | Secrets test | ❌ Not verified |
| `ai.karacterhub.xyz` deployable | Deployment test | ❌ Not verified |
| Authentication works | JWT test | ❌ Not verified |
| Authorization works | Rate limit test | ❌ Not verified |
| Failures handled | Fallback tests | ❌ Not verified |
| Fallback works | Transient failure tests | ❌ Not verified |
| Response formats hidden | Inspection | ❌ Not verified |
| Conversations functional | Integration test | ❌ Not verified |
| Auth functional | Supabase test | ❌ Not verified |
| Memory functional | learnFromConversation test | ❌ Not verified |
| Agents compatible | Capability test | ❌ Not verified |
| Tools authorized separately | Executor test | ❌ Not verified |
| Dev/preview uses Lovable | Dev test | ❌ Not verified |

**STATUS:** None verified — planning document only.

### 30.2 Acceptance Test Suite

**REQUIRED:** Automated tests for all criteria (Phase 8).

---

## 31. DECISIONS REQUIRING HUMAN APPROVAL

### 31.1 Provider Priority

**DECISION:** What is the default provider order?
- **OPTION A:** Gemini (primary), Mistral (fallback)
- **OPTION B:** Mistral (primary), Gemini (fallback)
- **OPTION C:** Configurable only (no default)
- **RECOMMENDATION:** A
- **STATUS:** ⏳ REQUIRES APPROVAL

### 31.2 Authentication Mechanism

**DECISION:** How to authenticate gateway requests?
- **OPTION A:** Local JWT verification (faster)
- **OPTION B:** Call Supabase Auth API (managed)
- **OPTION C:** Shared secret (simple)
- **RECOMMENDATION:** A
- **STATUS:** ⏳ REQUIRES APPROVAL

### 31.3 Gateway Deployment Topology

**DECISION:** Separate Worker or same Worker?
- **OPTION A:** Separate Worker at `ai.karacterhub.xyz`
- **OPTION B:** Same Worker with `/ai/*` route
- **RECOMMENDATION:** B (start simple)
- **STATUS:** ⏳ REQUIRES APPROVAL

### 31.4 Routing Policy Format

**DECISION:** How to configure routing?
- **OPTION A:** Priority list: `AI_PROVIDERS=gemini,mistral`
- **OPTION B:** Weighted: `AI_ROUTING_POLICY=gemini:80,mistral:20`
- **OPTION C:** External config service
- **RECOMMENDATION:** A
- **STATUS:** ⏳ REQUIRES APPROVAL

### 31.5 Fallback Policy

**DECISION:** Which failures trigger fallback?
- **PROPOSED:** timeout, 5xx, 429, 404 (model not found), network failures
- **NOT FALLBACK:** 401, 403, 400 (bad request), security rejection
- **STATUS:** ⏳ REQUIRES APPROVAL (see Section 12.1)

### 31.6 Streaming

**DECISION:** Implement now or defer?
- **OPTION A:** Now
- **OPTION B:** Defer
- **RECOMMENDATION:** B (not currently used)
- **STATUS:** ⏳ REQUIRES APPROVAL

### 31.7 Usage Tracking

**DECISION:** How to track usage?
- **OPTION A:** Workers KV
- **OPTION B:** External service
- **OPTION C:** Supabase table
- **OPTION D:** None initially
- **RECOMMENDATION:** A
- **STATUS:** ⏳ REQUIRES APPROVAL

### 31.8 Rate Limiting

**DECISION:** What limits?
- **PROPOSED:** 60 req/min/user, 10 req/min/IP (unauth), burst +10
- **STATUS:** ⏳ REQUIRES APPROVAL

### 31.9 Logging Strategy

**DECISION:** What to log where?
- **OPTION A:** Cloudflare Logs only
- **OPTION B:** Cloudflare + external monitoring
- **OPTION C:** Custom logging
- **RECOMMENDATION:** A initially, B for production
- **STATUS:** ⏳ REQUIRES APPROVAL

### 31.10 Domain Routing

**DECISION:** Domain strategy for gateway?
- **OPTION A:** `ai.karacterhub.xyz` (dedicated subdomain)
- **OPTION B:** `app.karacterhub.xyz/ai` (path)
- **OPTION C:** `api.karacterhub.xyz` (shared)
- **RECOMMENDATION:** A
- **STATUS:** ⏳ REQUIRES APPROVAL
- **NOTE:** Requires **EXTERNAL PLATFORM CONFIGURATION** (DNS, Cloudflare)

### 31.11 Cloudflare Environment Strategy

**DECISION:** How many environments?
- **OPTION A:** Single (`production`) with feature flags
- **OPTION B:** Multiple (`production`, `staging`, `development`)
- **OPTION C:** Branch-based (automatic)
- **RECOMMENDATION:** B
- **STATUS:** ⏳ REQUIRES APPROVAL

---

## SUMMARY

**DOCUMENT STATUS:** Planning complete. **NO IMPLEMENTATION AUTHORIZED.**

**NEXT ACTIONS:**
1. Review all decisions in Section 31
2. Provide explicit approval/modification for each
3. Authorize implementation
4. Begin Phase 1 (Provider-Neutral Boundary)

**CRITICAL:** This document defines the target architecture but does not authorize any changes to the codebase, dependencies, deployment, DNS, secrets, or configuration.
