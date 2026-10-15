ALTER TABLE "patient_prescriptions"
  ADD COLUMN "groupId" TEXT;

CREATE INDEX "patient_prescriptions_groupId_idx"
  ON "patient_prescriptions"("groupId");
