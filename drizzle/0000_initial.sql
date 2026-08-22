CREATE TABLE "briefs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" varchar(120) NOT NULL,
	"description" text NOT NULL,
	"content_type" text NOT NULL,
	"target_audience" varchar(500) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brief_id" uuid NOT NULL,
	"status" varchar(16) NOT NULL,
	"result" jsonb,
	"failure_code" varchar(32),
	"failure_message" varchar(240),
	"provider" varchar(24) NOT NULL,
	"model" varchar(80) NOT NULL,
	"prompt_version" varchar(24) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "analyses_brief_id_unique" UNIQUE("brief_id")
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_brief_id_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."briefs"("id") ON DELETE cascade ON UPDATE no action;
