import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Products on photos (5.1.3) may be saved half-filled (Ewan's project 12, 2026-10-26)
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects_gallery_hotspots" ALTER COLUMN "partner_id" DROP NOT NULL;
  ALTER TABLE "projects_gallery_hotspots" ALTER COLUMN "x" DROP NOT NULL;
  ALTER TABLE "projects_gallery_hotspots" ALTER COLUMN "y" DROP NOT NULL;
  ALTER TABLE "projects_concept_photos_hotspots" ALTER COLUMN "partner_id" DROP NOT NULL;
  ALTER TABLE "projects_concept_photos_hotspots" ALTER COLUMN "x" DROP NOT NULL;
  ALTER TABLE "projects_concept_photos_hotspots" ALTER COLUMN "y" DROP NOT NULL;
  ALTER TABLE "projects_preview_photos_hotspots" ALTER COLUMN "partner_id" DROP NOT NULL;
  ALTER TABLE "projects_preview_photos_hotspots" ALTER COLUMN "x" DROP NOT NULL;
  ALTER TABLE "projects_preview_photos_hotspots" ALTER COLUMN "y" DROP NOT NULL;
  ALTER TABLE "projects_process_photos_hotspots" ALTER COLUMN "partner_id" DROP NOT NULL;
  ALTER TABLE "projects_process_photos_hotspots" ALTER COLUMN "x" DROP NOT NULL;
  ALTER TABLE "projects_process_photos_hotspots" ALTER COLUMN "y" DROP NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Products saved without a partner or position cannot go back under NOT NULL; they were not shown on the site anyway
  await db.execute(sql`
   DELETE FROM "projects_gallery_hotspots" WHERE "partner_id" IS NULL OR "x" IS NULL OR "y" IS NULL;
  DELETE FROM "projects_concept_photos_hotspots" WHERE "partner_id" IS NULL OR "x" IS NULL OR "y" IS NULL;
  DELETE FROM "projects_preview_photos_hotspots" WHERE "partner_id" IS NULL OR "x" IS NULL OR "y" IS NULL;
  DELETE FROM "projects_process_photos_hotspots" WHERE "partner_id" IS NULL OR "x" IS NULL OR "y" IS NULL;
   ALTER TABLE "projects_gallery_hotspots" ALTER COLUMN "partner_id" SET NOT NULL;
  ALTER TABLE "projects_gallery_hotspots" ALTER COLUMN "x" SET NOT NULL;
  ALTER TABLE "projects_gallery_hotspots" ALTER COLUMN "y" SET NOT NULL;
  ALTER TABLE "projects_concept_photos_hotspots" ALTER COLUMN "partner_id" SET NOT NULL;
  ALTER TABLE "projects_concept_photos_hotspots" ALTER COLUMN "x" SET NOT NULL;
  ALTER TABLE "projects_concept_photos_hotspots" ALTER COLUMN "y" SET NOT NULL;
  ALTER TABLE "projects_preview_photos_hotspots" ALTER COLUMN "partner_id" SET NOT NULL;
  ALTER TABLE "projects_preview_photos_hotspots" ALTER COLUMN "x" SET NOT NULL;
  ALTER TABLE "projects_preview_photos_hotspots" ALTER COLUMN "y" SET NOT NULL;
  ALTER TABLE "projects_process_photos_hotspots" ALTER COLUMN "partner_id" SET NOT NULL;
  ALTER TABLE "projects_process_photos_hotspots" ALTER COLUMN "x" SET NOT NULL;
  ALTER TABLE "projects_process_photos_hotspots" ALTER COLUMN "y" SET NOT NULL;`)
}
