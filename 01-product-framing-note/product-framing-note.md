# Product Framing Note

## 1. Product Summary
Candidate Tracker is an internal web application for Token used by hiring managers and HR to manage shortlisted candidates after they have already been identified in LinkedIn Recruiter.

The product begins when a candidate is moved into a particular stage of a LinkedIn pipeline and is imported into Candidate Tracker. It supports the hiring workflow from that point through interviews, decisions, offer handling, and final offer acceptance or decline.

Candidate Tracker is not a full ATS. It is a focused post-shortlist hiring workflow tool.

## 2. Problem Statement
The current hiring process is manual, email-driven, and prone to errors.

Today, hiring managers shortlist candidates in LinkedIn, copy profile links, and email them to HR. HR then contacts candidates, schedules interviews, shares updates by email, and later sends notes and feedback back to the hiring manager, often in batches. The same pattern continues through HR interviews and offer handling.

Because there is no shared system:
- status tracking is fragmented
- notes are not stored in one place
- communication depends on email handoffs
- updates are often delayed because people batch work
- candidate outcomes such as unreachable, withdrawn, waitlisted, or approved are harder to track clearly
- the process is prone to confusion and operational errors

## 3. Target Users
### Primary users
- Hiring Managers
- HR

### User mode
The application should support two modes based on who is logging in:
- Hiring Manager mode
- HR mode

This can be decided when an account is created.

### User needs
#### Hiring Manager
- See shortlisted candidates imported from LinkedIn
- Track candidate progress clearly across the hiring process
- Record interview notes directly in the system
- Review HR notes and feedback
- Make decisions such as reject, move forward, waitlist, and approve for offer
- Rank candidates for offer priority

#### HR
- Receive candidates in a shared system instead of through email
- Track outreach outcomes such as scheduled, unreachable, or withdrawn
- Enter interview scheduling details and meeting links
- Record HR interview notes directly in the system
- Review hiring manager notes
- Progress candidates through the workflow and handle offers in the approved order

### Non-users
- Candidates do not interact with the application
- No separate note-taking user is needed; each interviewer enters their own notes

## 4. Scope
### In Scope
- Importing candidates from LinkedIn Recruiter when they are moved into a specific LinkedIn pipeline stage
- Importing LinkedIn projects so they can appear in the relevant hiring manager dashboard
- Managing shortlisted candidates from post-shortlist through offer accepted or declined
- Supporting the first department interview stage
- Supporting the HR interview stage
- Tracking outreach outcomes such as scheduled, unreachable, and withdrawn
- Recording interview notes from both hiring managers and HR
- Allowing HR and hiring managers to see each other's notes
- Tracking candidate decisions such as rejected, moved forward, waitlisted, and approved for offer
- Tracking interview scheduling details, including the meeting link entered by HR
- Tracking interview rescheduling history
- Supporting offer approval and offer priority
- Supporting one active offer at a time, while allowing multiple candidates to be approved as suitable for offers

### Out of Scope
- Candidate sourcing
- Pre-shortlist pipeline management
- Full ATS functionality
- Candidate interaction with the product
- Deep integration with Teams or calendar systems for automatic meeting creation
- Standardized interview scorecards or structured evaluation forms in the initial version
- Additional rare workflow scenarios such as multiple extra interview rounds for undecided candidates
- Any process beyond offer acceptance or decline

## 5. Workflow Boundaries
### Start
The workflow starts when a hiring manager moves a candidate into a particular stage of a LinkedIn pipeline and that candidate is imported into Candidate Tracker.

### End
The workflow ends when the candidate's final offer outcome is known:
- offer accepted
- offer declined

### Main flow in between
- Candidate is imported from LinkedIn into Candidate Tracker
- HR handles outreach for the first department interview
- Candidate may be scheduled, unreachable, or no longer interested / withdrawn
- Hiring manager conducts the department interview and records notes
- Hiring manager decides whether to reject, keep undecided, move forward, or later revisit the candidate
- HR conducts the HR interview and records notes
- HR shares feedback in the same system instead of by email
- Hiring manager approves candidates for offers or places them on a waitlist
- Hiring manager assigns offer priority
- HR extends an offer to one approved candidate at a time, following priority order
- If needed, HR returns to the hiring manager for a decision on waitlisted candidates

## 6. MVP Success Criteria
This first version is useful if it eliminates the need to manage this workflow through email and removes the need to track candidate information anywhere else.

A successful MVP should provide:
- a single source of truth for shortlisted candidates
- clear visibility into each candidate's current status
- one shared place for notes from both hiring managers and HR
- a way to manage interview scheduling details and rescheduling history
- a way to track offer approval, waitlisting, and one-by-one offer handling without email coordination

## 7. Constraints and Assumptions
### Constraints
- This is an internal tool for Token
- The product should stay minimalist
- The product should solve known current problems, not anticipated future ones
- Features that are only occasionally useful should not be included early unless clearly needed
- LinkedIn is the only planned integration for the initial version
- Teams/calendar integration may be restricted by IT, so scheduling should work without depending on those integrations

### Assumptions
- Each hiring manager has a LinkedIn Recruiter account
- LinkedIn projects can be imported and shown in the hiring manager dashboard
- Candidate import is triggered by movement into a particular LinkedIn pipeline stage
- Department interview is the first standard interview stage
- HR interview is the second standard interview stage
- Rare additional interview rounds for undecided candidates can be ignored in the initial version
- HR and hiring managers should both be able to read each other's notes
- HR extends offers one at a time, even if multiple candidates are approved for offers

## 8. Open Questions
- None identified yet at this stage
