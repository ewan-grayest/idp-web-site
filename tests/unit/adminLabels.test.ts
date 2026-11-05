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

type Node = {
  label?: unknown
  labels?: { singular?: unknown; plural?: unknown }
  admin?: { description?: unknown }
  options?: unknown[]
  fields?: Node[]
  tabs?: Node[]
}

const texts = (l: unknown): string[] =>
  typeof l === 'string' ? [l] : l && typeof l === 'object' ? Object.values(l as Record<string, unknown>).filter((v) => typeof v === 'string') : []

function labels(nodes: Node[], out: string[] = []): string[] {
  for (const n of nodes) {
    for (const l of [n.label, n.labels?.singular, n.labels?.plural]) out.push(...texts(l))
    labels(n.fields ?? [], out)
    labels(n.tabs ?? [], out)
  }
  return out
}

/** Every piece of admin text: names, hints and choices, of the collections and globals themselves too. */
function adminText(nodes: Node[], out: string[] = []): string[] {
  for (const n of nodes) {
    for (const l of [n.label, n.labels?.singular, n.labels?.plural, n.admin?.description]) out.push(...texts(l))
    for (const o of n.options ?? []) if (o && typeof o === 'object') out.push(...texts((o as { label?: unknown }).label))
    adminText(n.fields ?? [], out)
    adminText(n.tabs ?? [], out)
  }
  return out
}

const all = [Projects, People, Tags, Partners, Issues, Press, Lifestyle, Careers, LegalDocs, Leads, Consents, Media, Users, Studio, PageTexts] as unknown as Node[]

describe('admin field names', () => {
  // Payload lists the fields that failed to save as one comma-separated line and splits it on every comma,
  // so a comma inside a field name breaks the list into nonsense (Ewan's project 12, 2026-10-26)
  it('have no commas', () => {
    const bad = labels(all.flatMap((c) => c.fields ?? [])).filter((l) => l.includes(','))
    expect(bad).toEqual([])
  })

  // Editors see plain names, no spec numbers such as «(1.2 / 1.3)» or «(4)» (Ewan, 2026-11-05)
  it('carry no spec numbers', () => {
    const bad = adminText(all).filter((l) => /\d+\.\d+|\(\d+\)/.test(l))
    expect(bad).toEqual([])
  })
})
