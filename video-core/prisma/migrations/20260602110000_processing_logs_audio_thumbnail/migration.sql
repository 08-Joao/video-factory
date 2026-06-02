ALTER TABLE "AudioFile" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'elevenlabs';
ALTER TABLE "AudioFile" ADD COLUMN "model" TEXT;
ALTER TABLE "AudioFile" ADD COLUMN "voice" TEXT;
ALTER TABLE "AudioFile" ADD COLUMN "attempt" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AudioFile" ADD COLUMN "errorMessage" TEXT;
ALTER TABLE "AudioFile" ADD COLUMN "errorStack" TEXT;

ALTER TABLE "Thumbnail" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'openai';
ALTER TABLE "Thumbnail" ADD COLUMN "model" TEXT;
ALTER TABLE "Thumbnail" ADD COLUMN "style" TEXT NOT NULL DEFAULT 'cartoon';
ALTER TABLE "Thumbnail" ADD COLUMN "width" INTEGER;
ALTER TABLE "Thumbnail" ADD COLUMN "height" INTEGER;
ALTER TABLE "Thumbnail" ADD COLUMN "errorMessage" TEXT;
ALTER TABLE "Thumbnail" ADD COLUMN "metadataJson" JSONB;
ALTER TABLE "Thumbnail" ADD COLUMN "generatedAt" TIMESTAMP(3);

CREATE TABLE "ProcessingLog" (
  "id" TEXT NOT NULL,
  "projectId" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "message" TEXT,
  "errorMessage" TEXT,
  "errorStack" TEXT,
  "provider" TEXT,
  "model" TEXT,
  "voice" TEXT,
  "attempt" INTEGER,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessingLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProcessingLog_projectId_action_createdAt_idx"
  ON "ProcessingLog"("projectId", "action", "createdAt");

CREATE INDEX "ProcessingLog_entityType_entityId_createdAt_idx"
  ON "ProcessingLog"("entityType", "entityId", "createdAt");

ALTER TABLE "ProcessingLog"
  ADD CONSTRAINT "ProcessingLog_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
