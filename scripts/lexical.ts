/**
 * Plain text to the admin's rich text (Lexical), for scripts that fill in pages.
 * Blocks are separated by a blank line: "## " and "### " start headings, "- " lines make a list,
 * "1. " lines a numbered list, anything else is a paragraph.
 */
const text = (t: string) => ({ type: 'text', text: t, format: 0, style: '', mode: 'normal', detail: 0, version: 1 })
const block = { direction: 'ltr', format: '', indent: 0, version: 1 }

export function toLexical(source: string) {
  const children = source
    .trim()
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .map((b) => {
      const h = b.match(/^(#{2,3}) (.+)$/s)
      // The page has its h1 and the entry or partner name its h2, so text headings start at h3
      if (h) return { ...block, type: 'heading', tag: h[1].length === 2 ? 'h3' : 'h4', children: [text(h[2].trim())] }
      const lines = b.split('\n').map((l) => l.trim())
      const numbered = lines.every((l) => /^\d+\. /.test(l))
      if (numbered || lines.every((l) => l.startsWith('- '))) {
        return {
          ...block,
          type: 'list',
          listType: numbered ? 'number' : 'bullet',
          tag: numbered ? 'ol' : 'ul',
          start: 1,
          children: lines.map((l, k) => ({ ...block, type: 'listitem', value: k + 1, children: [text(l.replace(/^(- |\d+\. )/, ''))] })),
        }
      }
      return { ...block, type: 'paragraph', textFormat: 0, textStyle: '', children: [text(lines.join(' '))] }
    })
  return { root: { ...block, type: 'root', children } }
}
