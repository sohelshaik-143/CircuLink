<div align="center">

# 🎓 CircuLink

### *The Official Campus Intelligence & Communication Platform for RGUKT*

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-18-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-6-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io)
[![License](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)

> **CircuLink** bridges the gap between students, faculty, and administration across all four RGUKT campuses — bringing circulars, innovation posts, real-time messaging, and campus analytics into one seamless platform.

---

</div>

## ✨ What is CircuLink?

CircuLink is a **full-stack campus communication platform** built specifically for the Rajiv Gandhi University of Knowledge Technologies (RGUKT). It replaces fragmented WhatsApp groups and notice boards with a single, secure, role-aware digital campus hub.

Whether you are a student sharing an innovation idea, an HOD approving a circular, or a Director monitoring campus-wide engagement — CircuLink has your workflow covered.

---

## 🚀 Features

### 📋 Smart Circular Management
- Multi-stage approval workflow: **Student/Faculty → HOD → Dean → Director**
- Priority tags (URGENT, HIGH, NORMAL), category filters, and read receipts
- Students can submit circular ideas and suggestions — not just officials
- Emergency broadcast system for Directors and Security roles

### 💡 Innovation Feed
- Students and faculty post innovations, projects, research, and ideas
- Like, comment, and **endorse** posts (faculty endorsements carry extra weight)
- Topic-based trending analytics updated in real time
- Rich text content with file/image attachments

### 📊 Live Analytics Dashboard
- Real-time counts: Online users, Community Members, Active Posts
- Campus-wise and branch-wise engagement breakdown
- Top trending topics, leaderboard, and audit logs
- Export data as JSON for reporting (Director/Admin only)

### 🔒 Role-Based Access Control

| Role | Access Level |
|---|---|
| Student | Posts, Circulars, Community, Messaging |
| Faculty | + Endorsements, Circular Drafts |
| HOD | + Circular Approval (Level 1) |
| Dean | + Analytics, Audit Logs, Campus Reports |
| Director | + Emergency Broadcast, Full Export |
| Admin | Full Platform Access |

### 💬 Real-Time Encrypted Messaging
- Person-to-person chat within the platform (no external email)
- Photo and file sharing within the app only
- Live typing indicators via Socket.IO

### 🏆 Gamification
- Points awarded for posts, comments, endorsements, and activity
- Level progression: Beginner → Explorer → Innovator → Pioneer → Legend
- Auto-badge awards for milestones
- Live leaderboard per campus and branch

### 🔍 Global Search
- Instant search across all posts and circulars
- 300ms debounced search with animated dropdown results

### 📱 Fully Mobile Responsive
- Hamburger navigation at mobile breakpoints
- Adaptive grid layouts for all screen sizes

### 🔐 Secure Authentication
- Google OAuth login with RGUKT domain validation
- JWT + Refresh Token rotation
- MFA (TOTP via Google Authenticator) for HOD, Dean, Director roles
- Forgot password flow with secure crypto token

---

## 🏛️ Supported Campuses

| Campus | Email Domain |
|---|---|
| RK Valley | `@rguktrkv.ac.in` |
| Ongole | `@rguktrong.ac.in` |
| Srikakulam | `@rguktskl.ac.in` |
| Nuzvid | `@rguktnuz.ac.in` |

> Only valid RGUKT email addresses are accepted for student registration and Google Sign-In.

---

## 🛠️ Tech Stack

**Frontend**
- React 18, React Router v6
- Framer Motion (animations)
- Socket.IO Client
- Axios with JWT interceptors & auto token refresh
- `@react-oauth/google` for Google Sign-In
- React Hot Toast

**Backend**
- Node.js + Express.js
- MongoDB + Mongoose
- Socket.IO (real-time presence & messaging)
- JWT + Refresh Token auth
- Speakeasy (TOTP/MFA)
- Multer (file uploads)
- Helmet, CORS, Rate Limiting

---

## ⚡ Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- A Google OAuth Client ID

### 1. Clone the Repository
```bash
git clone https://github.com/sohelshaik-143/CircuLink.git
cd CircuLink
```

### 2. Backend Setup
```bash
npm install

# Create a .env file with:
# MONGO_URI=your_mongodb_uri
# JWT_SECRET=your_jwt_secret
# REFRESH_TOKEN_SECRET=your_refresh_secret
# CLIENT_URL=http://localhost:3000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

### 4. Run the App
```bash
# Backend — port 5000
npm run dev

# Frontend — port 3000
cd frontend && npm start
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your RGUKT college email.

---

## 📁 Project Structure

```
CircuLink/
├── api/
│   └── routes/          # Express route files (auth, posts, circulars, analytics...)
├── controllers/         # Business logic (authController, etc.)
├── middleware/          # JWT protect, role-based access control
├── models/              # Mongoose schemas (User, Post, Circular, Message...)
├── services/            # NotificationService, GamificationService
├── uploads/             # Multer file destination
├── server.js            # Express + Socket.IO entry point
└── frontend/
    └── src/
        ├── api/         # Axios instance + all API modules
        ├── components/  # Auth, Dashboard, Posts, Circulars, Analytics...
        ├── context/     # AuthContext, NotificationContext
        └── App.jsx      # Router and layout
```

---

## 🌟 What Makes It Different

- **Zero predefined accounts** — every user registers with their real RGUKT identity
- **Community opt-in** — students choose to join the campus community, not forced in
- **Profile setup flow** — new users complete their profile after first login; name and ID are read-only from college records
- **Live online presence** — see who's active on campus in real time across the community page
- **Full audit trail** — every significant action logged for compliance and transparency

---

## 👤 Author

**Sohel Shaik**
Student, RGUKT
[github.com/sohelshaik-143](https://github.com/sohelshaik-143)

---

<div align="center">

Built with dedication for the RGUKT community 🎓

*"Connecting Knowledge. Empowering Campus."*

</div>
