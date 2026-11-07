'use client'
import { useTranslation } from '@payloadcms/ui'

import { type DiagnosticsTexts, diagnosticsTexts } from './texts'

/** The «Диагностика» page's texts in the current admin language */
export function useDiagnosticsTexts(): DiagnosticsTexts {
  const { i18n } = useTranslation()
  return (diagnosticsTexts as Record<string, DiagnosticsTexts>)[i18n.language] ?? diagnosticsTexts.en
}
