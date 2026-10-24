# Contributing to CircuLink

Thank you for your interest in contributing to **CircuLink** — The Official Campus Intelligence & Communication Platform for RGUKT.

---

## Code of Conduct
We are committed to providing a welcoming, inclusive, and harassment-free environment for everyone. Please treat all contributors, students, and faculty with respect and professional courtesy.

---

## How to Contribute
1. **Fork or Branch**: Create a dedicated branch from `main`:
   ```bash
   git checkout -b feat/your-improvement-name
   ```
2. **Conform to Architecture Standards**:
   - Strictly follow the 3-tier architecture (Client -> Express/Spring -> MySQL 8).
   - Ensure dynamic URL resolution using `getFileUrl()` instead of hardcoded hostnames.
   - Maintain 100% pixel fidelity with the existing design system.
3. **Run Quality Gates**:
   ```bash
   cd frontend && npm run build
   ```
4. **Author Conventional Commits**:
   - `feat(scope): message`
   - `fix(scope): message`
   - `docs(scope): message`
5. **Open a Pull Request**: Provide a clear description, screenshots, and test results.
