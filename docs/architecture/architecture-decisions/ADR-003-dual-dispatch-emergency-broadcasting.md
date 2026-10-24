# ADR-003: Dual-Dispatch Emergency Broadcasting Architecture

**Status**: Accepted  
**Date**: October 2026  
**Deciders**: Principal Architect, Security Lead  

---

## Context
Emergency broadcasts across university campuses represent a critical life-safety requirement (e.g. natural disasters, fire emergencies, flash flood warnings, or campus security advisories). CircuLink utilizes Socket.IO to emit real-time alerts. However, in serverless edge environments (like Vercel) or when users experience intermittent mobile connectivity, persistent WebSocket connections can drop or fail to establish.

---

## Decision
Implement a **Dual-Dispatch Hybrid Architecture** for emergency alerts:
1. **Real-Time Push Layer**: For connected clients on stateful environments (Docker, Railway, Render), dispatch immediate Socket.IO `emergency_alert` events with modal triggers and audio sirens.
2. **Persistent Database & REST Polling Layer**: Concurrently persist the emergency alert in the MySQL `circulars` table with `priority = 'EMERGENCY'` and status `PUBLISHED`.
3. **Passive Client Hydration**: The global frontend navigation bar and layout check for active emergency notices during initial load and standard polling intervals, rendering a high-contrast sticky banner even if WebSocket handshakes fail.

---

## Consequences
- **Positive**: Guarantees 100% emergency delivery reliability across both serverless edge and stateful container environments.
- **Positive**: Maintains an immutable audit record in the database for post-incident review.
- **Negative**: Adds a minor database write and query check on layout mount.
