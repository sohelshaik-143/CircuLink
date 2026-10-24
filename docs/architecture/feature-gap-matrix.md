# Feature Gap Matrix: Reference Deployment vs CircuLink Architecture

**Auditor**: Principal Software Architect  
**Objective**: Identify operational and architectural gaps between deployed artifacts and repository capabilities, establishing prioritized engineering solutions.  
**Prioritization Schema**:
- **P0**: Blocker / System Critical — Prevents core authentication, breaks deployment, or causes catastrophic failure.
- **P1**: High Value Institutional Capability — Enhances core academic/administrative workflows.
- **P2**: User Engagement & Convenience — Polishes social, collaboration, and discovery workflows.
- **P3**: Long-Term Institutional Scalability — Multi-campus federation and enterprise extensions.

---

## 1. Structured Feature Gap Matrix

| Capability Area | Priority | Reference Platform Evidence | Existing CircuLink Status | Gap / Limitation | Institutional Value | Proposed Implementation | Security & Dependencies | Complexity | Acceptance Criteria |
|---|---|---|---|---|---|---|---|---|---|
| **Auth Resilience (OAuth Fallback)** | **P0** | Triggers fatal uncaught error on `/login` via ErrorBoundary | `App.tsx` passes `""` to `GoogleOAuthProvider`; `Login.jsx` calls `useGoogleLogin` unconditionally | Whole login flow blocked if `VITE_GOOGLE_CLIENT_ID` is missing or invalid | Critical (Zero user onboarding possible) | Decouple Google Login into safe subcomponent; provide university ID fallback | Zero external deps; eliminates client crash | Low (1 pt) | Login page renders cleanly without errors when env var is absent |
| **Vercel Edge SPA Rewrites** | **P0** | Direct URL navigation to `/home`, `/circulars` returns 404 | `vercel.json` exists, but subroutes fail when deployed from subfolders | Deep linking broken; browser refreshes fail | High (Usability & bookmarking) | Synchronize `vercel.json` rewrites across root and `frontend/`; configure clean URL rewrites | Vercel Edge configuration | Low (1 pt) | Navigating directly to `/circulars` or `/dashboard` loads app shell |
| **Emergency Broadcast Delivery** | **P1** | Inaccessible due to auth boundary | `Emergency.jsx` and `server.js` Socket.IO broadcast exist | Serverless environments (Vercel) lose WebSocket connections | Critical (Life safety, severe weather) | Add dual-dispatch: Socket.IO for stateful servers + persistent DB polling / header banner fallback | Rate limited to Director and Security roles | Med (3 pts) | Emergency notice renders immediately on both WebSocket and REST clients |
| **Multi-Stage Circular Approval** | **P1** | Inaccessible on reference site | Implemented in `circularController.js` and `CircularComponents.jsx` | Missing visible campus audit trail in circular detail view | High (Administrative transparency) | Add chronological audit history timeline in `CircularDetail.jsx` showing approvals | Immutable audit log in `circular_approvals` table | Med (2 pts) | Detailed timeline of HOD -> Dean -> Director approvals displayed |
| **Multi-Campus Tenant Isolation** | **P1** | Single RK Valley domain displayed | Multi-campus detection in `Login.jsx`, campus column in MySQL | Need rigorous server-side verification preventing cross-campus spoofing | High (Institutional multi-campus adoption) | Enforce campus filter in `MySQLService` queries based on authenticated JWT | Strict RBAC in `middleware/rbac.js` | Med (3 pts) | Users only see circulars targeted to their campus or `ALL` |
| **Student Innovation Feed Search** | **P2** | Inaccessible on reference site | Basic search in `PostComponents.jsx` | Search needs debouncing and topic pills | Medium (Knowledge sharing) | Add 300ms debounced search query + topic category pills | Client-side TanStack Query cache | Low (2 pts) | Instant search results with zero network thrashing |
| **Student Grievance & Complaint Tracker** | **P2** | Not present | Documented in concept | No dedicated ticket workflow for hostel/academic complaints | High (Student welfare) | Implement lightweight complaint submission and tracking under DSW role | Scoped to DSW and Dean roles | High (5 pts) | Track status: SUBMITTED -> UNDER_REVIEW -> RESOLVED |
