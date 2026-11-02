import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "projects_gallery_hotspots" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"partner_id" integer NOT NULL,
  	"x" numeric NOT NULL,
  	"y" numeric NOT NULL
  );
  
  CREATE TABLE "projects_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "projects_concept_photos_hotspots" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"partner_id" integer NOT NULL,
  	"x" numeric NOT NULL,
  	"y" numeric NOT NULL
  );
  
  CREATE TABLE "projects_concept_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "projects_preview_photos_hotspots" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"partner_id" integer NOT NULL,
  	"x" numeric NOT NULL,
  	"y" numeric NOT NULL
  );
  
  CREATE TABLE "projects_preview_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "projects_process_photos_hotspots" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"partner_id" integer NOT NULL,
  	"x" numeric NOT NULL,
  	"y" numeric NOT NULL
  );
  
  CREATE TABLE "projects_process_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "projects_achievements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar,
  	"image_id" integer,
  	"link" varchar
  );
  
  CREATE TABLE "partners" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "partners_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" integer
  );
  
  CREATE TABLE "tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "projects" ADD COLUMN "lead_author_id" integer;
  ALTER TABLE "projects" ADD COLUMN "lead_role" varchar DEFAULT 'Ведущий архитектор';
  ALTER TABLE "projects" ADD COLUMN "summary" varchar;
  ALTER TABLE "projects" ADD COLUMN "quote" varchar;
  ALTER TABLE "projects" ADD COLUMN "concept_text" varchar;
  ALTER TABLE "projects" ADD COLUMN "preview_text" varchar;
  ALTER TABLE "projects" ADD COLUMN "process_text" varchar;
  ALTER TABLE "projects" ADD COLUMN "next_stage_id" integer;
  ALTER TABLE "projects" ADD COLUMN "short_code" varchar;
  ALTER TABLE "projects_rels" ADD COLUMN "tags_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "partners_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "tags_id" integer;
  ALTER TABLE "projects_gallery_hotspots" ADD CONSTRAINT "projects_gallery_hotspots_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_gallery_hotspots" ADD CONSTRAINT "projects_gallery_hotspots_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_gallery" ADD CONSTRAINT "projects_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_gallery" ADD CONSTRAINT "projects_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_concept_photos_hotspots" ADD CONSTRAINT "projects_concept_photos_hotspots_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_concept_photos_hotspots" ADD CONSTRAINT "projects_concept_photos_hotspots_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_concept_photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_concept_photos" ADD CONSTRAINT "projects_concept_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_concept_photos" ADD CONSTRAINT "projects_concept_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_preview_photos_hotspots" ADD CONSTRAINT "projects_preview_photos_hotspots_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_preview_photos_hotspots" ADD CONSTRAINT "projects_preview_photos_hotspots_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_preview_photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_preview_photos" ADD CONSTRAINT "projects_preview_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_preview_photos" ADD CONSTRAINT "projects_preview_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_process_photos_hotspots" ADD CONSTRAINT "projects_process_photos_hotspots_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_process_photos_hotspots" ADD CONSTRAINT "projects_process_photos_hotspots_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_process_photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_process_photos" ADD CONSTRAINT "projects_process_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_process_photos" ADD CONSTRAINT "projects_process_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_achievements" ADD CONSTRAINT "projects_achievements_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_achievements" ADD CONSTRAINT "projects_achievements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "partners_rels" ADD CONSTRAINT "partners_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "partners_rels" ADD CONSTRAINT "partners_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "projects_gallery_hotspots_order_idx" ON "projects_gallery_hotspots" USING btree ("_order");
  CREATE INDEX "projects_gallery_hotspots_parent_id_idx" ON "projects_gallery_hotspots" USING btree ("_parent_id");
  CREATE INDEX "projects_gallery_hotspots_partner_idx" ON "projects_gallery_hotspots" USING btree ("partner_id");
  CREATE INDEX "projects_gallery_order_idx" ON "projects_gallery" USING btree ("_order");
  CREATE INDEX "projects_gallery_parent_id_idx" ON "projects_gallery" USING btree ("_parent_id");
  CREATE INDEX "projects_gallery_image_idx" ON "projects_gallery" USING btree ("image_id");
  CREATE INDEX "projects_concept_photos_hotspots_order_idx" ON "projects_concept_photos_hotspots" USING btree ("_order");
  CREATE INDEX "projects_concept_photos_hotspots_parent_id_idx" ON "projects_concept_photos_hotspots" USING btree ("_parent_id");
  CREATE INDEX "projects_concept_photos_hotspots_partner_idx" ON "projects_concept_photos_hotspots" USING btree ("partner_id");
  CREATE INDEX "projects_concept_photos_order_idx" ON "projects_concept_photos" USING btree ("_order");
  CREATE INDEX "projects_concept_photos_parent_id_idx" ON "projects_concept_photos" USING btree ("_parent_id");
  CREATE INDEX "projects_concept_photos_image_idx" ON "projects_concept_photos" USING btree ("image_id");
  CREATE INDEX "projects_preview_photos_hotspots_order_idx" ON "projects_preview_photos_hotspots" USING btree ("_order");
  CREATE INDEX "projects_preview_photos_hotspots_parent_id_idx" ON "projects_preview_photos_hotspots" USING btree ("_parent_id");
  CREATE INDEX "projects_preview_photos_hotspots_partner_idx" ON "projects_preview_photos_hotspots" USING btree ("partner_id");
  CREATE INDEX "projects_preview_photos_order_idx" ON "projects_preview_photos" USING btree ("_order");
  CREATE INDEX "projects_preview_photos_parent_id_idx" ON "projects_preview_photos" USING btree ("_parent_id");
  CREATE INDEX "projects_preview_photos_image_idx" ON "projects_preview_photos" USING btree ("image_id");
  CREATE INDEX "projects_process_photos_hotspots_order_idx" ON "projects_process_photos_hotspots" USING btree ("_order");
  CREATE INDEX "projects_process_photos_hotspots_parent_id_idx" ON "projects_process_photos_hotspots" USING btree ("_parent_id");
  CREATE INDEX "projects_process_photos_hotspots_partner_idx" ON "projects_process_photos_hotspots" USING btree ("partner_id");
  CREATE INDEX "projects_process_photos_order_idx" ON "projects_process_photos" USING btree ("_order");
  CREATE INDEX "projects_process_photos_parent_id_idx" ON "projects_process_photos" USING btree ("_parent_id");
  CREATE INDEX "projects_process_photos_image_idx" ON "projects_process_photos" USING btree ("image_id");
  CREATE INDEX "projects_achievements_order_idx" ON "projects_achievements" USING btree ("_order");
  CREATE INDEX "projects_achievements_parent_id_idx" ON "projects_achievements" USING btree ("_parent_id");
  CREATE INDEX "projects_achievements_image_idx" ON "projects_achievements" USING btree ("image_id");
  CREATE UNIQUE INDEX "partners_slug_idx" ON "partners" USING btree ("slug");
  CREATE INDEX "partners_updated_at_idx" ON "partners" USING btree ("updated_at");
  CREATE INDEX "partners_created_at_idx" ON "partners" USING btree ("created_at");
  CREATE INDEX "partners_rels_order_idx" ON "partners_rels" USING btree ("order");
  CREATE INDEX "partners_rels_parent_idx" ON "partners_rels" USING btree ("parent_id");
  CREATE INDEX "partners_rels_path_idx" ON "partners_rels" USING btree ("path");
  CREATE INDEX "partners_rels_tags_id_idx" ON "partners_rels" USING btree ("tags_id");
  CREATE UNIQUE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");
  CREATE INDEX "tags_updated_at_idx" ON "tags" USING btree ("updated_at");
  CREATE INDEX "tags_created_at_idx" ON "tags" USING btree ("created_at");
  ALTER TABLE "projects" ADD CONSTRAINT "projects_lead_author_id_people_id_fk" FOREIGN KEY ("lead_author_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects" ADD CONSTRAINT "projects_next_stage_id_projects_id_fk" FOREIGN KEY ("next_stage_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_rels" ADD CONSTRAINT "projects_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_partners_fk" FOREIGN KEY ("partners_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "projects_lead_author_idx" ON "projects" USING btree ("lead_author_id");
  CREATE INDEX "projects_next_stage_idx" ON "projects" USING btree ("next_stage_id");
  CREATE UNIQUE INDEX "projects_short_code_idx" ON "projects" USING btree ("short_code");
  CREATE INDEX "projects_rels_tags_id_idx" ON "projects_rels" USING btree ("tags_id");
  CREATE INDEX "payload_locked_documents_rels_partners_id_idx" ON "payload_locked_documents_rels" USING btree ("partners_id");
  CREATE INDEX "payload_locked_documents_rels_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("tags_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects_gallery_hotspots" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_concept_photos_hotspots" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_concept_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_preview_photos_hotspots" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_preview_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_process_photos_hotspots" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_process_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_achievements" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "partners" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "partners_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tags" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "projects_gallery_hotspots" CASCADE;
  DROP TABLE "projects_gallery" CASCADE;
  DROP TABLE "projects_concept_photos_hotspots" CASCADE;
  DROP TABLE "projects_concept_photos" CASCADE;
  DROP TABLE "projects_preview_photos_hotspots" CASCADE;
  DROP TABLE "projects_preview_photos" CASCADE;
  DROP TABLE "projects_process_photos_hotspots" CASCADE;
  DROP TABLE "projects_process_photos" CASCADE;
  DROP TABLE "projects_achievements" CASCADE;
  DROP TABLE "partners" CASCADE;
  DROP TABLE "partners_rels" CASCADE;
  DROP TABLE "tags" CASCADE;
  ALTER TABLE "projects" DROP CONSTRAINT "projects_lead_author_id_people_id_fk";
  
  ALTER TABLE "projects" DROP CONSTRAINT "projects_next_stage_id_projects_id_fk";
  
  ALTER TABLE "projects_rels" DROP CONSTRAINT "projects_rels_tags_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_partners_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tags_fk";
  
  DROP INDEX "projects_lead_author_idx";
  DROP INDEX "projects_next_stage_idx";
  DROP INDEX "projects_short_code_idx";
  DROP INDEX "projects_rels_tags_id_idx";
  DROP INDEX "payload_locked_documents_rels_partners_id_idx";
  DROP INDEX "payload_locked_documents_rels_tags_id_idx";
  ALTER TABLE "projects" DROP COLUMN "lead_author_id";
  ALTER TABLE "projects" DROP COLUMN "lead_role";
  ALTER TABLE "projects" DROP COLUMN "summary";
  ALTER TABLE "projects" DROP COLUMN "quote";
  ALTER TABLE "projects" DROP COLUMN "concept_text";
  ALTER TABLE "projects" DROP COLUMN "preview_text";
  ALTER TABLE "projects" DROP COLUMN "process_text";
  ALTER TABLE "projects" DROP COLUMN "next_stage_id";
  ALTER TABLE "projects" DROP COLUMN "short_code";
  ALTER TABLE "projects_rels" DROP COLUMN "tags_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "partners_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "tags_id";`)
}
