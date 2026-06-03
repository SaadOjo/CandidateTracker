# Roles, States, Routes

## Roles

`hr` — HR Manager.

Can create and edit projects, handle candidate outreach, log contact attempts, write HR notes, send assessments, process Candidate Review, manage rejection follow-up, and run offer handling after candidates are approved.

`hm` — Hiring Manager.

Can review projects and candidates, write hiring-manager notes, move candidates through manager-owned decisions, process Candidate Review, and order approved offer candidates.

Manager-owned decisions include Department Interview outcome. Candidate Review is shared by HR and hiring managers.

## Global Routes

`/` redirects to `/projects`.

`/projects` shows active projects.

`/projects/archived` shows archived projects.

`/projects/new` opens the create-project modal over the projects page.

`/projects/:projectId/edit` opens the edit-project modal over the projects page.

`/projects/:projectId/pipeline/:stage` shows one project pipeline stage.

`/projects/:projectId/candidates/:candidateId` shows one candidate detail page.

`/projects/:projectId/candidates/:candidateId?source=rejection` shows the same detail page in rejection-follow-up context.

`/rejection-follow-up` shows rejected/proceeded candidates that HR must handle.

## Pipeline Stages

`pre_interview` — `1. Pre-Interview`

`department_interview` — `2. Department Interview`

`hr_interview` — `3. HR Interview`

`manager_review` — `4. Candidate Review`

`offer_stage` — `5. Offer Stage`

Stage order is fixed.

## Candidate Statuses

`waiting_for_contact` — Waiting for Contact

`scheduled` — Scheduled. In pre-interview this is shown as Contact Successful.

`not_reached` — Not Reached

`withdrawn` — Withdrawn

`rejected` — Rejected

`assessment_sent` — Assessment Sent

`waitlisted` — Waitlisted

`approved_for_offer` — Approved for Offer

`final_check_sent` — Final Check Sent

`offer_sent` — Offer Sent

`offer_rejected` — Offer Rejected

`offer_accepted` — Offer Accepted

`proceeded_with_another_candidate` — Proceeded with Another Candidate

## Project Statuses

`active` — Active project.

`archived` — Closed project in archived view.

`candidate_accepted` — Display-only project badge when an active project has a candidate with `offer_accepted`.

## Observed Stage Statuses

Pre-Interview: `waiting_for_contact`, `scheduled`.

Department Interview: `waiting_for_contact`, `scheduled`, `not_reached`, `withdrawn`, `rejected`.

HR Interview: `waiting_for_contact`, `scheduled`, `not_reached`, `rejected`, `assessment_sent`.

Candidate Review: `waiting_for_contact`, `waitlisted`, `rejected`.

Offer Stage: `approved_for_offer`, `final_check_sent`, `offer_sent`, `offer_rejected`, `offer_accepted`, `proceeded_with_another_candidate`.

## Backend Ownership

The backend owns role access, stage transitions, status transitions, offer ordering, rejection follow-up eligibility, audit history, and note visibility.

The frontend should request actions, not patch arbitrary `stage` or `status` values.

Action-style examples:

- log contact attempt
- schedule interview
- mark not reached
- mark withdrawn
- move to department interview
- move to HR interview
- send assessment
- move to candidate review
- approve for offer
- waitlist
- reject
- send final check
- send offer
- accept offer
- reject offer
- mark rejection handled
