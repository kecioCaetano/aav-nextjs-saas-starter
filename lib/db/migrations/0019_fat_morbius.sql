CREATE TABLE "tb_orders_vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicles_id" integer NOT NULL,
	"orders_id" integer NOT NULL,
	"addresses_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "tb_orders_vehicles" ADD CONSTRAINT "tb_orders_vehicles_vehicles_id_tb_vehicles_id_fk" FOREIGN KEY ("vehicles_id") REFERENCES "public"."tb_vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_orders_vehicles" ADD CONSTRAINT "tb_orders_vehicles_orders_id_tb_orders_id_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."tb_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_orders_vehicles" ADD CONSTRAINT "tb_orders_vehicles_addresses_id_tb_addresses_id_fk" FOREIGN KEY ("addresses_id") REFERENCES "public"."tb_addresses"("id") ON DELETE no action ON UPDATE no action;