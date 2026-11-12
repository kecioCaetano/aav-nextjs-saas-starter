CREATE TABLE "tb_companies_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"companies_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "tb_companies_users" ADD CONSTRAINT "tb_companies_users_companies_id_tb_companies_id_fk" FOREIGN KEY ("companies_id") REFERENCES "public"."tb_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_companies_users" ADD CONSTRAINT "tb_companies_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;