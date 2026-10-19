CREATE TABLE "auth_action_tokens" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_action_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_action_tokens_tokenHash_key" ON "auth_action_tokens"("tokenHash");
CREATE INDEX "auth_action_tokens_userId_type_idx" ON "auth_action_tokens"("userId", "type");
CREATE INDEX "auth_action_tokens_expiresAt_idx" ON "auth_action_tokens"("expiresAt");

ALTER TABLE "auth_action_tokens" ADD CONSTRAINT "auth_action_tokens_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;