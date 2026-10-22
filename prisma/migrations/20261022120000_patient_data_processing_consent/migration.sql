ALTER TABLE "Persons"
ADD COLUMN "dataProcessingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "dataProcessingConsentUpdatedAt" TIMESTAMP(3);
