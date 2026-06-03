# Candidate Detail

Route: `/projects/:projectId/candidates/:candidateId`

Rejection context route: `/projects/:projectId/candidates/:candidateId?source=rejection`

## Purpose

Show one candidate, their notes, interview details, activity history, and available next actions.

## Access

HR and hiring managers can open normal candidate detail.

Rejection context is for HR work.

## Main Content

Always show candidate name and current status.

Pre-Interview `scheduled` displays as Contact Successful.

LinkedIn button is visible.

Resume button toggles inline resume preview.

Pre-interview candidates show HM and HR pre-interview comments when present.

Scheduled candidates with interview data show interview title, date, time, timezone, and Copy Meeting URL.

Activity History is always shown.

## Notes

HR and hiring managers can add notes when quick actions are visible.

HR notes in Pre-Interview and HR Interview use structured questions:

- Why is the candidate interested in this role?
- How clear and professional was the communication?
- What is the expected wage?
- Is notice period / availability suitable?
- Did the candidate sound motivated to continue? Applies to Pre-Interview.
- Did the candidate show strong motivation and stability? Applies to HR Interview.
- General Notes

Expected wage is HR-only.

Other HR notes and all hiring-manager notes are free text unless the stage uses the HR structured form.

HR can see all notes.

Hiring managers cannot see HR-only notes or HR-only note fields.

## Quick Action Visibility

Normal quick actions are hidden when the candidate is:

- Rejected
- Withdrawn
- Offer Rejected

The rejection context can still show rejection-specific actions.

## Pre-Interview Actions

HR:

- Add Log when status is not Contact Successful.
- Process when status is Contact Successful.
- Process options: Move to Department Interview Stage, Reject.

Hiring Manager:

- Process when status is Contact Successful.
- Process options: Move to Department Interview Stage, Reject.

## Department Interview Actions

HR:

- Contact Info
- Log Contact Attempt

Hiring Manager:

- Process only when status is Scheduled.
- Process options: Move to HR Stage, Reject.

## HR Interview Actions

HR:

- Contact Info
- Log Contact Attempt
- Process when status is not Rejected or Withdrawn.

HR process options:

- If status is not Assessment Sent: Send Assessment, Reject.
- If status is Assessment Sent: Move to Candidate Review, Reject.

Hiring Manager:

- Add Note only.

## Candidate Review Actions

HR and Hiring Manager:

- Process
- Approve for Offer
- Waitlist, hidden if candidate is already Waitlisted
- Reject
- Add Note

HR also has Interim Update when candidate is Waitlisted.

Production rule: both HR and hiring managers can process Candidate Review. Backend transition rules should remain centralized so this ownership can change without schema changes.

## Offer Stage Actions

HR sees Offer Handling only when:

- no candidate in the project has accepted an offer
- and the candidate is either the current Offer Sent candidate or the first actionable Approved for Offer / Final Check Sent candidate

Offer Handling options:

- Approved for Offer: Send Final Check
- Final Check Sent: Send Offer, Reject
- Offer Sent: Offer Accepted, Offer Rejected

Hiring Manager:

- Add Note only from candidate detail.
- Offer ordering happens on the pipeline page.

## Rejection Context Actions

When opened from Rejection Follow-Up, HR sees Rejection Handling.

Rejection Handling opens the rejection contact modal.

## Contact Info Modal

Shows candidate name, position, mobile, email, Copy Phone Number, Copy Email Address.

Backend should store real phone and email. The prototype uses generated contact data.

## Log Contact Attempt Modal

Pre-Interview result options:

- Contact Successful
- Pre-Interview Not Conducted
- Withdrawn
- Not Reached

Department Interview and HR Interview result options:

- Not Reached
- Scheduled
- Withdrawn

Scheduled requires:

- Interview Date
- Start Time
- Meeting URL

All logs require Attempt Date & Time.

Notes are optional.

Withdrawn requires confirmation.

## Rejection Contact Modal

Result options:

- Not Reached
- Rejection Handled

Requires Attempt Date & Time.

Notes are optional.

## Interim Update Modal

Available to HR for waitlisted Candidate Review candidates.

Notes are optional.

Saving requires confirmation.

## Cannot Do

Cannot run normal quick actions for rejected, withdrawn, or offer-rejected candidates.

Cannot log regular contact from Candidate Review or Offer Stage.

Cannot show HR-only note fields to hiring managers.

Cannot accept more than one offer in a project.

Cannot send an offer to a lower-priority candidate while a higher-priority candidate is still active in offer handling.

## Backend Needs

Candidate detail endpoint with candidate, project, interview, notes, activity, contact logs, and offer context.

Action endpoints for every quick action.

Note creation with field-level visibility.

Contact attempt creation with stage-aware result validation.

Interview creation when contact result is Scheduled.

Offer handling service that enforces one active offer at a time.
