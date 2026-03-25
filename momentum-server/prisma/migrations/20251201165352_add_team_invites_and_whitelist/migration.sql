-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "require_email_whitelist" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "require_invite_code" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "team_invites" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_whitelist_emails" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_whitelist_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_invites_code_key" ON "team_invites"("code");

-- CreateIndex
CREATE INDEX "team_invites_team_id_idx" ON "team_invites"("team_id");

-- CreateIndex
CREATE INDEX "team_invites_code_idx" ON "team_invites"("code");

-- CreateIndex
CREATE INDEX "team_whitelist_emails_team_id_idx" ON "team_whitelist_emails"("team_id");

-- CreateIndex
CREATE INDEX "team_whitelist_emails_email_idx" ON "team_whitelist_emails"("email");

-- CreateIndex
CREATE UNIQUE INDEX "team_whitelist_emails_team_id_email_key" ON "team_whitelist_emails"("team_id", "email");

-- AddForeignKey
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_whitelist_emails" ADD CONSTRAINT "team_whitelist_emails_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
