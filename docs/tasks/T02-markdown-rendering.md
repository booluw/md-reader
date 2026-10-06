# T2 — Markdown rendering core

**Depends on:** [T1](T01-scaffold-and-static-build.md)
**Milestone:** M1 — Read a URL

A pure `render(markdown, source) → { html, title, headings }` module plus a `<MarkdownView>`
component.

## Acceptance criteria

- [x] Supports CommonMark + GFM: tables, task lists, strikethrough, autolinks, fenced code.
- [x] Code blocks are syntax-highlighted (lazy-loaded highlighter; does not block first render).
- [x] Output is sanitized with DOMPurify: `<script>`, inline event handlers (`onerror` etc.),
      `javascript:`/`vbscript:`/`data:` (non-image) URLs are removed. Unit tests cover each.
- [x] Headings get stable slug IDs; `#heading` links scroll to them.
- [x] Title = first `# H1`, else filename.
- [x] Renders a 1 MB file in under 500 ms on a mid-range laptop (measured, recorded in the PR).
- [x] Empty file shows "This file is empty", not a blank page.
