CREATE TABLE "tb_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"address_line1" text,
	"address_line2" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"postal_code" text NOT NULL,
	"country_code" text NOT NULL,
	"address_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
