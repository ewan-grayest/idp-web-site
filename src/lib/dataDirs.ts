/**
 * Where the site keeps its files ("Data locations" in CLAUDE.md). In every container they are /data/media and
 * /data/backup, persistent Docker volumes; the image and compose files set MEDIA_DIR and BACKUPS_DIR to them.
 * `npm run dev` runs outside Docker and can't open the volumes, so it leaves both empty and uses media/ and
 * backups/ in the site folder.
 */
export function dataDirs(env: Record<string, string | undefined> = process.env) {
  return {
    media: env.MEDIA_DIR || 'media',
    backup: env.BACKUPS_DIR || 'backups',
  }
}
