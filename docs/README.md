# CircuLink Documentation Portal

Welcome to the comprehensive technical documentation for **CircuLink** — The Official Campus Intelligence & Communication Platform for RGUKT.

---

## 📚 Documentation Index

### 1. Audits & Assessments (`docs/audits/`)
- 🌐 [Reference Platform Audit](audits/reference-platform-audit.md) — Real-world browser reconnaissance of `https://rgukt-platform.vercel.app`.
- 📋 [Reference Feature Inventory](audits/reference-feature-inventory.md) — Ground-truth classification of working vs blocked features.
- 🚶 [Reference User Journeys](audits/reference-user-journeys.md) — Student, faculty, HOD, and administrative workflows.
- 🔬 [CircuLink Codebase Audit](audits/circlink-codebase-audit.md) — Monorepo, dual backend, and dependency graph analysis.
- 🛡️ [CircuLink Security Audit](audits/circlink-security-audit.md) — Threat modeling, OWASP Top 10, JWT lifecycle, RBAC.
- 🚀 [CircuLink Deployment Audit](audits/circlink-deployment-audit.md) — Vercel serverless, Docker, Railway, Render, and WebSocket limitations.
- 📊 [CircuLink Feature Status](audits/circlink-feature-status.md) — Verified capability status matrix.
- 🏁 [Implementation Summary](audits/implementation-summary.md) — Summary of architectural improvements implemented.

### 2. Architecture Blueprints (`docs/architecture/`)
- 🏛️ [System Overview](architecture/system-overview.md) — High-level architecture, layer taxonomy, and technology stack.
- 🧩 [Component Architecture](architecture/component-architecture.md) — Frontend modules, state stores, and backend controllers.
- 🗄️ [Database Schema Reference](architecture/database-schema.md) — 3NF relational MySQL 8 schema, tables, foreign keys, and indexes.
- 🔌 [API Reference](architecture/api-reference.md) — Complete REST endpoint documentation with request/response schemas.
- 🔐 [Authentication & Authorization](architecture/authentication-and-authorization.md) — JWT rotation, RBAC, and password security.
- 🌐 [Multi-Campus Security Architecture](architecture/multi-campus-security-architecture.md) — Multi-campus tenancy boundaries and scoping.
- 🔔 [Notifications & Events](architecture/notifications-and-events.md) — Socket.IO, STOMP broker, and real-time push events.
- ☁️ [Deployment Architecture](architecture/deployment.md) — Edge CDN, serverless lambdas, Docker containers, and database setup.
- ⚙️ [Environment Variables Specification](architecture/environment-variables.md) — Configuration dictionary and secrets hygiene.
- 🧪 [Testing Strategy](architecture/testing-strategy.md) — Automated testing pyramids, unit tests, and quality gates.
- 📈 [Observability & Monitoring](architecture/observability.md) — Audit logging, structured metrics, and health endpoints.
- ⚠️ [Known Limitations & Trade-Offs](architecture/known-limitations.md) — Documented constraints and architectural trade-offs.
- 🗺️ [Feature Gap Matrix](architecture/feature-gap-matrix.md) — P0 to P3 prioritization matrix.
- 🛣️ [Implementation Roadmap](architecture/implementation-roadmap.md) — Milestones and acceptance criteria.
- 📑 [Architecture Decision Records](architecture/architecture-decisions/) — ADR-001 through ADR-004.

### 3. Developer Guides (`docs/development/`)
- 💻 [Local Setup Guide](development/local-setup.md) — Step-by-step developer machine bootstrap.
- 🔧 [Troubleshooting Manual](development/troubleshooting.md) — Resolving common build, port, and database errors.
- 🤝 [Contributing Workflow](development/contributing-workflow.md) — Branching strategy, linting, and PR standards.

### 4. Operational Playbooks (`docs/operations/`)
- 🛡️ [Production Readiness Checklist](operations/production-readiness.md) — Go-live verification gates.
- 🔄 [Rollback & Recovery Playbook](operations/rollback-and-recovery.md) — Incident mitigation and deployment rollbacks.
- 💾 [Backup & Restore Procedures](operations/backup-and-restore.md) — MySQL database dump, encryption, and recovery.
