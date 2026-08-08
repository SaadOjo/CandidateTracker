# Final Product Design

Temporary product contract for turning the reference app into the real backend-backed product.

## Pages

- `01-projects/` — `/projects`
- `02-archived-projects/` — `/projects/archived`
- `03-project-form/` — `/projects/new`, `/projects/:projectId/edit`
- `04-project-pipeline/` — `/projects/:projectId/pipeline/:stage`
- `05-candidate-detail/` — `/projects/:projectId/candidates/:candidateId`
- `06-rejection-follow-up/` — `/rejection-follow-up`

## Shared Rules

- Roles, stage names, status names, and backend-owned workflow rules live in `00-shared/`.
- Database reasoning and the stage/status matrix live in `00-shared/`.
- Page docs describe what the user can see, choose, and do from that page.
- Prototype-only behavior is called out only when it affects backend design.
