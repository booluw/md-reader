# md-reader — Tasks

Context and decisions (D1–D7): [README.md](README.md). Each task has its own file in
[tasks/](tasks/), ordered by dependency. A task is done only when its acceptance criteria pass
**and** the Definition of Done below holds.

## Definition of Done (all tasks)

- `nuxt generate` succeeds; the output runs from a plain static server with no Node runtime.
- No network request sends document content anywhere (verify in DevTools Network tab).
- Changed behavior has a test (Vitest for logic, Playwright for the flows named in tasks).
- Keyboard-usable, visible focus, labelled inputs, errors announced (`aria-live`).
- Works in the latest Chrome, Firefox and Safari, and at 360 px width.

## Tasks

| # | Task | Depends on |
|---|------|------------|
| T1 | [Project scaffold & static build](tasks/T01-scaffold-and-static-build.md) | — |
| T2 | [Markdown rendering core](tasks/T02-markdown-rendering.md) | T1 |
| T3 | [Open by URL](tasks/T03-open-by-url.md) | T2 |
| T4 | [Open by upload](tasks/T04-open-by-upload.md) | T2 |
| T5 | [Local persistence (IndexedDB)](tasks/T05-local-persistence.md) | T4 |
| T6 | [Link & image resolution](tasks/T06-link-and-image-resolution.md) | T3, T5 |
| T7 | [Reader UI](tasks/T07-reader-ui.md) | T2 |
| T8 | [Shareable links](tasks/T08-shareable-links.md) | T3, T6 |
| T10 | [Security hardening](tasks/T10-security-hardening.md) | T2, T6 |
| T11 | [Deploy to Coolify](tasks/T11-deploy-coolify.md) | T1–T8, T10 |

## Milestones

| Milestone | Tasks | Outcome |
|-----------|-------|---------|
| M1 — Read a URL | T1, T2, T3, T7 (basic) | Paste link → rendered Markdown |
| M2 — Read local files | T4, T5 | Upload file/folder, survives refresh |
| M3 — Linked reading | T6, T10 | In-app navigation across `.md` files, safe |
| M4 — Share & ship | T8, T11 | Shareable links, deployed on Coolify |

## Decided

- `.mdx` is rejected (URL input, upload, and not opened in-app from links).
- Hosting: the existing Coolify setup, per `The Contabo PaaS Book` chapters 09 and 12, at
  `reader.myshort.page`.
- No sharing of uploaded files in v1 (former T9 dropped). Share links work for URL sources only.
