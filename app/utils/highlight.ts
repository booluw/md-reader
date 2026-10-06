type Hljs = typeof import('highlight.js/lib/common').default

let hljsPromise: Promise<Hljs> | undefined

export function highlightCodeBlocks(root: HTMLElement): Promise<void> {
  hljsPromise ??= import('highlight.js/lib/common').then((module) => module.default)
  return hljsPromise.then((hljs) => {
    const blocks = root.querySelectorAll<HTMLElement>('pre > code[class*="language-"]')
    for (const block of blocks) {
      if (block.classList.contains('hljs')) continue
      hljs.highlightElement(block)
    }
  })
}
