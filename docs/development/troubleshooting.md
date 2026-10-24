# Development Troubleshooting Manual

**Auditor**: Senior Full-Stack Engineer  
**Objective**: Quick diagnosis and resolution of common errors encountered during local setup and deployment.  

---

## 1. Common Issues & Solutions

### Issue 1: "Could not find GoogleOAuthProvider context with a valid clientId"
- **Symptom**: Uncaught ErrorBoundary screen displays upon opening `/login`.
- **Cause**: Google OAuth hook invoked without a valid `VITE_GOOGLE_CLIENT_ID`.
- **Fix**: Already resolved in v2.0. The application automatically detects missing client IDs, disables the Google button safely, and exposes the University College ID / Password login form.

### Issue 2: Vercel Deep Linking Returns 404 (NOT_FOUND)
- **Symptom**: Reloading `/circulars` or `/dashboard` on Vercel returns HTTP 404.
- **Cause**: Missing SPA rewrite rule in edge deployment.
- **Fix**: Verified `vercel.json` rewrites are present in both root and `frontend/` folders:
  ```json
  { "source": "/(.*)", "destination": "/index.html" }
  ```

### Issue 3: MySQL Connection Refused (`ECONNREFUSED 127.0.0.1:3306`)
- **Symptom**: `autoMigrate` or `server.js` fails on startup with connection refused.
- **Diagnosis**:
  1. Check MySQL service status: `sudo systemctl status mysql` (Linux) or `Get-Service MySQL` (Windows).
  2. Verify credentials in `.env`: Ensure `DB_USER` and `DB_PASSWORD` are valid.
  3. Ensure database exists: `CREATE DATABASE circulink;`

### Issue 4: EADDRINUSE: Port 5000 Already in Use
- **Diagnosis**: An existing Node.js or AirPlay process is occupying port 5000.
- **Fix**:
  - Windows: `netstat -ano | findstr :5000` then `taskkill /PID <PID> /F`
  - Linux/Mac: `lsof -i :5000` then `kill -9 <PID>`
  - Or configure `PORT=5001` in `.env`.
