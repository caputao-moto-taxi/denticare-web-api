/*
  Warnings:

  - You are about to drop the column `social_provider` on the `applications` table. All the data in the column will be lost.
  - Changed the type of `version_status` on the `applications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "applications" DROP COLUMN "social_provider",
DROP COLUMN "version_status",
ADD COLUMN     "version_status" "ApplicationVersionStatus" NOT NULL;
