ALTER TABLE "tb_pessoa" RENAME TO "tb_people";--> statement-breakpoint
ALTER TABLE "tb_people" DROP CONSTRAINT "tb_pessoa_company_id_tb_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "tb_people" ADD CONSTRAINT "tb_people_company_id_tb_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."tb_companies"("id") ON DELETE no action ON UPDATE no action;