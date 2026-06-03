# Current Decisions

These are the current product and implementation decisions. They are not blockers waiting for review.

## Candidate Review Ownership

Both HR and hiring managers can process Candidate Review.

Backend transition rules should still be centralized so role permissions can be adjusted without schema changes.

## File Ownership Shape

Use one generic `files` table for v1.

Files can link to exactly one owner: candidate, candidate application, or project. This keeps one attachment model while allowing each workflow surface to decide which files it needs.

## File Types

Keep file types.

The type should describe the file purpose, not the owner. Current v1 types are:

- `resume`
- `portfolio`
- `attachment`

Add more types only when the product needs distinct behavior, validation, or display copy. Do not create types only for labels that can live in UI copy.

## File Storage

Store file bytes in Postgres for v1.

Keep file metadata separate from `content` so storage can later move to object storage by replacing bytes with a storage key.

## Rejection Follow-Up Reasons

Keep both current reasons:

- `rejected`
- `proceeded_with_another_candidate`

Follow-up task status remains separate from candidate application status.

## Integration Providers

Use `external_references` for LinkedIn and future integrations.

Core tables should not gain provider-specific columns unless a provider-specific field becomes core product data.

## Offer Modeling

Do not add an `offer_queues` table for v1.

A project has one implicit offer queue, represented by `project_offer_queue_items`. This is simpler and matches the current workflow.

Add an `offer_queues` table only if the product later supports multiple named queues, queue history/reopening, queue-level settings, or separate queue lifecycle state.

## Current User And Auth

Use a backend auth service abstraction now.

Current implementation uses a dummy dev auth service. It resolves the current user from `x-dev-user-id`, then `DEV_AUTH_USER_ID`, then the first active admin/HR user in the database.

Future OIDC/JWT auth should replace this service without changing route-level authorization calls.
