CREATE TABLE "tb_companies_users_menus" (
	"company_users_id" integer NOT NULL,
	"menu_id" integer NOT NULL,
	"read-only" boolean NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tb_companies_users_menus" ADD CONSTRAINT "tb_companies_users_menus_company_users_id_tb_companies_users_id_fk" FOREIGN KEY ("company_users_id") REFERENCES "public"."tb_companies_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_companies_users_menus" ADD CONSTRAINT "tb_companies_users_menus_menu_id_tb_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."tb_menus"("id") ON DELETE no action ON UPDATE no action;