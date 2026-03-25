-- CreateEnum
CREATE TYPE "WorkoutType" AS ENUM ('STRENGTH', 'CARDIO', 'MOBILITY', 'HIIT', 'SPORTS', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkoutLogStatus" AS ENUM ('COMPLETED', 'PARTIAL', 'SKIPPED');

-- CreateTable
CREATE TABLE "workouts" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "WorkoutType" NOT NULL DEFAULT 'OTHER',
    "scheduled_date" DATE,
    "duration_minutes" INTEGER,
    "calories_target" INTEGER,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_logs" (
    "id" UUID NOT NULL,
    "workout_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "WorkoutLogStatus" NOT NULL DEFAULT 'COMPLETED',
    "duration_minutes" INTEGER,
    "calories_burned" INTEGER,
    "distance_meters" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workouts_team_id_idx" ON "workouts"("team_id");

-- CreateIndex
CREATE INDEX "workouts_created_by_idx" ON "workouts"("created_by");

-- CreateIndex
CREATE INDEX "workouts_scheduled_date_idx" ON "workouts"("scheduled_date");

-- CreateIndex
CREATE INDEX "workouts_is_archived_idx" ON "workouts"("is_archived");

-- CreateIndex
CREATE UNIQUE INDEX "workout_logs_workout_id_user_id_key" ON "workout_logs"("workout_id", "user_id");

-- CreateIndex
CREATE INDEX "workout_logs_workout_id_idx" ON "workout_logs"("workout_id");

-- CreateIndex
CREATE INDEX "workout_logs_user_id_idx" ON "workout_logs"("user_id");

-- CreateIndex
CREATE INDEX "workout_logs_status_idx" ON "workout_logs"("status");

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

