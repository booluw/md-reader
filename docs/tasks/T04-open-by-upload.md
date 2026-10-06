# T4 — Open by upload (single file & folder)

**Depends on:** [T2](T02-markdown-rendering.md)
**Milestone:** M2 — Read local files

File picker, folder picker and drag-and-drop on the landing page. Files are read locally with
the File API.

## Acceptance criteria

- [ ] Accepts `.md` and `.markdown` files and folders. `.mdx` is rejected with "Only .md and
      .markdown files are supported." In a folder, `.mdx` and other non-image files are skipped
      silently except for a count ("12 files skipped"); images are kept for
      [T6](T06-link-and-image-resolution.md).
- [ ] Uploading creates a **bundle** `{ id, name, createdAt, files: { [path]: Blob } }` and
      opens `/read?local=<id>&path=<entry>`. Entry = the chosen file, else `README.md`/
      `index.md` at the root, else a file list.
- [ ] DevTools Network tab shows **zero** requests carrying file data during and after upload.
- [ ] Per-file limit 5 MB, per-bundle limit 50 MB; over-limit shows which files were skipped.
- [ ] Drag-and-drop has a visible drop zone and a keyboard-accessible button equivalent.
