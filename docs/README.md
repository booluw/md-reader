# md-reader — Product & Technical Brief

A static Nuxt site that renders Markdown files from a **URL** or a **local upload**, follows
links between `.md` files inside the app, and produces shareable links. **No server-side
code, no uploads to any server.**

Tasks: [tasks.md](tasks.md) (index), one file per task in [tasks/](tasks/)

## Goals

1. Paste a direct link to a `.md` file → read it rendered.
2. Upload a `.md` file (or a folder of them) → read it rendered, file never leaves the device.
3. Links between `.md` files open inside the reader (with working back/forward), not as raw text.
4. Share a link that reopens the same document for someone else.

## Non-goals

- Accounts, server storage, server-side fetching/proxying, analytics on document content.
- Editing Markdown.
- `.mdx` files (rejected everywhere).
- Sharing locally-uploaded files with other people. They live only on the uploader's device.

## Architecture decisions

| # | Decision | Why |
|---|----------|-----|
| D1 | Nuxt with `ssr: false` and `nuxt generate` → pure static output, served by nginx in a container on Coolify (T11). | "No server-side ish." No Nitro runtime, no API routes. |
| D2 | All fetching happens in the browser with `fetch()`. No proxy. | A proxy is a server. Consequence: hosts without CORS headers fail; we show a clear error (T3). GitHub raw, Gist raw, GitLab raw and most CDNs send CORS headers. |
| D3 | Uploaded files are read with the File API and persisted in **IndexedDB** on the user's device. | Requirement allows local storage; IndexedDB handles large text and folders, `localStorage` (~5 MB, strings only) does not. |
| D4 | Folder upload (`<input webkitdirectory>` + drag-and-drop of folders) is supported. | Without the sibling files, relative links in an uploaded file cannot resolve. |
| D5 | One document identity: a **source** = `{ kind: 'url', href }` or `{ kind: 'local', bundleId, path }`. Relative links resolve against the current source. | Same link/image logic for both modes. |
| D6 | Reader state lives in the URL query (`/read?src=<url>` or `/read?local=<bundleId>&path=<path>`). | Gives back/forward and shareable links for free. |
| D7 | Markdown → HTML via `markdown-it` (GFM tables, task lists) then sanitized with `DOMPurify`. | Rendering untrusted third-party content in our origin; sanitization is mandatory. |

## Key risks

- **CORS**: many URLs will be unfetchable client-side. Mitigated by GitHub/GitLab/Gist URL
  normalization (T3) and an honest error message, not a proxy.
- **XSS**: untrusted Markdown may contain HTML/scripts. Mitigated by D7 + CSP (T10).
- **Storage eviction**: browsers can evict IndexedDB. Request persistent storage and tell the
  user local files may be cleared (T5).
