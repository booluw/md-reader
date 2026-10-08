# T10 — Security hardening

**Depends on:** [T2](T02-markdown-rendering.md), [T6](T06-link-and-image-resolution.md)
**Milestone:** M3 — Linked reading

## Acceptance criteria

- [x] Content-Security-Policy defined in the repo's nginx config (served by
      [T11](T11-deploy-coolify.md)): `script-src 'self'`, no `unsafe-eval`;
      `img-src * data: blob:`; `connect-src *` (needed for D2); `frame-ancestors 'none'`.
      (nginx.conf `add_header`, enforced + asserted in `e2e/security-csp.spec.ts`; the two
      build-varying inline scripts are allowed via per-build sha256 hashes written by
      `scripts/csp-hashes.mjs` during `postgenerate`, so `unsafe-inline`/`unsafe-eval` stay off.
      `TableOfContents.vue` inline styles moved to CSS so `style-src 'self'` holds.)
- [x] An XSS fixture file (OWASP cheat-sheet payloads: `<img onerror>`, `<svg onload>`,
      `javascript:` links, `<iframe>`, `<style>`) renders with no script execution;
      Playwright asserts no `dialog` event fired. Run against the production nginx image so
      the real CSP is tested.
      (`public/__fixtures__/xss.md`; `e2e/security-csp.spec.ts` against `nginxinc/
      nginx-unprivileged:alpine` via `npm run test:e2e:security`, all three browsers; the
      `serve`-backed default suite also asserts it in `e2e/security.spec.ts`.)
- [x] The `src` query param can only trigger a GET of http(s) URLs; no other scheme is fetched.
      (`test/source-url.test.ts` rejects `javascript:`, `vbscript:`, `mailto:`, `data:`,
      `ftp:`; `e2e/security.spec.ts` and `e2e/security-csp.spec.ts` assert
      `/read?src=javascript:alert(1)` shows the protocol error with no `dialog` event.)
- [x] Rendered external links have `rel="noopener noreferrer"`; images get
      `referrerpolicy="no-referrer"`.
      (`app/utils/markdown.ts`; unit + `e2e/security.spec.ts` DOM assertions.)
