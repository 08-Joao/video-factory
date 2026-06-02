CREATE TYPE "ProjectStatus" AS ENUM ('PENDING_SCRIPT', 'SCRIPT_GENERATED', 'SCRIPT_APPROVED', 'SCRIPT_REJECTED', 'TRANSLATING', 'AUDIO_GENERATING', 'VIDEO_EDITING', 'THUMBNAIL_GENERATING', 'READY_TO_PUBLISH', 'PUBLISHING', 'PUBLISHED', 'FAILED');
CREATE TYPE "WorkStatus" AS ENUM ('PENDING', 'GENERATING', 'EDITING', 'DONE', 'FAILED');
CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'DONE', 'FAILED');
CREATE TYPE "VideoType" AS ENUM ('LONG', 'SHORT');
CREATE TYPE "Platform" AS ENUM ('YOUTUBE', 'TIKTOK');
CREATE TYPE "PublishStatus" AS ENUM ('PENDING', 'UPLOADING', 'PUBLISHED', 'FAILED');

CREATE TABLE "User" ("id" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL, "name" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "User_pkey" PRIMARY KEY ("id"));
CREATE TABLE "UserSettings" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "viralScoreThreshold" DOUBLE PRECISION NOT NULL DEFAULT 7.0, "defaultLanguages" TEXT[] DEFAULT ARRAY['pt-BR','en-US','es-ES']::TEXT[], "defaultVoiceId" TEXT NOT NULL DEFAULT '21m00Tcm4TlvDq8ikWAM', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Project" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "theme" TEXT NOT NULL, "suggestion" TEXT, "status" "ProjectStatus" NOT NULL DEFAULT 'PENDING_SCRIPT', "viralScore" DOUBLE PRECISION, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Project_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Script" ("id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "content" TEXT NOT NULL, "summary" TEXT NOT NULL, "viralScore" DOUBLE PRECISION NOT NULL, "viralReason" TEXT NOT NULL, "language" TEXT NOT NULL DEFAULT 'pt-BR', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Script_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Translation" ("id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "language" TEXT NOT NULL, "content" TEXT NOT NULL, "summary" TEXT NOT NULL, "status" "TranslationStatus" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Translation_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AudioFile" ("id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "translationId" TEXT, "language" TEXT NOT NULL, "filePath" TEXT NOT NULL, "durationSeconds" DOUBLE PRECISION, "elevenLabsVoiceId" TEXT NOT NULL, "status" "WorkStatus" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AudioFile_pkey" PRIMARY KEY ("id"));
CREATE TABLE "BackgroundVideo" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "originalName" TEXT NOT NULL, "filePath" TEXT NOT NULL, "durationSeconds" DOUBLE PRECISION NOT NULL, "sizeBytes" BIGINT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "BackgroundVideo_pkey" PRIMARY KEY ("id"));
CREATE TABLE "VideoFile" ("id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "language" TEXT NOT NULL, "type" "VideoType" NOT NULL, "partNumber" INTEGER, "filePath" TEXT NOT NULL, "durationSeconds" DOUBLE PRECISION NOT NULL, "status" "WorkStatus" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "VideoFile_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Thumbnail" ("id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "filePath" TEXT NOT NULL, "prompt" TEXT NOT NULL, "status" "WorkStatus" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Thumbnail_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Channel" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "platform" "Platform" NOT NULL, "name" TEXT NOT NULL, "language" TEXT NOT NULL, "youtubeChannelId" TEXT, "youtubeAccessToken" TEXT, "youtubeRefreshToken" TEXT, "tiktokAccessToken" TEXT, "tiktokRefreshToken" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Channel_pkey" PRIMARY KEY ("id"));
CREATE TABLE "PublishJob" ("id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "channelId" TEXT NOT NULL, "videoFileId" TEXT NOT NULL, "status" "PublishStatus" NOT NULL DEFAULT 'PENDING', "youtubeVideoId" TEXT, "tiktokVideoId" TEXT, "errorMessage" TEXT, "scheduledAt" TIMESTAMP(3), "publishedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PublishJob_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
CREATE INDEX "Project_userId_createdAt_idx" ON "Project"("userId", "createdAt");
CREATE UNIQUE INDEX "Script_projectId_key" ON "Script"("projectId");
CREATE UNIQUE INDEX "Translation_projectId_language_key" ON "Translation"("projectId", "language");
CREATE UNIQUE INDEX "Thumbnail_projectId_key" ON "Thumbnail"("projectId");

ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Script" ADD CONSTRAINT "Script_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AudioFile" ADD CONSTRAINT "AudioFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AudioFile" ADD CONSTRAINT "AudioFile_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "Translation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BackgroundVideo" ADD CONSTRAINT "BackgroundVideo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoFile" ADD CONSTRAINT "VideoFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Thumbnail" ADD CONSTRAINT "Thumbnail_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublishJob" ADD CONSTRAINT "PublishJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublishJob" ADD CONSTRAINT "PublishJob_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublishJob" ADD CONSTRAINT "PublishJob_videoFileId_fkey" FOREIGN KEY ("videoFileId") REFERENCES "VideoFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
