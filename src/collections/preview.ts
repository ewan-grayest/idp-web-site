import { localePath, type Locale } from '../i18n/locales'
import { pages, personPath, projectPath, type ProjectKind } from '../lib/routes'

type Doc = Record<string, unknown>
type Args = { locale?: string }

/** «Предпросмотр» in the admin: the page where this document shows on the site, in the content language being edited. */
const at = (path: string, { locale }: Args) => localePath((locale ?? 'ru') as Locale, path)

export const previewProject = (d: Doc, a: Args) => (d.slug && d.kind ? at(projectPath(d.kind as ProjectKind, String(d.slug)), a) : null)
export const previewPerson = (d: Doc, a: Args) => (d.slug ? at(personPath(String(d.slug)), a) : null)
export const previewPartner = (d: Doc, a: Args) => (d.slug ? at(`${pages[6].path}#${d.slug}`, a) : null)
export const previewTeamPage = (_d: Doc, a: Args) => at(pages[3].path, a)
