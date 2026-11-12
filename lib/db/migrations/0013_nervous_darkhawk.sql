ALTER TABLE "tb_vehicles" DROP CONSTRAINT "tb_vehicles_pkey";--> statement-breakpoint
ALTER TABLE "tb_vehicles" ADD COLUMN "id" serial PRIMARY KEY NOT NULL;--> statement-breakpoint
CREATE INDEX "tb_vehicles_vim_idx" ON "tb_vehicles" USING btree ("vim");