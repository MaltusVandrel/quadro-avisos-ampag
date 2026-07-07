ALTER TABLE "citizens" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "citizens" ADD CONSTRAINT "citizens_email_unique" UNIQUE("email");