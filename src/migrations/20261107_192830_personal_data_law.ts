import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_consents_purpose" AS ENUM('personal-data', 'publication', 'cookies');
  CREATE TYPE "public"."enum_consents_decision" AS ENUM('agree', 'necessary-only');
  CREATE TYPE "public"."enum_consents_source" AS ENUM('lead', 'review', 'cookie-banner');
  CREATE TYPE "public"."enum_consents_locale" AS ENUM('ru', 'en', 'zh');
  CREATE TABLE "_legal_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar NOT NULL,
  	"version_date" timestamp(3) with time zone NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_legal_v_locales" (
  	"version_title" varchar,
  	"version_text" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_legal_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "consents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"purpose" "enum_consents_purpose" NOT NULL,
  	"decision" "enum_consents_decision" NOT NULL,
  	"subject" varchar,
  	"source" "enum_consents_source" NOT NULL,
  	"source_id" varchar,
  	"wording" varchar,
  	"documents" jsonb,
  	"origin_url" varchar,
  	"locale" "enum_consents_locale",
  	"ip" varchar,
  	"user_agent" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "reviews" ADD COLUMN "publication_consent" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "consents_id" integer;
  ALTER TABLE "_legal_v" ADD CONSTRAINT "_legal_v_parent_id_legal_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."legal"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_legal_v_locales" ADD CONSTRAINT "_legal_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_legal_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_legal_v_rels" ADD CONSTRAINT "_legal_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_legal_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_legal_v_rels" ADD CONSTRAINT "_legal_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "_legal_v_parent_idx" ON "_legal_v" USING btree ("parent_id");
  CREATE INDEX "_legal_v_version_version_slug_idx" ON "_legal_v" USING btree ("version_slug");
  CREATE INDEX "_legal_v_version_version_updated_at_idx" ON "_legal_v" USING btree ("version_updated_at");
  CREATE INDEX "_legal_v_version_version_created_at_idx" ON "_legal_v" USING btree ("version_created_at");
  CREATE INDEX "_legal_v_created_at_idx" ON "_legal_v" USING btree ("created_at");
  CREATE INDEX "_legal_v_updated_at_idx" ON "_legal_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "_legal_v_locales_locale_parent_id_unique" ON "_legal_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_legal_v_locales_parent_id_idx" ON "_legal_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_legal_v_rels_order_idx" ON "_legal_v_rels" USING btree ("order");
  CREATE INDEX "_legal_v_rels_parent_idx" ON "_legal_v_rels" USING btree ("parent_id");
  CREATE INDEX "_legal_v_rels_path_idx" ON "_legal_v_rels" USING btree ("path");
  CREATE INDEX "_legal_v_rels_media_id_idx" ON "_legal_v_rels" USING btree ("media_id");
  CREATE INDEX "consents_updated_at_idx" ON "consents" USING btree ("updated_at");
  CREATE INDEX "consents_created_at_idx" ON "consents" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_consents_fk" FOREIGN KEY ("consents_id") REFERENCES "public"."consents"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_consents_id_idx" ON "payload_locked_documents_rels" USING btree ("consents_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "_legal_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_legal_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_legal_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "consents" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "_legal_v" CASCADE;
  DROP TABLE "_legal_v_locales" CASCADE;
  DROP TABLE "_legal_v_rels" CASCADE;
  DROP TABLE "consents" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_consents_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_consents_id_idx";
  ALTER TABLE "reviews" DROP COLUMN "publication_consent";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "consents_id";
  DROP TYPE "public"."enum_consents_purpose";
  DROP TYPE "public"."enum_consents_decision";
  DROP TYPE "public"."enum_consents_source";
  DROP TYPE "public"."enum_consents_locale";`)
}
