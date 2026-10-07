export interface FileTreeFolder {
  type: 'folder'
  name: string
  children: FileTreeEntry[]
}

export interface FileTreeFile {
  type: 'file'
  name: string
  path: string
}

export type FileTreeEntry = FileTreeFolder | FileTreeFile

function sortEntries(entries: FileTreeEntry[]): void {
  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  for (const entry of entries) {
    if (entry.type === 'folder') sortEntries(entry.children)
  }
}

export function buildFileTree(paths: string[]): FileTreeEntry[] {
  const root: FileTreeFolder = { type: 'folder', name: '', children: [] }
  const folders = new Map<string, FileTreeFolder>([['', root]])

  for (const raw of paths) {
    const segments = raw.split('/').filter(Boolean)
    if (segments.length === 0) continue
    let parent = root
    let prefix = ''
    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = segments[index] as string
      prefix = prefix === '' ? segment : `${prefix}/${segment}`
      let folder = folders.get(prefix)
      if (!folder) {
        folder = { type: 'folder', name: segment, children: [] }
        folders.set(prefix, folder)
        parent.children.push(folder)
      }
      parent = folder
    }
    parent.children.push({ type: 'file', name: segments.at(-1) as string, path: raw })
  }

  sortEntries(root.children)
  return root.children
}
