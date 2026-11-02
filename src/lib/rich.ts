import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

/** Rich text from the admin, rendered by components/shared/Prose. */
export type Rich = SerializedEditorState | null | undefined

/** Nodes that show something without any words: a linked document («Связь»), a picture, a line. */
const solid = new Set(['relationship', 'upload', 'horizontalrule', 'block'])

/** True when a rich text holds at least one non-empty word or a linked document or picture. */
export function hasText(r: Rich): r is SerializedEditorState {
  const walk = (n: unknown): boolean => {
    if (!n || typeof n !== 'object') return false
    const node = n as { type?: string; text?: string; children?: unknown[] }
    return solid.has(node.type ?? '') || (typeof node.text === 'string' && node.text.trim() !== '') || (node.children ?? []).some(walk)
  }
  return !!r && walk(r.root)
}
