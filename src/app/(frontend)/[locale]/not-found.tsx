'use client'

import { useI18n } from '@/i18n/client'
import { Link } from '@/i18n/Link'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <section className="content" style={{ padding: '96px 0', minHeight: '60vh' }}>
      <h1 style={{ font: 'var(--t-h1)', margin: 0 }}>{t.common.notFound}</h1>
      <p>
        <Link href="/" style={{ color: 'var(--c-accent-text)' }}>{t.common.toHome}</Link>
      </p>
    </section>
  )
}
