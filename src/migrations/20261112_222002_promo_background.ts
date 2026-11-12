import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_studio_promo_background" AS ENUM('frame', 'image');
  ALTER TABLE "studio" ADD COLUMN "promo_background" "enum_studio_promo_background" DEFAULT 'frame';
  ALTER TABLE "studio" ADD COLUMN "promo_background_image_id" integer;
  ALTER TABLE "studio" ADD CONSTRAINT "studio_promo_background_image_id_media_id_fk" FOREIGN KEY ("promo_background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "studio_promo_background_image_idx" ON "studio" USING btree ("promo_background_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "studio" DROP CONSTRAINT "studio_promo_background_image_id_media_id_fk";
  
  DROP INDEX "studio_promo_background_image_idx";
  ALTER TABLE "studio" DROP COLUMN "promo_background";
  ALTER TABLE "studio" DROP COLUMN "promo_background_image_id";
  DROP TYPE "public"."enum_studio_promo_background";`)
}
