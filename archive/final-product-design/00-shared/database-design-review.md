# Database Design Review

This note captures current schema questions before implementation.

## OIDC

OIDC means OpenID Connect.

It is the identity layer commonly used with OAuth 2.0. In this product, it means users sign in through an external identity provider, such as Microsoft Entra ID, and we store the provider subject on `users`.

## Project Integrations

Do not put `linkedin_project_id` directly on `projects` as the long-term model.

LinkedIn is one possible source, not the project itself. The scalable shape is:

```txt
external_references
  id
  owner_type
  owner_id
  provider
  external_id
  external_url
  created_at
  updated_at
```

Examples:

```txt
owner_type=project    owner_id=p1    provider=linkedin    external_id=LI-123
owner_type=candidate  owner_id=c1    provider=linkedin    external_id=LI-CAND-456
```

If integrations become active sync jobs, add:

```txt
integration_connections
sync_runs
```

Keep those out until we know we are actually syncing.

## Hired Application On Project

`projects.hired_application_id` is optional.

Why store it:

- It records the final project outcome explicitly.
- It makes archived project summaries simple.
- It avoids ambiguity if historical offer/application rows later change.

Why not store it:

- It duplicates information that can be derived from an accepted offer.
- It must be kept consistent with `offers`, `candidate_applications`, and project closure state.

Recommendation:

Use it only as a nullable closure field, set in the same transaction as offer acceptance and project closure.

Do not use it as the source of active offer logic. Offer logic should come from `offers` and `project_offer_queue_items`.

## Files In Postgres

For now, storing files in Postgres is acceptable if we want one system to operate.

Still keep a `files` table. The table gives metadata, ownership, and download behavior. The file bytes can be stored in a `bytea` column for now.

Minimal version:

```txt
files
  id
  owner_type
  owner_id
  kind
  file_name
  mime_type
  size_bytes
  content
  created_by_user_id
  created_at
```

Field reasons:

- `owner_type`, `owner_id`: attaches the file to a candidate, candidate application, or project.
- `kind`: distinguishes resume, portfolio, and attachment.
- `file_name`: preserves display/download name.
- `mime_type`: required for correct download response.
- `size_bytes`: supports validation and user display.
- `content`: actual file bytes in Postgres for the first version.
- `created_by_user_id`: audit trail.

If this feels too generic for v1, use `candidate_files` instead. The generic `files` table is better if project attachments or portfolio files are likely soon.

Reliability tradeoff:

`owner_type` + `owner_id` is flexible, but the database cannot enforce a normal foreign key to multiple possible parent tables.

If strict foreign keys matter more than flexibility, use explicit nullable links and a check that exactly one is set:

```txt
files
  candidate_id
  candidate_application_id
  project_id
```

Or use specific attachment tables, such as `candidate_files`.

Future migration path:

Replace `content` with `storage_key` when moving to object storage. Keep the same metadata table.

## Candidate Applications

`candidate_applications` is the core workflow table.

`stage + status` defines where a candidate is in the workflow. Not every status is valid in every stage, so the backend must validate allowed combinations.

The current status matrix belongs in a separate document because it is product logic, not only database shape.

## Project Stage Comments

Project-stage comments exist because the user journeys say pre-interview comments belong to the project pre-interview stage, not to a specific candidate.

Keep `stage` on the table even if only `pre_interview` uses it today. It prevents the table name from lying if a later stage gets project-level comments.

```txt
project_stage_comments.project_id -> projects.id
project_stage_comments.author_user_id -> users.id
```

`author_user_id` links to `users`, not directly to `project_members`.

The backend should also verify that the author is a member of that project with the required role through `project_members`.

## Reusing Tables

Reuse tables when the records represent the same kind of business event.

Good reuse:

- `contact_attempts` for pre-interview, interview scheduling outreach, and rejection follow-up outreach.
- `candidate_notes` for HR and hiring-manager notes with visibility rules.

Bad reuse:

- Using `candidate_applications.status` alone as a rejection follow-up task.
- Using `activity_events` as the only source of contact attempt details.

## Activity Events And Contact Attempts

A contact attempt is an activity, but it is also structured data.

Keep both:

```txt
contact_attempts
activity_events
```

`contact_attempts` stores operational facts: result, attempted time, notes, context, owner.

`activity_events` stores display/audit feed rows: title, subtitle, actor, occurred time, metadata.

Activity events can link back to the structured source record:

```txt
activity_events.source_type = contact_attempt
activity_events.source_id = contact_attempts.id
```

When a contact attempt is created, the backend should create an activity event in the same transaction.

## Rejection Follow-Up Reasons

Current product docs include two cases:

- rejected
- proceeded with another candidate

They are different reasons for entering rejection follow-up.

`rejected` means the candidate was actively rejected during the process.

`proceeded_with_another_candidate` means the candidate was not selected because another candidate accepted or closed the role.

Both can require HR communication, but they are not the same outcome. Store the reason on `rejection_follow_ups`.

This still needs final product confirmation because some prototype behavior may be demo-specific.
