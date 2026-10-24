# Known Limitations & Architectural Trade-Offs

**Document Owner**: Principal Software Architect  
**Review Date**: October 2026  

---

## 1. Architectural Constraints & Trade-Offs

### 1.1 Ephemeral File Storage on Vercel Serverless
- **Constraint**: Vercel Serverless functions operate on read-only filesystems with the exception of temporary `/tmp` directories. Uploaded avatar images or chat attachments stored to local disk will disappear when the lambda cold starts or spins down.
- **Architectural Solution**: Local file storage is suitable for single-node containerized deployments (Docker, Railway, Render). For multi-instance enterprise serverless hosting on Vercel, integrate Amazon S3, Cloudinary, or Supabase Storage bucket adapters.

### 1.2 Stateful WebSockets vs Serverless Execution
- **Constraint**: Bidirectional WebSocket connections (Socket.IO) require long-lived TCP sockets. Vercel terminates function execution after HTTP responses, closing socket handshakes.
- **Architectural Solution**: The platform employs a Dual-Dispatch hybrid architecture: real-time WebSocket push for persistent container runtimes, coupled with automatic 30s background REST polling on serverless edge deployments.

### 1.3 University College ID Prefix Conventions
- **Constraint**: Campus multi-tenancy auto-detection relies on standard RGUKT ID prefixes:
  - `R` -> RK Valley
  - `N` -> Nuzvid
  - `O` -> Ongole
  - `S` -> Srikakulam
  - `B` -> Basar
- **Mitigation**: Higher officials (Deans, Directors, External Auditors) without an alphanumeric student ID can log in directly using their institutional email address.

### 1.4 Institutional Enterprise Integration Scope
- **Constraint**: University student records, examination marks, and biometric attendance data reside behind RGUKT campus intranets.
- **Policy**: CircuLink operates independently and does not attempt unauthorized integration with proprietary campus intranet servers without formal administrative approval from the University Vice-Chancellor and IT Council.
