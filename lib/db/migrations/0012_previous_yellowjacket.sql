CREATE TYPE "public"."vehicle_ownership" AS ENUM('paid-off', 'loan', 'lease');--> statement-breakpoint
CREATE TYPE "public"."vehicle_title" AS ENUM('clean', 'salvage', 'non-repairable', 'no title');--> statement-breakpoint
CREATE TABLE "tb_vehicles" (
	"vim" text PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"make" integer NOT NULL,
	"model" integer NOT NULL,
	"trims" integer,
	"mileage" integer,
	"fuel_type_primary" text,
	"type" text,
	"note" text,
	"ownership" "vehicle_ownership",
	"title" "vehicle_title",
	"plate" text,
	"company_id" integer NOT NULL,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "tb_vehicles" ADD CONSTRAINT "tb_vehicles_make_tb_makes_id_fk" FOREIGN KEY ("make") REFERENCES "public"."tb_makes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_vehicles" ADD CONSTRAINT "tb_vehicles_model_tb_models_id_fk" FOREIGN KEY ("model") REFERENCES "public"."tb_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_vehicles" ADD CONSTRAINT "tb_vehicles_trims_tb_trims_id_fk" FOREIGN KEY ("trims") REFERENCES "public"."tb_trims"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_vehicles" ADD CONSTRAINT "tb_vehicles_company_id_tb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."tb_companies"("id") ON DELETE no action ON UPDATE no action;