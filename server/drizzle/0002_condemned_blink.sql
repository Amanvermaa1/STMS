CREATE TABLE "passkey_credentials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"credential_id" varchar(255) NOT NULL,
	"public_key" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"device_type" varchar(20) DEFAULT 'single_device' NOT NULL,
	"backed_up" boolean DEFAULT false NOT NULL,
	"transports" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webauthn_challenges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" varchar(20) NOT NULL,
	"challenge" varchar(255) NOT NULL,
	"user_id" uuid,
	"user_identifier" varchar(254),
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "passkey_credentials" ADD CONSTRAINT "passkey_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webauthn_challenges" ADD CONSTRAINT "webauthn_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "passkey_credentials_credential_id_unique" ON "passkey_credentials" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "passkey_credentials_user_idx" ON "passkey_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webauthn_challenges_challenge_unique" ON "webauthn_challenges" USING btree ("challenge");--> statement-breakpoint
CREATE INDEX "webauthn_challenges_user_idx" ON "webauthn_challenges" USING btree ("user_id");