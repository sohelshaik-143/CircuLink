# CircuLink REST API Reference Specification

**Base URL**: `/api` (or `http://localhost:5000/api`)  
**Format**: `application/json`  
**Authentication**: HTTP Bearer Token (`Authorization: Bearer <jwt_token>`)  

---

## 1. Authentication Endpoints (`/api/auth`)

### 1.1 User Login
- **Endpoint**: `POST /api/auth/login`
- **Auth Required**: No (Public)
- **Request Body**:
  ```json
  {
    "loginId": "R200123",
    "password": "SecurePassword123!",
    "mfaToken": "123456"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": {
      "id": 1,
      "collegeId": "R200123",
      "name": "Sai Krishna",
      "email": "r200123@rguktrkv.ac.in",
      "role": "STUDENT",
      "campus": "RK Valley",
      "branch": "CSE",
      "year": "E3",
      "points": 140,
      "level": "Intermediate"
    }
  }
  ```
- **Error Responses**: `400 Bad Request` (Missing credentials), `401 Unauthorized` (Invalid password / MFA token required).

### 1.2 User Registration
- **Endpoint**: `POST /api/auth/register`
- **Auth Required**: No (Public)
- **Request Body**:
  ```json
  {
    "name": "Ananya Sharma",
    "email": "r210456@rguktrkv.ac.in",
    "collegeId": "R210456",
    "password": "Password99!",
    "role": "STUDENT",
    "campus": "RK Valley",
    "branch": "ECE",
    "year": "E2"
  }
  ```
- **Success Response (201 Created)**: Returns session token and user profile object.

### 1.3 Refresh Token Rotation
- **Endpoint**: `POST /api/auth/refresh-token`
- **Request Body**: `{ "refreshToken": "..." }`
- **Success Response (200 OK)**: `{ "token": "...", "refreshToken": "..." }`

---

## 2. Circular Management Endpoints (`/api/circulars`)

### 2.1 Fetch Circulars Feed
- **Endpoint**: `GET /api/circulars`
- **Auth Required**: Optional (Public gets published; Authenticated receives scoped)
- **Query Parameters**:
  - `campus`: Filter by campus (`RK Valley`, `Nuzvid`, `ALL`)
  - `branch`: Filter by department (`CSE`, `ECE`, `ALL`)
  - `priority`: `URGENT`, `HIGH`, `NORMAL`, `LOW`
  - `status`: `PUBLISHED`, `PENDING_HOD`, `PENDING_DEAN`, `PENDING_DIRECTOR`
  - `page`: Page index (default: `1`)
  - `limit`: Items per page (default: `10`)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "circulars": [
      {
        "id": 12,
        "circularNumber": "CIR/RKV/2026/014",
        "title": "Semester V Mid-Term Schedule Notification",
        "category": "ACADEMIC",
        "priority": "HIGH",
        "status": "PUBLISHED",
        "campus": "RK Valley",
        "createdAt": "2026-10-24T10:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 1, "pages": 1 }
  }
  ```

### 2.2 Create Circular Draft
- **Endpoint**: `POST /api/circulars`
- **Auth Required**: Yes (`FACULTY`, `HOD`, `DEAN`, `DIRECTOR`, `ADMIN`)
- **Request Body**:
  ```json
  {
    "title": "Annual Innovation Conclave Announcement",
    "content": "All engineering departments are invited...",
    "category": "INNOVATION",
    "priority": "HIGH",
    "targetBranches": ["CSE", "ECE", "EEE"],
    "targetCampuses": ["ALL"],
    "targetYears": ["E3", "E4"]
  }
  ```

### 2.3 Approve Circular
- **Endpoint**: `PUT /api/circulars/:id/approve`
- **Auth Required**: Yes (`HOD`, `DEAN`, `DIRECTOR`, `ADMIN`)
- **Request Body**: `{ "comment": "Reviewed and approved for university broadcast." }`

### 2.4 Emergency Alert Dispatch
- **Endpoint**: `POST /api/circulars/emergency`
- **Auth Required**: Yes (`DIRECTOR`, `SECURITY`, `ADMIN`)
- **Request Body**:
  ```json
  {
    "title": "URGENT: Flash Flood Advisory - Campus Gate Warning",
    "content": "Due to heavy rainfall, lower hostel bridge is closed...",
    "campus": "RK Valley"
  }
  ```

---

## 3. Innovation Posts & Projects (`/api/posts`)

### 3.1 Fetch Innovation Feed
- **Endpoint**: `GET /api/posts`
- **Query Parameters**: `topic`, `type` (`PROJECT`, `RESEARCH`, `INNOVATION`), `branch`, `campus`, `search`, `page`, `limit`
- **Success Response (200 OK)**: Returns list of posts with likes, comments count, and faculty endorsements.

### 3.2 Endorse Post (Faculty Only)
- **Endpoint**: `POST /api/posts/:id/endorse`
- **Auth Required**: Yes (`FACULTY`, `HOD`, `DEAN`, `DIRECTOR`)
- **Request Body**: `{ "comment": "Excellent circuit design and simulation results." }`
- **Impact**: Grants +15 gamification points to the post author.

---

## 4. Encrypted Chat & Messages (`/api/messages`)

- `GET /api/messages/unread` — Returns unread message count map by sender.
- `GET /api/messages/:userId` — Retrieves encrypted conversation history with specified contact.
- `POST /api/messages/:userId` — Dispatches message payload and optional media attachment.

---

## 5. Analytics & Dashboard (`/api/analytics`)

- `GET /api/analytics/overview` — High-level campus metrics (Total Students, Active Circulars, Online Sessions, Campus Breakdown).
- `GET /api/analytics/branch-activity` — Departmental engagement counters.
