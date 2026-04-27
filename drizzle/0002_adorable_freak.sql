CREATE TYPE "public"."sort_code" AS ENUM('10-10-10');--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "sort_code" SET DEFAULT '10-10-10'::"public"."sort_code";--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "sort_code" SET DATA TYPE "public"."sort_code" USING "sort_code"::"public"."sort_code";