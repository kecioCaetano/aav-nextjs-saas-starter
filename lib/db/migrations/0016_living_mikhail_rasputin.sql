CREATE TABLE "tb_quotes_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"quotes_id" integer,
	"vehicle_id" integer NOT NULL,
	"url_photo" text NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tb_quotes_photos" ADD CONSTRAINT "tb_quotes_photos_quotes_id_tb_quotes_id_fk" FOREIGN KEY ("quotes_id") REFERENCES "public"."tb_quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_quotes_photos" ADD CONSTRAINT "tb_quotes_photos_vehicle_id_tb_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."tb_vehicles"("id") ON DELETE no action ON UPDATE no action;