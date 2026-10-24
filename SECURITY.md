# Security Policy for CircuLink

## Supported Versions
Security updates are actively maintained for the current 2.x release line:

| Version | Supported |
|---|:---:|
| 2.0.x | ✅ |
| 1.0.x | ❌ (Legacy MongoDB stack deprecated) |

---

## Reporting a Vulnerability
If you discover a security vulnerability within CircuLink:
1. **Do not create a public issue** on GitHub.
2. Email full technical details, reproduction steps, and proof-of-concept to the security team or repository administrator.
3. We will acknowledge receipt within 48 hours and work with you on a coordinated disclosure timeline.

---

## Security Practices
- Passwords are encrypted with bcrypt (12 rounds).
- Access tokens expire in 7 days; refresh tokens rotate on every renewal.
- Cross-campus queries enforce server-side tenant boundaries.
- Passwords, API secrets, and `.env` files must never be committed to source control.
