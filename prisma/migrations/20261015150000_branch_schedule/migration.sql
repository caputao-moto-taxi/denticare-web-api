ALTER TABLE "branches" ADD COLUMN "workingDays" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "branches" ADD COLUMN "workingHours" JSONB;
ALTER TABLE "branches" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Africa/Luanda';
