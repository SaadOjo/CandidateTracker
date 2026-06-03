# Frontend product analysis and user journeys

This document treats the current React prototype as working product documentation. It captures the actual routes, roles, domain states, user journeys, and implementation constraints represented by the frontend.

## 1. Current frontend stack

The app currently lives in `app/`.

```txt
Vite
React
TypeScript
React Router
CSS
Lucide icons
Mock repository data source
```

Current app routes:

```txt
/
/projects
/projects/archived
/projects/new
/projects/:projectId/edit
/projects/:projectId/pipeline/:stage
/projects/:projectId/candidates/:candidateId
/rejection-follow-up
```

The frontend already has a clean data access seam:

```txt
src/data/repository.ts
src/data/repositories/candidateTrackerRepository.ts
src/data/mock/mockCandidateTrackerRepository.ts
```

This is important because the mock data can later be replaced with an API-backed repository without rewriting UI components.

---

## 2. Roles represented in the UI

The prototype has two user profiles:

### HR Manager

Current demo profile:

```txt
Sarah Chen
```

HR capabilities represented in UI:

- view projects
- create project
- edit/archive project where allowed
- use rejection follow-up menu
- log contact attempts
- conduct pre-interview / HR interview workflow
- add HR notes
- manage rejection handling
- handle offer-stage operations after manager approval

### Hiring Manager

Current demo profile:

```txt
Maya Patel
```

HM capabilities represented in UI:

- view projects
- review candidates
- add HM comments/notes
- process candidates from Department Interview / Candidate Review
- approve for offer / waitlist / reject
- reorder offer candidates

### Important product rule

The role switcher is currently frontend-only and stored in `localStorage`. For production this should be replaced by Microsoft Entra ID authentication and server-authorized role mapping.

---

## 3. Core domain model inferred from the frontend

### Project

A project represents a hiring process for one position.

Important fields currently represented:

```txt
id
name
position
status: active | archived
candidateCount
hiringManager
assignedHr[]
createdAt
archivedAt
linkedinProjectId
notes
preInterviewComments.hr[]
preInterviewComments.hm[]
```

### Candidate

A candidate belongs to a project and is always in one pipeline stage.

Important fields currently represented:

```txt
id
projectId
name
source
resumeUrl
stage
status
appliedAgo
contactAttempts
interview
activity[]
notes[]
```

### Pipeline stages

Canonical stage order currently implemented:

```txt
1. Pre-Interview
2. Department Interview
3. HR Interview
4. Candidate Review
5. Offer Stage
```

Enum values:

```txt
pre_interview
department_interview
hr_interview
manager_review
offer_stage
```

### Candidate statuses

Current status enum:

```txt
waiting_for_contact
scheduled
not_reached
withdrawn
rejected
assessment_sent
waitlisted
approved_for_offer
final_check_sent
offer_sent
offer_rejected
offer_accepted
proceeded_with_another_candidate
```

### Activity history

Activity history is a chronological audit trail. It is more than UI decoration; it describes the process history and should likely become a first-class backend entity.

Examples:

```txt
Profile Imported
Contact Successful
Pre-Interview Conducted Successfully
Pre-Interview Not Conducted
Department Interview Scheduled
Department Interview
HR Interview Scheduled
HR Interview
Assessment Sent
Waitlisted by Hiring Manager
Interim Update Sent
Approved for Offer
Final Check Sent
Offer Sent
Offer Accepted
Offer Rejected
Rejected by Hiring Manager
Rejected by HR Manager
Candidate Informed
Proceeded with another candidate.
Withdrawn
Not Reached
```

---

## 4. Main user journey cases

## Journey A — HR starts a hiring project

### Goal

HR creates a hiring project and begins candidate intake.

### Actor

HR Manager.

### UI path

```txt
/projects
→ Launch New Project
→ /projects/new modal
→ Create Project
→ /projects/:projectId/pipeline/pre_interview
```

### Current frontend behavior

The New Project modal captures:

```txt
Project Name
Job Position Name
Notes
Hiring Manager
Assigned HR Users
LinkedIn Setup
Recruiter Project ID
Import Source: Auto-Sync | Manual Import
```

### Backend implications

Need entities/API for:

```txt
Project
Project assignments
LinkedIn import config
Project creation command
```

Likely API:

```txt
POST /projects
GET /projects
GET /projects/:id
PATCH /projects/:id
```

---

## Journey B — Pre-Interview screening

### Goal

Before formal interviews, HR/HM can comment and HR can conduct initial candidate contact.

### Actors

HR Manager and Hiring Manager.

### UI path

```txt
/projects/:projectId/pipeline/pre_interview
→ candidate row
→ View
→ /projects/:projectId/candidates/:candidateId
```

### Key actions

HR:

```txt
HR Comments
Add Log
Add Note
Process candidate after successful contact
```

HM:

```txt
HM Comments
Add Note
```

### Important statuses

```txt
waiting_for_contact
scheduled / Contact Successful
not_reached
withdrawn
```

### Backend implications

This stage needs structured support for:

```txt
contact attempt logs
pre-interview comments by role
notes with visibility controls
candidate stage transitions
```

Notes currently have field-level visibility; for example expected wage can be HR-only.

---

## Journey C — Department Interview

### Goal

Move contacted candidates into department-level evaluation.

### Actors

HR and HM.

### UI path

```txt
/projects/:projectId/pipeline/department_interview
→ candidate row View
→ candidate detail
```

### Key states

```txt
Waiting for Contact
Scheduled
Not Reached
Rejected
Withdrawn
```

### Key actions

HR:

```txt
Contact Info
Log Contact Attempt
Add Note
```

HM for scheduled candidates:

```txt
Add Note
Process
  Move to HR Stage
  Reject
```

### Backend implications

Need to represent:

```txt
scheduled interview details
meeting URL
contact attempts
rejection by hiring manager
transition to HR Interview
```

---

## Journey D — HR Interview and assessment

### Goal

HR conducts deeper evaluation and can send assessment before moving candidate to Candidate Review.

### Actor

HR Manager primarily.

### UI path

```txt
/projects/:projectId/pipeline/hr_interview
→ candidate row View
→ candidate detail
```

### Key statuses

```txt
Waiting for Contact
Scheduled
Not Reached
Rejected
Assessment Sent
Withdrawn
```

### Key actions

```txt
Contact Info
Log Contact Attempt
Add Note
Process
  Send Assessment
  Move to Candidate Review
  Reject
```

### Notes behavior

HR interview notes can be structured field notes rather than a single text blob.

Example fields:

```txt
Why is the candidate interested in this role?
How clear and professional was the communication?
What is the expected wage?       // HR-only visibility
Is notice period / availability suitable?
Did the candidate show strong motivation and stability?
General Notes
```

### Backend implications

Need support for:

```txt
structured note templates
field-level visibility
assessment sent state
HR rejection state
transition to Candidate Review
```

---

## Journey E — Candidate Review / Manager Review

### Goal

Hiring manager reviews candidates after HR screening/assessment.

### Actor

Hiring Manager primarily, HR can observe and support.

### UI path

```txt
/projects/:projectId/pipeline/manager_review
→ candidate row View
→ candidate detail
```

### Key statuses represented

```txt
Waiting / blank review state
Waitlisted
Rejected
```

Current UI intentionally does not treat `Offer Sent` or `Approved for Offer` as manager-review statuses; those belong to Offer Stage.

### Key actions

```txt
Approve for Offer
Waitlist
Reject
Interim Update for waitlisted candidates
```

### Backend implications

Need:

```txt
manager decision records
waitlist state
interim update logs
transition to Offer Stage after approval
```

---

## Journey F — Offer Stage

### Goal

Handle ordered approved candidates and offer outcomes.

### Actors

HR and HM.

### UI path

```txt
/projects/:projectId/pipeline/offer_stage
→ candidate row View
→ candidate detail
```

### Key statuses

```txt
Approved for Offer
Final Check Sent
Offer Sent
Offer Accepted
Offer Rejected
Proceeded with Another Candidate
```

### Offer ordering behavior

The offer table has order labels:

```txt
First Candidate
Second Candidate
Third Candidate
```

HM/HR can reorder candidates in the offer list. The frontend includes drag-and-drop preview and confirmation.

### Key actions

For eligible offer-stage candidates:

```txt
Offer Handling
  Send Final Check
  Send Offer
  Offer Accepted
  Offer Rejected
```

### Product rule represented

When one candidate accepts an offer, other waitlisted/offer-stage candidates can become:

```txt
Proceeded with Another Candidate
```

### Backend implications

Need first-class concepts for:

```txt
Offer queue/order
Final check state
Offer sent state
Offer accepted/rejected state
Project completion/archive eligibility
Automatic side effects after offer accepted
```

Possible entity:

```txt
OfferQueueItem
  projectId
  candidateId
  rank
  state
```

---

## Journey G — Rejection Follow-up

### Goal

Track rejected candidates requiring follow-up communication.

### Actor

HR Manager.

### UI path

```txt
/rejection-follow-up
→ View
→ /projects/:projectId/candidates/:candidateId?source=rejection
```

### Rejection table filters

```txt
Search candidate name
Project filter
Status filter
```

### Rejection statuses in this area

```txt
Waiting for Contact
Rejection Handled
```

### Candidate detail behavior in rejection source

Candidate detail keeps rejection context:

```txt
Rejection Follow-up > Candidate Name
```

Quick action:

```txt
Rejection Handling
```

Modal:

```txt
Log Rejection Contact Attempt
  Not Reached
  Rejection Handled
  Attempt Date & Time
  Notes
```

### Backend implications

Need rejection follow-up as either:

1. a special candidate status dimension, or
2. a separate follow-up task entity.

Recommended entity:

```txt
RejectionFollowUpTask
  candidateId
  projectId
  status: waiting_for_contact | handled
  eligibleDate
  attempts[]
```

This avoids overloading candidate pipeline status.

---

## Journey H — Project archival

### Goal

Completed projects are archived after accepted offers.

### Actor

HR Manager.

### UI path

```txt
/projects
→ Edit Project
→ archive action if candidate has accepted offer
/projects/archived
```

### Current frontend behavior

Project cards can show accepted/completed state. Archived projects are separated under:

```txt
/projects/archived
```

### Backend implications

Need project lifecycle state:

```txt
active
archived
```

And probably a derived/project outcome state:

```txt
hasAcceptedOffer
completedAt
archivedAt
```

---

## 5. Key product constraints represented by the frontend

### Role-based UI

The same routes render different actions based on role.

Example:

```txt
HR sees Rejection Follow-up menu.
HM does not.
HR handles contact/logging/rejection follow-up.
HM handles manager review decisions and offer ordering.
```

### Stage/status is a state machine

The UI strongly implies a candidate state machine. Candidate status should be constrained by stage.

Example:

```txt
Pre-Interview:
- waiting_for_contact
- scheduled/contact_successful
- not_reached
- withdrawn

Department Interview:
- waiting_for_contact
- scheduled
- not_reached
- rejected
- withdrawn

HR Interview:
- waiting_for_contact
- scheduled
- not_reached
- assessment_sent
- rejected
- withdrawn

Candidate Review:
- waiting/pending
- waitlisted
- rejected

Offer Stage:
- approved_for_offer
- final_check_sent
- offer_sent
- offer_accepted
- offer_rejected
- proceeded_with_another_candidate
```

### Notes are not simple comments

The UI represents multiple note types:

```txt
free text note
structured HR interview/pre-interview note
role-aware visibility
field-level HR-only visibility
```

### Activity history is audit log

Activity history should not be computed only from current status. It should be stored as immutable/auditable events.

### Modals are route-driven

Many actions use query params:

```txt
?modal=log-contact
?modal=contact-card
?modal=rejection-contact
?modal=interim-update
?modal=hm-comments
?modal=hr-comments
```

This is useful because the UI state can be deep-linked and restored.

---

## 6. Current prototype limitations

The frontend is useful as product documentation, but important limitations remain:

1. Actions mostly do not persist candidate state transitions.
2. Some state is stored in `localStorage` only:
   - active role
   - saved candidate notes
   - pre-interview comments
3. There is no real authentication/authorization.
4. There is no backend validation of allowed transitions.
5. Activity history is mock data, not generated by real events.
6. Offer ordering is UI-preview only; it does not persist to a backend.
7. Rejection follow-up is inferred from candidate status rather than a separate backend task model.

---

## 7. Stack implications

Based on the frontend behavior, the backend should support more than CRUD.

### Recommended backend capabilities

```txt
Authentication with Microsoft Entra ID
Role-based authorization
Candidate state machine / transition service
Project lifecycle service
Offer queue/order service
Rejection follow-up task service
Audit/event log service
Notes service with visibility controls
Notification/email integration later
LinkedIn import integration later
```

### Recommended persistence model

At minimum:

```txt
users
projects
project_members
candidates
candidate_interviews
candidate_notes
candidate_activity_events
contact_attempts
rejection_follow_up_tasks
offer_queue_items
project_comments
```

### Recommended frontend architecture direction

The current repository seam is good. Next production step should be:

```txt
MSAL auth context
API-backed repository implementation
React Query or similar server-state cache
Form validation library
Centralized enum/state-machine definitions shared with backend if possible
```

### Important architectural decision

The backend should own the transition rules. The frontend should request actions like:

```txt
POST /candidates/:id/actions/log-contact-attempt
POST /candidates/:id/actions/move-to-stage
POST /candidates/:id/actions/reject
POST /candidates/:id/actions/approve-for-offer
POST /candidates/:id/actions/send-final-check
POST /candidates/:id/actions/send-offer
POST /candidates/:id/actions/offer-accepted
POST /candidates/:id/actions/offer-rejected
```

Rather than letting the frontend directly patch arbitrary `stage` and `status` values.
