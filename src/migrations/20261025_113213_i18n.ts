import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('ru', 'en', 'zh');
  CREATE TYPE "public"."enum_leads_locale" AS ENUM('ru', 'en', 'zh');
  CREATE TABLE "projects_gallery_hotspots_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "projects_concept_photos_hotspots_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "projects_preview_photos_hotspots_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "projects_process_photos_hotspots_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "projects_achievements_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "projects_locales" (
  	"title" varchar,
  	"lead_role" varchar,
  	"summary" varchar,
  	"quote" varchar,
  	"concept_text" varchar,
  	"preview_text" varchar,
  	"process_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "people_achievements_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "people_locales" (
  	"name" varchar,
  	"role" varchar,
  	"quote" varchar,
  	"interests" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "issues_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "tags_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "studio_history_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "studio_locales" (
  	"mission" varchar,
  	"vision" varchar,
  	"address" varchar DEFAULT '119028, Москва, Басманный район (ЦАО), м. Китай-город, ул. Солянка, 1/2, стр. 2',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "leads" ADD COLUMN "locale" "enum_leads_locale";
  ALTER TABLE "projects_gallery_hotspots_locales" ADD CONSTRAINT "projects_gallery_hotspots_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_gallery_hotspots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_concept_photos_hotspots_locales" ADD CONSTRAINT "projects_concept_photos_hotspots_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_concept_photos_hotspots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_preview_photos_hotspots_locales" ADD CONSTRAINT "projects_preview_photos_hotspots_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_preview_photos_hotspots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_process_photos_hotspots_locales" ADD CONSTRAINT "projects_process_photos_hotspots_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_process_photos_hotspots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_achievements_locales" ADD CONSTRAINT "projects_achievements_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects_achievements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_locales" ADD CONSTRAINT "projects_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "people_achievements_locales" ADD CONSTRAINT "people_achievements_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."people_achievements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "people_locales" ADD CONSTRAINT "people_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "issues_locales" ADD CONSTRAINT "issues_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tags_locales" ADD CONSTRAINT "tags_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "studio_history_locales" ADD CONSTRAINT "studio_history_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."studio_history"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "studio_locales" ADD CONSTRAINT "studio_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."studio"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "projects_gallery_hotspots_locales_locale_parent_id_unique" ON "projects_gallery_hotspots_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "projects_gallery_hotspots_locales_parent_id_idx" ON "projects_gallery_hotspots_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "projects_concept_photos_hotspots_locales_locale_parent_id_un" ON "projects_concept_photos_hotspots_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "projects_concept_photos_hotspots_locales_parent_id_idx" ON "projects_concept_photos_hotspots_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "projects_preview_photos_hotspots_locales_locale_parent_id_un" ON "projects_preview_photos_hotspots_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "projects_preview_photos_hotspots_locales_parent_id_idx" ON "projects_preview_photos_hotspots_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "projects_process_photos_hotspots_locales_locale_parent_id_un" ON "projects_process_photos_hotspots_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "projects_process_photos_hotspots_locales_parent_id_idx" ON "projects_process_photos_hotspots_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "projects_achievements_locales_locale_parent_id_unique" ON "projects_achievements_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "projects_achievements_locales_parent_id_idx" ON "projects_achievements_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "projects_locales_locale_parent_id_unique" ON "projects_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "projects_locales_parent_id_idx" ON "projects_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "people_achievements_locales_locale_parent_id_unique" ON "people_achievements_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "people_achievements_locales_parent_id_idx" ON "people_achievements_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "people_locales_locale_parent_id_unique" ON "people_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "people_locales_parent_id_idx" ON "people_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "issues_locales_locale_parent_id_unique" ON "issues_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "issues_locales_parent_id_idx" ON "issues_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "tags_locales_locale_parent_id_unique" ON "tags_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tags_locales_parent_id_idx" ON "tags_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "media_locales_parent_id_idx" ON "media_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "studio_history_locales_locale_parent_id_unique" ON "studio_history_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "studio_history_locales_parent_id_idx" ON "studio_history_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "studio_locales_locale_parent_id_unique" ON "studio_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "studio_locales_parent_id_idx" ON "studio_locales" USING btree ("_parent_id");
  -- Existing texts become the Russian version (the default language), so nothing is lost
  INSERT INTO "projects_gallery_hotspots_locales" ("label","_locale","_parent_id") SELECT "label",'ru',"id" FROM "projects_gallery_hotspots";
  INSERT INTO "projects_concept_photos_hotspots_locales" ("label","_locale","_parent_id") SELECT "label",'ru',"id" FROM "projects_concept_photos_hotspots";
  INSERT INTO "projects_preview_photos_hotspots_locales" ("label","_locale","_parent_id") SELECT "label",'ru',"id" FROM "projects_preview_photos_hotspots";
  INSERT INTO "projects_process_photos_hotspots_locales" ("label","_locale","_parent_id") SELECT "label",'ru',"id" FROM "projects_process_photos_hotspots";
  INSERT INTO "projects_achievements_locales" ("title","text","_locale","_parent_id") SELECT "title","text",'ru',"id" FROM "projects_achievements";
  INSERT INTO "projects_locales" ("title","lead_role","summary","quote","concept_text","preview_text","process_text","_locale","_parent_id") SELECT "title",NULLIF("lead_role", 'Ведущий архитектор'),"summary","quote","concept_text","preview_text","process_text",'ru',"id" FROM "projects";
  INSERT INTO "people_achievements_locales" ("title","text","_locale","_parent_id") SELECT "title","text",'ru',"id" FROM "people_achievements";
  INSERT INTO "people_locales" ("name","role","quote","interests","_locale","_parent_id") SELECT "name","role","quote","interests",'ru',"id" FROM "people";
  INSERT INTO "issues_locales" ("title","_locale","_parent_id") SELECT "title",'ru',"id" FROM "issues";
  INSERT INTO "tags_locales" ("title","_locale","_parent_id") SELECT "title",'ru',"id" FROM "tags";
  INSERT INTO "media_locales" ("alt","_locale","_parent_id") SELECT "alt",'ru',"id" FROM "media";
  INSERT INTO "studio_history_locales" ("title","text","_locale","_parent_id") SELECT "title","text",'ru',"id" FROM "studio_history";
  INSERT INTO "studio_locales" ("mission","vision","address","_locale","_parent_id") SELECT "mission","vision","address",'ru',"id" FROM "studio";
  ALTER TABLE "projects_gallery_hotspots" DROP COLUMN "label";
  ALTER TABLE "projects_concept_photos_hotspots" DROP COLUMN "label";
  ALTER TABLE "projects_preview_photos_hotspots" DROP COLUMN "label";
  ALTER TABLE "projects_process_photos_hotspots" DROP COLUMN "label";
  ALTER TABLE "projects_achievements" DROP COLUMN "title";
  ALTER TABLE "projects_achievements" DROP COLUMN "text";
  ALTER TABLE "projects" DROP COLUMN "title";
  ALTER TABLE "projects" DROP COLUMN "lead_role";
  ALTER TABLE "projects" DROP COLUMN "summary";
  ALTER TABLE "projects" DROP COLUMN "quote";
  ALTER TABLE "projects" DROP COLUMN "concept_text";
  ALTER TABLE "projects" DROP COLUMN "preview_text";
  ALTER TABLE "projects" DROP COLUMN "process_text";
  ALTER TABLE "people_achievements" DROP COLUMN "title";
  ALTER TABLE "people_achievements" DROP COLUMN "text";
  ALTER TABLE "people" DROP COLUMN "name";
  ALTER TABLE "people" DROP COLUMN "role";
  ALTER TABLE "people" DROP COLUMN "quote";
  ALTER TABLE "people" DROP COLUMN "interests";
  ALTER TABLE "issues" DROP COLUMN "title";
  ALTER TABLE "tags" DROP COLUMN "title";
  ALTER TABLE "media" DROP COLUMN "alt";
  ALTER TABLE "studio_history" DROP COLUMN "title";
  ALTER TABLE "studio_history" DROP COLUMN "text";
  ALTER TABLE "studio" DROP COLUMN "mission";
  ALTER TABLE "studio" DROP COLUMN "vision";
  ALTER TABLE "studio" DROP COLUMN "address";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "projects_gallery_hotspots" ADD COLUMN "label" varchar;
  ALTER TABLE "projects_concept_photos_hotspots" ADD COLUMN "label" varchar;
  ALTER TABLE "projects_preview_photos_hotspots" ADD COLUMN "label" varchar;
  ALTER TABLE "projects_process_photos_hotspots" ADD COLUMN "label" varchar;
  ALTER TABLE "projects_achievements" ADD COLUMN "title" varchar;
  ALTER TABLE "projects_achievements" ADD COLUMN "text" varchar;
  ALTER TABLE "projects" ADD COLUMN "title" varchar;
  ALTER TABLE "projects" ADD COLUMN "lead_role" varchar DEFAULT 'Ведущий архитектор';
  ALTER TABLE "projects" ADD COLUMN "summary" varchar;
  ALTER TABLE "projects" ADD COLUMN "quote" varchar;
  ALTER TABLE "projects" ADD COLUMN "concept_text" varchar;
  ALTER TABLE "projects" ADD COLUMN "preview_text" varchar;
  ALTER TABLE "projects" ADD COLUMN "process_text" varchar;
  ALTER TABLE "people_achievements" ADD COLUMN "title" varchar;
  ALTER TABLE "people_achievements" ADD COLUMN "text" varchar;
  ALTER TABLE "people" ADD COLUMN "name" varchar;
  ALTER TABLE "people" ADD COLUMN "role" varchar;
  ALTER TABLE "people" ADD COLUMN "quote" varchar;
  ALTER TABLE "people" ADD COLUMN "interests" varchar;
  ALTER TABLE "issues" ADD COLUMN "title" varchar;
  ALTER TABLE "tags" ADD COLUMN "title" varchar;
  ALTER TABLE "media" ADD COLUMN "alt" varchar;
  ALTER TABLE "studio_history" ADD COLUMN "title" varchar;
  ALTER TABLE "studio_history" ADD COLUMN "text" varchar;
  ALTER TABLE "studio" ADD COLUMN "mission" varchar;
  ALTER TABLE "studio" ADD COLUMN "vision" varchar;
  ALTER TABLE "studio" ADD COLUMN "address" varchar DEFAULT '119028, Москва, Басманный район (ЦАО), м. Китай-город, ул. Солянка, 1/2, стр. 2';
  -- Russian texts go back into the main tables; other languages are dropped
  UPDATE "projects_gallery_hotspots" SET "label" = l."label" FROM "projects_gallery_hotspots_locales" l WHERE l."_parent_id" = "projects_gallery_hotspots"."id" AND l."_locale" = 'ru';
  ALTER TABLE "projects_gallery_hotspots" ALTER COLUMN "label" SET NOT NULL;
  UPDATE "projects_concept_photos_hotspots" SET "label" = l."label" FROM "projects_concept_photos_hotspots_locales" l WHERE l."_parent_id" = "projects_concept_photos_hotspots"."id" AND l."_locale" = 'ru';
  ALTER TABLE "projects_concept_photos_hotspots" ALTER COLUMN "label" SET NOT NULL;
  UPDATE "projects_preview_photos_hotspots" SET "label" = l."label" FROM "projects_preview_photos_hotspots_locales" l WHERE l."_parent_id" = "projects_preview_photos_hotspots"."id" AND l."_locale" = 'ru';
  ALTER TABLE "projects_preview_photos_hotspots" ALTER COLUMN "label" SET NOT NULL;
  UPDATE "projects_process_photos_hotspots" SET "label" = l."label" FROM "projects_process_photos_hotspots_locales" l WHERE l."_parent_id" = "projects_process_photos_hotspots"."id" AND l."_locale" = 'ru';
  ALTER TABLE "projects_process_photos_hotspots" ALTER COLUMN "label" SET NOT NULL;
  UPDATE "projects_achievements" SET "title" = l."title", "text" = l."text" FROM "projects_achievements_locales" l WHERE l."_parent_id" = "projects_achievements"."id" AND l."_locale" = 'ru';
  ALTER TABLE "projects_achievements" ALTER COLUMN "title" SET NOT NULL;
  UPDATE "projects" SET "title" = l."title", "lead_role" = l."lead_role", "summary" = l."summary", "quote" = l."quote", "concept_text" = l."concept_text", "preview_text" = l."preview_text", "process_text" = l."process_text" FROM "projects_locales" l WHERE l."_parent_id" = "projects"."id" AND l."_locale" = 'ru';
  ALTER TABLE "projects" ALTER COLUMN "title" SET NOT NULL;
  UPDATE "people_achievements" SET "title" = l."title", "text" = l."text" FROM "people_achievements_locales" l WHERE l."_parent_id" = "people_achievements"."id" AND l."_locale" = 'ru';
  ALTER TABLE "people_achievements" ALTER COLUMN "title" SET NOT NULL;
  UPDATE "people" SET "name" = l."name", "role" = l."role", "quote" = l."quote", "interests" = l."interests" FROM "people_locales" l WHERE l."_parent_id" = "people"."id" AND l."_locale" = 'ru';
  ALTER TABLE "people" ALTER COLUMN "name" SET NOT NULL;
  UPDATE "issues" SET "title" = l."title" FROM "issues_locales" l WHERE l."_parent_id" = "issues"."id" AND l."_locale" = 'ru';
  ALTER TABLE "issues" ALTER COLUMN "title" SET NOT NULL;
  UPDATE "tags" SET "title" = l."title" FROM "tags_locales" l WHERE l."_parent_id" = "tags"."id" AND l."_locale" = 'ru';
  ALTER TABLE "tags" ALTER COLUMN "title" SET NOT NULL;
  UPDATE "media" SET "alt" = l."alt" FROM "media_locales" l WHERE l."_parent_id" = "media"."id" AND l."_locale" = 'ru';
  ALTER TABLE "media" ALTER COLUMN "alt" SET NOT NULL;
  UPDATE "studio_history" SET "title" = l."title", "text" = l."text" FROM "studio_history_locales" l WHERE l."_parent_id" = "studio_history"."id" AND l."_locale" = 'ru';
  ALTER TABLE "studio_history" ALTER COLUMN "title" SET NOT NULL;
  UPDATE "studio" SET "mission" = l."mission", "vision" = l."vision", "address" = l."address" FROM "studio_locales" l WHERE l."_parent_id" = "studio"."id" AND l."_locale" = 'ru';
  DROP TABLE "projects_gallery_hotspots_locales" CASCADE;
  DROP TABLE "projects_concept_photos_hotspots_locales" CASCADE;
  DROP TABLE "projects_preview_photos_hotspots_locales" CASCADE;
  DROP TABLE "projects_process_photos_hotspots_locales" CASCADE;
  DROP TABLE "projects_achievements_locales" CASCADE;
  DROP TABLE "projects_locales" CASCADE;
  DROP TABLE "people_achievements_locales" CASCADE;
  DROP TABLE "people_locales" CASCADE;
  DROP TABLE "issues_locales" CASCADE;
  DROP TABLE "tags_locales" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "studio_history_locales" CASCADE;
  DROP TABLE "studio_locales" CASCADE;
  ALTER TABLE "leads" DROP COLUMN "locale";
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_leads_locale";`)
}
