# Component Architecture: CircuLink Modular Design

**Author**: Senior Full-Stack Engineer  
**Scope**: Frontend Component Tree, State Architecture, Backend Service Decomposition  

---

## 1. Frontend Component Hierarchy

```mermaid
graph TD
    APP[App.tsx]
    OAUTH[GoogleOAuthProvider - Conditional]
    AUTH_CTX[AuthProvider / useAuthStore]
    NOTIF_CTX[NotificationProvider]
    LAYOUT[AppLayout]
    NAVBAR[Navbar.jsx]
    TOASTER[Toaster]

    APP --> OAUTH --> AUTH_CTX --> NOTIF_CTX --> LAYOUT
    LAYOUT --> NAVBAR
    LAYOUT --> TOASTER

    subgraph Pages & Routed Views
        LOGIN[Login.jsx / ProfileSetup.jsx]
        DASH[Dashboard Dispatcher]
        CIRCULARS[CircularList / CircularDetail]
        POSTS[PostFeed / PostForm / PostDetail]
        ANALYTICS[AnalyticsDashboard.tsx]
        DIRECTORY[UsersDirectory / UserProfile]
        SETTINGS[Settings.jsx]
        EMERGENCY[Emergency.jsx]
    end

    LAYOUT --> LOGIN
    LAYOUT --> DASH
    LAYOUT --> CIRCULARS
    LAYOUT --> POSTS
    LAYOUT --> ANALYTICS
    LAYOUT --> DIRECTORY
    LAYOUT --> SETTINGS
    LAYOUT --> EMERGENCY

    subgraph Role-Specific Dashboards
        STU_DASH[StudentDashboard.jsx]
        DIR_DASH[DirectorDashboard.jsx]
        SEC_DASH[SecurityDashboard.jsx]
        DEAN_ACAD[DeanAcademicsDashboard.jsx]
        DEAN_DSW[DeanStudentWelfareDashboard.jsx]
    end

    DASH --> STU_DASH
    DASH --> DIR_DASH
    DASH --> SEC_DASH
    DASH --> DEAN_ACAD
    DASH --> DEAN_DSW
```

---

## 2. State Management Architecture

CircuLink implements a hybrid state management model:
1. **Server Cache State (TanStack Query v5)**:
   - Manages asynchronous remote data (feeds, circular lists, analytics overview).
   - Configured with a 5-minute stale-time cache, eliminating redundant network calls upon view switching.
2. **Atomic Client State (Zustand)**:
   - Stores authenticated user identity, dark mode theme preferences, and cached session tokens.
   - Prevents cascading re-renders across sibling components.
3. **Real-Time Context (`NotificationContext`)**:
   - Manages active Socket.IO connections, unread notification counts, and real-time pop-up toasts.

---

## 3. Backend Controller & Service Layer Decomposition

```mermaid
graph LR
    subgraph Route Ingestion Layer
        R_AUTH[authRoutes.js]
        R_CIRC[circularRoutes.js]
        R_POST[postRoutes.js]
        R_USER[userRoutes.js]
        R_MSG[messageRoutes.js]
        R_ANALYTICS[analyticsRoutes.js]
    end

    subgraph Controller & Authorization Layer
        C_AUTH[authController.js]
        C_CIRC[circularController.js]
        C_POST[postController.js]
        C_MSG[messageController.js]
        MW_AUTH[middleware/auth.js]
        MW_RBAC[middleware/rbac.js]
    end

    subgraph Data Access Layer DAL
        DAL[services/mysqlService.js]
    end

    subgraph Database Connection Pool
        POOL[config/mysql.js - mysql2/promise]
    end

    R_AUTH --> MW_AUTH --> C_AUTH --> DAL --> POOL
    R_CIRC --> MW_RBAC --> C_CIRC --> DAL --> POOL
    R_POST --> MW_AUTH --> C_POST --> DAL --> POOL
    R_USER --> MW_AUTH --> DAL --> POOL
    R_MSG --> MW_AUTH --> C_MSG --> DAL --> POOL
    R_ANALYTICS --> MW_RBAC --> DAL --> POOL
```

---

## 4. Component Communication & Lifecycle Rules

1. **Strict Decoupling**: Frontend components never issue raw SQL or direct database queries; all interactions flow through the Axios API client (`api/axios.ts`).
2. **Dynamic Media Resolution**: All media attachments, user avatars, and download links resolve through `getFileUrl()`, ensuring compatibility between local development, Vercel edge deployment, and cloud storage.
3. **Resilient OAuth**: Google OAuth hooks reside in leaf components (`GoogleLoginSection`) and only execute when `VITE_GOOGLE_CLIENT_ID` is present, safeguarding primary username/password authentication against runtime crashes.
