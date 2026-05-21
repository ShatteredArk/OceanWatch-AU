# Contributing to OceanWatch AU

Thank you for your interest in contributing. This document explains the development
workflow and standards we follow.

---

## Development setup

See [README.md](README.md) for the complete local setup guide.

---

## Branch strategy

- `main` is protected: requires a passing CI pipeline and at least one review.
- All work happens on feature branches: `feat/`, `fix/`, `chore/`, `docs/`.
- Branch names use kebab-case.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/).

Examples:

```
feat(globe): add confidence tier colour coding
fix(ingest): handle CDSE token refresh race condition
chore(deps): bump maplibre-gl to 4.7.1
docs(api): document min_confidence query parameter
```

Husky enforces this at commit time via `@commitlint/config-conventional`.

## Pull requests

- Keep PRs focused: aim for ≤400 lines changed per PR.
- Every PR that changes API behaviour must update `docs/api.md`.
- Every PR that makes a non-obvious technical choice must add an entry to `DECISIONS.md`.
- CI must pass before merge.

## Code style

- TypeScript strict mode. All new code must type-check with `pnpm type-check`.
- `pnpm lint` must pass.
- `pnpm format:check` must pass (Prettier enforces formatting).
- Comments only when the _why_ is non-obvious. Never describe what the code does.

## Testing

- Unit tests in `src/lib/__tests__/` using Vitest.
- Integration tests mock Copernicus responses; real API calls do not run in CI.
- E2E smoke test in `e2e/` using Playwright.
- Run `pnpm test` before opening a PR.

## Security

See [SECURITY.md](SECURITY.md) for the vulnerability disclosure process.
Never commit credentials or `.env` files. Use `.env.example` as the template.

## Code of conduct

Be excellent to each other.
