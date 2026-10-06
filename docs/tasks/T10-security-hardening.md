# T10 — Security hardening

**Depends on:** [T2](T02-markdown-rendering.md), [T6](T06-link-and-image-resolution.md)
**Milestone:** M3 — Linked reading

## Acceptance criteria

- [ ] Content-Security-Policy defined in the repo's nginx config (served by
      [T11](T11-deploy-coolify.md)): `script-src 'self'`, no `unsafe-eval`;
      `img-src * data: blob:`; `connect-src *` (needed for D2); `frame-ancestors 'none'`.
- [ ] An XSS fixture file (OWASP cheat-sheet payloads: `<img onerror>`, `<svg onload>`,
      `javascript:` links, `<iframe>`, `<style>`) renders with no script execution;
      Playwright asserts no `dialog` event fired. Run against the production nginx image so
      the real CSP is tested.
- [ ] The `src` query param can only trigger a GET of http(s) URLs; no other scheme is fetched.
- [ ] Rendered external links have `rel="noopener noreferrer"`; images get
      `referrerpolicy="no-referrer"`.
