# CircuLink Codebase Audit: Architecture, Quality & Debt Analysis

**Target Repository**: `https://github.com/sohelshaik-143/CircuLink`  
**Auditor**: Principal Software Architect & QA Lead  
**Audit Scope**: Monorepo Structure, Dual-Backend Architecture, Dependencies, Data Layers, State Management  

---

## 1. Monorepo Structure & Stack Taxonomy

CircuLink is organized as a unified monorepo housing both frontend and backend modules:

```text
rgukt-platform/
├── api/                    # Express REST route controllers & legacy validators
├── backend-spring/         # Java 17+ / Spring Boot 3.2+ enterprise backend module
├── config/                 # MySQL connection pool configuration (mysql2/promise)
├── controllers/            # Controller layer (auth, circular, post, message, user)
├── database/               # Relational DDL (schema.sql), initial seeds, autoMigrate.js
├── docs/                   # Comprehensive architectural, security, and audit manuals
├── frontend/               # React 18 + Vite 5 + TypeScript + Zustand SPA
│   ├── src/
│   │   ├── api/            # Axios API client with automatic JWT rotation interceptor
│   │   ├── components/     # Role-based dashboards, circulars, posts, auth, chat
│   │   ├── context/        # Auth & Notification React context providers
│   │   └── store/          # Zustand atomic state stores
│   └── dist/               # Compiled production assets
├── middleware/             # JWT auth, RBAC authorization, and Multer file upload
├── models/                 # Relational & Mongoose schema definitions
├── services/               # MySQLService Data Access Layer (DAL)
├── uploads/                # Local disk storage for avatars, attachments, messages
├── Dockerfile              # Multi-stage production container manifest
├── package.json            # Node backend dependencies and root lifecycle scripts
├── railway.json            # Railway cloud deployment configuration
├── render.yaml             # Render infrastructure-as-code blueprint
├── server.js               # Main Express + Socket.IO server entry point
└── vercel.json             # Vercel serverless and static asset rewrite manifest
```

---

## 2. Dependency Graph & Vulnerability Review

### Root / Backend Dependencies (`package.json`)
- **Runtime Core**: `express ^4.18.2`, `http`, `socket.io ^4.7.1`
- **Database**: `mysql2 ^3.24.6` (connection pooling with promise wrappers), `mongoose ^7.3.1` (legacy compatibility)
- **Security & Cryptography**: `bcryptjs ^2.4.3`, `helmet ^7.0.0`, `jsonwebtoken ^9.0.0`, `speakeasy ^2.0.0`, `express-rate-limit ^6.7.0`
- **File Handling**: `multer ^1.4.5-lts.1`
- **Authentication**: `google-auth-library ^10.6.1`

### Frontend Dependencies (`frontend/package.json`)
- **UI Framework & Build**: `react ^18.2.0`, `react-dom ^18.2.0`, `vite ^5.1.6`, `typescript ^5.2.2`
- **State & Data Fetching**: `@tanstack/react-query ^5.28.9`, `zustand ^4.5.2`, `axios ^1.6.8`
- **Animation & Icons**: `framer-motion ^11.0.24`, `lucide-react ^0.363.0`, `react-icons ^5.0.1`
- **Real-Time Client**: `socket.io-client ^4.7.5`, `@stomp/stompjs ^7.0.0`, `sockjs-client ^1.6.1`
- **Security & Utilities**: `crypto-js ^4.2.0`, `@react-oauth/google ^0.13.4`, `date-fns ^2.30.0`

---

## 3. Dual-Backend Analysis: Express vs Spring Boot

The repository presents two distinct backend engines:
1. **Node.js Express + MySQL2 Engine (`server.js`, `services/mysqlService.js`)**:
   - Primary active runtime wired to `npm start`, Docker, Railway, Render, and Vercel serverless.
   - Comprehensive implementation of all 32 REST endpoints, real-time presence tracking, and Socket.IO messaging.
2. **Spring Boot 3.2+ Engine (`backend-spring/`)**:
   - Secondary enterprise module implementing Spring Data JPA entities, Spring Security filter chains, and STOMP message brokers.
   - Designed for high-concurrency enterprise deployments requiring ACID `@Transactional` multi-tier approval chains.

---

## 4. Architectural Debt & Critical Codebase Findings

1. **OAuth Initialization Trap**:
   - `frontend/src/App.tsx:152` passes an empty string `""` to `<GoogleOAuthProvider>` when `VITE_GOOGLE_CLIENT_ID` is unset.
   - In `frontend/src/components/Auth/Login.jsx:132`, `useGoogleLogin` executes unconditionally, triggering an uncaught React render crash.
2. **Hardcoded Fallback JWT Secrets**:
   - In `middleware/auth.js:19,50,57`, `process.env.JWT_SECRET || 'supersecretkey123'` permits insecure startup if environment variables are not injected.
3. **Ghost In-Memory Session Cleanup**:
   - `server.js` maintains an in-memory `onlineUsers` Map alongside MySQL's `online_users` table. In multi-instance serverless deployments (such as Vercel), in-memory maps do not synchronize across lambdas, making MySQL the single source of truth.
4. **Vercel Edge Rewrite Divergence**:
   - Root `vercel.json` and subproject `frontend/vercel.json` require strict synchronization to prevent 404 responses during direct route navigation.
