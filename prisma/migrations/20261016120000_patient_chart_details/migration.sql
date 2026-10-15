ALTER TABLE "Persons"
  ADD COLUMN "idNumber" TEXT,
  ADD COLUMN "nif" TEXT,
  ADD COLUMN "profession" TEXT,
  ADD COLUMN "bloodType" TEXT,
  ADD COLUMN "insuranceProvider" TEXT,
  ADD COLUMN "insurancePlan" TEXT,
  ADD COLUMN "insurancePolicyNumber" TEXT,
  ADD COLUMN "insuranceCoveragePercent" INTEGER,
  ADD COLUMN "emergencyContactName" TEXT,
  ADD COLUMN "emergencyContactRelationship" TEXT,
  ADD COLUMN "emergencyContactPhone" TEXT,
  ADD COLUMN "allergies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "medicalConditions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "medications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "diagnostics"
  ADD COLUMN "code" TEXT,
  ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'low',
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'monitoring',
  ADD COLUMN "affectedTeeth" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "treatment_plans"
  ADD COLUMN "estimatedCompletion" TIMESTAMP(3),
  ADD COLUMN "activePhase" TEXT;

CREATE TABLE "patient_teeth" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "patientId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "state" TEXT NOT NULL,
  "procedureDone" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patient_teeth_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patient_teeth_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "patient_teeth_patientId_number_key" ON "patient_teeth"("patientId", "number");
CREATE INDEX "patient_teeth_patientId_idx" ON "patient_teeth"("patientId");

CREATE TABLE "patient_prescriptions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "patientId" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL,
  "medication" TEXT NOT NULL,
  "dosage" TEXT NOT NULL,
  "instructions" TEXT NOT NULL,
  "duration" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "patient_prescriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patient_prescriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "patient_prescriptions_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "patient_prescriptions_patientId_deletedAt_idx" ON "patient_prescriptions"("patientId", "deletedAt");

CREATE TABLE "patient_financial_entries" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "patientId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "method" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'paid',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "patient_financial_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patient_financial_entries_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "patient_financial_entries_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "patient_financial_entries_reference_key" ON "patient_financial_entries"("reference");
CREATE INDEX "patient_financial_entries_branchId_patientId_deletedAt_idx" ON "patient_financial_entries"("branchId", "patientId", "deletedAt");

CREATE TABLE "patient_exams" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "patientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "doctorName" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "patient_exams_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patient_exams_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "patient_exams_storageKey_key" ON "patient_exams"("storageKey");
CREATE INDEX "patient_exams_patientId_deletedAt_idx" ON "patient_exams"("patientId", "deletedAt");
