# Local Development Setup Guide

**Prerequisites**:
- Node.js 18.x or 20.x LTS
- MySQL 8.0+ running locally or in Docker
- Git

---

## 1. Clone & Bootstrap

```bash
# 1. Clone the repository
git clone https://github.com/sohelshaik-143/CircuLink.git
cd CircuLink

# 2. Install backend dependencies
npm install

# 3. Install frontend dependencies
cd frontend
npm install
cd ..
```

---

## 2. Environment Configuration

Create `.env` in the root directory:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=circulink
DB_PORT=3306

# Cryptography
JWT_SECRET=super_secure_development_jwt_secret_32chars!
JWT_EXPIRE=7d
REFRESH_TOKEN_SECRET=super_secure_development_refresh_secret_32chars!
REFRESH_TOKEN_EXPIRE=30d
```

Create `frontend/.env` (optional):
```env
VITE_API_URL=/api
# VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

---

## 3. Database Initialization

Execute the auto-migration script to initialize schema tables and default seed personas:
```bash
npm run seed
```

---

## 4. Run Development Servers

```bash
# Option A: Run Backend API & Socket Server (Terminal 1)
npm run dev

# Option B: Run Frontend Vite Dev Server (Terminal 2)
cd frontend
npm run dev
```
Open `http://localhost:3000` or `http://localhost:5173` in your browser.
