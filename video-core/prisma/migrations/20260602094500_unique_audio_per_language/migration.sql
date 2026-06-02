WITH ranked_audio AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "projectId", language
      ORDER BY
        CASE WHEN status = 'DONE' THEN 0 ELSE 1 END,
        "updatedAt" DESC,
        "createdAt" DESC
    ) AS rn
  FROM "AudioFile"
)
DELETE FROM "AudioFile"
WHERE id IN (
  SELECT id FROM ranked_audio WHERE rn > 1
);

CREATE UNIQUE INDEX "AudioFile_projectId_language_key"
  ON "AudioFile"("projectId", "language");
