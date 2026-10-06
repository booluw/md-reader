# T8 — Shareable links (URL sources)

**Depends on:** [T3](T03-open-by-url.md), [T6](T06-link-and-image-resolution.md)
**Milestone:** M4 — Share & ship

## Acceptance criteria

- [ ] **Share** copies the current reader URL (`/read?src=...#heading` if a heading is in view)
      to the clipboard and confirms with a toast; uses `navigator.share` on mobile and falls
      back to a selectable text field if the clipboard API fails.
- [ ] Opening a shared link in a fresh browser renders the same document and scrolls to the
      heading.
- [ ] For local sources, Share is disabled with a tooltip explaining local files can't be
      shared by link: "Uploaded files stay on your device,
      so they can't be shared. Share a web link to the file instead."
