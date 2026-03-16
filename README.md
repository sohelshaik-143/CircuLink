# 🗃️ RGUKT Platform — Database & API Reference

## 📁 Folder Structure

```
rgukt-db-api/
│
├── database/
│   ├── schemas/
│   │   └── allSchemas.js        ← All 6 MongoDB collection schemas documented
│   ├── indexes/
│   │   └── createIndexes.js     ← Run once to create all performance indexes
│   ├── migrations/
│   │   └── 001_add_gamification.js  ← DB migrations (up/down)
│   └── seed/
│       └── fullSeed.js          ← Seeds 90+ users across all campuses + branches
│
├── api/
│   ├── routes/
│   │   ├── authRoutes.js        ← 11 auth endpoints (register, login, MFA, refresh, etc.)
│   │   ├── userRoutes.js        ← 12 user endpoints (follow, leaderboard, admin, etc.)
│   │   ├── postRoutes.js        ← 15 post endpoints (CRUD, like, bookmark, endorse, etc.)
│   │   ├── circularRoutes.js    ← 13 circular endpoints (full approval workflow + emergency)
│   │   └── analyticsAndNotifRoutes.js ← 9 analytics + 5 notification endpoints
│   ├── validators/
│   │   └── index.js             ← All express-validator chains for every endpoint
│   └── docs/
│       └── api-documentation.json ← Complete structured API docs (all 65+ endpoints)
│
├── services/
│   ├── notificationService.js   ← Centralized notification sending + socket emit
│   └── gamificationService.js  ← Points, levels, badges, streaks
│
└── server.js                    ← Full Express + Socket.IO server (all routes mounted)
```

---

## 🗃️ Database: 6 Collections

| Collection    | Documents | Purpose |
|---|---|---|
| `users`       | ~100      | All roles (Student→Director), gamification, MFA |
| `posts`       | ~50+      | Innovation, research, projects, ideas |
| `circulars`   | ~20+      | Official circulars with 3-step approval chain |
| `comments`    | dynamic   | Threaded comments on posts/circulars |
| `notifications`| dynamic  | In-app + socket notifications (TTL 30d) |
| `auditlogs`   | dynamic   | All actions logged (TTL 90d) |

### Total indexes: 37
- 7 on `users` (unique collegeId, email, role+campus, points for leaderboard)
- 8 on `posts` (text search, trending, branch+campus+topic)
- 8 on `circulars` (unique number, status+targets, approval chain)
- 5 on `comments` (post, circular, author, parent)
- 4 on `notifications` (recipient+read, TTL 30-day auto-delete)
- 5 on `auditlogs` (user+action, campus+branch, TTL 90-day)

---

## 🔗 API: 65+ Endpoints

### Auth (11)
| Method | Endpoint | Access |
|---|---|---|
| POST | /auth/register | Public |
| POST | /auth/login | Public (+ MFA for HOD/Dean/Director) |
| POST | /auth/logout | Private |
| GET | /auth/me | Private |
| POST | /auth/refresh-token | Public |
| POST | /auth/forgot-password | Public |
| PUT | /auth/reset-password/:token | Public |
| PUT | /auth/change-password | Private |
| POST | /auth/setup-mfa | Private |
| POST | /auth/verify-mfa | Private |
| POST | /auth/disable-mfa | Private |

### Users (12)
| Method | Endpoint | Access |
|---|---|---|
| GET | /users | Private |
| GET | /users/leaderboard | Private |
| GET | /users/profile | Private |
| PUT | /users/profile | Private |
| GET | /users/:id | Private |
| POST | /users/:id/follow | Private |
| GET | /users/:id/followers | Private |
| GET | /users/:id/following | Private |
| PUT | /users/:id/deactivate | ADMIN, DIRECTOR |
| PUT | /users/:id/activate | ADMIN |
| PUT | /users/:id/role | ADMIN |

### Posts (15)
| Method | Endpoint | Notes |
|---|---|---|
| GET | /posts | Public/Private (with filtering) |
| POST | /posts | +10 points, notifies followers |
| GET | /posts/trending | Top 10 |
| GET | /posts/:id | Auto-increments views |
| PUT | /posts/:id | Saves version history |
| DELETE | /posts/:id | Soft + hard delete |
| POST | /posts/:id/like | Toggle, notifies author |
| POST | /posts/:id/bookmark | Toggle |
| POST | /posts/:id/endorse | FACULTY+, author gets +50 pts |
| POST | /posts/:id/comment | +5 points, notifies author |
| DELETE | /posts/:id/comment/:cid | Soft-delete |
| POST | /posts/:id/flag | FACULTY+ |
| POST | /posts/:id/feature | HOD+ |
| GET | /posts/:id/versions | Version history |

### Circulars (13) — 3-Step Approval Workflow
| Method | Endpoint | Notes |
|---|---|---|
| GET | /circulars | Role-filtered |
| POST | /circulars | Starts HOD→Dean→Director chain |
| GET | /circulars/pending | For approvers only |
| PUT | /circulars/:id/approve | Advances workflow, notifies next |
| PUT | /circulars/:id/reject | Notifies author |
| POST | /circulars/:id/read | Mark as read |
| POST | /circulars/:id/acknowledge | For URGENT circulars |
| POST | /circulars/emergency | Instant broadcast, skips approval |
| GET | /circulars/:id | Full details, auto-read |
| DELETE | /circulars/:id | Archive (soft-delete) |

### Analytics (9)
| Endpoint | Access | Description |
|---|---|---|
| GET /analytics/overview | Any | totalUsers, posts, circulars, pending |
| GET /analytics/branch-activity | Any | Posts/students/faculty per branch |
| GET /analytics/campus-comparison | DEAN+ | All 4 campuses side-by-side |
| GET /analytics/topic-trends | Any | Top 12 topics |
| GET /analytics/engagement-over-time | Any | Daily activity chart |
| GET /analytics/circular-stats | HOD+ | By category, status, read rates |
| GET /analytics/leaderboard | Any | Top students by points |
| GET /analytics/audit-logs | DEAN+ | Full audit trail |
| GET /analytics/export | DIRECTOR+ | JSON data export |

### Notifications (5)
| Endpoint | Description |
|---|---|
| GET /notifications | Paginated, filterable |
| PUT /notifications/:id/read | Mark single read |
| PUT /notifications/mark-all-read | Bulk read |
| DELETE /notifications/:id | Delete one |
| DELETE /notifications/clear-all | Clear read |

---

## 🔌 Real-Time (Socket.IO)

**Client → Server events:**
- `join(userId)` — subscribe to personal room
- `join_branch(branch)` — subscribe to branch events
- `join_campus(campus)` — subscribe to campus events

**Server → Client events:**
- `notification` — new notification
- `emergency` — emergency broadcast
- `new_circular` — new circular published
- `new_post` — new post from followed user

---

## ⚡ Quick Setup

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Edit MONGO_URI and JWT secrets

# 3. Create indexes (run once)
node database/indexes/createIndexes.js

# 4. Seed data
node database/seed/fullSeed.js

# 5. Start server
npm run dev
```

---

## 📋 Demo Credentials (after seed)

| Role | College ID | Password |
|---|---|---|
| Student | r22,n22,o22,s22| student123 |
| Faculty | F001CSE | faculty123 |
| HOD | HOD001CSE | hod12345 |
| DSW | DSW001 | dsw12345 |
| Dean | DEAN001 | dean1234 |
| Director | DIR001 | director1 |
| Security | SEC001 | security1 |
| Admin | ADM001 | admin1234 |
