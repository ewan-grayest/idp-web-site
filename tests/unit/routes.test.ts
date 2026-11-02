import { describe, expect, it } from 'vitest'

import { dictionaries } from '@/i18n/dictionaries'
import { headerVisible, pages, projectPath, sectionPage } from '@/lib/routes'

describe('page roles', () => {
  it('covers all 17 spec pages', () => {
    expect(Object.keys(pages)).toHaveLength(17)
  })

  it('hides header 0.1 on Home and Promo only', () => {
    expect(headerVisible('/')).toBe(false)
    expect(headerVisible('/promo')).toBe(false)
    expect(headerVisible('/studio')).toBe(true)
    expect(headerVisible('/projects/public/fabrika')).toBe(true)
  })

  it('takes header title 0.1.2 from the section', () => {
    const title = (path: string) => {
      const id = sectionPage(path)
      return id ? dictionaries.ru.pages[id] : ''
    }
    expect(title('/studio')).toBe('Наша команда')
    expect(title('/projects/residential/loft')).toBe('Жилые интерьеры')
    expect(title('/payment')).toBe('Способы оплаты')
    expect(title('/nowhere')).toBe('')
    expect(dictionaries.en.pages[sectionPage('/payment')!]).toBe('Payment options')
  })

  it('builds stable project permalinks', () => {
    expect(projectPath('public', 'fabrika')).toBe('/projects/public/fabrika')
    expect(projectPath('archive', 'old')).toBe('/projects/archive/old')
  })
})
