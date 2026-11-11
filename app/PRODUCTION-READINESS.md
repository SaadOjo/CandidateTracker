# Production Readiness

Production deployment is not approved by the current implementation. The architecture refactor preserves the existing stack and separates the API into testable features, but the following decisions and product gaps remain.

## Decisions for the owner

| ID | Decision | Current behavior |
| --- | --- | --- |
| D1 | Retain development login for this refactor, or implement LDAP now? | Shared development password, database sessions and an explicit production startup block. LDAP requires confirmed TLS endpoint, certificate trust and registration policy. |
| D2 | Can Human Resource see every project, or only assigned projects? | Authenticated users can access projects without membership checks. Hiring Manager assignment restrictions also need enforcement across lists, details and writes. No project-scope policy has been assumed. |
| D3 (confirmed) | Only one hire per project. | Acceptance sets `hiredApplicationId` and closes the project. A second acceptance returns 409, including concurrent requests. Database partial unique indexes limit accepted applications and accepted offers to one per project. Other candidates are not automatically rejected or withdrawn. |

## Release blockers

1. **Identity and registration:** implement the chosen provider, server-managed login controls, account provisioning, admin role assignment, secure session cookies, login abuse protection and the agreed session lifetime. Development login is not a production identity provider.
2. **Project authorization:** apply D2 to every route. Authentication and action-role checks are implemented; membership filtering is not.
3. **Offer lifecycle:** the single-hire limit is enforced, but queue priority and the whole project's offer order are not. Rejection does not yet reconcile the offer and queue-item status. Closed projects also disappear from the current active/archived lists.
4. **Administration:** the database has an admin role, but candidate screens do not support it and no admin user-management screen exists. Decide whether admins should act in candidate workflows or only administer accounts.
5. **Incomplete product actions:** interim-update saving currently discards the form contents; resume preview/download and LinkedIn import/sync are placeholders. Confirm interim-update persistence and whether it sends a message before implementing it. File storage remains modeled in PostgreSQL but is not connected to uploads/downloads.
6. **Scale and API contracts:** list endpoints are unpaginated and candidate lists include detail data. Network responses are still trusted by frontend types. Define the list/detail contracts and page behavior before changing consumers.
7. **Operations:** deployment target, HTTPS termination, trusted proxy configuration, backups and restore testing, migration rollout, monitoring and data-retention policy are not configured.

## Remaining defects and review work

- Repeated interview scheduling creates multiple scheduled records; rescheduling and cancellation semantics need confirmation.
- Archived/closed project mutation policy is not enforced.
- Scheduled interview times are formatted in the browser's timezone while showing the stored timezone label.
- A note can switch between rubric and free-text editing when its candidate changes stage. Confirm how both forms should coexist without discarding earlier content.
- Dialog focus management, form labels and filter keyboard behavior need accessibility work.
- Clipboard actions do not report success or failure.
- The earlier 15-minute scheduling increment and primary-button color requests remain outstanding in the archived action list.

## Verified on November 11 2026

- Baseline build and lint passed before refactoring.
- The refactor passed lint, strict frontend compilation, both builds, 18 unit/HTTP tests and 18 database integration scenarios.
- All six migrations applied successfully to an isolated PostgreSQL test database. The new single-hire migration adds the accepted-application constraint; the accepted-offer constraint already exists in the original migration.
- Single-hire tests covered a second acceptance, simultaneous acceptances, independent projects, inconsistent legacy hire records and direct database writes. Rejected acceptance requests leave the existing hire and other candidate's records unchanged.
- The private-note JSON migration was also tested against legacy `hr_only` field values, including field order and Hiring Manager response filtering.
- Database tests covered session hashing, invalid login, role checks, project creation, in-place note editing, private-field filtering in list/detail responses, application IDs, scheduling validation, concurrent movement/comment/rejection handling, offer acceptance and logout revocation.
- Browser checks covered development login, note creation/editing, contact logging, movement breadcrumbs, missing-URL validation, interview scheduling, switching to Hiring Manager and persistence after reload.
- Candidate detail was inspected at 1440px and 390px widths; clipped candidate/account controls were corrected. No browser warnings or errors were observed in that journey.
- The existing application database was not migrated, seeded or modified. The preview uses `candidate_tracker_refactor_test_20261111` and fictional records.

These checks do not establish production readiness, complete accessibility coverage or correctness of the unresolved offer/project policies.
