CREATE TABLE "clinic_services" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "clinic_services_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "clinic_services_branchId_deletedAt_idx" ON "clinic_services"("branchId", "deletedAt");

ALTER TABLE "clinic_services" ADD CONSTRAINT "clinic_services_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;