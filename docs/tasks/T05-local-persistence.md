# T5 — Local persistence (IndexedDB)

**Depends on:** [T4](T04-open-by-upload.md)
**Milestone:** M2 — Read local files

Bundles persist on the user's device so a refresh or later visit still works.

## Acceptance criteria

- [ ] Bundles are stored in IndexedDB (thin wrapper, e.g. `idb-keyval`).
- [ ] Refreshing `/read?local=...` reopens the same file.
- [ ] Landing page lists saved bundles (name, file count, size, date) with **Open** and
      **Delete**; **Delete all** asks for confirmation.
- [ ] App calls `navigator.storage.persist()` on first upload; if denied, shows a one-line
      notice that the browser may clear local files.
- [ ] Opening a `local=` link whose bundle doesn't exist (evicted, other device, shared by
      someone else) shows: "This file was uploaded on another device or has been cleared. Ask
      for a web link, or upload it again." Never a blank page.
- [ ] Private browsing / IndexedDB unavailable: upload still works for the session (in memory)
      and the user is told it won't be saved.
