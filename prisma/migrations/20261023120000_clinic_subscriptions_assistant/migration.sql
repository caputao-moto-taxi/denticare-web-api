ALTER TABLE "plans"
ADD COLUMN "subscriptionPrice" DECIMAL(12,2),
ADD COLUMN "subscriptionMonths" INTEGER,
ADD COLUMN "isSubscriptionOption" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "plans_subscriptionMonths_key" ON "plans"("subscriptionMonths");
CREATE INDEX "plans_isSubscriptionOption_deletedAt_idx"
ON "plans"("isSubscriptionOption", "deletedAt");

ALTER TABLE "plans"
ADD CONSTRAINT "plans_subscription_option_fields_check"
CHECK (
    NOT "isSubscriptionOption"
    OR ("subscriptionMonths" IS NOT NULL AND "subscriptionPrice" IS NOT NULL)
);

CREATE TYPE "ClinicSubscriptionStatus" AS ENUM (
    'TRIAL_ACTIVE',
    'TRIAL_EXPIRED',
    'ACTIVE',
    'EXPIRING_SOON',
    'EXPIRED',
    'CANCELLED'
);

CREATE TYPE "SubscriptionRequestStatus" AS ENUM (
    'PENDING',
    'UNDER_REVIEW',
    'INFORMATION_REQUESTED',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);

CREATE TYPE "AssistantMessageRole" AS ENUM ('USER', 'ASSISTANT');

CREATE TABLE "clinic_subscriptions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "headquarterId" TEXT NOT NULL,
    "planId" TEXT,
    "status" "ClinicSubscriptionStatus" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "planNameSnapshot" TEXT,
    "durationMonths" INTEGER,
    "approvedAmount" DECIMAL(12,2),
    "originalAmount" DECIMAL(12,2),
    "savingsAmount" DECIMAL(12,2),
    "discountPercent" DECIMAL(5,2),
    "currencyCode" TEXT NOT NULL DEFAULT 'AOA',
    "approvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "clinic_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscription_requests" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "headquarterId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "subscriptionId" TEXT,
    "status" "SubscriptionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'AOA',
    "paymentReference" TEXT,
    "notes" TEXT,
    "clinicResponse" TEXT,
    "informationRequest" TEXT,
    "rejectionReason" TEXT,
    "proofStorageKey" TEXT NOT NULL,
    "proofMimeType" TEXT NOT NULL,
    "proofOriginalFileName" TEXT NOT NULL,
    "proofSizeBytes" INTEGER NOT NULL,
    "planNameSnapshot" TEXT NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "originalAmount" DECIMAL(12,2) NOT NULL,
    "requestedAmount" DECIMAL(12,2) NOT NULL,
    "savingsAmount" DECIMAL(12,2) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscription_requests_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "subscription_requests"
ADD CONSTRAINT "subscription_requests_amount_paid_matches_price_check"
CHECK ("amountPaid" > 0 AND "amountPaid" = "requestedAmount");
ALTER TABLE "subscription_requests"
ADD CONSTRAINT "subscription_requests_proof_size_check"
CHECK ("proofSizeBytes" > 0 AND "proofSizeBytes" <= 5242880);

CREATE TABLE "subscription_audits" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "requestId" TEXT,
    "headquarterId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscription_audits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscription_settings" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "bankName" TEXT NOT NULL,
    "accountHolder" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "estimatedReviewHours" INTEGER NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscription_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_outbox" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "dedupeKey" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assistant_conversations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "headquarterId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "assistant_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assistant_messages" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AssistantMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assistant_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_requests_subscriptionId_key"
ON "subscription_requests"("subscriptionId");
CREATE UNIQUE INDEX "subscription_requests_headquarterId_idempotencyKey_key"
ON "subscription_requests"("headquarterId", "idempotencyKey");
CREATE UNIQUE INDEX "subscription_requests_one_open_per_headquarter"
ON "subscription_requests"("headquarterId")
WHERE "status" IN ('PENDING', 'UNDER_REVIEW', 'INFORMATION_REQUESTED');
CREATE INDEX "clinic_subscriptions_headquarterId_status_expiresAt_idx"
ON "clinic_subscriptions"("headquarterId", "status", "expiresAt");
CREATE INDEX "clinic_subscriptions_headquarterId_startsAt_idx"
ON "clinic_subscriptions"("headquarterId", "startsAt");
CREATE INDEX "subscription_requests_headquarterId_status_submittedAt_idx"
ON "subscription_requests"("headquarterId", "status", "submittedAt");
CREATE INDEX "subscription_requests_status_submittedAt_idx"
ON "subscription_requests"("status", "submittedAt");
CREATE INDEX "subscription_audits_headquarterId_createdAt_idx"
ON "subscription_audits"("headquarterId", "createdAt");
CREATE INDEX "subscription_audits_requestId_createdAt_idx"
ON "subscription_audits"("requestId", "createdAt");
CREATE UNIQUE INDEX "notification_outbox_dedupeKey_key"
ON "notification_outbox"("dedupeKey");
CREATE INDEX "notification_outbox_sentAt_nextAttemptAt_idx"
ON "notification_outbox"("sentAt", "nextAttemptAt");
CREATE INDEX "assistant_conversations_headquarterId_userId_updatedAt_idx"
ON "assistant_conversations"("headquarterId", "userId", "updatedAt");
CREATE INDEX "assistant_conversations_expiresAt_idx"
ON "assistant_conversations"("expiresAt");
CREATE INDEX "assistant_messages_conversationId_createdAt_idx"
ON "assistant_messages"("conversationId", "createdAt");

CREATE UNIQUE INDEX "clinic_subscriptions_one_current_per_headquarter"
ON "clinic_subscriptions"("headquarterId")
WHERE "status" IN ('TRIAL_ACTIVE', 'ACTIVE', 'EXPIRING_SOON');

ALTER TABLE "clinic_subscriptions"
ADD CONSTRAINT "clinic_subscriptions_headquarterId_fkey"
FOREIGN KEY ("headquarterId") REFERENCES "headquarters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinic_subscriptions"
ADD CONSTRAINT "clinic_subscriptions_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clinic_subscriptions"
ADD CONSTRAINT "clinic_subscriptions_approvedByUserId_fkey"
FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subscription_requests"
ADD CONSTRAINT "subscription_requests_headquarterId_fkey"
FOREIGN KEY ("headquarterId") REFERENCES "headquarters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscription_requests"
ADD CONSTRAINT "subscription_requests_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscription_requests"
ADD CONSTRAINT "subscription_requests_submittedByUserId_fkey"
FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscription_requests"
ADD CONSTRAINT "subscription_requests_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_requests"
ADD CONSTRAINT "subscription_requests_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "clinic_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subscription_audits"
ADD CONSTRAINT "subscription_audits_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "subscription_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_audits"
ADD CONSTRAINT "subscription_audits_headquarterId_fkey"
FOREIGN KEY ("headquarterId") REFERENCES "headquarters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscription_audits"
ADD CONSTRAINT "subscription_audits_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "subscription_settings"
ADD CONSTRAINT "subscription_settings_updatedByUserId_fkey"
FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "assistant_conversations"
ADD CONSTRAINT "assistant_conversations_headquarterId_fkey"
FOREIGN KEY ("headquarterId") REFERENCES "headquarters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assistant_conversations"
ADD CONSTRAINT "assistant_conversations_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assistant_conversations"
ADD CONSTRAINT "assistant_conversations_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "assistant_messages"
ADD CONSTRAINT "assistant_messages_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "assistant_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assistant_messages"
ADD CONSTRAINT "assistant_messages_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "roles" ("name", "description", "slug", "isSystem", "createdAt", "updatedAt")
VALUES ('Platform owner', 'Global DentCare platform administrator', 'platform_owner', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
