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

const bundles = new Map<string, Bundle>()

export function registerBundle(bundle: Bundle): void {
  bundles.set(bundle.id, bundle)
}

export function getBundle(id: string): Bundle | undefined {
  return bundles.get(id)
}

export function createBundleId(): string {
  return crypto.randomUUID()
}

export function resetBundles(): void {
  bundles.clear()
}