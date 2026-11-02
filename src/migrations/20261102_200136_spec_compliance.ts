import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_social_posts_scope" AS ENUM('studio', 'person', 'project', 'partners');
  CREATE TYPE "public"."enum_reviews_network" AS ENUM('vk', 'facebook');
  CREATE TYPE "public"."enum_site_settings_map_provider" AS ENUM('yandex', 'google');
  CREATE TYPE "public"."enum_site_settings_default_network" AS ENUM('vk', 'facebook');
  CREATE TABLE "social_posts" (
    "id" serial PRIMARY KEY NOT NULL,
    "date" timestamp(3) with time zone NOT NULL,
    "url" varchar NOT NULL,
    "image_id" integer NOT NULL,
    "scope" "enum_social_posts_scope" NOT NULL,
    "person_id" integer,
    "project_id" integer,
    "hashtags" varchar,
    "published" boolean DEFAULT false,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "social_posts_locales" (
    "caption" varchar,
    "id" serial PRIMARY KEY NOT NULL,
    "_locale" "_locales" NOT NULL,
    "_parent_id" integer NOT NULL
  );

  CREATE TABLE "reviews" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar NOT NULL,
    "text" varchar NOT NULL,
    "project_id" integer NOT NULL,
    "network" "enum_reviews_network" DEFAULT 'vk' NOT NULL,
    "source_url" varchar,
    "date" timestamp(3) with time zone NOT NULL,
    "consent" boolean DEFAULT false NOT NULL,
    "origin_url" varchar NOT NULL,
    "approved" boolean DEFAULT false,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "site_settings" (
    "id" serial PRIMARY KEY NOT NULL,
    "limits_max_tags" numeric DEFAULT 5 NOT NULL,
    "limits_studio_posts" numeric DEFAULT 12 NOT NULL,
    "limits_person_posts" numeric DEFAULT 12 NOT NULL,
    "limits_partner_posts" numeric DEFAULT 12 NOT NULL,
    "limits_project_posts" numeric DEFAULT 3 NOT NULL,
    "limits_latest_reviews" numeric DEFAULT 5 NOT NULL,
    "map_provider" "enum_site_settings_map_provider" DEFAULT 'yandex' NOT NULL,
    "feeds_enabled" boolean DEFAULT true,
    "reviews_enabled" boolean DEFAULT true,
    "studio_hashtag" varchar,
    "partner_hashtag" varchar,
    "default_network" "enum_site_settings_default_network" DEFAULT 'vk',
    "vk_enabled" boolean DEFAULT false,
    "vk_app_id" varchar,
    "facebook_app_id" varchar,
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
  );

  ALTER TABLE "projects" ADD COLUMN "social_hashtag" varchar;
  ALTER TABLE "people" ADD COLUMN "social_hashtag" varchar;
  ALTER TABLE "lifestyle" ADD COLUMN "short_code" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "social_posts_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "reviews_id" integer;
  ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "social_posts_locales" ADD CONSTRAINT "social_posts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."social_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "social_posts_image_idx" ON "social_posts" USING btree ("image_id");
  CREATE INDEX "social_posts_person_idx" ON "social_posts" USING btree ("person_id");
  CREATE INDEX "social_posts_project_idx" ON "social_posts" USING btree ("project_id");
  CREATE INDEX "social_posts_updated_at_idx" ON "social_posts" USING btree ("updated_at");
  CREATE INDEX "social_posts_created_at_idx" ON "social_posts" USING btree ("created_at");
  CREATE UNIQUE INDEX "social_posts_locales_locale_parent_id_unique" ON "social_posts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "social_posts_locales_parent_id_idx" ON "social_posts_locales" USING btree ("_parent_id");
  CREATE INDEX "reviews_project_idx" ON "reviews" USING btree ("project_id");
  CREATE INDEX "reviews_updated_at_idx" ON "reviews" USING btree ("updated_at");
  CREATE INDEX "reviews_created_at_idx" ON "reviews" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_social_posts_fk" FOREIGN KEY ("social_posts_id") REFERENCES "public"."social_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reviews_fk" FOREIGN KEY ("reviews_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "lifestyle_short_code_idx" ON "lifestyle" USING btree ("short_code");
  CREATE INDEX "payload_locked_documents_rels_social_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("social_posts_id");
  CREATE INDEX "payload_locked_documents_rels_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("reviews_id");`)
  // Existing editorial entries receive a stable short permalink as part of the upgrade.
  await db.execute(sql`UPDATE "lifestyle" SET "short_code" = 'j-' || "id"::text WHERE "short_code" IS NULL;`)

}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "social_posts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "social_posts_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "reviews" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "social_posts" CASCADE;
  DROP TABLE "social_posts_locales" CASCADE;
  DROP TABLE "reviews" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_social_posts_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_reviews_fk";

  DROP INDEX IF EXISTS "lifestyle_short_code_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_social_posts_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_reviews_id_idx";
  ALTER TABLE "projects" DROP COLUMN "social_hashtag";
  ALTER TABLE "people" DROP COLUMN "social_hashtag";
  ALTER TABLE "lifestyle" DROP COLUMN "short_code";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "social_posts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "reviews_id";
  DROP TYPE "public"."enum_social_posts_scope";
  DROP TYPE "public"."enum_reviews_network";
  DROP TYPE "public"."enum_site_settings_map_provider";
  DROP TYPE "public"."enum_site_settings_default_network";`)
}
