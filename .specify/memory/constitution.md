<!--
SYNC IMPACT REPORT
==================
Version change: (unfilled template) → 1.0.0
Action: Initial constitution ratification — all placeholders replaced.

Modified principles: N/A (first fill; no prior named principles)

Added sections:
  - I.   Access-Based Bot Authorization
  - II.  Session & Chat Persistence
  - III. Tool-Equipped LLMs
  - IV.  ERP Integration (Navision / Business Central)
  - V.   Multi-LLM Provider Support
  - VI.  Web-First User Experience
  - Security & Compliance Standards
  - Development & Integration Standards
  - Governance

Removed sections: N/A

Template sync status:
  ✅ .specify/templates/plan-template.md   — Constitution Check gate is dynamic; no hard-coded principle refs. No update required.
  ✅ .specify/templates/spec-template.md   — Fully generic; no principle-specific content. No update required.
  ✅ .specify/templates/tasks-template.md  — Fully generic; no principle-specific content. No update required.

Deferred TODOs: None — all placeholders resolved.
-->

# Aivora Constitution

## Core Principles

### I. Access-Based Bot Authorization

Every user MUST only see and interact with bots that have been explicitly assigned to them by an
administrator. Authorization is enforced at the API layer on every request — not only at the UI
layer. Privilege escalation between bots is not permitted under any circumstances.

- The system MUST validate bot-access permissions on every API call, not just at session start.
- Administrators MUST be able to grant and revoke bot access without requiring a deployment.
- Unauthenticated or unauthorized requests MUST receive a 401/403 response and MUST NOT leak
  bot metadata.

**Rationale**: Multi-tenancy and role-based access are core to the product promise. A breach of
bot isolation would expose confidential tools, data sources, or conversation history across
organizational boundaries.

### II. Session & Chat Persistence

Each user-bot pair supports multiple independently named chat sessions. Every message in every
session MUST be durably persisted and correctly associated with the originating (user, bot, session)
triple.

- Sessions MUST be created, retrieved, renamed, and deleted without data loss.
- The system MUST guarantee session isolation: messages from one session MUST NOT appear in
  another session's context window.
- Pagination or streaming MUST be used when loading large session histories to avoid memory
  or latency issues.

**Rationale**: Chat history is the primary user-facing value. Misrouted or lost messages destroy
trust and make the platform unusable for operational tasks.

### III. Tool-Equipped LLMs

Each bot MAY be configured with its own discrete set of tools (database queries, task execution,
data analysis, file operations, external API calls, etc.). Tool execution is scoped and sandboxed
per bot — a bot MUST NOT invoke tools it has not been explicitly configured with.

- Tool definitions MUST be stored as structured configuration, not hard-coded logic.
- Tool inputs and outputs MUST be logged for auditability.
- Tools that perform writes or mutations MUST require explicit user confirmation or carry an
  explicit `allow_mutations: true` flag in bot configuration.

**Rationale**: Different teams need different capabilities. Mixing tool scopes across bots would
introduce uncontrolled side-effects and make the platform unpredictable and insecure.

### IV. ERP Integration (Navision / Business Central)

Bots that connect to Microsoft Dynamics Navision (Business Central) MUST interact via
parameterized OData or API queries only. Raw SQL strings MUST NOT be constructed from LLM
output and passed to the database.

- Navision credentials MUST be stored in the platform's secrets manager, never in bot
  configuration plain-text or in the conversation context.
- All ERP operations MUST be read-only by default; write operations require an explicit
  opt-in flag and audit trail.
- Schema discovery (available entities, fields, filters) MUST be pre-cached and served to
  the LLM as structured tool definitions — the LLM MUST NOT perform open-ended schema
  exploration at runtime.

**Rationale**: ERP systems contain financial and operational data with strict integrity and
compliance requirements. Injection attacks via LLM-generated queries are a real threat vector
that parameterization eliminates.

### V. Multi-LLM Provider Support

The platform MUST support multiple LLM providers (Anthropic Claude, OpenAI GPT, and others)
through a unified adapter interface. Switching or adding a provider MUST not require changes
to session management, tool dispatch, or the web UI.

- Each bot configuration MUST declare its provider and model identifier explicitly.
- The adapter layer MUST normalize streaming, tool-call, and error response formats across
  providers.
- Provider API keys MUST be stored in the secrets manager and rotated without downtime.

**Rationale**: Provider lock-in is a commercial and technical risk. Different bots may require
different model capabilities or cost profiles; the architecture MUST accommodate this without
re-engineering.

### VI. Web-First User Experience

The primary interface is a responsive web application. Users MUST be able to authenticate, view
their assigned bots, open or resume chat sessions, and receive streamed responses from any
modern desktop or mobile browser without installing additional software.

- The UI MUST stream LLM responses token-by-token (or chunk-by-chunk) using SSE or WebSocket.
- Navigation MUST clearly separate the bot list from the chat view and the session history.
- The web app MUST be accessible without VPN for authorized users (subject to network policy).

**Rationale**: A browser-first product removes friction for non-technical users and ensures
adoption across the organization without IT-managed client installs.

## Security & Compliance Standards

All components of Aivora MUST adhere to the following non-negotiable security baselines:

- **Authentication**: Users MUST authenticate via a centrally managed identity provider (e.g.,
  Azure AD / Entra ID, OIDC). Shared credentials or API-key-only access MUST NOT be used for
  human users.
- **Transport security**: All traffic MUST be TLS 1.2 or higher. Unencrypted HTTP endpoints
  MUST NOT be exposed in production.
- **Secret management**: API keys, database credentials, and integration tokens MUST be stored
  in a dedicated secrets manager (e.g., Azure Key Vault, HashiCorp Vault). They MUST NOT appear
  in source code, environment files committed to version control, or conversation logs.
- **Audit logging**: Every bot invocation, tool execution, and ERP operation MUST produce an
  immutable audit log entry containing: timestamp, user ID, bot ID, session ID, action type,
  and outcome.
- **Data retention**: Conversation data retention periods MUST be configurable per tenant/bot
  and MUST comply with the organization's data governance policy.

## Development & Integration Standards

- **API-first design**: All platform capabilities MUST be exposed via a versioned REST or
  GraphQL API before building UI on top of them.
- **Environment parity**: Development, staging, and production environments MUST use the same
  infrastructure configuration. Environment-specific secrets are the only permitted difference.
- **Dependency management**: Third-party dependencies MUST be pinned to explicit versions.
  Dependency updates MUST go through CI before merging.
- **Testing gates**: Features touching bot authorization, session persistence, or ERP integration
  MUST include integration tests that run against a real (or realistic sandbox) data store —
  mocked-only tests are insufficient for these critical paths.
- **Observability**: Every service MUST expose structured logs, health-check endpoints, and key
  metrics (request latency, error rate, LLM token usage). Dashboards MUST exist before a feature
  is considered production-ready.

## Governance

This constitution supersedes all other documented practices and design decisions for the Aivora
platform. Any practice not covered here defaults to the principle of least privilege and minimal
scope.

**Amendment procedure**:
1. A proposed amendment is submitted as a pull request modifying this file.
2. The amendment MUST include: motivation, impact assessment, and affected dependent artifacts.
3. Amendments MUST be approved by at least one project lead and one senior engineer.
4. After merge, the version line MUST be incremented per the versioning policy below and
   this document re-ratified by updating `LAST_AMENDED_DATE`.

**Versioning policy**:
- MAJOR: Removal or backward-incompatible redefinition of a core principle.
- MINOR: New principle, new mandatory standard, or materially expanded guidance.
- PATCH: Clarifications, wording improvements, typo fixes, non-semantic refinements.

**Compliance review**: Every feature specification and implementation plan MUST include a
Constitution Check section verifying alignment with all applicable principles before work begins.
Non-compliant designs MUST be revised or receive an explicit documented exception.

**Version**: 1.0.0 | **Ratified**: 2026-06-01 | **Last Amended**: 2026-06-01
