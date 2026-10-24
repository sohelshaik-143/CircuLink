# Rollback & Disaster Recovery Playbook

**Scope**: Incident Mitigation, Vercel Instant Rollback, Docker Version Reversion  

---

## 1. Vercel Edge Rollback (Instant)

If a newly deployed build causes unexpected runtime issues in production:
1. Open the Vercel Dashboard for `rgukt-platform`.
2. Navigate to **Deployments**.
3. Locate the previous healthy deployment hash.
4. Click **Instant Rollback** (Promote to Production).
5. Vercel edge routes traffic to the previous healthy immutable bundle within 300 milliseconds globally.

---

## 2. Containerized Cloud Rollback (Docker / Railway / Render)

```bash
# 1. Inspect previous release commit
git log -n 5 --oneline

# 2. Checkout the verified previous stable tag/commit
git checkout <previous_stable_commit>

# 3. Redeploy container
docker build -t circulink:stable .
docker stop circulink_running && docker run -d --name circulink_running -p 5000:5000 --env-file .env circulink:stable
```
