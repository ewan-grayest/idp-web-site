import { notFound } from 'next/navigation'

import { getT } from '@/i18n/server'
import { pages, sectionPage } from '@/lib/routes'

/**
 * Temporary stand-in for the page roles not built yet (3–17), so the header title,
 * footer links and enquiry can be tried on every permalink. Each role replaces this
 * with its own route as it is built.
 */
export default async function ComingSoon({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const path = '/' + slug.join('/')
  const known = Object.values(pages).some((p) => p.path !== '/' && (path === p.path || path.startsWith(p.path + '/')))
  if (!known) notFound()
  const t = await getT()
  const page = sectionPage(path)

  return (
    <section className="content" style={{ padding: '96px 0', minHeight: '60vh' }}>
      <h1 style={{ font: 'var(--t-h1)', margin: 0 }}>{page ? t.pages[page] : ''}</h1>
      <p style={{ color: 'var(--c-muted)' }}>{t.common.inProgress}</p>
    </section>
  )
}
