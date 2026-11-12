CREATE TABLE "tb_people_addresses" (
	"people_id" integer NOT NULL,
	"addresses_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "tb_people_addresses" ADD CONSTRAINT "tb_people_addresses_people_id_tb_people_id_fk" FOREIGN KEY ("people_id") REFERENCES "public"."tb_people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_people_addresses" ADD CONSTRAINT "tb_people_addresses_addresses_id_tb_addresses_id_fk" FOREIGN KEY ("addresses_id") REFERENCES "public"."tb_addresses"("id") ON DELETE no action ON UPDATE no action;