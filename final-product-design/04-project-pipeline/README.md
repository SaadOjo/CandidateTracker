# Project Pipeline

Route: `/projects/:projectId/pipeline/:stage`

## Purpose

Show candidates in one project stage and provide row-level entry points into candidate work.

## Access

HR and hiring managers can open all stages.

Role changes affect visible columns and available row actions.

## Header

Show project name, position, notes, project status, created date, and archived date when present.

If any candidate in the project accepted an offer and the project is active, show `CANDIDATE ACCEPTED`.

## Stage Tabs

Tabs are fixed:

1. Pre-Interview
2. Department Interview
3. HR Interview
4. Candidate Review
5. Offer Stage

Changing tabs stays inside the same project.

## Search

Search filters candidates by name inside the selected project and stage.

## Candidate Sort

Rows are sorted by work priority:

1. Waiting for Contact
2. Not Reached
3. Other active statuses
4. Withdrawn or Rejected

## Columns

HR:

- Pre-Interview: Candidate Name, Status, Actions
- Department Interview: Candidate Name, Status, Contact, Interview Info, Actions
- HR Interview: Candidate Name, Status, Contact, Interview Info, Actions
- Candidate Review: Candidate Name, Status, Actions
- Offer Stage: Candidate Name, Status, Actions

Hiring Manager:

- Pre-Interview: Candidate Name, Status, Actions
- Department Interview: Candidate Name, Status, Interview Info, Actions
- HR Interview: Candidate Name, Status, Interview Info, Actions
- Candidate Review: Candidate Name, Status, Actions
- Offer Stage: Candidate Name, Status, Actions

## Row Actions

View opens `/projects/:projectId/candidates/:candidateId`.

Add Log appears for HR when:

- stage is not Candidate Review
- stage is not Offer Stage
- candidate is not Rejected
- candidate is not Withdrawn

Contact icon appears for HR in Department Interview and HR Interview.

## Pre-Interview Comments

Pre-Interview shows one comments button:

- HR sees HR Comments.
- Hiring Manager sees HM Comments.

The modal stores one or more text comments. Comments appear on candidate detail for pre-interview candidates.

## Offer Ordering

In Offer Stage, HR and hiring managers can drag candidates with `approved_for_offer` or `final_check_sent`.

The first three visible ranks are First Candidate, Second Candidate, Third Candidate.

Saving order requires confirmation.

Backend must persist order; the prototype only previews it.

## Status Display Exceptions

Pre-Interview `scheduled` displays as Contact Successful.

Candidate Review `waiting_for_contact` displays as `--`.

Withdrawn candidates show Interview Info as Terminated.

Missing interview data shows `--`.

## Cannot Do

Cannot edit project data from pipeline.

Cannot log contact for rejected or withdrawn candidates.

Cannot log contact from Candidate Review or Offer Stage.

Cannot contact candidates from hiring-manager pipeline tables.

Cannot reorder offer candidates outside Offer Stage.

## Backend Needs

List candidates by project, stage, status, and query.

Return interview summary for stage tables.

Persist pre-interview comments by project and author role.

Persist offer priority.

Generate activity events for all actions.
