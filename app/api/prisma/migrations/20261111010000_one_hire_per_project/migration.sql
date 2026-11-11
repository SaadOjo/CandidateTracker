-- Partial unique indexes are maintained in SQL because Prisma 6 cannot model them.
-- Existing duplicate acceptances must be reviewed; this migration does not remove data.
CREATE UNIQUE INDEX "candidate_applications_one_hire_per_project"
ON "candidate_applications" ("project_id")
WHERE "status" = 'offer_accepted';
