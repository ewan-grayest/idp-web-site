import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "studio" ADD COLUMN "intro_on_first_visit" boolean DEFAULT true;
  ALTER TABLE "studio" ADD COLUMN "promo_autoplay" boolean DEFAULT true;
  ALTER TABLE "studio" ADD COLUMN "promo_sound" boolean DEFAULT true;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "studio" DROP COLUMN "intro_on_first_visit";
  ALTER TABLE "studio" DROP COLUMN "promo_autoplay";
  ALTER TABLE "studio" DROP COLUMN "promo_sound";`)
}
