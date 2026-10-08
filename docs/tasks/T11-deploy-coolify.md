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

- [x] `Dockerfile` + `nginx.conf` in the repo. nginx has `try_files $uri $uri/ /index.html;`,
      long-cache headers on `/_nuxt/*` (hashed assets), `no-cache` on `index.html`, and the T10
      headers.
      (Landed as part of T10, verified via the nginx-image security suite.)
- [x] Image runs as non-root, has a `HEALTHCHECK` (`wget -qO- http://127.0.0.1:<port>/`) and
      no Node runtime in the final stage.
      (`nginxinc/nginx-unprivileged:alpine` final stage, `EXPOSE 8080`, `HEALTHCHECK`.)
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

## Infra steps (12.x, with exact values)

1. **GitHub repo** — `booluw/md-reader`: created, pushed (this repo started local-only; the CI
   commit on `main` is the first push).
2. **VPS can pull from GHCR** (09.4). GitHub → Settings → Developer settings → PAT
   (classic) → `coolify-ghcr-pull`, scope **`read:packages`**, expiry 1 year, into the password
   manager. On the VPS as root (no credential helper — Coolify's helper can't run
   `docker-credential-*`):
   ```bash
   read -rs GHCR_PAT
   echo "$GHCR_PAT" | docker login ghcr.io -u booluw --password-stdin
   unset GHCR_PAT
   ```
   Confirm `sudo cat /root/.docker/config.json` has an `auths` entry (base64), no `credHelpers`.
   A pull gives `not found` until CI first pushes — that's expected; `denied` means wrong login.
3. **DNS** (12.3) — Cloudflare, `myshort.page` zone: A `reader` → `<VPS IP>`, **DNS only** (grey).
   Leave grey until TLS works, then optionally proxy (04.4).
4. **Coolify project** (12.4) — Projects → + Add → `md-reader`, keep the `production` environment.
5. **Resource** — inside `md-reader / production` → **+ New → Docker Image** (pulls a prebuilt
   image; no git source — Coolify "pulls, not builds"):
   - General → Docker Image: `ghcr.io/booluw/md-reader`, Docker Image Tag/Hash: `main`
   - General → **Ports Exposes: `8080`** (the image starts at 80 by default; ours listens on 8080)
   - Domain: `https://reader.myshort.page:8080` (12.7)
   - **Resource Limits** (12.9): **Maximum Memory Limit `64M`**. Check later
     `docker inspect <container> --format '{{.HostConfig.Memory}}'` (0 = no limit); if the
     container OOM-kills, raise to 96M and update this doc.
   - Advanced → **Auto Deploy off** (single, webhook-only deploy path).
6. **API token** (09.5) — Keys & Tokens → API Tokens → Create → name
   `github-actions-md-reader`, permission **deploy only** → copy once to the password manager.
7. **Webhook URL** (09.6) — open the `md-reader` resource → **Webhooks** → copy the
   **Deploy Webhook** URL (exact, don't hand-build; note GET or POST).
8. **Repo secrets** (09.7) — `booluw/md-reader` → Settings → Secrets & variables → Actions:
   - `COOLIFY_TOKEN` = token from step 6
   - `COOLIFY_WEBHOOK` = URL from step 7
   The `deploy` job skips cleanly until these exist, so the first push isn't red.
9. **Uptime Kuma** (11.5) — add HTTP(s) monitor `md-reader` → `https://reader.myshort.page`; in
   **Advanced** tick **Certificate Expiry Notification**.
10. **First deploy** — push `main` (or **Redeploy** on the resource): watch Actions
    `lint → test → e2e → security → build-images → deploy`. Coolify's deploy log must say it is
    **pulling** the image, not building it. Then `npm run smoke:prod` from a laptop and the manual
    browser smoke (AC above).
11. **Rollback drill** (09.8, optional) — images are tagged `sha-<full sha>`; a rollback = set the
    resource's image tag to a `sha-…`, Redeploy, then restore `main` after the fix.

## 12.11 Checklist — Project: md-reader

- [x] Build pack chosen: **Dockerfile** (decision) — deployed as a **Docker Image** resource,
      CI builds and pushes to GHCR (09)
- [x] Repo added to the `coolify-paas-example` GitHub App — **N/A** (Docker Image resource has no
      git source)
- [ ] DNS record(s) exist (or the wildcard covers them), DNS only
- [ ] Coolify project `md-reader` with a `production` environment
- [x] Compose — **N/A** (single Dockerfile image; one container, no `ports:`, healthcheck in image)
- [x] All env vars set — **N/A** (no env vars); secrets are runtime-only and in the password manager
- [ ] Domains set; each host/path answers from the right container
- [x] Database — **N/A** (no database)
- [x] Memory limits set on every long-running service (Resource Limits → 64M)
- [ ] (CI) images on GHCR, `github-actions-md-reader` token, repo secrets, Auto Deploy off
- [x] Volumes added to `backup-volumes.sh` — **N/A** (no named volumes)
- [ ] Uptime Kuma monitors added, with certificate-expiry alerts
- [ ] Watched the first deploy end to end; a second push deploys once, not twice
- [x] Query strings: nothing beyond default access logs — nginx default access log only; the
      `reader` record stays DNS-only (no Cloudflare layer), so no proxy caching of `/read`
      (double-checked by `scripts/smoke-prod.sh`)

## Deploy log

- (pending) First `main` push → Actions deploy → Coolify pulls `ghcr.io/booluw/md-reader:main`,
  `https://reader.myshort.page:8080` answers, `npm run smoke:prod` green.
