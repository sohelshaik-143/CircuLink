# ADR-001: Authentication Resilience and OAuth Isolation

**Status**: Accepted  
**Date**: October 2026  
**Deciders**: Principal Architect, Security Lead  

---

## Context
In production on Vercel (`https://rgukt-platform.vercel.app`), visiting unauthenticated routes causes the entire React application to crash with an `ErrorBoundary` card. The root cause is `@react-oauth/google`'s `useGoogleLogin` hook, which throws a synchronous uncaught exception during component rendering if the `GoogleOAuthProvider` context has an empty or missing `clientId`.

In institutional deployments across RGUKT, primary authentication relies on University College IDs (e.g., `R200123`, `N190456`) and student webmail domain accounts. Google Single Sign-On is an optional convenience. A missing Google OAuth Client ID environment variable must never incapacitate core university authentication.

---

## Decision
1. **Decouple Google OAuth Provider**:
   - In `App.tsx`, evaluate `VITE_GOOGLE_CLIENT_ID`. Only wrap the application in `<GoogleOAuthProvider>` if `googleClientId` is defined, non-empty, and non-trivial. If undefined, render the children directly without the provider.
2. **Encapsulate Google Hook in Isolated Child Component**:
   - In `Login.jsx`, extract the Google Login button into a dedicated child component (`GoogleLoginButton`).
   - Only mount `GoogleLoginButton` when `googleClientId` is available and the provider is active.
   - If Google OAuth is not configured, render a subtle indicator or hide the button, allowing students and staff to log in via College ID / Password without friction.

---

## Consequences
- **Positive**: Eliminates runtime rendering crashes in production, preview, and local development environments where `VITE_GOOGLE_CLIENT_ID` is omitted.
- **Positive**: Preserves 100% functional parity for Google SSO when credentials are provided.
- **Negative**: Requires conditional rendering in `Login.jsx` instead of a static top-level hook call.
