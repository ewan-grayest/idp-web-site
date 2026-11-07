import { describe, expect, it } from 'vitest'

import { Consents } from '@/collections/Consents'
import { Careers, LegalDocs, Lifestyle } from '@/collections/entries'
import { Issues } from '@/collections/Issues'
import { Leads } from '@/collections/Leads'
import { Media } from '@/collections/Media'
import { Partners } from '@/collections/Partners'
import { People } from '@/collections/People'
import { Press } from '@/collections/Press'
import { Projects } from '@/collections/Projects'
import { Tags } from '@/collections/Tags'
import { Users } from '@/collections/Users'
import { PageTexts } from '@/globals/PageTexts'
import { Studio } from '@/globals/Studio'

type Node = { label?: unknown; labels?: { singular?: unknown; plural?: unknown }; fields?: Node[]; tabs?: Node[] }

function labels(nodes: Node[], out: string[] = []): string[] {
  for (const n of nodes) {
    for (const l of [n.label, n.labels?.singular, n.labels?.plural]) {
      if (typeof l === 'string') out.push(l)
      else if (l && typeof l === 'object') out.push(...Object.values(l as Record<string, string>))
    }
    labels(n.fields ?? [], out)
    labels(n.tabs ?? [], out)
  }
  return out
}

describe('admin field names', () => {
  // Payload lists the fields that failed to save as one comma-separated line and splits it on every comma,
  // so a comma inside a field name breaks the list into nonsense (Ewan's project 12, 2026-10-26)
  it('have no commas', () => {
    const all = [Projects, People, Tags, Partners, Issues, Press, Lifestyle, Careers, LegalDocs, Leads, Consents, Media, Users, Studio, PageTexts]
    const bad = labels((all as unknown as Node[]).flatMap((c) => c.fields ?? [])).filter((l) => l.includes(','))
    expect(bad).toEqual([])
  })
})
