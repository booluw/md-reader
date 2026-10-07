export interface BundleSkips {
  count: number
  tooLarge: string[]
  bundleLimit: string[]
}

export interface Bundle {
  id: string
  name: string
  createdAt: number
  files: Record<string, Blob>
  skipped: BundleSkips
}

export function createBundleId(): string {
  return crypto.randomUUID()
}