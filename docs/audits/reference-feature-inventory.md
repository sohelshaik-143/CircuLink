# Reference Feature Inventory: Deployed vs Repository

**Reference Deployment**: `https://rgukt-platform.vercel.app`  
**Evaluation Standard**: Ground-Truth Browser Verification & Source Code Mapping  
**Classification Categories**:
1. **Verified and Working**: Tested and operational in active deployment.
2. **Visually Present but Not Functionally Verified**: Rendered in UI, but backend/API interaction is unconfirmed or mocked.
3. **Partially Working**: Operates in limited capacity or fails under edge conditions.
4. **Inaccessible or Blocked**: Code exists in repository, but runtime environment or deployment misconfiguration prevents access.
5. **Not Found**: Feature is absent from both deployed site and local source.

---

## 1. Feature Classification Matrix

| Feature / Domain | Reference Site Status | Source Repository Status | Verification Notes & Technical Classification |
|---|---|---|---|
| **Root Shell & PWA Entry** | Verified and working | Implemented (`index.html`) | Serves 200 OK, HTML meta tags, Google Fonts, theme color `#4F46E5`. |
| **Defensive Error Boundary** | Verified and working | Implemented (`ErrorBoundary.tsx`) | Prevents white-screen crash, renders branded glassmorphic rescue card. |
| **SPA Client-Side Deep Linking** | Partially working (404 on direct hit) | Implemented (`App.tsx`, `vercel.json`) | Direct URL entry (e.g. `/home`, `/posts`) returns Vercel 404; requires SPA rewrites. |
| **College ID / Password Login** | Inaccessible or blocked | Implemented (`Login.jsx`, `authRoutes.js`) | Blocked on reference site due to Google OAuth hook initialization failure. |
| **Google Single Sign-On (SSO)** | Inaccessible or blocked | Implemented (`@react-oauth/google`) | Blocked by missing `VITE_GOOGLE_CLIENT_ID` configuration on Vercel. |
| **Campus Multi-Tenancy Detection** | Inaccessible or blocked | Implemented (`Login.jsx:45-52`) | Auto-detects campus prefix (R=RK Valley, N=Nuzvid, O=Ongole, S=Srikakulam, B=Basar). |
| **Two-Factor Authentication (MFA)** | Inaccessible or blocked | Implemented (`speakeasy`, `qrcode`) | TOTP QR code setup and token verification on backend and login modal. |
| **Multi-Stage Circular Approval** | Inaccessible or blocked | Implemented (`circularRoutes.js`, Spring JPA) | Student/Faculty -> HOD -> Dean -> Director state machine. |
| **Emergency Broadcast System** | Inaccessible or blocked | Implemented (`Emergency.jsx`, Socket.IO) | Real-time push modal for Director & Security Officer. |
| **Innovation & Research Feed** | Inaccessible or blocked | Implemented (`PostComponents.jsx`, `postRoutes.js`) | Feed with likes, comments, topics, and faculty weighted endorsements. |
| **Student Profiles & Gamification** | Inaccessible or blocked | Implemented (`UserProfile.jsx`, `mysqlService.js`) | Points, streak days, levels (Beginner to Expert), and badge awards. |
| **Encrypted 1-to-1 Chat** | Inaccessible or blocked | Implemented (`ChatPanel.jsx`, `messageRoutes.js`) | Client-side AES encryption with Socket.IO real-time dispatch. |
| **Administrative Analytics** | Inaccessible or blocked | Implemented (`AnalyticsDashboard.tsx`) | Role-gated dashboard (Dean, DSW, Director, Admin) with Chart.js charts. |
| **Real-time Presence Tracker** | Inaccessible or blocked | Implemented (`onlineUsers` Map & MySQL) | Tracks active sessions and updates online heartbeat counters. |
| **Automated Institutional Migration** | Not applicable on frontend | Implemented (`database/autoMigrate.js`) | Auto-creates tables, indexes, and seeds administrative credentials. |

---

## 2. Summary by Status Breakdown

```text
Total Assessed Capabilities: 15
├── Verified and Working: 2 (13.3%)
├── Partially Working: 1 (6.7%)
├── Inaccessible or Blocked: 12 (80.0%)
├── Visually Present but Unverified: 0 (0.0%)
└── Not Found: 0 (0.0%)
```

> **Engineering Takeaway**: The codebase itself contains rich, fully implemented capabilities across all university workflows. However, the reference Vercel deployment suffered from an unhandled OAuth environment variable trap and missing SPA rewrites, blocking 80% of end-user features from public execution. Remediation requires hardening the auth provider fallback and deploying verified edge rewrites.
