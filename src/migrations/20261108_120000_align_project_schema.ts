import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Brings every database to the one schema after main and master were joined (Ewan, 2026-11-08). No schema change of
 * its own: the snapshot beside this file is the joined schema, product design and «Публиковать на сайте» included.
 *
 * Which databases exist and what they need:
 * - Made from main: 20261105_225500_product_design_publish runs before this one and does the work; this does nothing.
 * - Made from master: that migration is already recorded and skipped; main's own ones run; this does nothing.
 * - Empty: everything runs in order; this does nothing.
 * - Made from master, then repaired by 20261108_083000_restore_projects_after_master, which lived on a branch for a few
 *   hours and put `archive` and `projects.home_show_name` back. Here this renames `archive` to `product` again, drops
 *   the column (master's «Главная» switch, `home.show_slide_names`, still holds the value) and forgets that migration,
 *   which no longer exists in the code, so «Диагностика» doesn't report it as unknown.
 * Every step checks first, so it is safe on any of them.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = 'enum_projects_kind' AND e.enumlabel = 'archive'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = 'enum_projects_kind' AND e.enumlabel = 'product'
    ) THEN
      ALTER TYPE "public"."enum_projects_kind" RENAME VALUE 'archive' TO 'product';
    END IF;
  END $$;

  CREATE TABLE IF NOT EXISTS "home" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"show_slide_names" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "publish_on_site" boolean DEFAULT true;
  ALTER TABLE "projects" DROP COLUMN IF EXISTS "home_show_name";
  DELETE FROM "payload_migrations" WHERE "name" = '20261108_083000_restore_projects_after_master';`)
}

/** Nothing to undo: on every database but the repaired one `up` changed nothing, and that one must not go back. */
export async function down(_args: MigrateDownArgs): Promise<void> {}
