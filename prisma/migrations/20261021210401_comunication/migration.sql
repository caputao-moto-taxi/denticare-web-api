-- AlterTable
DO $$
BEGIN
    IF to_regclass('public.communication_campaigns') IS NOT NULL THEN
        ALTER TABLE "communication_campaigns" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
    END IF;
END
$$;