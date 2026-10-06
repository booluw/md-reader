# T2 — Markdown rendering core

**Depends on:** [T1](T01-scaffold-and-static-build.md)
**Milestone:** M1 — Read a URL

A pure `render(markdown, source) → { html, title, headings }` module plus a `<MarkdownView>`
component.

## Acceptance criteria

- [ ] Supports CommonMark + GFM: tables, task lists, strikethrough, autolinks, fenced code.
- [ ] Code blocks are syntax-highlighted (lazy-loaded highlighter; does not block first render).
- [ ] Output is sanitized with DOMPurify: `<script>`, inline event handlers (`onerror` etc.),
      `javascript:`/`vbscript:`/`data:` (non-image) URLs are removed. Unit tests cover each.
- [ ] Headings get stable slug IDs; `#heading` links scroll to them.
- [ ] Title = first `# H1`, else filename.
- [ ] Renders a 1 MB file in under 500 ms on a mid-range laptop (measured, recorded in the PR).
- [ ] Empty file shows "This file is empty", not a blank page.
