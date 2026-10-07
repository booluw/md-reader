<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>

<style>
.md-external::after {
  content: ' ↗';
  font-size: 0.85em;
}

.breadcrumb {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin: 0 0 1rem;
  padding: 0;
  list-style: none;
  font-size: 0.9rem;
  color: #555;
}

.breadcrumb li + li::before {
  content: '/';
  margin-right: 0.25rem;
  color: #999;
}

.reader-layout {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.reader-sidebar {
  flex: 0 0 16rem;
  position: sticky;
  top: 1rem;
  max-height: calc(100vh - 2rem);
  overflow: auto;
}

.file-tree {
  margin: 0;
  padding-left: 1rem;
  list-style: none;
}

.file-tree .file-tree {
  padding-left: 1rem;
}
</style>
