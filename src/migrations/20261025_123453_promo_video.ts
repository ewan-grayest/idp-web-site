import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "studio" ADD COLUMN "promo_video_id" integer;
  ALTER TABLE "studio" ADD CONSTRAINT "studio_promo_video_id_media_id_fk" FOREIGN KEY ("promo_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "studio_promo_video_idx" ON "studio" USING btree ("promo_video_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "studio" DROP CONSTRAINT "studio_promo_video_id_media_id_fk";
  
  DROP INDEX "studio_promo_video_idx";
  ALTER TABLE "studio" DROP COLUMN "promo_video_id";`)
}
