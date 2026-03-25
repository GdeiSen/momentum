-- CreateTable
CREATE TABLE "team_channels" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_channel_messages" (
    "id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "media_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_channel_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_channels_team_id_slug_key" ON "team_channels"("team_id", "slug");

-- CreateIndex
CREATE INDEX "team_channels_team_id_idx" ON "team_channels"("team_id");

-- CreateIndex
CREATE INDEX "team_channels_created_by_idx" ON "team_channels"("created_by");

-- CreateIndex
CREATE INDEX "team_channels_is_archived_idx" ON "team_channels"("is_archived");

-- CreateIndex
CREATE INDEX "team_channel_messages_channel_id_idx" ON "team_channel_messages"("channel_id");

-- CreateIndex
CREATE INDEX "team_channel_messages_user_id_idx" ON "team_channel_messages"("user_id");

-- CreateIndex
CREATE INDEX "team_channel_messages_created_at_idx" ON "team_channel_messages"("created_at");

-- AddForeignKey
ALTER TABLE "team_channels" ADD CONSTRAINT "team_channels_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_channels" ADD CONSTRAINT "team_channels_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_channel_messages" ADD CONSTRAINT "team_channel_messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "team_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_channel_messages" ADD CONSTRAINT "team_channel_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
