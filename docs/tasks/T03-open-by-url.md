# T3 — Open by URL

**Depends on:** [T2](T02-markdown-rendering.md)
**Milestone:** M1 — Read a URL

Landing page input: user pastes a direct link, app navigates to `/read?src=<encoded url>` and
fetches it in the browser (no proxy, see D2).

## Acceptance criteria

- [x] Only `http:`/`https:` URLs accepted; invalid input shows an inline error and keeps focus.
- [x] Only paths ending in `.md` or `.markdown` (case-insensitive, ignoring query/fragment) are
      accepted. `.mdx` and other extensions show: "Only .md and .markdown files are supported."
      Extensionless URLs are allowed but the response must have a `text/*` content type.
- [x] Normalizes known "page" URLs to raw URLs before fetching:
      `github.com/<o>/<r>/blob/<ref>/<path>` → `raw.githubusercontent.com/...`,
      GitLab `/-/blob/` → `/-/raw/`, Gist page → raw. Unit test per pattern.
- [x] Loading state shown while fetching; request is aborted when the user navigates away.
- [x] Distinct, actionable error messages for: network/CORS failure ("This site doesn't allow
      other websites to read its files. Try the raw link, or download the file and upload it."),
      404, non-text content type, file > 5 MB.
- [x] Error state offers **Retry** and **Upload instead**.
- [x] Recently opened URLs (last 10) are listed on the landing page, stored in `localStorage`,
      with a **Clear** button. Reads/writes wrapped in try/catch.
