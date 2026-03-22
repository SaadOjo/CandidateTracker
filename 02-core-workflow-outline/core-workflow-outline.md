# Core Workflow Outline

## 1. Workflow Summary
Candidate Tracker manages the hiring workflow for a single open position after shortlisted candidates are moved into a specific LinkedIn pipeline stage and imported into the system.

The workflow begins with imported shortlisted candidates who are ready to be contacted for the department interview. It then moves through department interview handling, HR interview handling, hiring manager decision-making, offer handling, and final closure when an offer is accepted or all remaining candidates are closed.

The two users in the workflow are:
- Hiring Manager
- HR

The main handoffs are:
- from Hiring Manager to HR when shortlisted candidates enter the system
- from HR to Hiring Manager after department interview scheduling
- from Hiring Manager to HR when a candidate is moved to HR interview
- from HR to Hiring Manager after HR interview notes are entered
- from Hiring Manager to HR when candidates are approved for offer

The workflow should be thought of as a few broader stages, each with statuses inside them, rather than one long flat pipeline of unrelated states.

## 2. Main Workflow Stages
1. Candidate Intake
2. Department Interview Stage
3. HR Interview Stage
4. Offer Decision Stage
5. Offer Handling Stage
6. Project Closure

## 3. Step-by-Step Workflow

### Step 1 — Candidate Intake
- User: System / LinkedIn integration
- Action: A candidate is moved into the chosen LinkedIn pipeline stage and imported into Candidate Tracker.
- Outcome: The candidate appears in the project for the relevant Hiring Manager and enters the initial status **Waiting for Contact**.

### Step 2 — Department Interview Outreach
- User: HR
- Action: HR reviews imported candidates and contacts them to arrange the department interview.
- Outcome: The candidate moves to one of the following statuses inside the Department Interview Stage:
  - **Waiting for Contact**
  - **Scheduled**
  - **Not Reached**
  - **Withdrawn**

Notes:
- "Withdrawn" also covers candidates who are no longer interested.
- "Not Reached" means a contact attempt was made but the candidate was not reached; it does not imply a permanent outcome.
- Candidates in **Not Reached** remain active and can be retried directly from that status.
- The system should log contact attempts, including number of tries and last attempt time.

### Step 3 — Department Interview Scheduling
- User: HR
- Action: HR adds the interview details and meeting link after arranging the interview.
- Outcome: The candidate is marked **Scheduled** for the department interview.

Notes:
- The system does not need deep Teams or calendar integration in MVP.
- HR can enter the meeting link directly.
- If an interview must be moved, the system should track rescheduling history.

### Step 4 — Department Interview Conducted
- User: Hiring Manager
- Action: The Hiring Manager conducts the department interview and enters interview notes directly in Candidate Tracker.
- Outcome: The Hiring Manager decides one of the following:
  - **Rejected**
  - **Undecided**
  - **Move to HR Interview**

Notes:
- Candidates in the **Undecided** status remain there until the Hiring Manager later moves them to **Rejected** or **Move to HR Interview**.
- Candidates cannot move directly from **Undecided** to offer approval. They must first go through the HR interview.

### Step 5 — HR Interview Outreach
- User: HR
- Action: When a candidate is moved forward by the Hiring Manager, HR contacts them to arrange the HR interview.
- Outcome: The candidate enters the HR Interview Stage with one of the following statuses:
  - **Waiting for Contact**
  - **Scheduled**
  - **Not Reached**
  - **Withdrawn**

Notes:
- The same outreach logic used for the department interview applies here.
- Candidates in **Not Reached** remain active and can be retried directly from that status.
- Contact attempts should again be logged.

### Step 6 — HR Interview Conducted
- User: HR
- Action: HR conducts the HR interview and enters notes directly in Candidate Tracker.
- Outcome: The candidate moves to the Offer Decision Stage and becomes ready for Hiring Manager review.

Notes:
- HR does not make the hiring decision at this step.
- HR only records notes and feedback.
- The Hiring Manager uses those notes to decide the candidate's next path.

### Step 7 — Offer Decision
- User: Hiring Manager
- Action: The Hiring Manager reviews HR notes and chooses the candidate's next status.
- Outcome: The candidate is moved to one of the following:
  - **Approved for Offer**
  - **Waitlisted**
  - **Rejected**

Notes:
- Multiple candidates can be approved for offer.
- Approved candidates should have an offer priority so HR knows which candidate to approach first.
- Waitlisted candidates cannot receive an offer unless the Hiring Manager later changes their status to **Approved for Offer**.

### Step 8 — Offer Handling
- User: HR
- Action: HR starts the offer process for the highest-priority candidate in **Approved for Offer**.
- Outcome: The candidate moves through the following statuses:
  - **Offer Sent**
  - **Offer Accepted**
  - **Offer Declined**

Notes:
- HR should extend offers one candidate at a time.
- If the current candidate declines, HR automatically proceeds to the next highest-priority candidate already approved for offer.
- If no approved candidates remain, HR waits for the Hiring Manager to promote a waitlisted candidate to **Approved for Offer**.
- At this stage, declined and withdrawn do not need to be treated as separate outcomes.

### Step 9 — Project Closure
- User: System, HR, Hiring Manager
- Action: When one candidate accepts the offer, the project is considered complete.
- Outcome:
  - the accepted candidate becomes the hired candidate
  - all remaining unrejected candidates eventually move to **Position Filled by Another Candidate**
  - those candidates become eligible for rejection notice handling after a cooldown period

Notes:
- Rejection notices are in scope only as a tracked follow-up list, not as generated or sent messages.
- Candidates rejected earlier in the process can also become eligible for rejection notice handling after a cooldown period.

## 4. Candidate States and Transitions

### Broad stages
- Candidate Intake
- Department Interview Stage
- HR Interview Stage
- Offer Decision Stage
- Offer Handling Stage
- Project Closure

### Typical statuses used inside stages
- Waiting for Contact
- Scheduled
- Not Reached
- Withdrawn
- Rejected
- Undecided
- Ready for Hiring Manager Review
- Approved for Offer
- Waitlisted
- Offer Sent
- Offer Accepted
- Offer Declined
- Position Filled by Another Candidate

### Typical transitions
- Imported from LinkedIn → Waiting for Contact
- Waiting for Contact → Scheduled
- Waiting for Contact → Not Reached
- Waiting for Contact → Withdrawn
- Not Reached → Scheduled / Withdrawn / remain Not Reached with additional attempts logged
- Scheduled → Rejected / Undecided / Move to HR Interview
- Move to HR Interview → Waiting for Contact
- HR Interview Waiting for Contact → Scheduled / Not Reached / Withdrawn
- HR Interview Not Reached → Scheduled / Withdrawn / remain Not Reached with additional attempts logged
- HR Interview Scheduled → Ready for Hiring Manager Review
- Ready for Hiring Manager Review → Approved for Offer / Waitlisted / Rejected
- Approved for Offer → Offer Sent
- Offer Sent → Offer Accepted / Offer Declined
- Offer Declined → next Approved for Offer candidate enters Offer Sent
- Waitlisted → Approved for Offer / Rejected / Position Filled by Another Candidate
- Undecided → Rejected / Move to HR Interview / Position Filled by Another Candidate
- Any active non-hired candidate at project end → Position Filled by Another Candidate

## 5. Key Decisions

### Hiring Manager decisions
- Reject candidate after department interview
- Keep candidate as Undecided after department interview
- Move candidate to HR Interview after department interview
- After HR interview, reject candidate
- After HR interview, waitlist candidate
- After HR interview, approve candidate for offer
- Assign or adjust offer priority among approved candidates
- Move waitlisted candidates to approved for offer if needed

### HR decisions and actions
- Contact candidate for interview scheduling
- Record outreach outcomes such as Scheduled, Not Reached, or Withdrawn
- Enter interview details and meeting link
- Reschedule interviews when needed
- Conduct HR interview and record notes
- Start offer process for the highest-priority approved candidate
- Move to the next approved candidate if an offer is declined

### Decisions that change the candidate's path
- Hiring Manager moves candidate from department interview outcome to HR interview or rejection
- Hiring Manager moves candidate from HR review to approved, waitlisted, or rejected
- HR records outreach outcomes that can pause, continue, or effectively end progress
- Offer accepted closes the project and changes the outcome for all remaining active candidates

## 6. Exceptions and Edge Cases
- Candidate is not reached during department interview outreach
- Candidate is not reached during HR interview outreach
- Candidate withdraws before scheduling
- Candidate withdraws after scheduling but before interview
- Interview is rescheduled and the system logs rescheduling history
- Candidate remains in Undecided for some time before later resolution
- Candidate is waitlisted and cannot be offered automatically
- Top approved candidate declines offer
- No approved candidates remain, so HR must wait for Hiring Manager action on waitlisted candidates
- A candidate is rejected at any stage and becomes eligible for rejection notice handling after a cooldown period

## 7. Notes for the Next Stage
This workflow implies that the system must store:
- candidate identity and LinkedIn reference
- project / position reference
- current broad stage
- current status within stage
- outreach attempt count
- last outreach attempt time
- interview scheduling details
- interview meeting link
- rescheduling history
- department interview notes
- HR interview notes
- hiring manager decisions
- offer approval status
- waitlist status
- offer priority
- offer status
- final closure reason
- rejection notice eligibility after cooldown

This workflow also implies likely future screens or views such as:
- project dashboard
- candidate pipeline view by stage and status
- candidate detail view
- interview scheduling/update flow
- notes entry view
- offer queue / priority view
- rejection notice follow-up list
