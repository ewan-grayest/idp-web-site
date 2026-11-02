import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "partners_locales" (
  	"name" varchar,
  	"text" jsonb,
  	"discount" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "press" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"url" varchar,
  	"photo_id" integer,
  	"project_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "press_locales" (
  	"title" varchar,
  	"source" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "lifestyle" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "lifestyle_locales" (
  	"title" varchar,
  	"text" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "lifestyle_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "careers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "careers_locales" (
  	"title" varchar,
  	"text" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "careers_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "legal" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "legal_locales" (
  	"title" varchar,
  	"text" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "legal_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "page_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "page_texts_locales" (
  	"gt" jsonb,
  	"payment" jsonb,
  	"media" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "partners" ADD COLUMN "link" varchar;
  ALTER TABLE "partners" ADD COLUMN "photo_id" integer;
  ALTER TABLE "partners_rels" ADD COLUMN "projects_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "press_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "lifestyle_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "careers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "legal_id" integer;
  ALTER TABLE "studio" ADD COLUMN "phone" varchar;
  ALTER TABLE "studio" ADD COLUMN "email" varchar;
  ALTER TABLE "studio" ADD COLUMN "partners_phone" varchar;
  ALTER TABLE "studio" ADD COLUMN "partners_email" varchar;
  ALTER TABLE "studio" ADD COLUMN "social_instagram" varchar;
  ALTER TABLE "studio" ADD COLUMN "social_vk" varchar;
  ALTER TABLE "studio" ADD COLUMN "social_facebook" varchar;
  ALTER TABLE "studio" ADD COLUMN "social_houzz" varchar;
  ALTER TABLE "studio" ADD COLUMN "inn" varchar;
  ALTER TABLE "studio" ADD COLUMN "kpp" varchar;
  ALTER TABLE "studio" ADD COLUMN "ogrn" varchar;
  ALTER TABLE "studio_locales" ADD COLUMN "company" varchar;
  ALTER TABLE "studio_locales" ADD COLUMN "legal_address" varchar;
  ALTER TABLE "studio_locales" ADD COLUMN "bank" varchar;
  ALTER TABLE "partners_locales" ADD CONSTRAINT "partners_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "press" ADD CONSTRAINT "press_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "press" ADD CONSTRAINT "press_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "press_locales" ADD CONSTRAINT "press_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."press"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lifestyle_locales" ADD CONSTRAINT "lifestyle_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lifestyle"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lifestyle_rels" ADD CONSTRAINT "lifestyle_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."lifestyle"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lifestyle_rels" ADD CONSTRAINT "lifestyle_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "careers_locales" ADD CONSTRAINT "careers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."careers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "careers_rels" ADD CONSTRAINT "careers_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."careers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "careers_rels" ADD CONSTRAINT "careers_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legal_locales" ADD CONSTRAINT "legal_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legal"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legal_rels" ADD CONSTRAINT "legal_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."legal"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legal_rels" ADD CONSTRAINT "legal_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_texts_locales" ADD CONSTRAINT "page_texts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_texts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "partners_locales_locale_parent_id_unique" ON "partners_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "partners_locales_parent_id_idx" ON "partners_locales" USING btree ("_parent_id");
  CREATE INDEX "press_photo_idx" ON "press" USING btree ("photo_id");
  CREATE INDEX "press_project_idx" ON "press" USING btree ("project_id");
  CREATE INDEX "press_updated_at_idx" ON "press" USING btree ("updated_at");
  CREATE INDEX "press_created_at_idx" ON "press" USING btree ("created_at");
  CREATE UNIQUE INDEX "press_locales_locale_parent_id_unique" ON "press_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "press_locales_parent_id_idx" ON "press_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "lifestyle_slug_idx" ON "lifestyle" USING btree ("slug");
  CREATE INDEX "lifestyle_updated_at_idx" ON "lifestyle" USING btree ("updated_at");
  CREATE INDEX "lifestyle_created_at_idx" ON "lifestyle" USING btree ("created_at");
  CREATE UNIQUE INDEX "lifestyle_locales_locale_parent_id_unique" ON "lifestyle_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "lifestyle_locales_parent_id_idx" ON "lifestyle_locales" USING btree ("_parent_id");
  CREATE INDEX "lifestyle_rels_order_idx" ON "lifestyle_rels" USING btree ("order");
  CREATE INDEX "lifestyle_rels_parent_idx" ON "lifestyle_rels" USING btree ("parent_id");
  CREATE INDEX "lifestyle_rels_path_idx" ON "lifestyle_rels" USING btree ("path");
  CREATE INDEX "lifestyle_rels_media_id_idx" ON "lifestyle_rels" USING btree ("media_id");
  CREATE UNIQUE INDEX "careers_slug_idx" ON "careers" USING btree ("slug");
  CREATE INDEX "careers_updated_at_idx" ON "careers" USING btree ("updated_at");
  CREATE INDEX "careers_created_at_idx" ON "careers" USING btree ("created_at");
  CREATE UNIQUE INDEX "careers_locales_locale_parent_id_unique" ON "careers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "careers_locales_parent_id_idx" ON "careers_locales" USING btree ("_parent_id");
  CREATE INDEX "careers_rels_order_idx" ON "careers_rels" USING btree ("order");
  CREATE INDEX "careers_rels_parent_idx" ON "careers_rels" USING btree ("parent_id");
  CREATE INDEX "careers_rels_path_idx" ON "careers_rels" USING btree ("path");
  CREATE INDEX "careers_rels_media_id_idx" ON "careers_rels" USING btree ("media_id");
  CREATE UNIQUE INDEX "legal_slug_idx" ON "legal" USING btree ("slug");
  CREATE INDEX "legal_updated_at_idx" ON "legal" USING btree ("updated_at");
  CREATE INDEX "legal_created_at_idx" ON "legal" USING btree ("created_at");
  CREATE UNIQUE INDEX "legal_locales_locale_parent_id_unique" ON "legal_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "legal_locales_parent_id_idx" ON "legal_locales" USING btree ("_parent_id");
  CREATE INDEX "legal_rels_order_idx" ON "legal_rels" USING btree ("order");
  CREATE INDEX "legal_rels_parent_idx" ON "legal_rels" USING btree ("parent_id");
  CREATE INDEX "legal_rels_path_idx" ON "legal_rels" USING btree ("path");
  CREATE INDEX "legal_rels_media_id_idx" ON "legal_rels" USING btree ("media_id");
  CREATE UNIQUE INDEX "page_texts_locales_locale_parent_id_unique" ON "page_texts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "page_texts_locales_parent_id_idx" ON "page_texts_locales" USING btree ("_parent_id");
  ALTER TABLE "partners" ADD CONSTRAINT "partners_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "partners_rels" ADD CONSTRAINT "partners_rels_projects_fk" FOREIGN KEY ("projects_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_press_fk" FOREIGN KEY ("press_id") REFERENCES "public"."press"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_lifestyle_fk" FOREIGN KEY ("lifestyle_id") REFERENCES "public"."lifestyle"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_careers_fk" FOREIGN KEY ("careers_id") REFERENCES "public"."careers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_legal_fk" FOREIGN KEY ("legal_id") REFERENCES "public"."legal"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "partners_photo_idx" ON "partners" USING btree ("photo_id");
  CREATE INDEX "partners_rels_projects_id_idx" ON "partners_rels" USING btree ("projects_id");
  CREATE INDEX "payload_locked_documents_rels_press_id_idx" ON "payload_locked_documents_rels" USING btree ("press_id");
  CREATE INDEX "payload_locked_documents_rels_lifestyle_id_idx" ON "payload_locked_documents_rels" USING btree ("lifestyle_id");
  CREATE INDEX "payload_locked_documents_rels_careers_id_idx" ON "payload_locked_documents_rels" USING btree ("careers_id");
  CREATE INDEX "payload_locked_documents_rels_legal_id_idx" ON "payload_locked_documents_rels" USING btree ("legal_id");
  -- Partner names become translatable: the existing names are the Russian version, so nothing is lost
  INSERT INTO "partners_locales" ("name","_locale","_parent_id") SELECT "name",'ru',"id" FROM "partners";
  ALTER TABLE "partners" DROP COLUMN "name";`)
}

// IF EXISTS: dropping the new tables first already takes their constraints and indexes with them
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "partners_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "press" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "press_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "lifestyle" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "lifestyle_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "lifestyle_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "careers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "careers_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "careers_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "legal" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "legal_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "legal_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_texts_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "press" CASCADE;
  DROP TABLE "press_locales" CASCADE;
  DROP TABLE "lifestyle" CASCADE;
  DROP TABLE "lifestyle_locales" CASCADE;
  DROP TABLE "lifestyle_rels" CASCADE;
  DROP TABLE "careers" CASCADE;
  DROP TABLE "careers_locales" CASCADE;
  DROP TABLE "careers_rels" CASCADE;
  DROP TABLE "legal" CASCADE;
  DROP TABLE "legal_locales" CASCADE;
  DROP TABLE "legal_rels" CASCADE;
  DROP TABLE "page_texts" CASCADE;
  DROP TABLE "page_texts_locales" CASCADE;
  ALTER TABLE "partners" DROP CONSTRAINT IF EXISTS "partners_photo_id_media_id_fk";
  
  ALTER TABLE "partners_rels" DROP CONSTRAINT IF EXISTS "partners_rels_projects_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_press_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_lifestyle_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_careers_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_legal_fk";
  
  DROP INDEX IF EXISTS "partners_photo_idx";
  DROP INDEX IF EXISTS "partners_rels_projects_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_press_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_lifestyle_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_careers_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_legal_id_idx";
  ALTER TABLE "partners" ADD COLUMN "name" varchar;
  -- Russian names go back into the main table; other languages are dropped
  UPDATE "partners" SET "name" = l."name" FROM "partners_locales" l WHERE l."_parent_id" = "partners"."id" AND l."_locale" = 'ru';
  UPDATE "partners" SET "name" = "slug" WHERE "name" IS NULL;
  ALTER TABLE "partners" ALTER COLUMN "name" SET NOT NULL;
  DROP TABLE "partners_locales" CASCADE;
  ALTER TABLE "partners" DROP COLUMN "link";
  ALTER TABLE "partners" DROP COLUMN "photo_id";
  ALTER TABLE "partners_rels" DROP COLUMN "projects_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "press_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "lifestyle_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "careers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "legal_id";
  ALTER TABLE "studio" DROP COLUMN "phone";
  ALTER TABLE "studio" DROP COLUMN "email";
  ALTER TABLE "studio" DROP COLUMN "partners_phone";
  ALTER TABLE "studio" DROP COLUMN "partners_email";
  ALTER TABLE "studio" DROP COLUMN "social_instagram";
  ALTER TABLE "studio" DROP COLUMN "social_vk";
  ALTER TABLE "studio" DROP COLUMN "social_facebook";
  ALTER TABLE "studio" DROP COLUMN "social_houzz";
  ALTER TABLE "studio" DROP COLUMN "inn";
  ALTER TABLE "studio" DROP COLUMN "kpp";
  ALTER TABLE "studio" DROP COLUMN "ogrn";
  ALTER TABLE "studio_locales" DROP COLUMN "company";
  ALTER TABLE "studio_locales" DROP COLUMN "legal_address";
  ALTER TABLE "studio_locales" DROP COLUMN "bank";`)
}
