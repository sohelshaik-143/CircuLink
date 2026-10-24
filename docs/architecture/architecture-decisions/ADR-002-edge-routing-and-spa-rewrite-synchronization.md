# ADR-002: Edge Routing and SPA Rewrite Synchronization

**Status**: Accepted  
**Date**: October 2026  
**Deciders**: Principal Architect, DevSecOps Lead  

---

## Context
When deploying a Vite single-page application (SPA) to edge hosting platforms like Vercel, client-side routes (e.g. `/dashboard`, `/circulars/:id`, `/posts`) are not static HTML files on disk. If a user navigates directly to a deep URL or reloads the browser, the edge web server returns an HTTP 404 error unless configured with rewrite rules mapping all non-asset requests back to `/index.html`.

In the CircuLink repository, `vercel.json` exists at the root, but subproject deployments (such as targeting `frontend/` as the root directory on Vercel) lacked synchronized edge rewrite rules.

---

## Decision
1. **Maintain Dual Rewrite Specifications**:
   - Provide a canonical `vercel.json` at the repository root configuring build commands, output directory (`frontend/dist`), and SPA rewrites.
   - Provide a synchronized `frontend/vercel.json` rewrite file so that if an administrator connects Vercel directly to the `frontend/` folder, Vercel immediately recognizes SPA client routing without custom dashboard overrides.
2. **Path Fallbacks**:
   - Explicitly route `/api/(.*)` to `/api/index.js` for serverless API invocations.
   - Route `/uploads/(.*)` to API or cloud media handlers.
   - Fallback `/(.*)` to `/index.html`.

---

## Consequences
- **Positive**: Deep-linking, page reloads, and shared links work seamlessly across all deployment configurations.
- **Positive**: Eliminates HTTP 404 errors on direct navigation.
- **Negative**: Requires maintaining two configuration files in sync if routes change.
