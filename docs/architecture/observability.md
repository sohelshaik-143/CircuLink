# Observability, Monitoring & Audit Logging

**Maintainer**: Principal DevSecOps Lead  
**Scope**: Structured Logging, Health Checks, Error Boundaries, Immutable Audit Trail  

---

## 1. Observability Architecture

```mermaid
graph LR
    subgraph Client Observability
        CLIENT_ERR[React Error Boundary]
        TOAST_ERR[User Toast Notifications]
    end

    subgraph Server Observability
        HTTP_LOG[Morgan Request Logger]
        ERR_MW[Express Error Middleware]
        HEALTH[/api/health Endpoint]
    end

    subgraph Immutable Audit Trail
        DAL[MySQLService.logAudit]
        AUDIT_TBL[(MySQL audit_logs Table)]
    end

    CLIENT_ERR -.->|Client Console| SENTRY[Sentry / Telemetry Opt-in]
    HTTP_LOG --> STDOUT[Server Standard Output]
    ERR_MW --> STDOUT
    DAL --> AUDIT_TBL
```

---

## 2. Immutable Audit Logging (`audit_logs`)

All sensitive administrative actions (circular creation, approvals, rejections, emergency broadcasts) trigger a persistent audit record in MySQL:

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT AUTO_INCREMENT | Unique audit event identifier |
| `user_id` | BIGINT FK -> users(id) | Action initiator |
| `action` | VARCHAR(100) | `CREATE_CIRCULAR`, `APPROVE_CIRCULAR`, `EMERGENCY_BROADCAST`, etc. |
| `resource_type` | VARCHAR(50) | Target entity (`Circular`, `Post`, `User`) |
| `resource_id` | BIGINT | Entity primary key |
| `ip_address` | VARCHAR(50) | Client IP address captured by reverse proxy |
| `details` | JSON / TEXT | Structured metadata and remarks |
| `created_at` | DATETIME(3) | Millisecond precision UTC timestamp |

---

## 3. Health Endpoint & Heartbeats

- **Endpoint**: `GET /api/health`
- **Output Schema**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-24T12:00:00.000Z",
    "uptime": 3600,
    "database": "connected",
    "environment": "production"
  }
  ```
