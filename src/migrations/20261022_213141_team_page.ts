import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "people_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" integer
  );
  
  CREATE TABLE "issues" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"number" numeric NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"cover_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "studio_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar,
  	"image_id" integer,
  	"project_id" integer
  );
  
  CREATE TABLE "studio" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"mission" varchar,
  	"vision" varchar,
  	"address" varchar DEFAULT '119028, Москва, Басманный район (ЦАО), м. Китай-город, ул. Солянка, 1/2, стр. 2',
  	"lat" numeric DEFAULT 55.7533,
  	"lng" numeric DEFAULT 37.6366,
  	"zoom" numeric DEFAULT 16,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "people" ADD COLUMN "quote" varchar;
  ALTER TABLE "people" ADD COLUMN "on_team" boolean DEFAULT true;
  ALTER TABLE "people" ADD COLUMN "order" numeric DEFAULT 0;
  ALTER TABLE "partners" ADD COLUMN "logo_id" integer;
  ALTER TABLE "partners" ADD COLUMN "order" numeric DEFAULT 0;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "issues_id" integer;
  ALTER TABLE "people_rels" ADD CONSTRAINT "people_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "people_rels" ADD CONSTRAINT "people_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "issues" ADD CONSTRAINT "issues_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "studio_history" ADD CONSTRAINT "studio_history_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "studio_history" ADD CONSTRAINT "studio_history_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "studio_history" ADD CONSTRAINT "studio_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."studio"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "people_rels_order_idx" ON "people_rels" USING btree ("order");
  CREATE INDEX "people_rels_parent_idx" ON "people_rels" USING btree ("parent_id");
  CREATE INDEX "people_rels_path_idx" ON "people_rels" USING btree ("path");
  CREATE INDEX "people_rels_tags_id_idx" ON "people_rels" USING btree ("tags_id");
  CREATE INDEX "issues_cover_idx" ON "issues" USING btree ("cover_id");
  CREATE INDEX "issues_updated_at_idx" ON "issues" USING btree ("updated_at");
  CREATE INDEX "issues_created_at_idx" ON "issues" USING btree ("created_at");
  CREATE INDEX "studio_history_order_idx" ON "studio_history" USING btree ("_order");
  CREATE INDEX "studio_history_parent_id_idx" ON "studio_history" USING btree ("_parent_id");
  CREATE INDEX "studio_history_image_idx" ON "studio_history" USING btree ("image_id");
  CREATE INDEX "studio_history_project_idx" ON "studio_history" USING btree ("project_id");
  ALTER TABLE "partners" ADD CONSTRAINT "partners_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_issues_fk" FOREIGN KEY ("issues_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "partners_logo_idx" ON "partners" USING btree ("logo_id");
  CREATE INDEX "payload_locked_documents_rels_issues_id_idx" ON "payload_locked_documents_rels" USING btree ("issues_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "people_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "issues" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "studio_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "studio" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "people_rels" CASCADE;
  DROP TABLE "issues" CASCADE;
  DROP TABLE "studio_history" CASCADE;
  DROP TABLE "studio" CASCADE;
  ALTER TABLE "partners" DROP CONSTRAINT "partners_logo_id_media_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_issues_fk";
  
  DROP INDEX "partners_logo_idx";
  DROP INDEX "payload_locked_documents_rels_issues_id_idx";
  ALTER TABLE "people" DROP COLUMN "quote";
  ALTER TABLE "people" DROP COLUMN "on_team";
  ALTER TABLE "people" DROP COLUMN "order";
  ALTER TABLE "partners" DROP COLUMN "logo_id";
  ALTER TABLE "partners" DROP COLUMN "order";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "issues_id";`)
}
