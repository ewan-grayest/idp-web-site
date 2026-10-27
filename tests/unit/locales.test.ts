import { describe, expect, it } from 'vitest'

import { dictionaries } from '@/i18n/dictionaries'
import { browserLocale, localePath, locales, splitLocale } from '@/i18n/locales'

describe('language addresses', () => {
  it('keeps Russian unprefixed and prefixes the others', () => {
    expect(localePath('ru', '/studio#team')).toBe('/studio#team')
    expect(localePath('en', '/studio#team')).toBe('/en/studio#team')
    expect(localePath('zh', '/')).toBe('/zh')
    expect(localePath('en', '/?x=1')).toBe('/en?x=1')
    expect(localePath('en', '/projects/public?tags=loft')).toBe('/en/projects/public?tags=loft')
  })

  it('leaves admin, API, hash and external links alone', () => {
    expect(localePath('en', '/admin')).toBe('/admin')
    expect(localePath('en', '/api/v1/leads')).toBe('/api/v1/leads')
    expect(localePath('en', '#team')).toBe('#team')
    expect(localePath('en', 'https://vk.com/')).toBe('https://vk.com/')
    expect(localePath('en', '//cdn.example.com/x')).toBe('//cdn.example.com/x')
  })

  it('splits the language off an address', () => {
    expect(splitLocale('/en/studio')).toEqual({ locale: 'en', path: '/studio' })
    expect(splitLocale('/zh')).toEqual({ locale: 'zh', path: '/' })
    expect(splitLocale('/studio')).toEqual({ locale: 'ru', path: '/studio' })
    expect(splitLocale('/')).toEqual({ locale: 'ru', path: '/' })
    expect(splitLocale('/english')).toEqual({ locale: 'ru', path: '/english' })
  })

  it('has every text in every language', () => {
    const keys = (o: object, prefix = ''): string[] =>
      Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]))
    const ru = keys(dictionaries.ru).sort()
    for (const l of locales) expect(keys(dictionaries[l]).sort(), l).toEqual(ru)
  })
})

describe('browserLocale', () => {
  it('follows the browser: Russian, Chinese, otherwise English', () => {
    expect(browserLocale('ru-RU,ru;q=0.9,en;q=0.8')).toBe('ru')
    expect(browserLocale('zh-CN,zh;q=0.9')).toBe('zh')
    expect(browserLocale('zh-TW')).toBe('zh')
    expect(browserLocale('en-GB,en;q=0.9')).toBe('en')
    expect(browserLocale('de-DE,fr;q=0.8')).toBe('en')
  })
  it('takes the most preferred site language in the visitor order', () => {
    expect(browserLocale('de-DE,ru;q=0.8,en;q=0.5')).toBe('ru')
    expect(browserLocale('en;q=0.5,zh;q=0.9')).toBe('zh')
    expect(browserLocale('ru;q=0,en')).toBe('en')
  })
  it('keeps Russian when the browser says nothing (search engines, scripts)', () => {
    expect(browserLocale(null)).toBe('ru')
    expect(browserLocale('')).toBe('ru')
  })
})
