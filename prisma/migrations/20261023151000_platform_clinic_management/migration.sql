ALTER TABLE "headquarters"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "platform_admin_audits" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "headquarterId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_admin_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "platform_admin_audits_headquarterId_createdAt_idx"
ON "platform_admin_audits"("headquarterId", "createdAt");
CREATE INDEX "platform_admin_audits_targetUserId_createdAt_idx"
ON "platform_admin_audits"("targetUserId", "createdAt");

ALTER TABLE "platform_admin_audits"
ADD CONSTRAINT "platform_admin_audits_headquarterId_fkey"
FOREIGN KEY ("headquarterId") REFERENCES "headquarters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "platform_admin_audits"
ADD CONSTRAINT "platform_admin_audits_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "platform_admin_audits"
ADD CONSTRAINT "platform_admin_audits_targetUserId_fkey"
FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
