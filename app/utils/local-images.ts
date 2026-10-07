export function hydrateLocalImages(
  root: ParentNode,
  files: Record<string, Blob>
): string[] {
  const urls: string[] = []
  const images = root.querySelectorAll<HTMLImageElement>('img[data-md-local-src]')
  for (const image of images) {
    const path = image.dataset.mdLocalSrc ?? ''
    const blob = files[path]
    if (!blob) {
      image.setAttribute('data-md-missing', path)
      continue
    }
    const url = URL.createObjectURL(blob)
    image.src = url
    image.dataset.mdObjectUrl = url
    urls.push(url)
  }
  return urls
}

export function revokeLocalImages(urls: string[]): void {
  for (const url of urls) URL.revokeObjectURL(url)
}
