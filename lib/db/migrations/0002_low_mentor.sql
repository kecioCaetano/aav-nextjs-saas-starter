CREATE TABLE "tb_menus" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"url" text,
	"menu_id" integer
);
--> statement-breakpoint
ALTER TABLE "tb_menus" ADD CONSTRAINT "tb_menus_menu_id_tb_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."tb_menus"("id") ON DELETE no action ON UPDATE no action;