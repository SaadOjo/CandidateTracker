# RSC local simulator

Separate test app with three fictional Recruiter projects: Software Engineer at Example Labs, Product Designer at Example Studio, and Data Analyst at Example Analytics. Each has ten distinct fictional candidates, for thirty total. No LinkedIn connection, direct database access or outbound delivery. Candidate Tracker can read their project exports through an explicitly configured local connector.

## Run

Node 24; no package installation required.

```sh
cd playground/rsc-simulator
npm start
npm test
```

Open http://127.0.0.1:5180. Use `PORT=5181 npm start` if occupied. The server binds only to `127.0.0.1` and refuses production mode. Exports and stage changes are held in memory and cleared on restart. Candidates initially have the `uncontacted` stage; identities remain stable.

Select candidates, optionally enter export notes, and prepare an export. The inspector shows the notification, signature headers, retrieval request and candidate response. Test retrieval API makes an actual local HTTP request. Preparing an export does not send a callback or import candidates anywhere.

## Project tracking

Choose a demo using the **Project** selector. Each project has independent stage changes, export history and a last exported snapshot. Each candidate row has a stage selector: `uncontacted`, `contacted`, `replied`, or custom `shortlisted`. Change stages, then press **Export Project** to publish that project and all ten of its candidates, irrespective of checkbox selection. Later edits stay unpublished until the next export. **Download Last Export** retrieves that project's published snapshot, not the current edits. Before its first export, retrieval returns 409; no snapshot is published implicitly.

Candidate Tracker imports the project once, with explicit Human Resource and Hiring Manager assignments. Its local connector reads the last exported project snapshot every five seconds by default. Only candidates exported with stage `shortlisted` receive new applications, in `pre_interview` / `waiting_for_contact`. Existing applications retain their progress; moving a source candidate out of `shortlisted` does not remove an imported application. Archived projects and projects with a hire stop importing.

The project snapshot and stage polling are simulator-only contracts, not documented LinkedIn RSC APIs. The prepared RSC candidate exports above remain separate from this project-tracking flow.

## API contract

The mock implements this documented operation with `LinkedIn-Version: 202604`:

```http
GET /rest/exportedCandidates?q=request&requestId=<prepared-request-id>
Authorization: Bearer rsc-local-test-token
LinkedIn-Version: 202604
```

The response contains `paging` and `elements`. Candidate records contain basic stub-profile fields, requester, export time, organization context, optional notes, and the ATS requisition reference `req-demo-001`. Candidate member URNs stay stable across exports. Later import code must map the requisition explicitly and deduplicate by organization, requisition and candidate identity, not solely by notification ID.

Prepared request IDs expire after 24 hours. Repeated retrieval is non-destructive. The local mock returns 401 for an incorrect token, 400 for unsupported versions or malformed inputs, 404 for unknown requests and 410 for expired requests. These exact errors are local test behavior, not a claim of LinkedIn error parity.

Simulator-only controls, not LinkedIn APIs:

| Method | Route | Result |
| --- | --- | --- |
| GET | `/simulator/projects` | Project catalog and each project's last export time |
| GET | `/simulator/state` | Fictional project, candidates and prepared-export history |
| PATCH | `/simulator/candidates/:id` | Set `stage`; unknown candidates and stages fail |
| POST | `/simulator/project-export` | Publish current project and all candidate stages |
| GET | `/simulator/project-export` | Last exported snapshot; simulator bearer token required; 409 before first export |
| GET | `/simulator/project-download` | Last exported snapshot as a local JSON attachment |
| POST | `/simulator/exports` | Prepare an export with `candidateIds` and optional `notes` |
| GET | `/simulator/exports/:id` | Inspect its notification, headers, request and response |

State, candidate-stage changes, project export/download, and RSC export creation require `?projectId=sim-project-001` (or `sim-project-002` / `sim-project-003`). Missing IDs return 400; unknown projects return 404. RSC export inspection/retrieval uses its unique request ID. Switching the visible project never changes an existing export or a tracker's project binding.

These fixture project IDs are not LinkedIn project API identifiers. This app does not implement real LinkedIn project discovery, synchronization or RSC+ Connected Projects. Multi-candidate batches are a local convenience over the documented collection response shape, not a claim that bulk export is available under a particular LinkedIn contract.

## Authentication and notifications

The fixed token is deliberately fake; OAuth issuance and permissions are not simulated. `RSC_SIMULATOR_TOKEN` and `RSC_SIMULATOR_SECRET` can override the local test values. The default signing secret is `rsc-local-test-secret`. Do not use real LinkedIn credentials. The local inspection API exposes prepared request headers, so these values must remain test-only.

Notification signatures use the documented HMAC-SHA256 construction over `hmacsha256=` followed by the exact UTF-8 notification body. `notificationBody` and notification downloads preserve those exact bytes. The inspector pretty-prints for reading only. No signature validation, delivery, automatic retry or callback registration is implemented here.

The notification uses `expiresAt` as shown in LinkedIn's example; the same documentation's field table calls it `expires_at`. That inconsistency must be checked against approved test traffic before a real receiver is deployed.

Cross-origin browser access is blocked. Candidate Tracker makes server-to-server requests to the local API. No external callback URL can be configured in this app.

## Limits

- Basic stub fields only; no resumes, email addresses or enhanced-profile entitlement claims.
- Fictional profile URLs use the reserved `linkedin.invalid` domain and are not navigable profiles.
- No LinkedIn widget, job sync, deletion feed, rate-limit simulation or certification coverage.
- Maximum 500 RSC exports per project per session; restarting clears them.
- Tests against this mock do not establish real LinkedIn compatibility or API eligibility.

## Verification

Automated tests cover explicit project publication, isolation of unpublished stage changes, full-project downloads, actual HTTP requests, signed notification downloads, expiry, invalid credentials, invalid inputs and cross-origin rejection. Browser checks passed for selection, filtering, RSC exports, retrieval, payload inspection and history after reload. Project-tracking checks verified that an unexported shortlist change did not import even after manual sync, while pressing Export Project made the candidate available to the tracker. Mobile viewport control and browser download-completion reporting remain unverified.

## Sources

- [Exported candidates](https://learn.microsoft.com/en-us/linkedin/talent/recruiter-system-connect/retrieve-exported-candidates?view=li-lts-2026-03)
- [Stub profile](https://learn.microsoft.com/en-us/linkedin/talent/recruiter-system-connect/retrieve-exported-candidates/stubprofile?view=li-lts-2026-03)
- [Push notifications and signing](https://learn.microsoft.com/en-us/linkedin/talent/receive-push-events?view=li-lts-2026-03)
- [RSC development tools](https://learn.microsoft.com/en-us/linkedin/talent/recruiter-system-connect/rsc-development-tools?view=li-lts-2026-03)

Documentation consulted November 11, 2026. The project mark is the Lucide FlaskConical icon, generated from the repository's installed lucide-react package (ISC license).
