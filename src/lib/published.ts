import type { Where } from 'payload'

/**
 * Projects visitors may read: «Публиковать на сайте» on (Ewan, 2026-11-05). A missing value counts as on, as the
 * field defaults to it. Signed-in staff read every project; see the access rule in collections/Projects.ts.
 */
export const publishedOnly: Where = { publishOnSite: { not_equals: false } }

/**
 * Local API reads for the public site run with the visitor's access, not the server's full access, so an unpublished
 * project is left out of every list and link exactly as on the public API: a relation to one comes back as a bare id,
 * which the helpers in src/lib already skip.
 */
export const asVisitor = { overrideAccess: false } as const
