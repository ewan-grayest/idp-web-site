import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Ewan, 2026-11-05:
// - archive projects become product design (shown under ID Lab): the enum value is renamed in place, so every
//   archive project changes kind with it and nothing is lost;
// - «Публиковать на сайте» on every project, on for the existing ones;
// - «Показывать название на слайде главной» moves from each project to one switch in the new «Главная» global.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_projects_kind" RENAME VALUE 'archive' TO 'product';
  CREATE TABLE "home" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"show_slide_names" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );

  ALTER TABLE "projects" ADD COLUMN "publish_on_site" boolean DEFAULT true;
  ALTER TABLE "projects" DROP COLUMN "home_show_name";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_projects_kind" RENAME VALUE 'product' TO 'archive';
  DROP TABLE "home" CASCADE;
  ALTER TABLE "projects" ADD COLUMN "home_show_name" boolean DEFAULT true;
  ALTER TABLE "projects" DROP COLUMN "publish_on_site";`)
}
