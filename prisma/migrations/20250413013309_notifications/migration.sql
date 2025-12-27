-- CreateEnum
CREATE TYPE "ApplicationVersionStatus" AS ENUM ('DEVELOPMENT', 'STAGING', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "TypeLog" AS ENUM ('ERROR', 'WARNING', 'INFO');

-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'DISCORD', 'SLACK', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELED', 'RE_SCHEDULED', 'ScHEDULED');

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "version_status" TEXT NOT NULL,
    "social_provider" "ApplicationVersionStatus" NOT NULL,
    "refresh_api_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "TypeNotification" NOT NULL,
    "receipts" TEXT[],
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "sendt_at" TIMESTAMP(3),
    "application_id" TEXT NOT NULL,
    "re_scheduled_at" TIMESTAMP(3),
    "status" "NotificationStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Logs" (
    "id" TEXT NOT NULL,
    "error" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "TypeLog" NOT NULL,
    "status_code" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retry_count" INTEGER,
    "notification_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "applications_api_key_key" ON "applications"("api_key");

-- CreateIndex
CREATE INDEX "idx_app_name" ON "applications"("name");

-- CreateIndex
CREATE INDEX "idx_app_api_key" ON "applications"("api_key");

-- CreateIndex
CREATE INDEX "idx_notification_application_id" ON "notifications"("application_id");

-- CreateIndex
CREATE INDEX "idx_notification_type" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "idx_notification_status" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "idx_log_notification_id" ON "Logs"("notification_id");

-- CreateIndex
CREATE INDEX "idx_log_type" ON "Logs"("type");

-- CreateIndex
CREATE INDEX "idx_log_status_code" ON "Logs"("status_code");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
