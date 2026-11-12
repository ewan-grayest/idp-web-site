import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Names on the Home slides (Ewan, 2026-11-12): each project gets its «Показывать название на слайде главной» tick back,
 * on for every project, and «Настройки сайта и интеграции» → «Главная» gets the site-wide override that replaces the
 * «Главная» global. A site that had the old switch off keeps every name off («Скрывать на всех слайдах»); any other
 * looks the same as before («Как задано в каждом проекте», with every tick on). The site settings' tabs are layout only.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TYPE "public"."enum_site_settings_home_slide_names" AS ENUM('project', 'show', 'hide');
  ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "home_show_name" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "home_slide_names" "enum_site_settings_home_slide_names" DEFAULT 'project' NOT NULL;

  CREATE TABLE IF NOT EXISTS "home" ("id" serial PRIMARY KEY NOT NULL, "show_slide_names" boolean DEFAULT true);
  INSERT INTO "site_settings" ("updated_at", "created_at")
    SELECT now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM "site_settings") AND EXISTS (SELECT 1 FROM "home" WHERE "show_slide_names" = false);
  UPDATE "site_settings" SET "home_slide_names" = 'hide'
    WHERE EXISTS (SELECT 1 FROM "home" WHERE "show_slide_names" = false);
  DROP TABLE "home" CASCADE;`)
}

/** Back to the «Главная» switch: off only if names were hidden on every slide. The projects' ticks are lost. */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE "home" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"show_slide_names" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  INSERT INTO "home" ("show_slide_names", "updated_at", "created_at")
    SELECT false, now(), now() FROM "site_settings" WHERE "home_slide_names" = 'hide' LIMIT 1;

  ALTER TABLE "projects" DROP COLUMN "home_show_name";
  ALTER TABLE "site_settings" DROP COLUMN "home_slide_names";
  DROP TYPE "public"."enum_site_settings_home_slide_names";`)
}
