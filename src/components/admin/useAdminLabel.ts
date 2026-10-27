import { useTranslation } from '@payloadcms/ui'

import { adminTranslations, type AdminKey } from './translations'

/** A label of the studio's own admin controls in the current admin language. */
export function useAdminLabel() {
  const { i18n } = useTranslation()
  const texts = adminTranslations[i18n.language as keyof typeof adminTranslations] ?? adminTranslations.en
  return (key: AdminKey) => texts[key]
}
