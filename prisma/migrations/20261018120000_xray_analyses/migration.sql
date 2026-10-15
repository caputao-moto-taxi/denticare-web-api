CREATE TABLE "xray_analyses" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "patientId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "analyzedById" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "analysis" JSONB NOT NULL,
  "modelName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "xray_analyses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "xray_analyses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "xray_analyses_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "xray_analyses_analyzedById_fkey" FOREIGN KEY ("analyzedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "xray_analyses_storageKey_key" ON "xray_analyses"("storageKey");
CREATE INDEX "xray_analyses_branchId_createdAt_idx" ON "xray_analyses"("branchId", "createdAt");
CREATE INDEX "xray_analyses_branchId_patientId_createdAt_idx" ON "xray_analyses"("branchId", "patientId", "createdAt");
