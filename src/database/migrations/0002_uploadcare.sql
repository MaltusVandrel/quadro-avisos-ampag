CREATE TABLE "uploadcare_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"file_url" text NOT NULL,
	"user_id" text NOT NULL,
	"incident_id" integer,
	"upload_timestamp" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uploadcare_files_file_id_unique" UNIQUE("file_id")
);
--> statement-breakpoint
ALTER TABLE "incidents" ALTER COLUMN "photo" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "uploadcare_files" ADD CONSTRAINT "uploadcare_files_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE no action ON UPDATE no action;