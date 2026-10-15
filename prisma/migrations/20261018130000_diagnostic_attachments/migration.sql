CREATE TABLE "diagnostic_attachments" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "diagnosisId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "diagnostic_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "diagnostic_attachments_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "diagnostics"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "diagnostic_attachments_storageKey_key" ON "diagnostic_attachments"("storageKey");
CREATE INDEX "diagnostic_attachments_diagnosisId_deletedAt_idx" ON "diagnostic_attachments"("diagnosisId", "deletedAt");
