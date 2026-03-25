-- CreateTable
CREATE TABLE "permissions" (
    "code" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "team_role_templates" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_role_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_role_permissions" (
    "id" UUID NOT NULL,
    "role_template_id" UUID NOT NULL,
    "permission_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_member_role_assignments" (
    "id" UUID NOT NULL,
    "team_member_id" UUID NOT NULL,
    "role_template_id" UUID NOT NULL,
    "assigned_by" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_member_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_role_templates_team_id_name_key" ON "team_role_templates"("team_id", "name");

-- CreateIndex
CREATE INDEX "team_role_templates_team_id_idx" ON "team_role_templates"("team_id");

-- CreateIndex
CREATE INDEX "team_role_templates_created_by_idx" ON "team_role_templates"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "team_role_permissions_role_template_id_permission_code_key" ON "team_role_permissions"("role_template_id", "permission_code");

-- CreateIndex
CREATE INDEX "team_role_permissions_role_template_id_idx" ON "team_role_permissions"("role_template_id");

-- CreateIndex
CREATE INDEX "team_role_permissions_permission_code_idx" ON "team_role_permissions"("permission_code");

-- CreateIndex
CREATE UNIQUE INDEX "team_member_role_assignments_team_member_id_role_template_id_key" ON "team_member_role_assignments"("team_member_id", "role_template_id");

-- CreateIndex
CREATE INDEX "team_member_role_assignments_team_member_id_idx" ON "team_member_role_assignments"("team_member_id");

-- CreateIndex
CREATE INDEX "team_member_role_assignments_role_template_id_idx" ON "team_member_role_assignments"("role_template_id");

-- CreateIndex
CREATE INDEX "team_member_role_assignments_assigned_by_idx" ON "team_member_role_assignments"("assigned_by");

-- AddForeignKey
ALTER TABLE "team_role_templates" ADD CONSTRAINT "team_role_templates_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_role_templates" ADD CONSTRAINT "team_role_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_role_permissions" ADD CONSTRAINT "team_role_permissions_role_template_id_fkey" FOREIGN KEY ("role_template_id") REFERENCES "team_role_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_role_permissions" ADD CONSTRAINT "team_role_permissions_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "permissions"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member_role_assignments" ADD CONSTRAINT "team_member_role_assignments_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member_role_assignments" ADD CONSTRAINT "team_member_role_assignments_role_template_id_fkey" FOREIGN KEY ("role_template_id") REFERENCES "team_role_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member_role_assignments" ADD CONSTRAINT "team_member_role_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed baseline permissions (idempotent)
INSERT INTO "permissions" ("code", "description") VALUES
  ('roles.manage', 'Create, update and delete custom role templates.'),
  ('roles.assign', 'Assign and unassign role templates to team members.'),
  ('permissions.view', 'View effective permissions in a team.'),
  ('channels.create', 'Create team channels.'),
  ('channels.manage', 'Manage team channels and access rules.'),
  ('messages.moderate', 'Moderate team messages.'),
  ('members.invite', 'Invite users into team.'),
  ('members.remove', 'Remove members from team.'),
  ('members.block', 'Block and unblock team members.'),
  ('posts.create', 'Create posts in team feed.'),
  ('posts.moderate', 'Moderate team posts.'),
  ('workspace.update', 'Update workspace/team settings.'),
  ('workspace.analytics.view', 'View team analytics and statistics.')
ON CONFLICT ("code") DO NOTHING;
