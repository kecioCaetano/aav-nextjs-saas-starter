CREATE TYPE "public"."pessoa_type" AS ENUM('llc', 'person');--> statement-breakpoint
CREATE TABLE "tb_pessoa" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"zipcode" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"note" text,
	"type" "pessoa_type" DEFAULT 'person' NOT NULL,
	"company_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "tb_pessoa" ADD CONSTRAINT "tb_pessoa_company_id_tb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."tb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tb_pessoa_email_idx" ON "tb_pessoa" USING btree ("email");