CREATE TABLE "communication_campaigns" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "branchId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "channel" VARCHAR(16) NOT NULL,
    "subject" VARCHAR(200),
    "body" TEXT NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'SENDING',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "communication_campaigns_branchId_createdAt_idx"
ON "communication_campaigns"("branchId", "createdAt");

ALTER TABLE "communication_campaigns"
ADD CONSTRAINT "communication_campaigns_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "communication_campaigns"
ADD CONSTRAINT "communication_campaigns_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
