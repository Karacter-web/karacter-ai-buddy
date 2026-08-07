# Karacter AI — Roadmap

Karacter AI is a voice-first, PWA assistant built on TanStack Start (React 19, Vite 7), Supabase, and the Lovable AI Gateway, targeted at Cloudflare Workers behind `karacterhub.xyz`. The LLM never touches devices directly: it plans **intents** against a live **Capability Registry**, and each installed integration executes what it is authorized to do.

## Current Status / Progress Summary

The assistant is functional end-to-end for authenticated users: sign in (email/password or Google), speak or type, get a planned response, and see intents executed by connected capabilities. Chat persists in Supabase and is browsable from History. Biometric verification is **paused** — enrolment still works, but it no longer gates assistant access.

- [x] 6 of 9 core areas complete (auth, chat persistence, registry, planner, PWA, navigation)
- [ ] Stable biometric verification, realtime/webhook endpoints, production Cloudflare pipeline

## Phase 1: Foundation — complete

- [x] TanStack Start + Tailwind v4 + PWA shell (manifest, icons, install prompt) (done)
- [x] Supabase auth: email/password, validation, password strength, reset flow (done)
- [x] Google OAuth sign-in via the Lovable broker (done)
- [x] Legal surfaces: privacy, terms, cookies + acceptance toggle (done)
- [x] Responsive sidebar navigation, notification bell, history + new chat (done)

## Phase 2: Assistant Core — complete

- [x] Capability Registry tables (`capabilities`, `integrations`) with RLS (done)
- [x] LLM planner server function returning structured intents (done)
- [x] Client executor for browser capabilities (camera, clipboard, share) (done)
- [x] Conversation + message persistence in Supabase, resumable from `/history` (done)
- [x] Wake word ("Hey Karacter") with spoken greeting using the user's nickname (done)
- [x] Continuous learning: distilled facts stored in `assistant_memories` (done)

## Phase 3: Stability & Trust — in progress

- [ ] Rebuild biometric verification as an opt-in step-up, not an access gate (large)
  - Rationale: FFT voiceprints and grayscale face vectors are too noisy for a hard gate; false rejections locked users out of their own assistant.
  - [ ] Multi-sample enrolment with averaged templates and per-user thresholds
  - [ ] Confidence scoring surfaced to the user before any lockdown
  - [ ] Step-up only for sensitive intents (terminal, filesystem, payments)
- [ ] Password / account-session fallback wired into the step-up flow (small)
- [ ] Error and offline states for planner failures and lost mic permission (small)
- [ ] Rate limiting and abuse guards on the planner server function (medium)

## Phase 4: Integrations at Runtime

- [ ] OAuth connect flow per integration with token storage and revocation (large)
- [ ] API-key integrations with encrypted-at-rest secrets and scope display (medium)
- [ ] Local agent pairing protocol for Terminal / Filesystem / Docker capabilities (large)
- [ ] Confirmation + validation endpoints before destructive intents execute (medium)
- [ ] WebSocket / realtime channel for agent round-trips and streaming results (large)
- [ ] Per-integration health checks and status badges (small)

## Phase 5: Production Deployment

- [ ] GitHub repository export with `.env` excluded and `.env.example` documented (small)
- [ ] Cloudflare Workers project + `wrangler` config bound to `karacterhub.xyz` (medium)
- [ ] Preview/staging environment separated from production by env vars (medium)
- [ ] Global-access database decision documented (single Supabase project for now) (small)
- [ ] Lighthouse / PWA audit and offline shell caching (medium)

## Future Ideas & Backlog

- Mobile home-button long-press assistant handoff (requires a native wrapper)
- Multi-user households: distinguish speakers and switch persona
- Intent macros: chain saved multi-step routines
- Marketplace for community-published capability manifests
- On-device embeddings for memory retrieval instead of full-text recall
- Multilingual wake words and locale-aware TTS voices

## Known Limitations / Tech Debt

- Biometric matching uses hand-rolled signal features, not a trained model — unstable and now disabled by default.
- A browser cannot lock an OS; "lockdown" only blanks the Karacter session.
- Preview and production share one Supabase project, so staging writes hit live data.
- Executor capabilities that need OS privileges are stubbed until the local agent ships.
- No automated test suite yet; verification is manual plus typecheck.
- `intent_logs` grows unbounded — needs retention and a pruning job.
