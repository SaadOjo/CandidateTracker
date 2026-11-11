# Cloudflare RSC demo

Independent copy of `../rsc-simulator`; the original is unchanged. Public, shared, fictional demo data only. Anyone can change candidate stages and publish exports. Do not enter real candidate details or credentials in export notes.

## Run and deploy

```sh
npm ci
npm test
npm run dev
npx wrangler login
npm run deploy
```

Local URL: http://127.0.0.1:5181. Deployment creates the `rsc-test-demo` Worker with static assets and one SQLite-backed Durable Object. Project state, published snapshots and RSC export records survive restarts and deployments. The three demo projects start independently with ten fictional candidates each, all uncontacted. This does not copy state from the running local simulator.

## API

The custom project export includes `email` and `phone` strings for every fictional candidate. Emails use `example.com`; phones use the reserved North American `202-555-01xx` fictional range. These appear in simulator candidate details. Existing published snapshots keep their contents until Export Project is pressed again. Basic RSC candidate export fixtures exclude these fields; they do not simulate contact-sharing consent or enhanced-profile permissions.

- `GET /simulator/projects`: project catalog.
- `GET /simulator/state?projectId=sim-project-001`: draft stages and export history.
- `PATCH /simulator/candidates/:id?projectId=...`: JSON `{ "stage": "shortlisted" }`.
- `POST /simulator/project-export?projectId=...`: publish all candidates and stages.
- `GET /simulator/project-export?projectId=...`: retrieve published snapshot with `Authorization: Bearer rsc-local-test-token`.
- `GET /simulator/project-download?projectId=...`: download published snapshot.
- `POST /simulator/exports?projectId=...`: prepare RSC fixture with `candidateIds` and optional `notes`.
- `GET /simulator/exports/:requestId`: inspect fixture, optionally `?download=notification|response|request|headers`.
- `GET /rest/exportedCandidates?q=request&requestId=...`: retrieve with fake bearer and `LinkedIn-Version: 202604`.

The bearer and HMAC secret (`rsc-local-test-secret`) are public protocol fixtures, not security controls. No real LinkedIn connection, OAuth, outbound webhooks or resume PDFs. Candidate profile URLs use the reserved, non-navigable `linkedin.invalid` domain. Full-project exports and stage tracking are custom simulator contracts, not documented RSC APIs. Each project permits 500 prepared RSC exports; further preparations fail visibly. Retrieval expires after 24 hours; stored history remains.

Candidate Tracker's existing local connector currently accepts only loopback HTTP URLs. Deploying this demo does not change that connector or automatically connect the tracker to this cloud URL.

Tests cover persisted stages/snapshots, export identity and signatures, independent projects, invalid requests and simulated process restarts. Wrangler provides local Worker-runtime verification before deployment.
