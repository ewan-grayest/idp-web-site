'use client'
/* The admin's own language (menus, buttons, field names), with a visible caption so it is found at a glance.
   Which language's texts are edited is the separate «Язык контента» switch. RU / EN / 中 on wide screens, a list on narrow ones */
import { Button, useTranslation } from '@payloadcms/ui'
import React from 'react'

import { localeCodes, localeNames, type Locale } from '@/i18n/locales'
import styles from './AdminActions.module.css'
import { useAdminLabel } from './useAdminLabel'

export function LanguageSwitch({ compact = true }: { compact?: boolean }) {
  const { i18n, languageOptions, switchLanguage } = useTranslation()
  const label = useAdminLabel()
  const languages = languageOptions.map((o) => o.value as Locale)
  const choose = (code: string) => code !== i18n.language && switchLanguage?.(code as Locale)

  return (
    <div className={`${styles.switch} ${compact ? styles.compact : ''}`} data-admin-languages>
      <span className={styles.caption} aria-hidden>
        {label('interface')}
      </span>
      <div role="group" aria-label={label('interfaceLanguage')} title={label('interfaceLanguage')} className={styles.languages}>
        {languages.map((code) => (
          <Button
            key={code}
            buttonStyle={code === i18n.language ? 'primary' : 'subtle'}
            size="small"
            margin={false}
            extraButtonProps={{ 'aria-pressed': code === i18n.language }}
            aria-label={`${label('interfaceLanguage')}: ${localeNames[code]}`}
            onClick={() => choose(code)}
          >
            {localeCodes[code]}
          </Button>
        ))}
      </div>
      <select
        className={styles.select}
        aria-label={label('interfaceLanguage')}
        title={label('interfaceLanguage')}
        value={i18n.language}
        onChange={(e) => choose(e.target.value)}
      >
        {languages.map((code) => (
          <option key={code} value={code}>
            {localeCodes[code]}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Login page: the same switch above the form, so the admin opens in the right language from the first screen. */
export function LoginLanguages() {
  return <LanguageSwitch compact={false} />
}
