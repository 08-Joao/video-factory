ALTER TABLE "UserSettings" ALTER COLUMN "autoRunAfterApproval" SET DEFAULT false;
UPDATE "UserSettings" SET "autoRunAfterApproval" = false;
