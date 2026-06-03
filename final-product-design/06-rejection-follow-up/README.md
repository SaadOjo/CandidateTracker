# Rejection Follow-Up

Route: `/rejection-follow-up`

## Purpose

Show candidates who need rejection follow-up after being rejected or after another candidate accepted the role.

## Access

HR only.

The sidebar link is visible only to HR.

Backend should block hiring-manager access even if the route is entered directly.

## Rows

Rows represent rejection follow-up tasks, not candidate pipeline status alone.

Each row shows:

- Candidate Name
- Project Name
- Status
- Eligible Date
- Actions

## Included Candidates

Prototype includes candidates whose status is:

- `rejected`
- `proceeded_with_another_candidate`

Final backend should include candidates with an eligible `RejectionFollowUpTask`.

## Follow-Up Statuses

`waiting_for_contact` — Waiting for Contact.

`handled` — Rejection Handled.

Prototype maps `proceeded_with_another_candidate` to handled and has one candidate-specific shortcut. Backend must store task status directly.

## Filters

Search by candidate name.

Project filter:

- All
- Any project, shown with Active or Archived prefix.

Status filter:

- All
- Waiting for Contact
- Rejection Handled

Rows sort Waiting for Contact before Rejection Handled.

## Actions

View opens `/projects/:projectId/candidates/:candidateId?source=rejection`.

In rejection context, candidate detail breadcrumb starts from Rejection Follow-up.

HR can open Rejection Handling from candidate detail.

## Cannot Do

Cannot handle rejection directly from the table.

Cannot show candidates before their eligible date.

Cannot show this page to hiring managers.

Cannot infer handled state from candidate status in production.

## Backend Needs

Rejection follow-up task list endpoint.

Filters for query, project, and task status.

Eligible date calculation.

Task status transitions:

- Waiting for Contact to Waiting for Contact after Not Reached log.
- Waiting for Contact to Handled after Rejection Handled log.

Contact attempt history per rejection follow-up task.
