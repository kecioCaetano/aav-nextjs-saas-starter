CREATE TABLE "tb_makes" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tb_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tb_trims" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" text NOT NULL
);
