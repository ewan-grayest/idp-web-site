/**
 * Where the site keeps its files. The layout is the same in every setup ("Data locations" in CLAUDE.md):
 * a data folder holding media/ (uploads), backup/ (backups) and db/ (the database container's files).
 *
 * In the containers the folder is /data, and the image and compose files set MEDIA_DIR and BACKUPS_DIR to
 * /data/media and /data/backup. `npm run dev` leaves them empty and uses DATA_DIR (default ./data), the same
 * folder `docker compose` mounts in the local environment, so both see the same uploads.
 */
export function dataDirs(env: Record<string, string | undefined> = process.env) {
  const root = (env.DATA_DIR || 'data').replace(/\/+$/, '') || '/'
  const sub = (name: string) => (root === '/' ? `/${name}` : `${root}/${name}`)
  return {
    media: env.MEDIA_DIR || sub('media'),
    backup: env.BACKUPS_DIR || sub('backup'),
  }
}
