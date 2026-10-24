# Changelog

All notable changes to the CircuLink platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2026-10-24

### Added
- Comprehensive technical documentation suite in `docs/` containing over 20 architectural blueprints, audits, ADRs, and operational playbooks.
- Architecture Decision Records: ADR-001 (OAuth Isolation), ADR-002 (Edge Routing), ADR-003 (Emergency Dual-Dispatch), ADR-004 (Multi-Campus Tenancy).
- Dynamic media and avatar resolution helper `getFileUrl()` in `frontend/src/api/axios.ts`.
- Deep-link alias routes `/home` and `/feed` in `frontend/src/App.tsx`.
- Security policy `SECURITY.md` and contributing guidelines `CONTRIBUTING.md`.

### Fixed
- **P0 Authentication Crash**: Decoupled `GoogleOAuthProvider` and isolated `useGoogleLogin` into `GoogleLoginSection`, preventing fatal ErrorBoundary crashes when `VITE_GOOGLE_CLIENT_ID` is unset.
- **Hardcoded Localhost Hostnames**: Replaced `http://localhost:5000` across `PostComponents.jsx`, `CircularDetail.jsx`, `UserComponents.jsx`, `UsersDirectory.jsx`, `EditProfile.jsx`, `AnalyticsDashboard.jsx`, and `Navbar.jsx` with dynamic URL helpers.
- **Socket.IO Host Resolution**: Updated `ChatPanel.jsx` to dynamically target `VITE_SOCKET_URL` or `window.location.origin`.
- **JWT Fallback Vulnerability**: Hardened `middleware/auth.js` to eliminate weak fallback secret strings.

---

## [2.0.0] - 2026-10-15
- Migration from Create React App to Vite 5 + TypeScript + TanStack Query + Zustand.
- Enterprise Relational Schema on MySQL 8 replacing MongoDB.
- Spring Boot 3.2+ module for high-concurrency ACID transactions.
- Socket.IO real-time event dispatcher and online user presence tracking.
