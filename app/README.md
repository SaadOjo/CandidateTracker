# Candidate Tracker

React frontend, Fastify API, Prisma and PostgreSQL. This refactor is tested locally; production deployment remains blocked by the decisions and gaps in [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md).

## Structure

| Path | Responsibility |
| --- | --- |
| `api/src/server.ts` | Configuration, database connection, listening and shutdown |
| `api/src/app.ts` | Testable HTTP application, plugins, authentication boundary and error handling |
| `api/src/auth.ts` | Development login and database-backed sessions behind `AuthService` |
| `api/src/config.ts` | Environment validation and production startup guard |
| `api/src/domain.ts` | API input schemas |
| `api/src/features/*/routes.ts` | Feature HTTP endpoints |
| `api/src/features/*/response.ts` | Database selection and explicit response mapping |
| `api/src/features/projects/service.ts` | Project lookup and assignment validation |
| `api/src/features/candidates/workflow.ts` | Transactional candidate changes and their related records |
| `api/src/features/candidates/transition-policy.ts` | Role, stage and status rules |
| `api/src/features/candidates/note-visibility.ts` | Server-side filtering of private notes and fields |
| `web/src/auth` | Session state and development account selection |
| `web/src/app/queries` | User-scoped server data, cancellation and cache invalidation |
| `web/src/data/api.ts` | HTTP transport and API calls |
| `web/src/pages` | Route screens and feature-specific components |
| `web/src/components` | Shared controls and feedback |
| `api/test`, `web/test` | Regression tests; database tests are separate |
| `local-db` | Local Postgres startup and destructive demo seed |

The archived reference application and product documents remain in `../archive`. The LDAP experiments remain in `../playground`; they are not the application's authentication implementation.

## Local setup

Use the Node version in `.nvmrc`. Run commands from `app/`.

1. Install dependencies with `npm ci`.
2. Configure `api/.env` and `web/.env.local` using the corresponding `.env.example` files. The development passwords must match. They are development-only because the browser receives the frontend value.
3. Start the local database with `npm run db:start`, or configure an existing PostgreSQL instance.
4. Generate the Prisma client with `npm run prisma:generate`.
5. Review migrations, then apply them to the configured database with `npm run prisma:deploy`.
6. Start the API with `npm run dev:api`.
7. Start the frontend with `npm run dev --workspace @candidate-tracker/web -- --host 127.0.0.1 --port 5174`.

Set `CORS_ORIGIN` to the exact frontend origin, including the port. For the command above, use `http://127.0.0.1:5174`. Set `VITE_API_URL` to the API origin. Use the same hostname for frontend and API during local cookie-based authentication.

`npm run db:seed` deletes all application records. It requires both `NODE_ENV=development` and `ALLOW_DESTRUCTIVE_SEED=true`. Do not run it against a database containing work you need to retain.

## Simulator Import

Run `../playground/rsc-simulator` separately. Configure the API with `RSC_SIMULATOR_URL=http://127.0.0.1:5180` and `RSC_SIMULATOR_TOKEN=rsc-local-test-token`; both are required to enable the connector. Alternatively, explicitly set `RSC_SIMULATOR_URL=https://rsc-test-demo.saadsaif0333.workers.dev` and `RSC_SIMULATOR_TOKEN` to that simulator’s token. Only HTTP `127.0.0.1` origins and this exact HTTPS cloud origin are accepted. Credentials in the URL, paths, queries, fragments, other origins, and HTTP redirects are rejected. The optional `RSC_SIMULATOR_INTERVAL_MS` defaults to 5000.

In the simulator, select a demo project, change candidate stages and press **Export Project**. Human Resource can then choose **Import Simulator Project** in the new-project form, select an exported source project, assign registered staff, and import/link it. Unexported projects appear disabled in the selection. The API polls each linked project's last exported snapshot by source project ID and imports only `shortlisted` candidates into **Pre-interview / Waiting for contact**. Later stage edits require another **Export Project** click before they reach the tracker. Before the first export, import/sync reports an explicit error. The pipeline shows candidate counts, the last successful check, errors, and a manual sync action. Candidate lists refresh every five seconds for linked projects.

Source organization/project/member identifiers are stored in `ExternalReference`. Unique references and transaction locks prevent duplicate projects, candidates and applications. Existing workflow progress is never overwritten by polling. A source stage change away from `shortlisted` does not delete an imported application. Tracking skips archived projects and projects with a hire. Failed reads do not create partial imports; errors remain visible until a successful sync.

The custom `candidate-tracker-simulator-project-v1` snapshot accepts optional `email` and `phone` strings. Supplied email must be valid; supplied phone must be a nonempty string. New shortlisted candidates receive these contacts. Sync fills only null or empty contact fields for existing source-linked candidates, including profiles no longer shortlisted; nonempty contacts and application progress are preserved. Omitted fields never clear existing contacts. The candidate contact UI reads these database fields. These are custom simulator fields, not guaranteed LinkedIn RSC export fields.

This connector uses a simulator-specific project snapshot, not an official LinkedIn project API. The simulator resets source stages on restart; imported PostgreSQL records remain. No database migration or destructive seed is needed for this feature.

## Verification

`npm run check` runs lint, unit and HTTP tests, and both builds.

Database tests require a separate migrated database whose name contains `_test`. They create uniquely named records and clean up only those records:

```sh
TEST_DATABASE_URL='postgresql://USER:PASSWORD@HOST:PORT/candidate_tracker_test' npm run test:integration
```

Apply migrations to that same test database before running the suite. The suite fails if `TEST_DATABASE_URL` is absent; it does not fall back to `DATABASE_URL`.

`api/test/preview.ts` creates two fictional accounts and candidates in an explicitly configured test database for browser checks. It does not reset existing records.

The HTTP tests use [Fastify injection](https://fastify.dev/docs/latest/Guides/Testing/). `buildApp` does not open a port or create a global database client. The caller owns database connection cleanup.

## Runtime behavior

- Business routes require an authenticated session. Project membership enforcement is still pending a product decision.
- Human Resource-only notes and fields are removed before Hiring Manager responses are serialized.
- Candidate detail routes identify an application, not a person. A person may have several applications.
- Candidate changes, contact attempts, interviews and activity events commit together. A project row lock serializes competing workflow operations. Invalid or stale actions return an error.
- Stage comments serialize edits by project. Rejection contact handling locks its follow-up record so two concurrent requests cannot complete it twice.
- `/health` checks the HTTP process. `/ready` checks database connectivity.
- SIGINT and SIGTERM close the HTTP server before disconnecting Prisma.
- `NODE_ENV=production` currently fails startup because production authentication is not implemented.

## Backup

The pre-refactor application is saved at `../archive/backups/app-before-refactor-2026-11-11.tar.gz`. It includes uncommitted work and local environment files; dependencies and build outputs are excluded. The backup is ignored by Git and readable only by its owner. It does not contain a database backup.

Inspect or extract it into a separate directory before restoring anything. Do not extract it over newer work without reviewing the differences.
