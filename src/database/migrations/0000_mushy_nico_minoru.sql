CREATE TYPE "public"."criticality" AS ENUM('Relato', 'Transtorno', 'Risco', 'Perigo');--> statement-breakpoint
CREATE TABLE "citizens" (
	"id" serial PRIMARY KEY NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"cpf" varchar(11) NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" varchar(255),
	"birth_at" timestamp,
	"anon_id" varchar(255),
	"cellphone" varchar(20),
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	CONSTRAINT "citizens_cpf_unique" UNIQUE("cpf"),
	CONSTRAINT "citizens_anon_id_unique" UNIQUE("anon_id")
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"title" varchar(255),
	"description" text,
	"photo" varchar(500) NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"device_direction" varchar(20),
	"criticality" "criticality" NOT NULL,
	"citizen_id" integer,
	"anon_id" varchar(255),
	"bo_opened" boolean DEFAULT false NOT NULL,
	"bo_number_or_protocol" varchar(100),
	"occurred_at" timestamp NOT NULL,
	"validated" boolean DEFAULT false NOT NULL,
	"reviewed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_citizen_id_citizens_id_fk" FOREIGN KEY ("citizen_id") REFERENCES "public"."citizens"("id") ON DELETE no action ON UPDATE no action;