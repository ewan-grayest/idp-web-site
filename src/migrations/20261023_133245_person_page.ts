import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "people_achievements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar,
  	"image_id" integer,
  	"project_id" integer
  );
  
  ALTER TABLE "people" ADD COLUMN "photo_id" integer;
  ALTER TABLE "people" ADD COLUMN "interests" varchar;
  ALTER TABLE "people_achievements" ADD CONSTRAINT "people_achievements_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "people_achievements" ADD CONSTRAINT "people_achievements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "people_achievements" ADD CONSTRAINT "people_achievements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "people_achievements_order_idx" ON "people_achievements" USING btree ("_order");
  CREATE INDEX "people_achievements_parent_id_idx" ON "people_achievements" USING btree ("_parent_id");
  CREATE INDEX "people_achievements_image_idx" ON "people_achievements" USING btree ("image_id");
  CREATE INDEX "people_achievements_project_idx" ON "people_achievements" USING btree ("project_id");
  ALTER TABLE "people" ADD CONSTRAINT "people_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "people_photo_idx" ON "people" USING btree ("photo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "people_achievements" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "people_achievements" CASCADE;
  ALTER TABLE "people" DROP CONSTRAINT "people_photo_id_media_id_fk";
  
  DROP INDEX "people_photo_idx";
  ALTER TABLE "people" DROP COLUMN "photo_id";
  ALTER TABLE "people" DROP COLUMN "interests";`)
}
