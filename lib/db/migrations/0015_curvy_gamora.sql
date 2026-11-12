CREATE TABLE "tb_vehicle_conditions" (
	"vehicle_id" integer NOT NULL,
	"conditions_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "tb_vehicle_conditions" ADD CONSTRAINT "tb_vehicle_conditions_vehicle_id_tb_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."tb_vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_vehicle_conditions" ADD CONSTRAINT "tb_vehicle_conditions_conditions_id_tb_conditions_id_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."tb_conditions"("id") ON DELETE no action ON UPDATE no action;