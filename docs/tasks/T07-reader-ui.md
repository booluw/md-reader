# T7 — Reader UI

**Depends on:** [T2](T02-markdown-rendering.md) (can run in parallel with T3–T6)
**Milestone:** M1 (basic), finished by M3

## Acceptance criteria

- [x] Layout: header (source + share + "open another"), document, optional table of contents
      from `headings` (sticky on desktop, collapsible on mobile).
- [x] Light/dark theme following `prefers-color-scheme` with a manual toggle (remembered in
      `localStorage`).
- [x] Readable typography: max line length ~75ch; tables scroll horizontally inside their own
      container, never the page.
- [x] Loading, empty and error states designed for every view (landing, reader, file tree).
- [x] Axe scan has zero serious/critical violations on landing and reader pages.
