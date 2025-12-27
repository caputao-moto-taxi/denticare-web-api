/*
  Warnings:

  - You are about to drop the `Logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `applications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Logs" DROP CONSTRAINT "Logs_notification_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_application_id_fkey";

-- DropTable
DROP TABLE "Logs";

-- DropTable
DROP TABLE "applications";

-- DropTable
DROP TABLE "notifications";

-- CreateTable
CREATE TABLE "notification_applications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "version_status" "ApplicationVersionStatus" NOT NULL,
    "refresh_api_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_notifications" (
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

    CONSTRAINT "notification_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
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

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_applications_api_key_key" ON "notification_applications"("api_key");

-- CreateIndex
CREATE INDEX "idx_app_name" ON "notification_applications"("name");

-- CreateIndex
CREATE INDEX "idx_app_api_key" ON "notification_applications"("api_key");

-- CreateIndex
CREATE INDEX "idx_notification_application_id" ON "notification_notifications"("application_id");

-- CreateIndex
CREATE INDEX "idx_notification_type" ON "notification_notifications"("type");

-- CreateIndex
CREATE INDEX "idx_notification_status" ON "notification_notifications"("status");

-- CreateIndex
CREATE INDEX "idx_log_notification_id" ON "notification_logs"("notification_id");

-- CreateIndex
CREATE INDEX "idx_log_type" ON "notification_logs"("type");

-- CreateIndex
CREATE INDEX "idx_log_status_code" ON "notification_logs"("status_code");

-- AddForeignKey
ALTER TABLE "notification_notifications" ADD CONSTRAINT "notification_notifications_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "notification_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notification_notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
