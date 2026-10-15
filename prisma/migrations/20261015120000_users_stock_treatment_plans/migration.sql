ALTER TABLE "chat_conversations" ADD COLUMN "starterLastReadAt" TIMESTAMP(3);
ALTER TABLE "chat_conversations" ADD COLUMN "recipientLastReadAt" TIMESTAMP(3);

CREATE TABLE "stock_items" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "supplier" TEXT NOT NULL,
    "notes" TEXT,
    "lastRestockAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stock_items_quantity_check" CHECK ("quantity" >= 0),
    CONSTRAINT "stock_items_capacity_check" CHECK ("capacity" > 0)
);
CREATE INDEX "stock_items_branchId_deletedAt_idx" ON "stock_items"("branchId", "deletedAt");
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "treatment_plans" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "branchId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "notes" TEXT,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "totalSteps" INTEGER NOT NULL,
    "completedSteps" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "treatment_plans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "treatment_plans_steps_check"
        CHECK ("totalSteps" > 0 AND "completedSteps" >= 0 AND "completedSteps" <= "totalSteps")
);
CREATE INDEX "treatment_plans_branchId_deletedAt_idx" ON "treatment_plans"("branchId", "deletedAt");
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
