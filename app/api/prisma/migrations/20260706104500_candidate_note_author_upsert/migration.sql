-- Remove duplicate backend notes for the same candidate application and author before adding uniqueness.
-- Keep the most recently updated row.
WITH ranked_notes AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "candidate_application_id", "author_user_id"
      ORDER BY "updated_at" DESC, "created_at" DESC, "id" DESC
    ) AS "rank"
  FROM "candidate_notes"
)
DELETE FROM "candidate_notes"
WHERE "id" IN (
  SELECT "id"
  FROM ranked_notes
  WHERE "rank" > 1
);

-- One editable note per company user per candidate application.
CREATE UNIQUE INDEX "candidate_notes_candidate_application_id_author_user_id_key"
  ON "candidate_notes"("candidate_application_id", "author_user_id");
