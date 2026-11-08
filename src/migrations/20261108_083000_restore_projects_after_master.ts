import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Repairs a database that the `master` branch has already migrated, so this branch can read projects again.
 * No schema change: the snapshot beside this file is the same as the previous one.
 *
 * `master` is a separate history. Its migration 20261105_225500_product_design_publish drops `projects.home_show_name`
 * (the switch moved to a «Главная» global there) and renames the project kind `archive` to `product`. Running this branch
 * on such a database, every query on projects failed with «column projects.home_show_name does not exist»: the admin's
 * «Проекты» list stayed blank and the project pages answered 500 (Ewan, 2026-11-08).
 *
 * Each step runs only when the database is in that state, so on any other database this does nothing.
 * - The column comes back, set from `master`'s one switch (home.show_slide_names) when that exists, otherwise on.
 * - `product` is renamed back to `archive`, so those projects are archive projects here, as they were before.
 * `master`'s other additions (the `home` table, `projects.publish_on_site`) are left in place and unused here.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'home_show_name'
    ) THEN
      ALTER TABLE "projects" ADD COLUMN "home_show_name" boolean DEFAULT true;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'home' AND column_name = 'show_slide_names'
      ) THEN
        UPDATE "projects" SET "home_show_name" = COALESCE((SELECT "show_slide_names" FROM "home" ORDER BY "id" LIMIT 1), true);
      END IF;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = 'enum_projects_kind' AND e.enumlabel = 'product'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = 'enum_projects_kind' AND e.enumlabel = 'archive'
    ) THEN
      ALTER TYPE "public"."enum_projects_kind" RENAME VALUE 'product' TO 'archive';
    END IF;
  END $$;`)
}

/** Nothing to undo: on a database this branch made, `up` changed nothing, and putting master's state back would break it again. */
export async function down(_args: MigrateDownArgs): Promise<void> {}
