# ADR-004: Multi-Campus Tenant Isolation Boundary

**Status**: Accepted  
**Date**: October 2026  
**Deciders**: Principal Architect, Security Lead  

---

## Context
RGUKT operates multiple autonomous campuses across Andhra Pradesh and Telangana:
- RK Valley (Idupulapaya, YSR Kadapa District)
- Nuzvid (Eluru District)
- Srikakulam
- Ongole
- Basar (Telangana)

While some circulars apply university-wide (e.g., Chancellor messages, academic council regulations), most operational circulars, departmental exam notices, and security advisories are strictly campus-specific. Allowing students or faculty from one campus to modify or access confidential drafts from another campus represents a severe institutional security violation.

---

## Decision
1. **Server-Side Authorization Boundary**:
   - The user's campus identity is extracted directly from the signed JWT payload verified against the database.
   - Client-supplied campus headers or parameters are never trusted for authorization decisions.
2. **Campus Scoping in Data Access Layer (DAL)**:
   - For `STUDENT` and `FACULTY` roles, `MySQLService.getCirculars()` strictly filters by `targetCampuses IN (user.campus, 'ALL')`.
   - Creation of campus-targeted circulars is restricted: staff can only issue notices for their own campus unless they hold the `DIRECTOR` or `ADMIN` role.
3. **Institutional Escalation**:
   - Institutional administrators (`DIRECTOR`, `DEAN`, `ADMIN`) are granted multi-campus oversight and can publish notices targeted to all campuses (`ALL`).

---

## Consequences
- **Positive**: Strict tenant isolation across all 5 RGUKT campuses.
- **Positive**: Prevents cross-campus data leakage and privilege escalation.
- **Negative**: Requires checking user campus context in every data retrieval path.
