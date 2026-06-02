ALTER TABLE "UserSettings" ADD COLUMN "autoRunAfterApproval" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Script" ADD COLUMN "narratorGender" TEXT NOT NULL DEFAULT 'female';

CREATE UNIQUE INDEX "VideoFile_projectId_language_type_partNumber_key"
  ON "VideoFile"("projectId", "language", "type", "partNumber");
