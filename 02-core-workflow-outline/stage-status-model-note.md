# Stage and Status Model Note

## Decision
Use a two-level workflow model in the data design:
- **Stage** = the broad phase of the hiring process
- **Status** = the candidate's current condition inside that stage

We will not model the workflow as one long flat list of combined states.

## How to present it
Internally, store **stage + status**.

In the UI, show a combined label when needed for clarity, for example:
- **Department Interview — Scheduled**
- **Department Interview — Not Reached**
- **HR Interview — Scheduled**
- **Offer Handling — Offer Sent**

## Why this decision was made
- the workflow has a few broad phases
- some statuses repeat across multiple phases
- this structure is cleaner to maintain and easier to extend

## Possible First-Pass Stage and Status Shape

### Stage: Candidate Intake
Possible status:
- Waiting for Contact

### Stage: Department Interview
Possible statuses:
- Waiting for Contact
- Scheduled
- Not Reached
- Withdrawn
- Rejected
- Undecided
- Move to HR Interview

### Stage: HR Interview
Possible statuses:
- Waiting for Contact
- Scheduled
- Not Reached
- Withdrawn
- Ready for Hiring Manager Review

### Stage: Offer Decision
Possible statuses:
- Approved for Offer
- Waitlisted
- Rejected

### Stage: Offer Handling
Possible statuses:
- Offer Sent
- Offer Accepted
- Offer Declined

### Stage: Project Closure
Possible statuses:
- Position Filled by Another Candidate

## Note
This is a structural decision, not a finalized naming scheme. Final names can still be refined later for consistency and readability.
