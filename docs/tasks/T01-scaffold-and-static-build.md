# T1 — Project scaffold & static build

**Depends on:** —
**Milestone:** M1 — Read a URL

Set up Nuxt (latest stable), TypeScript, Vitest, Playwright, lint, and the static build.

## Acceptance criteria

- [ ] `nuxt.config` has `ssr: false`; no `server/` directory exists.
- [ ] `npm run generate` outputs `.output/public`; served by any static server, every route
      works, including a hard refresh on `/read?...` (needs SPA fallback; production config in
      [T11](T11-deploy-coolify.md)).
- [ ] `npm run test` and `npm run test:e2e` run in CI (GitHub Actions) on every PR.
- [ ] Lint + typecheck fail the CI on errors.
