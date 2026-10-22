CREATE TABLE "patient_documents" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "patientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "formData" JSONB NOT NULL,
    "pdfBytes" BYTEA NOT NULL,
    "fileName" VARCHAR(180) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "patient_documents_branchId_createdAt_idx"
ON "patient_documents"("branchId", "createdAt");

CREATE INDEX "patient_documents_branchId_patientId_createdAt_idx"
ON "patient_documents"("branchId", "patientId", "createdAt");

ALTER TABLE "patient_documents"
ADD CONSTRAINT "patient_documents_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Persons"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "patient_documents"
ADD CONSTRAINT "patient_documents_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "patient_documents"
ADD CONSTRAINT "patient_documents_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "branches"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
