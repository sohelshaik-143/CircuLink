# Environment Variables Specification & Configuration Guide

**Security Policy**: Never commit real secret values, passwords, or production API tokens into version control.

---

## 1. Backend Environment Variables (`.env`)

| Variable Name | Type | Required | Default / Example Value | Description |
|---|---|:---:|---|---|
| `PORT` | Number | No | `5000` | Local port on which Express server listens |
| `NODE_ENV` | String | Yes | `development` / `production` | Runtime mode. In production, strict security checks are enforced |
| `CLIENT_URL` | String | Yes | `http://localhost:3000` | Allowed CORS origin for web client |
| `DATABASE_URL` | String | Cond. | `mysql://root:password@localhost:3306/circulink` | Unified connection string for cloud MySQL |
| `DB_HOST` | String | Cond. | `localhost` | MySQL host address |
| `DB_USER` | String | Cond. | `root` | MySQL username |
| `DB_PASSWORD` | String | Cond. | `your_secure_password` | MySQL user password |
| `DB_NAME` | String | Cond. | `circulink` | MySQL database name |
| `DB_PORT` | Number | No | `3306` | MySQL port |
| `JWT_SECRET` | String | Yes | Minimum 32-character string | Symmetric secret used to sign and verify access tokens |
| `JWT_EXPIRE` | String | No | `7d` | Access token lifespan |
| `REFRESH_TOKEN_SECRET`| String | Yes | Minimum 32-character string | Symmetric secret used for refresh tokens |
| `REFRESH_TOKEN_EXPIRE`| String | No | `30d` | Refresh token lifespan |
| `GOOGLE_CLIENT_ID` | String | No | `your-google-oauth-client-id` | Backend verification of Google OAuth tokens |

---

## 2. Frontend Environment Variables (`frontend/.env`)

| Variable Name | Type | Required | Default / Example Value | Description |
|---|---|:---:|---|---|
| `VITE_API_URL` | String | No | `/api` | Base REST API URL. Defaults to relative `/api` on Vercel |
| `VITE_SOCKET_URL` | String | No | Empty / `http://localhost:5000` | Real-time WebSocket connection URL |
| `VITE_GOOGLE_CLIENT_ID` | String | No | `your-client-id.apps.googleusercontent.com` | Google OAuth Web Client ID for Google SSO button |

> [!NOTE]
> If `VITE_GOOGLE_CLIENT_ID` is omitted or empty, CircuLink automatically deactivates the Google login button and presents the native University College ID / Email authentication interface without throwing runtime exceptions.
