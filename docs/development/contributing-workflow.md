# Contributing Workflow & Engineering Standards

**Repository**: `https://github.com/sohelshaik-143/CircuLink`  
**Branching Model**: Trunk-Based with Short-Lived Feature Branches  

---

## 1. Branch Naming & Commit Convention

### Branch Naming
- `feat/feature-name` — New functional capabilities or integrations
- `fix/bug-description` — Defect resolutions
- `docs/doc-scope` — Technical documentation updates
- `refactor/scope` — Structural improvements without contract changes

### Conventional Commits
All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
```text
<type>(<scope>): <short description in imperative present tense>

[optional body explaining rationale and trade-offs]

[optional footer referencing issue ID or breaking change]
```
Examples:
- `feat(auth): decouple Google OAuth provider for resilient fallback`
- `fix(routing): add SPA rewrite rules for Vercel edge deployment`
- `docs(architecture): document relational schema and multi-campus boundaries`

---

## 2. Pull Request & Quality Gate Requirements

Before opening a Pull Request:
1. **Compilation**: Run `cd frontend && npm run build` to verify strict TypeScript and Vite bundling.
2. **Secrets Check**: Ensure no API keys, private credentials, or `.env` files are tracked in `git status`.
3. **Diff Review**: Inspect `git diff` for stray `console.log` statements or unintentional formatting shifts.
