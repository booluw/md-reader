# T6 — Link & image resolution between Markdown files

**Depends on:** [T3](T03-open-by-url.md), [T5](T05-local-persistence.md)
**Milestone:** M3 — Linked reading

The core feature: links between `.md` files open **inside the reader**.

## Acceptance criteria

- [ ] Relative and absolute links are resolved against the current source with `new URL()`
      (URL mode) or POSIX path join (local mode). Unit tests: `./a.md`, `../b.md`, `sub/c.md`,
      `/root.md`, `a.md#section`, `a.md?x=1`, encoded spaces.
- [ ] Links whose path ends in `.md`/`.markdown` are rewritten to in-app routes
      (`/read?src=...` or `/read?local=...&path=...`) and navigate client-side; the `#fragment`
      is preserved and scrolled to after render.
- [ ] `.mdx` links are treated as ordinary external links (not opened in the reader).
- [ ] Browser back/forward moves between previously viewed documents and restores scroll.
- [ ] Non-Markdown links open in a new tab with `rel="noopener noreferrer"` and an external
      link indicator.
- [ ] Relative images resolve the same way; in local mode they are served from the bundle via
      `URL.createObjectURL` and revoked when the document changes (no leak across 20
      navigations, checked in a test).
- [ ] A local link to a file missing from the bundle renders with a "not in upload" tooltip
      and, on click, an inline message. No crash.
- [ ] A URL-mode link to a GitHub page URL of another `.md` is normalized via
      [T3](T03-open-by-url.md).
- [ ] Breadcrumb shows the current file path; local bundles get a collapsible file tree
      sidebar.

## Playwright

Open a 3-file fixture via URL and via folder upload; click A→B→C, go back twice, land on A at
the previous scroll position.
