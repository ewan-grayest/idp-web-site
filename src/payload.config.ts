import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { ru } from '@payloadcms/translations/languages/ru'
import { zh } from '@payloadcms/translations/languages/zh'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Projects } from './collections/Projects'
import { People } from './collections/People'
import { Leads } from './collections/Leads'
import { Tags } from './collections/Tags'
import { Partners } from './collections/Partners'
import { Issues } from './collections/Issues'
import { Press } from './collections/Press'
import { Careers, LegalDocs, Lifestyle } from './collections/entries'
import { Studio } from './globals/Studio'
import { PageTexts } from './globals/PageTexts'
import { SiteSettings } from './globals/SiteSettings'
import { SocialPosts } from './collections/SocialPosts'
import { Reviews } from './collections/Reviews'
import { Consents } from './collections/Consents'
import { defaultLocale, locales } from './i18n/locales'
import { tr } from './collections/labels'
import { migrations } from './migrations'
import { backupEndpoints } from './endpoints/backups'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const contentLanguageNames = {
  ru: tr('Русский', 'Russian', '俄语'),
  en: tr('Английский', 'English', '英语'),
  zh: tr('Китайский', 'Chinese', '中文'),
}

export default buildConfig({
  // Versioned API so a client personal area can be added later without breaking URLs
  routes: { api: '/api/v1', admin: '/admin', graphQL: '/graphql' },
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · ID project' },
    // Built-in initials avatar: Gravatar is a foreign service and often unreachable from Russia
    avatar: 'default',
    // «25 октября 2026, 11:39» instead of the default «октября 25-е 2026, 11:39 ДП»
    dateFormat: 'd MMMM yyyy, HH:mm',
    components: {
      // "Open site" and a labelled "Log out" in the header, visible even with the side menu collapsed
      actions: ['/components/admin/AdminActions#AdminActions'],
      // Interface language switch on the login page, and a note on the two language switches on the dashboard
      beforeLogin: ['/components/admin/LanguageSwitch#LoginLanguages'],
      beforeDashboard: ['/components/admin/AdminGuide#AdminGuide'],
      // «Резервные копии»: make, download, upload, check and restore full backups (database and media)
      afterNavLinks: ['/components/admin/backups/BackupsNavLink#BackupsNavLink'],
      views: {
        backups: { Component: '/components/admin/backups/BackupsView#BackupsView', path: '/backups', exact: true },
      },
    },
  },
  // Admin side menu order: projects and team, then each page's section, then enquiries, files and users
  collections: [Projects, People, Tags, Partners, Issues, Press, Lifestyle, Careers, LegalDocs, SocialPosts, Reviews, Leads, Consents, Media, Users],
  globals: [Studio, PageTexts, SiteSettings],
  // /api/v1/backups: see src/endpoints/backups.ts
  endpoints: backupEndpoints,
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI || '' },
    // Dev pushes schema changes automatically; production applies these on start
    prodMigrations: migrations,
  }),
  sharp,
  // Site content languages: fields marked `localized` get a language switch in the admin;
  // a text not yet translated shows in Russian on the site
  localization: {
    // Names follow the interface language: «Русский», "Russian", «俄语»
    locales: locales.map((code) => ({ code, label: contentLanguageNames[code] })),
    defaultLocale,
    fallback: true,
  },
  // Admin interface languages: RU / EN / 中 in the admin header, on the login page or the account page; Russian by default.
  // Payload calls the content language switch «Локаль»; it is renamed so the two switches are told apart
  i18n: {
    fallbackLanguage: 'ru',
    supportedLanguages: { ru, en, zh },
    translations: {
      ru: { general: { locale: 'Язык контента' } },
      en: { general: { locale: 'Content language' } },
      zh: { general: { locale: '内容语言' } },
    },
  },
})
