# Candidate Tracker Cloudflare demo

Public, shared, fictional-data test deployment. This is separate from the PostgreSQL application in `../app` and from the RSC simulator. Do not enter real candidate data.

- Tracker: https://candidate-tracker-test-demo.saadsaif0333.workers.dev
- RSC: https://rsc-test-demo.saadsaif0333.workers.dev

## Architecture

- Cloudflare Worker serves the current React UI from `../app/web`, built into `dist/client`. There is no separate copy of the UI.
- `/api/*` is handled by one SQLite-backed Durable Object. The demo workspace, notes, activity, contact details, project comments and sessions persist across restarts and deployments.
- `src/api.ts` adapts the existing HTTP contract to this storage. `src/model.ts` implements demo persistence and workflow updates. Validation schemas, transition permissions and note visibility are imported from `../app/api/src`.
- `src/rsc.ts` fetches only the deployed RSC origin. The published `candidate-tracker-simulator-project-v1` contract remains unchanged. Only shortlisted candidates become applications. Existing workflow state and non-empty contacts survive sync.
- A Durable Object alarm synchronizes active imported projects every 30 seconds. Each project's error appears in its pipeline; manual Sync Now is also available. Alarms stop when no tracked active projects remain.
- The Cloudflare build enables the public-demo label and Reset demo button. Normal local builds do not include the reset control, and the local PostgreSQL API has no reset endpoint.
- Public role switching uses fictional Serenay (HR) and Ayca (Hiring Manager), HTTP-only session cookies and the explicit public fixture password in `src/api.ts`. This is demonstration authentication, not access control against the public. Role restrictions are still enforced to test product behavior.

## Import from deployed RSC

1. In RSC, choose a project and shortlist candidates.
2. Press **Export Project**. Draft changes are not visible to the tracker until published.
3. In Candidate Tracker, select Serenay, open **New Project**, and choose the RSC Simulator source/project.
4. Assign Ayca and Serenay, then import. Subsequent published shortlisted candidates sync into the project.

RSC exports are fetched server-to-server, so no cross-origin browser permission changes are needed. The bearer in `wrangler.jsonc` is the simulator's documented public protocol fixture, not a production secret.

## Reset

On Projects, **Reset demo** opens a confirmation. Confirming deletes all projects, candidate identities/applications, notes, interviews, activity and project comments in this Cloudflare workspace. Role accounts and sessions remain. RSC and local PostgreSQL data are untouched. The same RSC project can then be imported again.

Reset increments a workspace generation; imports and syncs started before the reset cannot repopulate it afterward. The server requires the HR role and the explicit reset confirmation value.

## Build and deploy

Requires Node 24 and dependencies installed in `../app` and this folder.

```sh
npm ci
npx wrangler types
npm test
npm run typecheck
npm run build
npx wrangler dev --port 5182 --ip 127.0.0.1
# Separately, when ready:
npm run deploy
```

Wrangler reuses the existing account login. Credentials stay in Wrangler's own local configuration, never this repository. `wrangler.jsonc` creates only the tracker Worker and its own SQLite Durable Object namespace.

Zod is pinned to a patched version for the public Worker; Wrangler aliases shared-schema imports to that dependency. The original app's dependency lock and runtime are not changed by this deployment.

## Verification

Deployed and verified on 2026-11-11. Live checks covered the published RSC Product Designer export, contact import, role restrictions, private notes, shared HM comments, manual and automatic sync, and reset followed by re-import. The demo was left with one clean imported project. Desktop browser checks covered the project list, reset confirmation, pipeline and inline candidate note editor.

`npm test` covers persistent SQLite state, deduplicated imports, workflow/role restrictions, note privacy, comments, one hire per project, reset/re-import and reset racing an in-flight sync/import.

`node scripts/smoke.mjs <demo-url>` performs an HTTP journey using the real deployed fictional RSC export. It requires an empty dedicated tracker workspace, creates test records, verifies roles/notes/sync/reset, then leaves a clean imported project for browser inspection. It refuses to delete pre-existing projects. Accepted targets are localhost:5182 and the tracker demo URL above.

Use the deployment for fictional testing only. Existing application limitations (such as the unimplemented interim-update save and real LinkedIn integration) are not implemented by this adapter. Changing core persistence/workflow behavior requires updating this adapter's tests alongside the local API.
