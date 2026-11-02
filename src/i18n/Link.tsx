'use client'

import NextLink from 'next/link'
import type { ComponentProps } from 'react'

import { useI18n } from './client'

/**
 * next/link that keeps the visitor in their language: internal paths get the language prefix.
 * Pages and data helpers keep building plain paths ("/studio#team"); only links rendered here change.
 */
export function Link({ href, ...rest }: Omit<ComponentProps<typeof NextLink>, 'href'> & { href: string }) {
  const { href: localize } = useI18n()
  return <NextLink href={localize(href)} {...rest} />
}
