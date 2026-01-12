/*
  Warnings:

  - The primary key for the `AccessHistory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `AccessHistory` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Audit` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Audit` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Log` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Log` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `LoginHistory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `LoginHistory` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Persons` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Persons` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Prescription` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Prescription` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `TreatmentPrice` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `TreatmentPrice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `addresses` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `addresses` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `appointments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `appointments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `benefits` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `benefits` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `branches` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `branches` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `clinic_proccesses` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `clinic_proccesses` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `consult_treatments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `consult_treatments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `consults` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `consults` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `currencies` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `currencies` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `diagnostics` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `diagnostics` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `headquarters` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `headquarters` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `messages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `messages` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `new_latters` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `new_latters` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `permissions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `plan_benefits` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `plan_benefits` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `plans` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `plans` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `prescription_items` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `prescription_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `products` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `products` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `role_permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `role_permissions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `roles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `roles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `sale_items` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `sale_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `sales` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `sales` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `prescriptionId` column on the `sales` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `treatments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `treatments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `user_branches` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `user_branches` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `user_roles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `user_roles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `addressId` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `roleId` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `branchId` on the `Persons` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `addressId` on the `Persons` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `consultationId` on the `Prescription` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `branchId` on the `TreatmentPrice` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `currencyId` on the `TreatmentPrice` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `treatmentId` on the `TreatmentPrice` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `patientId` on the `appointments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `doctorId` on the `appointments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `addressId` on the `branches` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `headquarterId` on the `branches` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `patientId` on the `clinic_proccesses` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `doctorId` on the `clinic_proccesses` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `consultId` on the `consult_treatments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `treatmentId` on the `consult_treatments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `patientId` on the `consults` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `doctorId` on the `consults` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `paidCurrencyId` on the `consults` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `patientId` on the `diagnostics` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `doctorId` on the `diagnostics` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `planId` on the `headquarters` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `planId` on the `plan_benefits` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `benefitId` on the `plan_benefits` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `currencyId` on the `plans` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `prescriptionId` on the `prescription_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `productId` on the `prescription_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `branchId` on the `products` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `roleId` on the `role_permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `permissionId` on the `role_permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `saleId` on the `sale_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `productId` on the `sale_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `branchId` on the `sales` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `user_branches` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `branchId` on the `user_branches` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `user_roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `roleId` on the `user_roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `branchId` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Persons" DROP CONSTRAINT "Persons_addressId_fkey";

-- DropForeignKey
ALTER TABLE "Persons" DROP CONSTRAINT "Persons_branchId_fkey";

-- DropForeignKey
ALTER TABLE "Prescription" DROP CONSTRAINT "Prescription_consultationId_fkey";

-- DropForeignKey
ALTER TABLE "TreatmentPrice" DROP CONSTRAINT "TreatmentPrice_branchId_fkey";

-- DropForeignKey
ALTER TABLE "TreatmentPrice" DROP CONSTRAINT "TreatmentPrice_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "TreatmentPrice" DROP CONSTRAINT "TreatmentPrice_treatmentId_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_patientId_fkey";

-- DropForeignKey
ALTER TABLE "branches" DROP CONSTRAINT "branches_addressId_fkey";

-- DropForeignKey
ALTER TABLE "branches" DROP CONSTRAINT "branches_headquarterId_fkey";

-- DropForeignKey
ALTER TABLE "clinic_proccesses" DROP CONSTRAINT "clinic_proccesses_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "clinic_proccesses" DROP CONSTRAINT "clinic_proccesses_patientId_fkey";

-- DropForeignKey
ALTER TABLE "consult_treatments" DROP CONSTRAINT "consult_treatments_consultId_fkey";

-- DropForeignKey
ALTER TABLE "consult_treatments" DROP CONSTRAINT "consult_treatments_treatmentId_fkey";

-- DropForeignKey
ALTER TABLE "consults" DROP CONSTRAINT "consults_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "consults" DROP CONSTRAINT "consults_paidCurrencyId_fkey";

-- DropForeignKey
ALTER TABLE "consults" DROP CONSTRAINT "consults_patientId_fkey";

-- DropForeignKey
ALTER TABLE "diagnostics" DROP CONSTRAINT "diagnostics_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "diagnostics" DROP CONSTRAINT "diagnostics_patientId_fkey";

-- DropForeignKey
ALTER TABLE "headquarters" DROP CONSTRAINT "headquarters_planId_fkey";

-- DropForeignKey
ALTER TABLE "plan_benefits" DROP CONSTRAINT "plan_benefits_benefitId_fkey";

-- DropForeignKey
ALTER TABLE "plan_benefits" DROP CONSTRAINT "plan_benefits_planId_fkey";

-- DropForeignKey
ALTER TABLE "plans" DROP CONSTRAINT "plans_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "prescription_items" DROP CONSTRAINT "prescription_items_prescriptionId_fkey";

-- DropForeignKey
ALTER TABLE "prescription_items" DROP CONSTRAINT "prescription_items_productId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_branchId_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_roleId_fkey";

-- DropForeignKey
ALTER TABLE "sale_items" DROP CONSTRAINT "sale_items_productId_fkey";

-- DropForeignKey
ALTER TABLE "sale_items" DROP CONSTRAINT "sale_items_saleId_fkey";

-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT "sales_branchId_fkey";

-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT "sales_prescriptionId_fkey";

-- DropForeignKey
ALTER TABLE "user_branches" DROP CONSTRAINT "user_branches_branchId_fkey";

-- DropForeignKey
ALTER TABLE "user_branches" DROP CONSTRAINT "user_branches_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_roleId_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_userId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_addressId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_branchId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_roleId_fkey";

-- AlterTable
ALTER TABLE "AccessHistory" DROP CONSTRAINT "AccessHistory_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "AccessHistory_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Audit" DROP CONSTRAINT "Audit_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "Audit_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Log" DROP CONSTRAINT "Log_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "Log_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "LoginHistory" DROP CONSTRAINT "LoginHistory_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "LoginHistory_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Persons" DROP CONSTRAINT "Persons_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "branchId",
ADD COLUMN     "branchId" UUID NOT NULL,
DROP COLUMN "addressId",
ADD COLUMN     "addressId" UUID NOT NULL,
ADD CONSTRAINT "Persons_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Prescription" DROP CONSTRAINT "Prescription_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "consultationId",
ADD COLUMN     "consultationId" UUID NOT NULL,
ADD CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TreatmentPrice" DROP CONSTRAINT "TreatmentPrice_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "branchId",
ADD COLUMN     "branchId" UUID NOT NULL,
DROP COLUMN "currencyId",
ADD COLUMN     "currencyId" UUID NOT NULL,
DROP COLUMN "treatmentId",
ADD COLUMN     "treatmentId" UUID NOT NULL,
ADD CONSTRAINT "TreatmentPrice_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "addresses" DROP CONSTRAINT "addresses_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "patientId",
ADD COLUMN     "patientId" UUID NOT NULL,
DROP COLUMN "doctorId",
ADD COLUMN     "doctorId" UUID NOT NULL,
ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "benefits" DROP CONSTRAINT "benefits_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "benefits_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "branches" DROP CONSTRAINT "branches_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "addressId",
ADD COLUMN     "addressId" UUID NOT NULL,
DROP COLUMN "headquarterId",
ADD COLUMN     "headquarterId" UUID NOT NULL,
ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "clinic_proccesses" DROP CONSTRAINT "clinic_proccesses_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "patientId",
ADD COLUMN     "patientId" UUID NOT NULL,
DROP COLUMN "doctorId",
ADD COLUMN     "doctorId" UUID NOT NULL,
ADD CONSTRAINT "clinic_proccesses_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "consult_treatments" DROP CONSTRAINT "consult_treatments_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "consultId",
ADD COLUMN     "consultId" UUID NOT NULL,
DROP COLUMN "treatmentId",
ADD COLUMN     "treatmentId" UUID NOT NULL,
ADD CONSTRAINT "consult_treatments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "consults" DROP CONSTRAINT "consults_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "patientId",
ADD COLUMN     "patientId" UUID NOT NULL,
DROP COLUMN "doctorId",
ADD COLUMN     "doctorId" UUID NOT NULL,
DROP COLUMN "paidCurrencyId",
ADD COLUMN     "paidCurrencyId" UUID NOT NULL,
ADD CONSTRAINT "consults_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "currencies" DROP CONSTRAINT "currencies_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "currencies_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "diagnostics" DROP CONSTRAINT "diagnostics_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "patientId",
ADD COLUMN     "patientId" UUID NOT NULL,
DROP COLUMN "doctorId",
ADD COLUMN     "doctorId" UUID NOT NULL,
ADD CONSTRAINT "diagnostics_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "headquarters" DROP CONSTRAINT "headquarters_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "planId",
ADD COLUMN     "planId" UUID NOT NULL,
ADD CONSTRAINT "headquarters_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "messages" DROP CONSTRAINT "messages_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "new_latters" DROP CONSTRAINT "new_latters_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "new_latters_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "plan_benefits" DROP CONSTRAINT "plan_benefits_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "planId",
ADD COLUMN     "planId" UUID NOT NULL,
DROP COLUMN "benefitId",
ADD COLUMN     "benefitId" UUID NOT NULL,
ADD CONSTRAINT "plan_benefits_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "plans" DROP CONSTRAINT "plans_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "currencyId",
ADD COLUMN     "currencyId" UUID NOT NULL,
ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "prescription_items" DROP CONSTRAINT "prescription_items_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "prescriptionId",
ADD COLUMN     "prescriptionId" UUID NOT NULL,
DROP COLUMN "productId",
ADD COLUMN     "productId" UUID NOT NULL,
ADD CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "products" DROP CONSTRAINT "products_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "branchId",
ADD COLUMN     "branchId" UUID NOT NULL,
ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "roleId",
ADD COLUMN     "roleId" UUID NOT NULL,
DROP COLUMN "permissionId",
ADD COLUMN     "permissionId" UUID NOT NULL,
ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "roles" DROP CONSTRAINT "roles_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "sale_items" DROP CONSTRAINT "sale_items_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "saleId",
ADD COLUMN     "saleId" UUID NOT NULL,
DROP COLUMN "productId",
ADD COLUMN     "productId" UUID NOT NULL,
ADD CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "sales" DROP CONSTRAINT "sales_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "prescriptionId",
ADD COLUMN     "prescriptionId" UUID,
DROP COLUMN "branchId",
ADD COLUMN     "branchId" UUID NOT NULL,
ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "treatments" DROP CONSTRAINT "treatments_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "treatments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_branches" DROP CONSTRAINT "user_branches_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
DROP COLUMN "branchId",
ADD COLUMN     "branchId" UUID NOT NULL,
ADD CONSTRAINT "user_branches_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
DROP COLUMN "roleId",
ADD COLUMN     "roleId" UUID NOT NULL,
ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "branchId",
ADD COLUMN     "branchId" UUID NOT NULL,
DROP COLUMN "addressId",
ADD COLUMN     "addressId" UUID,
DROP COLUMN "roleId",
ADD COLUMN     "roleId" UUID,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "consult_treatments_consultId_treatmentId_key" ON "consult_treatments"("consultId", "treatmentId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_benefits_planId_benefitId_key" ON "plan_benefits"("planId", "benefitId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "user_branches_userId_branchId_key" ON "user_branches"("userId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_key" ON "user_roles"("userId", "roleId");

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_benefits" ADD CONSTRAINT "plan_benefits_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_benefits" ADD CONSTRAINT "plan_benefits_benefitId_fkey" FOREIGN KEY ("benefitId") REFERENCES "benefits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "headquarters" ADD CONSTRAINT "headquarters_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_headquarterId_fkey" FOREIGN KEY ("headquarterId") REFERENCES "headquarters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persons" ADD CONSTRAINT "Persons_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persons" ADD CONSTRAINT "Persons_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consults" ADD CONSTRAINT "consults_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consults" ADD CONSTRAINT "consults_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consults" ADD CONSTRAINT "consults_paidCurrencyId_fkey" FOREIGN KEY ("paidCurrencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consult_treatments" ADD CONSTRAINT "consult_treatments_consultId_fkey" FOREIGN KEY ("consultId") REFERENCES "consults"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consult_treatments" ADD CONSTRAINT "consult_treatments_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "treatments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPrice" ADD CONSTRAINT "TreatmentPrice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPrice" ADD CONSTRAINT "TreatmentPrice_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPrice" ADD CONSTRAINT "TreatmentPrice_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "treatments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consults"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_proccesses" ADD CONSTRAINT "clinic_proccesses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_proccesses" ADD CONSTRAINT "clinic_proccesses_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostics" ADD CONSTRAINT "diagnostics_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostics" ADD CONSTRAINT "diagnostics_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
