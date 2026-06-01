# Candidate Tracker User Journeys

## Purpose
This document summarizes the current demo workflow and status rules for the Candidate Tracker app.

---

## 1. Pre-Interview
Pre-Interview is the first HR-led step and represents an unscheduled phone screening.

### Main statuses
- Waiting for Contact
- Not Reached
- Contact Successful
- Withdrawn
- Rejected

### HR behavior
- **Waiting for Contact / Not Reached**
  - Add Note
  - Add Log
  - No Process button
- **Contact Successful**
  - Add Note
  - Process
- **Withdrawn**
  - Save action should show confirmation modal

### Hiring Manager behavior
- Can add note
- If candidate is **Contact Successful**, HM also sees **Process**

### Pre-Interview comments
Pre-Interview also supports project-level comments.

#### HM Comments
- Used for optional questions or topics HR should ask during the phone screen
- Only HM sees and edits HM Comments

#### HR Comments
- Used for HR-only reminders or shared role-specific notes
- Only HR sees and edits HR Comments

### Comment rules
- Comments belong to the **project pre-interview stage**, not to one specific candidate
- Comments are stored separately from Internal Notes
- Pre-interview comments should still be visible when reviewing the pre-interview stage
- Candidate-specific pre-interview notes should continue into later candidate stages through Internal Notes

### Process options
- Move to Department Interview Stage
- Reject

### Rules
- Reject stays at the bottom of the process list
- Pre-interview HR notes should remain visible in later stages
- Pre-interview comments and logs should appear in activity history when relevant

---

## 2. Department Interview
Candidate moves here after successful pre-interview.

### Main statuses
- Waiting for Contact
- Not Reached
- Scheduled
- Withdrawn
- Rejected

### HR behavior
- Contact Info
- Log Contact Attempt
- Add Note

### Hiring Manager behavior
- If status is **Scheduled**, HM sees **Process**

### Process options
- Move to HR Stage
- Reject

### Rules
- If a candidate completed Department Interview, there should be HM notes
- Reject stays at the bottom of the process list

---

## 3. HR Interview
Candidate moves here after department interview.

### Main statuses
- Waiting for Contact
- Not Reached
- Scheduled
- Assessment Sent
- Withdrawn
- Rejected

### HR behavior
- Add Note
- Contact Info
- Log Contact Attempt
- Process

### Process rules
- If status is **Scheduled**
  - Send Assessment
  - Reject
- If status is **Assessment Sent**
  - Move to Candidate Review
  - Reject

### Rules
- Reject stays at the bottom of the process list
- "Waiting for Assessment" is no longer used
- HR interview notes should remain visible later
- Wage information is HR-only

---

## 4. Candidate Review
Candidate moves here after HR interview flow.

### Main statuses
- Waiting for Contact
- Waitlisted
- Rejected
- Approved for Offer

### Status display rules
- **Waiting for Contact** is shown as blank `--`
- **Waitlisted** is an active keep-warm state

### HR and Hiring Manager behavior
Both roles can use **Process**.

### Process options
- Approve for Offer
- Waitlist
- Reject

### Interim Update rule
If candidate is:
- in **Candidate Review**
- and status is **Waitlisted**

then **HR** can send an **Interim Update** from quick actions.

### Interim Update behavior
- Separate modal, similar to Log Contact Attempt
- Used for keep-warm / keep-in-touch communication
- Should be saved into activity history

### Rules
- Reject stays at the bottom of the process list
- Contact Info and Log Contact Attempt are not shown in Candidate Review quick actions
- HR also sees the View button in Candidate Review pipeline

---

## 5. Offer Stage
Candidates approved for offer move into Offer Stage.

### Main statuses
- Approved for Offer
- Final Check Sent
- Offer Sent
- Offer Accepted
- Offer Rejected
- Proceeded with Another Candidate

### Ordering rules
- Approved candidates are ranked in order
- HR and HM can use the drag handle for reorderable offer candidates
- If there is already an **Offer Sent** candidate, that candidate is effectively first in the offer sequence
- Remaining queue labels continue after that position

### Offer flow
The active first candidate moves through the offer process.

#### If status is **Approved for Offer**
- Send Final Check

#### If status is **Final Check Sent**
- Send Offer
- Reject

#### If status is **Offer Sent**
- Offer Accepted
- Offer Rejected

### Important logic
- If one candidate already has **Offer Sent**, another candidate should not also be in **Final Check Sent**
- Backup candidates should remain **Approved for Offer**
- Final Check Sent should only appear for the active first offer-path candidate
- If a candidate is **Offer Rejected**, the quick action bar should be hidden

### Accepted offer rules
If a project has an **Offer Accepted** candidate:
- Active project badge becomes **Candidate Accepted**
- Offer-step process buttons are hidden
- Waitlisted candidates become **Proceeded with Another Candidate**
- Archived projects still keep **Archived** badge

---

## 6. Rejection Follow-Up
Rejected and proceeded candidates can appear in Rejection Follow-Up.

### Included statuses
- Rejected
- Proceeded with Another Candidate

### Ordering rules
- Waiting for Contact first
- Not Reached next
- Active items next
- Rejected / Withdrawn lower

### HR behavior
- Open candidate detail
- Handle rejection contact
- Log rejection attempts

---

## 7. Notes rules
### Expected note flow
Typical sequence:
1. Pre-Interview HR note
2. Department Interview HM note
3. HR Interview HR note

### Visibility rules
- Most recent note stays on top
- Notes are collapsed by default
- Internal Notes only appear if notes exist
- HM cannot see HR-only wage information

---

## 8. Activity History rules
Workflow actions should also be reflected in activity history.

### Examples
- Profile Imported
- Pre-Interview Conducted Successfully
- Not Reached
- Department Interview Scheduled
- Department Interview
- HR Interview Scheduled
- HR Interview
- Assessment Sent
- Waitlisted by Hiring Manager
- Interim Update Sent
- Approved for Offer
- Final Check Sent
- Offer Sent
- Offer Accepted
- Offer Rejected
- Rejected by HR Manager
- Rejected by Hiring Manager
- Candidate Informed
- Proceeded with Another Candidate

### Display rules
- Activity explanation should show the owner when possible
- Contact attempt entries should include both attempt number and owner

---

## 9. Shared UI rules
- Negative actions should be placed at the end of process lists
- Open action lists should show separators between options
- Confirmation modals should be used for critical actions like reject / withdrawn
- Confirmation modals should include candidate name and pipeline step where relevant
