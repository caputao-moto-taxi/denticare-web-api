ALTER TABLE "Persons"
ADD COLUMN "marketingEmailConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "marketingEmailConsentUpdatedAt" TIMESTAMP(3),
ADD COLUMN "marketingSmsConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "marketingSmsConsentUpdatedAt" TIMESTAMP(3);
