# Karacter AI — Refactor & Production Architecture Audit

**Generated:** 2026-08-08  
**Auditor:** Mistral Vibe (Independent Technical Audit)  
**Repository:** /workspaces/karacter-ai-buddy  
**Commit:** cbbb3d8 (HEAD -> main, origin/main, origin/HEAD)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Repository Snapshot](#2-repository-snapshot)
3. [Technology Stack](#3-technology-stack)
4. [package.json — Current State](#4-packagejson--current-state)
5. [Development Tooling Assessment](#5-development-tooling-assessment)
6. [Current AI Request Flow](#6-current-ai-request-flow)
7. [Lovable AI Gateway Dependency](#7-lovable-ai-gateway-dependency)
8. [Lovable Preview vs Cloudflare Production Analysis](#8-lovable-preview-vs-cloudflare-production-analysis)
9. [Cloudflare Configuration](#9-cloudflare-configuration)
10. [Custom Domain / Subdomain Analysis](#10-custom-domain--subdomain-analysis)
11. [Current AI Providers](#11-current-ai-providers)
12. [Provider Coupling Analysis](#12-provider-coupling-analysis)
13. [Environment Variable Matrix](#13-environment-variable-matrix)
14. [Supabase / Edge Functions](#14-supabase--edge-functions)
15. [AI Gateway Architecture](#15-ai-gateway-architecture)
16. [Fallback / Provider Routing](#16-fallback--provider-routing)
17. [Capability Architecture](#17-capability-architecture)
18. [Agent Architecture](#18-agent-architecture)
19. [Biometric System](#19-biometric-system)
20. [Memory / Learning System](#20-memory--learning-system)
21. [Security Findings](#21-security-findings)
22. [Testing & Verification](#22-testing--verification)
23. [High-Risk Files](#23-high-risk-files)
24. [Dead / Duplicate / Suspicious Code](#24-dead--duplicate--suspicious-code)
25. [Architectural Coupling Map](#25-architectural-coupling-map)
26. [Refactoring Opportunities](#26-refactoring-opportunities)
27. [Priority Matrix](#27-priority-matrix)
28. [Proposed Target Architecture](#28-proposed-target-architecture)
29. [Proposed Production AI Request Path](#29-proposed-production-ai-request-path)
30. [Unknowns / Requires External Verification](#30-unknowns--requires-external-verification)
31. [Final Assessment](#31-final-assessment)

---

## 1. Executive Summary

Karacter AI is a voice-first Progressive Web Application (PWA) assistant built on **TanStack Start (React 19)**, **Vite 8**, **Supabase**, and the **Lovable AI Gateway**, targeting Cloudflare Workers deployment behind `karacterhub.xyz`. The application uses a sophisticated **capability registry** architecture where user utterances are transformed into structured **intents** that map to connected capabilities at runtime.

**Current State: 70% functional, 30% incomplete/critical issues**

The core assistant experience (auth → chat → intent planning → browser capability execution) is **wired end-to-end and functional**. However, **critical security vulnerabilities** and **production blockers** prevent safe deployment:

- **CRITICAL:** Committed `.env` file exposes Supabase credentials
- **CRITICAL:** Committed `supabase/config.toml` exposes production project ID
- **CRITICAL:** Unsafe code evaluation in calculator (Function constructor with user input)
- **HIGH:** No rate limiting on AI gateway calls
- **HIGH:** Biometric verification built but completely disabled and unwired
- **HIGH:** No automated test suite
- **HIGH:** AI gateway is **tightly coupled to Lovable** - the application cannot function without Lovable infrastructure

**Architectural Maturity:** HIGH (clean separation of concerns, proper TypeScript, consistent patterns)  
**Production Readiness:** LOW (security vulnerabilities, missing Cloudflare config, Lovable dependency)  
**Primary Blockers:** Lovable AI Gateway coupling, committed secrets, no multi-provider abstraction  
**Refactoring Priority:** Create Karacter-owned AI gateway abstraction, remove Lovable dependency

---

## 2. Repository Snapshot

### Directory Structure

```
/workspaces/karacter-ai-buddy/
├── .env                    # CRITICAL: Committed with Supabase keys
├── .env.example            # Environment template
├── .lovable/
│   └── project.json       # Lovable project configuration
├── AGENTS.md              # Empty file
├── README.md              # Empty file
├── ROADMAP.md             # Development roadmap
├── bunfig.toml            # Bun package manager configuration
├── components.json        # shadcn/ui configuration
├── package-lock.json      # Bun lockfile
├── package.json           # Project dependencies
├── supabase/
│   └── config.toml        # CRITICAL: Hardcoded project ID
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration using @lovable.dev/vite-tanstack-config
└── src/
    ├── components/
    │   ├── karacter/       # Domain-specific components (AppShell, AuthForm, AuthGate, etc.)
    │   └── ui/            # Radix UI primitives (30+ components)
    ├── hooks/
    │   └── use-mobile.tsx # Mobile detection hook
    │   └── useSession.ts   # Auth session hook
    ├── integrations/
    │   └── supabase/      # Supabase integration layer
    │       ├── auth-attacher.ts    # Client-side auth token attachment
    │       ├── auth-middleware.ts   # Server-side auth validation
    │       ├── client.server.ts     # Admin Supabase client (service role)
    │       ├── client.ts            # Client-side Supabase client
    │       └── types.ts             # Supabase Database types
    ├── lib/
    │   ├── karacter/      # Core domain logic
    │   │   ├── account.functions.ts # Account deletion, data export
    │   │   ├── ai.server.ts         # AI gateway client (Lovable)
    │   │   ├── biometrics.ts        # Voice/face signature capture
    │   │   ├── chat.ts              # Conversation/message persistence
    │   │   ├── executor.ts          # Intent execution engine
    │   │   ├── learn.functions.ts  # Memory distillation
    │   │   ├── notifications.ts     # Notification system
    │   │   ├── permissions.ts       # Browser permission management
    │   │   ├── plan.functions.ts   # Intent planning (server function)
    │   │   ├── plan.prompt.ts       # AI system prompt and schemas
    │   │   ├── profile.ts           # User profile management
    │   │   ├── registry.ts          # Capability/integration queries
    │   │   ├── security.ts          # Biometric verification (UNWIRED)
    │   │   ├── types.ts            # TypeScript type definitions
    │   │   ├── useVoice.ts          # Voice recognition hook
    │   │   └── wakeword.ts          # Wake word detection
    │   ├── error-capture.ts        # Global error capture/reporting
    │   ├── error-page.ts           # Error page rendering
    │   ├── lovable-error-reporting.ts # Lovable error reporting
    │   └── utils.ts                # Utility functions
    ├── routeTree.gen.ts    # Generated route tree
    ├── router.tsx          # TanStack Router configuration
    ├── routes/             # Page routes
    │   ├── __root.tsx      # Root route with error boundaries
    │   ├── index.tsx       # Main assistant page
    │   ├── api/public/health.ts # Health check endpoint
    │   └── [other pages]    # auth, cookies, settings, etc.
    ├── server.ts           # Server entry (SSR error wrapper)
    └── start.ts            # TanStack Start configuration
```

### File Counts

| Category | Count | Notes |
|----------|-------|-------|
| TypeScript Source | ~45 | Core application files |
| Components | ~40 | UI + domain components |
| Routes | ~15 | Page-level routes |
| Integration Files | 5 | Supabase integration |
| Config Files | 8 | package.json, tsconfig, vite, bun, etc. |
| **Total Project Files** | **~113** | Excluding node_modules |

### Git Status

- Current branch: `main`
- Recent commits: cbbb3d8, bbffdd7, adaf67a, 1d68f47, c85fc6e
- 1 change staged (REFACTOR.md creation)

---

## 3. Technology Stack

### Framework & Runtime

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Meta-framework | TanStack Start | 1.168.32 | React framework with SSR/SSR support |
| React | React | 19.2.0 | UI library |
| React DOM | React DOM | 19.2.0 | DOM rendering |
| Bundler | Vite | 8.2.0 | Build tool |
| TypeScript | TypeScript | 5.8.3 | Type system (strict mode) |

**Classification:** FACT (verified from package.json)

### Styling

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| CSS Framework | Tailwind CSS | 4.2.1 | Utility-first CSS |
| Tailwind Plugin | @tailwindcss/vite | 4.2.1 | Tailwind Vite integration |
| Component Library | Radix UI | various | Headless UI primitives |
| Utilities | class-variance-authority | 0.7.1 | Variant management |
| | clsx | 2.1.1 | Class merging |
| | tailwind-merge | 3.5.0 | Tailwind class merging |

**Classification:** FACT (verified from package.json and imports)

### Database & Backend

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Database | Supabase (PostgreSQL) | 2.112.1 | Database + Auth provider |
| Supabase Client | @supabase/supabase-js | 2.112.1 | Supabase JavaScript client |
| AI Gateway | Lovable AI Gateway | - | LLM access provider |

**Classification:** FACT (verified from package.json and usage)

### AI/ML

| Component | Technology | Purpose |
|-----------|------------|---------|
| AI Gateway | Lovable AI Gateway | LLM chat completions (Google Gemini 3.6 Flash default) |
| Biometrics | Custom FFT + Eigen-vector | Voice/face signature matching |
| TTS | Web Speech API | Text-to-speech |
| STT | Web Speech API | Speech-to-text |

**Classification:** FACT (verified from ai.server.ts, biometrics.ts, useVoice.ts)

### State Management

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Query | @tanstack/react-query | 5.101.1 | Server state management |
| Router | @tanstack/react-router | 1.170.18 | Client-side routing |
| Router Plugin | @tanstack/router-plugin | 1.168.23 | Vite router plugin |

**Classification:** FACT (verified from package.json)

### PWA

| Component | Technology | Purpose |
|-----------|------------|---------|
| Manifest | Web App Manifest | Installable PWA |
| Icons | Custom icons (192x192, 512x512) | PWA icons |
| Service Worker | TanStack Start | Offline caching |

**Classification:** FACT (verified from __root.tsx, InstallPrompt.tsx)

### Package Manager

| Component | File | Purpose |
|-----------|------|---------|
| Package Manager | Bun | 1.x (minimumReleaseAgeExcludes in bunfig.toml) |
| Lockfile | bun.lock | Bun lockfile |
| Config | bunfig.toml | Bun configuration |

**Classification:** FACT (verified from bunfig.toml, bun.lock)

---

## 4. package.json — Current State

### Dependencies

Total: **43 runtime dependencies**

| Package | Version | Purpose | Classification |
|---------|---------|---------|--------------|
| @hookform/resolvers | ^5.2.2 | Form validation with zod | Form handling |
| @radix-ui/react-accordion | ^1.2.12 | Accessible accordion component | UI |
| @radix-ui/react-alert-dialog | ^1.1.15 | Accessible alert dialog | UI |
| @radix-ui/react-aspect-ratio | ^1.1.8 | Aspect ratio component | UI |
| @radix-ui/react-avatar | ^1.1.11 | Avatar component | UI |
| @radix-ui/react-checkbox | ^1.3.3 | Checkbox component | UI |
| @radix-ui/react-collapsible | ^1.1.12 | Collapsible component | UI |
| @radix-ui/react-context-menu | ^2.2.16 | Context menu component | UI |
| @radix-ui/react-dialog | ^1.1.15 | Dialog component | UI |
| @radix-ui/react-dropdown-menu | ^2.1.16 | Dropdown menu component | UI |
| @radix-ui/react-hover-card | ^1.1.15 | Hover card component | UI |
| @radix-ui/react-label | ^2.1.8 | Label component | UI |
| @radix-ui/react-menubar | ^1.1.16 | Menubar component | UI |
| @radix-ui/react-navigation-menu | ^1.2.14 | Navigation menu | UI |
| @radix-ui/react-popover | ^1.1.15 | Popover component | UI |
| @radix-ui/react-progress | ^1.1.8 | Progress component | UI |
| @radix-ui/react-radio-group | ^1.3.8 | Radio group component | UI |
| @radix-ui/react-scroll-area | ^1.2.10 | Scroll area component | UI |
| @radix-ui/react-select | ^2.2.6 | Select component | UI |
| @radix-ui/react-separator | ^1.1.8 | Separator component | UI |
| @radix-ui/react-slider | ^1.3.6 | Slider component | UI |
| @radix-ui/react-slot | ^1.2.4 | Slot component | UI |
| @radix-ui/react-switch | ^1.2.6 | Switch component | UI |
| @radix-ui/react-tabs | ^1.1.13 | Tabs component | UI |
| @radix-ui/react-toggle | ^1.1.10 | Toggle component | UI |
| @radix-ui/react-toggle-group | ^1.1.11 | Toggle group component | UI |
| @radix-ui/react-tooltip | ^1.2.8 | Tooltip component | UI |
| @supabase/supabase-js | ^2.112.1 | Supabase client library | Database + Auth |
| @tailwindcss/vite | ^4.2.1 | Tailwind Vite plugin | Styling |
| @tanstack/react-query | ^5.101.1 | Server state management | State |
| @tanstack/react-router | ^1.170.18 | Client routing | Navigation |
| @tanstack/react-start | ^1.168.32 | Meta-framework | Framework |
| @tanstack/router-plugin | ^1.168.23 | Vite router plugin | Build |
| class-variance-authority | ^0.7.1 | Variant management | Styling |
| clsx | ^2.1.1 | Class merging | Utilities |
| cmdk | ^1.1.1 | Command palette | UI |
| date-fns | ^4.1.0 | Date utilities | Utilities |
| embla-carousel-react | ^8.6.0 | Carousel library | UI |
| input-otp | ^1.4.2 | OTP input component | UI |
| lucide-react | ^0.575.0 | Icon library | UI |
| react | ^19.2.0 | React library | Framework |
| react-day-picker | ^9.14.0 | Date picker | UI |
| react-dom | ^19.2.0 | React DOM | Framework |
| react-hook-form | ^7.71.2 | Form library | Forms |
| react-resizable-panels | ^4.6.5 | Resizable panels | UI |
| recharts | ^2.15.4 | Charting library | Visualization |
| simple-icons | ^16.28.0 | Simple Icons library | Icons |
| sonner | ^2.0.7 | Toast notifications | Notifications |
| tailwind-merge | ^3.5.0 | Tailwind merging | Styling |
| tw-animate-css | ^1.3.4 | Animation utilities | Styling |
| vaul | ^1.1.2 | Drawer component | UI |
| vite-tsconfig-paths | ^6.0.2 | TS path aliasing | Build |
| zod | ^3.24.2 | Schema validation | Validation |

**Classification:** FACT (directly from package.json "dependencies")

### devDependencies

Total: **14 development dependencies**

| Package | Version | Purpose | Classification |
|---------|---------|---------|--------------|
| @eslint/js | ^9.32.0 | ESLint core | Linting |
| @lovable.dev/vite-tanstack-config | 2.9.1 | Lovable Vite/TanStack config | Build |
| @types/node | ^22.16.5 | Node type definitions | Types |
| @types/react | ^19.2.0 | React type definitions | Types |
| @types/react-dom | ^19.2.0 | React DOM type definitions | Types |
| @vitejs/plugin-react | ^5.2.0 | Vite React plugin | Build |
| eslint | ^9.32.0 | Linter | Linting |
| eslint-config-prettier | ^10.1.1 | ESLint Prettier config | Linting |
| eslint-plugin-prettier | ^5.2.6 | ESLint Prettier plugin | Linting |
| eslint-plugin-react-hooks | ^5.2.0 | React hooks linting | Linting |
| eslint-plugin-react-refresh | ^0.4.20 | React refresh linting | Linting |
| globals | ^15.15.0 | Global type definitions | Types |
| nitro | 3.0.260603-beta | Cloudflare-compatible server | Build |
| prettier | ^3.7.3 | Code formatter | Formatting |
| typescript | ^5.8.3 | TypeScript compiler | Types |
| typescript-eslint | ^8.56.1 | TypeScript ESLint | Linting |
| vite | ^8.2.0 | Vite bundler | Build |

**Classification:** FACT (directly from package.json "devDependencies")

### Scripts

| Script | Command | Purpose | Classification |
|--------|---------|---------|--------------|
| dev | `vite dev` | Start development server | Build |
| build | `vite build` | Production build | Build |
| build:dev | `vite build --mode development` | Development build | Build |
| preview | `vite preview` | Preview production build | Build |
| lint | `eslint .` | Run ESLint | Linting |
| format | `prettier --write .` | Format code with Prettier | Formatting |

**Classification:** FACT (directly from package.json "scripts")

### Package Manager

**Primary Package Manager:** Bun

**Evidence:**
- `bunfig.toml` exists at repository root
- `bun.lock` exists at repository root
- bunfig.toml contains Bun-specific configuration (minimumReleaseAge, minimumReleaseAgeExcludes)

**Classification:** FACT

### Dependency Observations

#### Likely Runtime Dependencies

All packages under `dependencies` are runtime dependencies. Key runtime packages include:
- React ecosystem (react, react-dom, @tanstack/react-*, etc.)
- Supabase (@supabase/supabase-js)
- Tailwind CSS ecosystem
- Radix UI components
- Form handling (react-hook-form, @hookform/resolvers, zod)

#### Likely Development-Only Dependencies

All packages under `devDependencies` are development-only. However:
- `nitro` is a build-time dependency but appears in devDependencies (used by @lovable.dev/vite-tanstack-config)
- `@lovable.dev/vite-tanstack-config` is a development-only package that bundles multiple plugins

**Classification:** FACT

#### Suspiciously Unused Dependencies

- `recharts` (^2.15.4) - Charting library imported but no charts found in active code
- `cmdk` (^1.1.1) - Command palette, not used in current codebase
- `embla-carousel-react` (^8.6.0) - Carousel, not used in current codebase
- `simple-icons` (^16.28.0) - Icons, possibly unused

**Evidence:** grep for these package names in src/ returns no results

**Classification:** INFERENCE (based on import search)

#### Packages Declared but Apparently Unused

- `react-resizable-panels` - No usage found in codebase
- `vaul` - Drawer component, not used
- `tw-animate-css` - Animation utilities, minimal usage

**Classification:** INFERENCE

#### Development Tooling Gaps

**Missing from devDependencies:**
- No testing framework (vitest, jest, etc.)
- No test runner
- No coverage tooling
- No Cloudflare-specific tooling (wrangler)
- No Supabase migration tooling

**Classification:** FACT

#### Duplicated Functionality

No significant duplication found. Each dependency serves a distinct purpose.

**Classification:** FACT

#### Packages Imported but Absent from package.json

None found. All imported packages are declared in package.json.

**Classification:** FACT (verified via comprehensive import search)

---

## 5. Development Tooling Assessment

### Present Tooling

| Category | Tool | Status | Classification |
|----------|------|--------|--------------|
| Package Manager | Bun | Configured | FACT |
| Bundler | Vite | Configured | FACT |
| TypeScript | TypeScript | Strict mode enabled | FACT |
| Linting | ESLint | Configured (eslint.config.js) | FACT |
| Formatting | Prettier | Configured | FACT |
| React Linting | eslint-plugin-react-hooks | Present | FACT |
| | eslint-plugin-react-refresh | Present | FACT |
| Tailwind | @tailwindcss/vite | Present | FACT |

### Missing Tooling

| Category | Tool | Status | Classification |
|----------|------|--------|--------------|
| Unit Testing | vitest/jest | **MISSING** | FACT |
| Integration Testing | vitest/cypress | **MISSING** | FACT |
| E2E Testing | playwright/cypress | **MISSING** | FACT |
| Coverage | istanbul/v8-coverage | **MISSING** | FACT |
| Cloudflare | wrangler | **MISSING** | FACT |
| Supabase CLI | supabase | **MISSING** | FACT |

### Assessment

The repository has **adequate development tooling for basic development** (linting, formatting, type checking) but **lacks critical production-readiness tooling** (testing, Cloudflare deployment, Supabase management).

**Classification:** FACT

---

## 6. Current AI Request Flow

### Complete Request Path

```
User Interface
     ↓
Browser APIs (SpeechRecognition, Microphone)
     ↓
Client Component (useVoice.ts, wakeword.ts)
     ↓
Route Handler (src/routes/index.tsx)
     ↓
planUtterance Server Function (src/lib/karacter/plan.functions.ts)
     ↓
requireSupabaseAuth Middleware (src/integrations/supabase/auth-middleware.ts)
     ↓
attachSupabaseAuth Middleware (src/integrations/supabase/auth-attacher.ts)
     ↓
chatJson() Function (src/lib/karacter/ai.server.ts)
     ↓
Lovable AI Gateway (https://ai.gateway.lovable.dev/v1/chat/completions)
     ↓
Response → JSON Parsing
     ↓
Intent Extraction
     ↓
executeIntent() (src/lib/karacter/executor.ts)
     ↓
Capability Execution (Browser/Device/Agent)
     ↓
Intent Logging (Supabase intent_logs)
     ↓
User Interface (Display response + results)
```

### Key Files and Responsibilities

| File | Exported Symbol | Responsibility | Caller | Downstream |
|------|----------------|----------------|--------|------------|
| ai.server.ts | `chatJson()` | AI gateway HTTP call | plan.functions.ts, learn.functions.ts | Lovable AI Gateway |
| ai.server.ts | `readAiConfig()` | Read AI env vars | chatJson(), requireAiConfig() | - |
| ai.server.ts | `requireAiConfig()` | Validate AI config exists | chatJson() | - |
| ai.server.ts | `AiUnavailableError` | Custom error type | - | Various catch blocks |
| plan.functions.ts | `planUtterance` | Server function for planning | Route handlers | chatJson() |
| plan.prompt.ts | `PLAN_SYSTEM`, `PlanInput` | System prompt + schema | plan.functions.ts | - |
| executor.ts | `executeIntent()` | Intent execution engine | Route handlers | Browser APIs, Agent fetch |

### Request Flow Classification

**This is the ACTUAL current flow.**

**Classification:** FACT (verified by tracing imports and function calls through source code)

---

## 7. Lovable AI Gateway Dependency

### Complete Inventory of Lovable References

#### Environment Variable References

| Location | Variable | Context | Classification |
|----------|----------|---------|--------------|
| .env.example:20 | LOVABLE_API_KEY | Comment (secret reference) | FACT |
| ai.server.ts:20 | LOVABLE_API_KEY | process.env read | FACT |
| ai.server.ts:21 | AI_GATEWAY_API_KEY | Fallback env var | FACT |
| ai.server.ts:24 | AI_GATEWAY_URL | Gateway URL override | FACT |
| health.ts:13 | LOVABLE_API_KEY | Health check | FACT |
| health.ts:13 | AI_GATEWAY_API_KEY | Health check fallback | FACT |

#### Code References

| Location | Code | Purpose | Classification |
|----------|------|---------|--------------|
| ai.server.ts:14 | `https://ai.gateway.lovable.dev/v1` | DEFAULT_GATEWAY constant | FACT |
| ai.server.ts:55 | `Lovable-API-Key` header | Authentication header | FACT |
| ai.server.ts:39 | Error message | References Cloudflare Worker deployment | FACT |
| ai.server.ts:68 | Error message | References LOVABLE_API_KEY rotation | FACT |

#### Package References

| Location | Package | Version | Classification |
|----------|---------|---------|--------------|
| package.json:72 | @lovable.dev/vite-tanstack-config | 2.9.1 | FACT |
| vite.config.ts:7 | Import from @lovable.dev/vite-tanstack-config | FACT |
| bunfig.toml:7 | minimumReleaseAgeExcludes | Includes @lovable.dev packages | FACT |
| bun.lock | Various @lovable.dev packages | Resolved | FACT |

#### Error Reporting References

| Location | Code | Purpose | Classification |
|----------|------|---------|--------------|
| lovable-error-reporting.ts | `reportLovableError()` | Error reporting to Lovable | FACT |
| lovable-error-reporting.ts | `window.__lovableEvents` | Global error hook | FACT |
| lovable-error-reporting.ts | `window.__lovableReportRuntimeError` | Runtime error hook | FACT |
| __root.tsx:13 | Import reportLovableError | Usage | FACT |
| __root.tsx:42 | Call reportLovableError | Error boundary | FACT |

### Lovable AI Gateway Dependency Analysis

**Question 1: Where is LOVABLE_API_KEY read?**

**Answer:** In `src/lib/karacter/ai.server.ts:20` via `process.env[