# AGENTS.md

# Karacter AI — Agent Engineering Contract

This document defines how AI coding agents must operate when working in the Karacter AI repository.

It provides repository-level engineering, architecture, security, verification, and change-management instructions.

This file is an operational contract for coding agents. It does not replace source code, migrations, API contracts, legal documentation, product requirements, or detailed architectural documentation.

---

# 1. Mission

Karacter AI is a voice-first Progressive Web Application (PWA) assistant built around a runtime capability registry.

The assistant receives natural-language or voice input, plans structured intents, determines which capabilities are available, and executes authorized capabilities.

The architecture is intentionally designed so that the AI model does not directly become the authority over the user's environment.

The conceptual execution pipeline is:

```text
User Input
    ↓
Input Capture
    ↓
Intent Planning
    ↓
Structured Intent
    ↓
Capability Resolution
    ↓
Authorization / Permission Checks
    ↓
Confirmation where required
    ↓
Capability Execution
    ↓
Execution Result
    ↓
Audit Logging
    ↓
Conversation / Memory Updates
```

Agents must preserve these boundaries when modifying the system.

---

# 2. Core Engineering Principles

Agents working in this repository must follow these principles.

## 2.1 Inspect Before Modifying

Before changing an unfamiliar subsystem:

1. Inspect its implementation.
2. Identify its callers.
3. Identify its dependencies.
4. Identify its security boundary.
5. Identify relevant database tables or external services.
6. Check existing documentation and migrations.
7. Determine whether the functionality is active, partial, stubbed, deprecated, or planned.

Do not assume that the presence of code means the feature is operational.

---

## 2.2 Preserve Existing Architecture

Prefer extending established architecture over introducing parallel systems.

Do not:

* create duplicate service layers;
* bypass existing server functions;
* bypass existing authentication middleware;
* bypass RLS;
* create a second capability registry;
* create a second AI planning mechanism;
* introduce another state-management system without justification;
* duplicate existing Supabase clients;
* introduce unnecessary framework abstractions.

---

## 2.3 Minimize Scope

A requested feature does not automatically authorize unrelated refactoring.

Prefer:

```text
Targeted change
    ↓
Required supporting changes
    ↓
Verification
```

over:

```text
Requested change
    ↓
Large architectural rewrite
    ↓
Unrelated cleanup
    ↓
New dependencies
    ↓
Unknown regressions
```

Do not perform drive-by refactors unless they are necessary for correctness, security, or maintainability of the requested work.

---

# 3. Current Technology Baseline

The current audited project uses:

* TanStack Start
* React 19
* Vite
* TypeScript with strict mode
* Bun
* Tailwind CSS v4
* Radix UI
* TanStack Router
* TanStack React Query
* Supabase / PostgreSQL
* Supabase Auth
* Supabase Row Level Security
* Lovable AI Gateway
* Zod
* Web Speech APIs
* MediaDevices APIs
* PWA capabilities

The repository currently follows a feature-oriented structure including:

```text
src/
├── components/
│   ├── karacter/
│   └── ui/
├── hooks/
├── integrations/
│   └── supabase/
├── lib/
│   └── karacter/
└── routes/
```

The repository also contains Supabase migrations and project configuration.

These conventions should be preserved unless there is a documented architectural reason to change them.

---

# 4. Architecture Model

Karacter currently uses several important architectural boundaries.

## 4.1 Client / Server Boundary

Server-only operations must remain server-side.

Server-only modules should use the repository's established `.server.ts` convention where applicable.

Never expose:

* service-role credentials;
* private API keys;
* privileged database clients;
* server-only integration credentials;
* privileged administrative operations

to browser/client code.

---

## 4.2 Server Functions

Server functions are a security boundary.

Before adding or modifying a server function:

1. Identify its authentication requirements.
2. Identify its authorization requirements.
3. Validate all external input.
4. Determine whether the operation accesses user-owned data.
5. Determine whether the operation requires elevated privileges.
6. Ensure errors do not leak sensitive information.

Do not bypass the established middleware/authentication pipeline for convenience.

---

# 5. Authentication and Authorization

## 5.1 Authentication

Supabase Auth is currently the primary authentication system.

Supported authentication includes:

* email/password;
* Google OAuth.

Authentication establishes who the user is.

It does not automatically authorize every operation.

---

## 5.2 Authorization

Authorization must be enforced at the appropriate boundary.

Relevant controls may include:

* Supabase RLS;
* authenticated user identity;
* user ownership;
* server-side authorization checks;
* capability availability;
* integration connection state;
* explicit permissions;
* confirmation requirements;
* future policy/role systems.

Agents must not assume:

```text
Authenticated user
    =
Authorized for every action
```

---

## 5.3 RLS

Supabase Row Level Security is a critical security boundary.

Do not bypass RLS merely because a query is inconvenient.

When changing database access:

* inspect existing policies;
* understand `auth.uid()` ownership rules;
* inspect foreign-key relationships;
* verify SELECT/INSERT/UPDATE/DELETE behavior;
* consider cross-user access;
* test both authorized and unauthorized cases.

Privileged/service-role clients must only be used where genuinely required.

---

# 6. Capability Registry

The capability registry is a core architectural component.

Capabilities represent actions that Karacter can potentially perform.

The current design resolves available capabilities approximately as:

```text
Available Capabilities
=
Registered Capabilities
∩
Enabled / Connected Integrations
```

The planner should only receive capabilities that are actually available to the user.

Agents must preserve this invariant.

---

## 6.1 Capability Is Not Authorization

The existence of a capability does not automatically authorize execution.

These are distinct concepts:

```text
Capability exists
        ≠
Capability is connected
        ≠
Capability is enabled
        ≠
User is authorized
        ≠
Permission is granted
        ≠
Confirmation has been provided
        ≠
Capability can execute successfully
```

Do not collapse these concepts into a single boolean.

---

# 7. Intent Planning

The AI planner converts natural-language input into structured intents.

The planner is not the final authority over execution.

The AI model must be treated as an untrusted decision-producing component.

Agents must assume that AI-generated output can be:

* malformed;
* incomplete;
* contradictory;
* maliciously influenced;
* hallucinated;
* outside the available capability set;
* unsafe;
* inconsistent with authorization state.

AI output must therefore pass through deterministic application-level validation before execution.

---

# 8. AI Output Validation

Never blindly trust raw AI output.

Structured AI responses should be validated against explicit schemas.

Use the repository's Zod validation conventions where applicable.

The preferred flow is:

```text
AI Response
    ↓
Parse
    ↓
Schema Validation
    ↓
Semantic Validation
    ↓
Capability Validation
    ↓
Authorization / Permission Checks
    ↓
Execution
```

Do not use:

```text
AI Response
    ↓
JSON.parse()
    ↓
Immediate execution
```

unless the response has been appropriately validated.

Malformed AI output must fail safely.

---

# 9. Prompt Injection and Untrusted Input

User input must be considered untrusted.

External content may also be untrusted, including:

* web content;
* imported documents;
* tool responses;
* third-party APIs;
* integration data;
* conversation content;
* generated content.

Do not assume that instructions contained inside retrieved or user-provided content are trusted system instructions.

AI planning must maintain clear separation between:

```text
System / developer constraints
User intent
Retrieved content
Tool output
Untrusted external instructions
```

Never allow arbitrary external content to silently override system-level security constraints.

---

# 10. Intent Execution

`executor.ts` and equivalent execution mechanisms are security-sensitive.

The executor must never assume that because an intent was generated by the planner, it is safe to execute.

Before execution, consider:

1. Is the capability registered?
2. Is the capability available?
3. Is the integration connected?
4. Is the user authorized?
5. Are required permissions granted?
6. Is confirmation required?
7. Is the target/input valid?
8. Is the operation reversible?
9. Is the operation sensitive?
10. Should the action be logged?

---

# 11. Sensitive Actions

Actions affecting external systems, private information, money, identity, account security, destructive operations, or irreversible state may require explicit confirmation.

Examples include:

* deleting data;
* changing account security;
* sending messages;
* publishing content;
* making purchases;
* transferring funds;
* modifying external resources;
* deleting repositories/files;
* granting permissions;
* changing credentials.

Do not introduce automatic execution for sensitive capabilities without explicitly defining the authorization and confirmation model.

---

# 12. Browser Capabilities

Karacter currently uses browser APIs for capabilities such as:

* camera;
* microphone;
* clipboard;
* notifications;
* geolocation;
* fullscreen;
* vibration;
* speech recognition;
* speech synthesis.

Browser permission is controlled by the browser and must not be represented as unconditional authorization.

Handle:

* permission denied;
* permission unavailable;
* unsupported browser;
* user cancellation;
* device failure;
* timeout;
* missing hardware

as expected failure states where appropriate.

Do not silently retry permission requests indefinitely.

---

# 13. Calculator / Expression Evaluation

Never use dynamic code evaluation for user-controlled expressions.

Do not use:

```ts
eval(...)
```

or:

```ts
new Function(...)
```

as a calculator/security mechanism for untrusted input.

Use a genuinely safe mathematical expression parser or a constrained deterministic evaluator.

Allow only explicitly supported mathematical operations.

---

# 14. Voice System

Karacter is voice-first.

Voice functionality includes:

* wake-word detection;
* speech recognition;
* speech synthesis;
* manual talk activation.

Voice input is untrusted input.

Do not treat successful speech recognition as proof of identity.

```text
Voice command
    ≠
Authenticated identity
```

Wake-word detection:

```text
"Hey Karacter"
```

is an activation mechanism, not an authentication mechanism.

---

# 15. Biometric System

The repository contains voice and face biometric enrollment functionality.

The current audited implementation has biometric verification code, but the verification flow is disabled/unwired and must not be represented as active security protection.

Until explicitly implemented and verified:

```text
Biometric enrollment
    ≠
Biometric authentication
```

Agents must not claim that biometric protection is active merely because:

* biometric tables exist;
* signatures can be generated;
* enrollment UI exists;
* `verifyIdentity()` exists;
* security functions exist.

When biometric authentication is eventually implemented, it should be treated as a dedicated security subsystem with explicit:

* enrollment;
* verification;
* liveness considerations;
* threshold management;
* failure handling;
* fallback authentication;
* consent;
* revocation;
* data protection;
* step-up authentication policy.

Do not improvise biometric security semantics.

---

# 16. Memory and Continuous Learning

Karacter contains a memory/learning subsystem.

Memory must be treated as distinct from raw conversation history.

Agents should preserve the distinction between:

```text
Conversation
    ↓
Candidate information
    ↓
Memory extraction
    ↓
Validation / policy
    ↓
Durable memory
```

Do not automatically treat every conversation statement as durable user memory.

Memory operations must respect:

* user consent;
* user ownership;
* deletion;
* export;
* privacy;
* retention rules.

---

# 17. Integrations

External integrations must be isolated behind appropriate interfaces.

Current/planned integrations may include services such as:

* Google Calendar;
* Spotify;
* GitHub;
* other external APIs;
* local agents.

Do not assume an integration is operational simply because it appears in the capability registry.

An integration can be:

```text
Registered
    ↓
Discoverable
    ↓
Connectable
    ↓
Connected
    ↓
Authenticated
    ↓
Healthy
    ↓
Authorized
    ↓
Executable
```

These states should not be conflated.

---

# 18. Local Agents

Local-agent capabilities are currently planned/stubbed rather than a fully implemented local agent system.

Future capabilities may include:

* filesystem;
* terminal;
* Docker;
* VS Code;
* OBS;
* other local-device operations.

Do not implement local-agent execution by simply exposing unrestricted endpoints.

A local agent must eventually have explicit:

* pairing;
* identity;
* authentication;
* authorization;
* capability discovery;
* permission boundaries;
* tool inventory;
* execution policies;
* confirmation rules;
* audit logging;
* connection health;
* revocation.

Treat a local agent as a privileged execution environment.

---

# 19. Future Agent / Skill / Knowledge / Tooling Architecture

The project is expected to evolve toward distinct concepts for:

```text
Agents
Skills
Knowledge
Tools
Capabilities
Integrations
Permissions
Policies
```

Do not prematurely collapse these concepts into one generic abstraction.

A useful conceptual separation is:

```text
Agent
    = reasoning / orchestration identity

Skill
    = reusable capability or procedure

Knowledge
    = information available for reasoning

Tool
    = executable interface

Capability
    = permissioned ability exposed to the planner

Integration
    = connection to an external system

Policy
    = rules governing what may happen

Permission
    = authorization granted to a user/agent/tool
```

This is an architectural direction, not a claim that all of these systems are currently implemented.

Do not create new implementations of these concepts without first examining the existing capability architecture.

---

# 20. Secrets and Environment Configuration

Secrets must never be committed.

Never commit:

* API keys;
* service-role keys;
* OAuth client secrets;
* access tokens;
* private keys;
* passwords;
* encryption keys;
* production credentials.

Environment files containing secrets must remain outside version control.

Use safe placeholders in:

```text
.env.example
```

Never copy production credentials into examples.

---

# 21. Supabase Credentials

Supabase publishable configuration and privileged credentials have different security implications.

Never expose:

```text
SUPABASE_SERVICE_ROLE_KEY
```

to browser code.

Service-role access bypasses normal RLS protections and must remain server-side.

If credentials have been committed historically:

1. Treat them as potentially exposed.
2. Rotate them where appropriate.
3. Remove them from tracked files.
4. Update environment configuration.
5. Verify no secrets remain in history where remediation requires history rewriting.

Do not assume a credential is safe merely because it is labeled "publishable."

---

# 22. Database Changes

Database changes must be performed through the repository's migration workflow.

Before changing schema:

1. Inspect existing migrations.
2. Inspect dependent application code.
3. Inspect RLS policies.
4. Inspect foreign keys.
5. Consider existing production data.
6. Consider migration ordering.
7. Consider rollback/recovery.

Never casually modify production data to make development work.

---

# 23. Error Handling

The project currently contains multiple error-handling approaches.

Agents should avoid introducing additional inconsistent patterns.

Preferred behavior:

```text
Error occurs
    ↓
Capture sufficient diagnostic context
    ↓
Avoid leaking sensitive information
    ↓
Return appropriate application error
    ↓
Provide useful user-facing feedback where appropriate
```

Do not silently swallow meaningful failures.

Do not expose:

* stack traces;
* secrets;
* database credentials;
* internal tokens;
* sensitive user data

to end users.

---

# 24. Logging

Logs must be useful without becoming a source of data leakage.

Never log:

* passwords;
* API keys;
* access tokens;
* service-role keys;
* biometric templates;
* sensitive personal information unnecessarily.

Prefer structured logging for security-sensitive and execution-sensitive operations.

Sensitive operations should eventually have appropriate audit records.

---

# 25. Health Endpoints

Health endpoints should expose operational state without unnecessarily exposing deployment secrets or sensitive configuration.

Do not expose raw environment variables.

Avoid unnecessary information such as:

```text
SECRET_PRESENT=true
```

when the same operational health question can be answered without revealing configuration details.

Health endpoints should answer:

```text
Is the service operational?
```

not:

```text
Which secrets does this deployment contain?
```

---

# 26. Rate Limiting and Abuse Prevention

AI planning and external API operations can create real financial and operational costs.

Before production:

* expensive AI endpoints should have appropriate rate limiting;
* abuse controls should exist for externally callable operations;
* request sizes should be bounded;
* execution frequency should be controlled where appropriate;
* external API quotas should be considered.

Never assume authentication alone prevents abuse.

---

# 27. Testing

The audited repository currently lacks a meaningful automated test suite.

Do not represent manual testing as automated testing.

When adding tests, prioritize high-risk boundaries first:

```text
Authentication
Authorization
RLS
Intent validation
Capability resolution
Intent execution
Sensitive actions
Biometric verification
AI response validation
Memory operations
Account deletion
Integration authorization
```

Tests should include both:

```text
Expected success
```

and:

```text
Expected rejection/failure
```

---

# 28. Verification Requirements

Before declaring a change complete, agents should perform the strongest practical verification available.

Where applicable:

```text
Type check
    ↓
Lint
    ↓
Unit tests
    ↓
Integration tests
    ↓
Build
    ↓
Relevant runtime verification
    ↓
Final diff inspection
```

Do not claim:

* "tested";
* "verified";
* "production-ready";
* "secure";
* "working end-to-end"

unless the available evidence supports the statement.

Clearly distinguish:

```text
Implemented
```

from:

```text
Verified
```

and:

```text
Production-ready
```

---

# 29. Build and Package Management

The project currently uses Bun and contains a `bun.lock`.

Do not switch package managers casually.

Before changing dependency management:

1. Inspect existing package configuration.
2. Determine why the current package manager is used.
3. Evaluate CI/CD implications.
4. Evaluate Cloudflare deployment compatibility.
5. Document intentional changes.

Avoid modifying unrelated dependencies during feature work.

---

# 30. Vendor Lock-In Awareness

The audited project currently contains Lovable-specific tooling/configuration.

Agents must distinguish between:

```text
Application architecture
```

and:

```text
Development-platform-specific tooling
```

Do not introduce additional vendor-specific coupling without justification.

When replacing or removing vendor dependencies, verify:

* build behavior;
* runtime behavior;
* environment variables;
* deployment compatibility;
* generated configuration;
* development workflow.

---

# 31. Cloudflare Deployment

The intended production target is Cloudflare Workers behind the Karacter domain.

The audited repository did not yet contain a finalized Cloudflare Workers configuration.

Do not assume local/TanStack development behavior is identical to Cloudflare Workers runtime behavior.

Before production deployment, verify:

* Workers configuration;
* runtime compatibility;
* environment bindings;
* secrets;
* server-function behavior;
* routing;
* static assets;
* database connectivity;
* external API access;
* caching;
* PWA behavior.

---

# 32. PWA

Karacter is a Progressive Web Application.

Changes affecting:

* service workers;
* manifest;
* install prompts;
* offline behavior;
* caching;
* browser permissions;
* standalone mode

must consider both desktop and mobile browser behavior.

Do not assume browser APIs have identical support across environments.

---

# 33. Naming Conventions

Preserve established conventions.

Current conventions include:

```text
Files:
kebab-case where established

React components:
PascalCase

Variables/functions:
camelCase

Server-only modules:
.server.ts

Domain logic:
src/lib/karacter/
```

Do not rename files merely to satisfy personal stylistic preferences.

When introducing new conventions, apply them consistently and document the decision.

---

# 34. Components and UI

The project uses Radix-based UI primitives and Tailwind.

Prefer existing UI primitives and established design patterns.

Do not introduce another UI framework for an isolated feature.

Generic components belong in appropriate generic UI locations.

Karacter-specific domain components belong in the Karacter component/domain structure.

Keep business logic out of purely presentational components when practical.

---

# 35. Routing

TanStack Router is the established routing system.

Do not introduce another routing mechanism.

When adding routes:

* follow existing route conventions;
* respect authentication boundaries;
* consider loading/error states;
* consider authorization;
* update navigation where required;
* verify direct navigation and refresh behavior.

---

# 36. State Management

TanStack React Query is used for server state.

Prefer existing query/mutation patterns.

After mutations:

* invalidate relevant queries;
* avoid stale UI;
* preserve optimistic-update semantics where already established.

Do not introduce global state for data that should remain server state.

---

# 37. External API Calls

External requests should account for:

* authentication;
* validation;
* timeout;
* transient failure;
* rate limits;
* malformed responses;
* authorization;
* logging;
* user feedback.

Never trust third-party responses as inherently safe.

---

# 38. File and Filesystem Operations

Any future filesystem capability must be treated as privileged.

Do not permit unrestricted arbitrary filesystem access.

Future filesystem tools should define:

* allowed roots;
* denied paths;
* read/write permissions;
* file-size limits;
* path normalization;
* symlink handling;
* confirmation rules;
* audit logging.

Never execute arbitrary filesystem operations solely because an AI-generated intent requested them.

---

# 39. Terminal / Shell Operations

Shell execution is a privileged capability.

Do not expose unrestricted shell access through a public-facing assistant.

Future terminal tooling must have explicit:

* command policy;
* environment restrictions;
* working-directory restrictions;
* timeout;
* resource limits;
* output limits;
* confirmation;
* audit logging.

Never execute arbitrary shell commands originating directly from untrusted model output without a dedicated security boundary.

---

# 40. Docker Operations

Docker access is equivalent to privileged infrastructure access in many environments.

Do not expose arbitrary Docker control without explicit authorization and isolation.

Future Docker capabilities must define:

* allowed images;
* container permissions;
* filesystem mounts;
* network access;
* resource limits;
* lifecycle controls;
* privileged-mode restrictions.

---

# 41. VS Code / IDE Capabilities

IDE capabilities must respect workspace boundaries.

Do not allow an assistant to arbitrarily access unrelated workspaces, credentials, terminals, or system files.

Workspace-scoped access should be preferred over unrestricted machine access.

---

# 42. OBS and Device Integrations

Device integrations such as OBS must be treated as external control surfaces.

Before implementing automation:

* define connection/authentication;
* define available actions;
* define permissions;
* define confirmation requirements;
* define failure handling;
* define audit behavior.

Do not expose unrestricted device control through generic AI execution.

---

# 43. Destructive Operations

Destructive actions require additional scrutiny.

Examples:

```text
DELETE
DROP
REVOKE
RESET
OVERWRITE
PURGE
DISCONNECT
ROTATE
```

Before executing a destructive operation:

1. Confirm scope.
2. Confirm target.
3. Determine reversibility.
4. Determine authorization.
5. Determine whether confirmation is required.
6. Prefer safe/dry-run behavior where practical.

Never perform destructive cleanup simply because it appears convenient.

---

# 44. Git Discipline

Before modifying a repository with existing local changes:

* inspect the working tree when appropriate;
* do not overwrite unrelated changes;
* do not reset or discard user work without authorization.

Never run destructive Git commands such as:

```bash
git reset --hard
git clean -fd
git checkout -- .
```

against potentially valuable work without explicit authorization.

Do not rewrite Git history unless explicitly requested.

---

# 45. Documentation Truthfulness

Documentation must reflect actual system behavior.

Do not describe:

```text
planned
```

as:

```text
implemented
```

Do not describe:

```text
implemented
```

as:

```text
verified
```

Do not describe:

```text
verified
```

as:

```text
production-ready
```

unless the evidence supports it.

If documentation conflicts with implementation, investigate before choosing which statement is correct.

---

# 46. Feature Status Language

Use precise status terminology.

Recommended:

```text
PLANNED
DESIGNED
IMPLEMENTED
WIRED
PARTIAL
STUBBED
DISABLED
UNVERIFIED
VERIFIED
PRODUCTION-READY
```

These terms should not be treated as interchangeable.

For example:

```text
Biometric verification

Code exists:
YES

Enrollment exists:
YES

Verification wired:
NO

Active security boundary:
NO

Production-ready:
NO
```

---

# 47. Agent Autonomy Boundaries

AI coding agents may inspect, reason, propose, modify, and validate code within the authorized repository scope.

Agents must pause for human clarification or approval when:

* requirements are materially ambiguous;
* a destructive operation is required;
* production infrastructure may be affected;
* credentials must be rotated;
* security controls must be weakened;
* major architecture must be replaced;
* irreversible data operations are required;
* a decision materially changes product behavior;
* multiple reasonable architectural choices have significant consequences.

Do not hide consequential decisions inside implementation details.

---

# 48. Do Not Fabricate

Agents must never fabricate:

* test results;
* API responses;
* deployment status;
* credentials;
* environment variables;
* database state;
* integration availability;
* implementation status;
* security guarantees;
* user approval;
* successful execution.

If something cannot be verified, say so.

---

# 49. Change Proposal Pattern

For substantial changes, use this mental model:

```text
1. Understand
2. Identify affected systems
3. Identify risks
4. Propose approach
5. Implement
6. Validate
7. Inspect diff
8. Report result
```

For small, obvious changes, the process may be proportionally smaller.

The goal is not bureaucracy.

The goal is controlled engineering.

---

# 50. Definition of Done

A change is complete when:

* the requested behavior exists;
* the implementation follows repository architecture;
* security boundaries remain intact;
* relevant inputs are validated;
* relevant outputs are validated;
* authorization is enforced;
* appropriate tests/verification have been performed;
* no unrelated behavior was unnecessarily changed;
* documentation is accurate;
* the final diff has been reviewed;
* known limitations are disclosed.

"Code was written" is not the definition of done.

---

# 51. Known Current Limitations

The following limitations were identified by the independent technical audit and should not be silently represented as completed functionality.

## Security / Production

* committed environment configuration requires remediation;
* unsafe dynamic calculator evaluation requires replacement;
* rate limiting is not yet implemented;
* AI response validation requires strengthening;
* comprehensive automated testing is absent;
* production deployment configuration requires completion.

## Biometrics

* enrollment exists;
* biometric verification is currently disabled/unwired;
* biometric verification is not currently an active security boundary.

## Agent Capabilities

* local agent capabilities are currently stubbed;
* filesystem/terminal/Docker/VS Code/OBS agent integrations are not yet fully implemented.

## Integrations

* several external OAuth/API integrations remain planned rather than fully wired.

These statements reflect the supplied audit and should be re-verified against the repository before being treated as current permanent truth.

---

# 52. Future Architecture: Do Not Assume Completion

Karacter is expected to evolve.

Potential future subsystems include:

```text
Agent Runtime
Skill Registry
Knowledge System
Tool Registry
Capability Registry
Integration Manager
Permission System
Policy Engine
Confirmation System
Memory System
Biometric Security
Local Agent Runtime
Audit System
Observability
```

Future implementations must preserve clear boundaries between these systems.

Do not prematurely implement an abstraction simply because the concept has been discussed.

Verify existing architecture before extending it.

---

# 53. Repository Instruction Hierarchy

This root `AGENTS.md` defines repository-wide rules.

If more specific `AGENTS.md` files are introduced in subdirectories, the more specific instructions may add or refine rules for that directory.

Future hierarchy may look like:

```text
AGENTS.md
│
├── src/AGENTS.md
├── src/lib/karacter/AGENTS.md
├── src/integrations/AGENTS.md
├── supabase/AGENTS.md
└── docs/AGENTS.md
```

Do not create nested instruction files merely for organizational appearance.

Create them only when a directory has genuinely different engineering constraints.

---

# 54. Final Rule

When uncertain:

```text
Do not guess.
Inspect.
Understand.
Validate.
Then change.
```

When a security boundary is involved:

```text
Assume untrusted input.
Validate explicitly.
Authorize explicitly.
Execute narrowly.
Log appropriately.
```

When an AI system is involved:

```text
The model proposes.
The application validates.
The policy authorizes.
The capability executes.
```

When production is involved:

```text
Implemented
    ≠
Verified
    ≠
Production-ready
```

Karacter should evolve as a controlled software system, not as a collection of increasingly powerful prompts and integrations.

