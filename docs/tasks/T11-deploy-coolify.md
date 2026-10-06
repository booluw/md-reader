# T11 — Deploy to Coolify

**Depends on:** T1–T8, [T10](T10-security-hardening.md)
**Milestone:** M4 — Share & ship

Follow the existing runbook: `The Contabo PaaS Book/12-onboarding-new-projects.md`
(checklist 12.11) and, for CI, chapter 09. This task lists only what is specific to md-reader.

## Decisions

- **Build pack: Dockerfile** (12.1), not the Static build pack. A multi-stage Dockerfile
  (`node` → `nuxt generate`; `nginx:alpine` serving `.output/public`) puts the SPA fallback and
  the security headers (CSP from T10) in a versioned `nginx.conf` in the repo, instead of
  Coolify UI settings.
- **No database, no volumes, no secrets.** 12.5, 12.8 and the volume part of 12.10 are N/A.
- **CI per chapter 09:** GitHub Actions builds and pushes `ghcr.io/booluw/md-reader`, then
  calls the Coolify deploy webhook; Auto Deploy off.

## Acceptance criteria

- [ ] `Dockerfile` + `nginx.conf` in the repo. nginx has `try_files $uri $uri/ /index.html;`,
      long-cache headers on `/_nuxt/*` (hashed assets), `no-cache` on `index.html`, and the T10
      headers.
- [ ] Image runs as non-root, has a `HEALTHCHECK` (`wget -qO- http://127.0.0.1:<port>/`) and
      no Node runtime in the final stage.
- [ ] Coolify project `md-reader` with `production` environment, domain
      `https://reader.myshort.page:<port>` (12.7). DNS: `reader` A record on the
      `myshort.page` Cloudflare zone (12.3; add the zone per 04.1 if it isn't there yet).
- [ ] Memory limit set via **Resource Limits** (12.9); start at 64M.
- [ ] `github-actions-md-reader` deploy token, `COOLIFY_TOKEN` + `COOLIFY_WEBHOOK` repo
      secrets (12.10). A push to `main` deploys exactly once.
- [ ] Uptime Kuma HTTP monitor on `https://reader.myshort.page` with certificate-expiry alerts (12.10).
- [ ] No Coolify/Traefik/Cloudflare feature logs or stores query strings beyond default
      access logs; confirm Cloudflare (if proxied) doesn't cache `/read` responses by query.
- [ ] Smoke test on `https://reader.myshort.page`: open a public GitHub README by URL, follow one relative link,
      hard-refresh on `/read?...`, upload a fixture folder, copy a share link and open it in a
      private window. Response headers include the CSP.
- [ ] Repo README explains the CORS limitation and "local files stay on your device" in plain
      language.
- [ ] 12.11 checklist copied into the project notes with every applicable item ticked.
