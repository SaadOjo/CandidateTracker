# Information Model Note

## 1. Information Model Summary
Candidate Tracker needs to store and present the information required to support the hiring workflow after shortlist. The information model should make it easy for HR and Hiring Managers to do their work without relying on email or separate tracking tools.

At a high level, the system needs to manage:
- projects / positions imported or referenced from LinkedIn
- candidates imported from LinkedIn
- candidate workflow stage and status
- contact information needed for outreach
- contact attempts by stage
- scheduled interview information
- simple notes from both HR and Hiring Manager
- offer-related information on the candidate
- project closure and candidate closure information
- LinkedIn sync tracking

## 2. Core Entities
The main entities currently implied by the workflow are:
- Project / Position
- Candidate
- User
- Contact Attempt
- Interview
- Rejection Notice Follow-up

## 3. Key Fields per Entity

### Project / Position
Represents one open position. In this product, the project is the open position.

Likely fields:
- project id
- LinkedIn project id
- project name
- job position name
- hiring manager
- associated HR users
- project status
- project closure reason
- imported date
- closed date
- last LinkedIn sync date
- LinkedIn sync status

Notes:
- One project corresponds to one open position.
- A project can have one Hiring Manager and multiple HR users.
- A project may close either with a successful hire or with no one hired.
- Project status and project closure reason should be stored separately.

### Candidate
Represents a shortlisted candidate imported from LinkedIn.

Likely fields:
- candidate id
- LinkedIn candidate id
- full name
- LinkedIn profile URL
- phone number
- email
- CV / resume
- project reference
- current stage
- current status
- hiring manager notes
- HR notes
- offer priority
- offer status
- final closure reason
- imported date
- duplicate warning flag, if candidate appears in another project
- last LinkedIn sync date
- LinkedIn sync status

Notes:
- Phone number should be visible to HR when contacting the candidate.
- If phone number is not available from LinkedIn, HR can use the CV.
- CV should be stored in Candidate Tracker.
- LinkedIn profile link should be visible in the product.
- Both HR and Hiring Manager can view all candidate information.
- Notes are simple text areas and are not linked to a specific stage.
- Offer-related information can live directly on the candidate in MVP.

### User
Represents a person using Candidate Tracker.

Likely fields:
- user id
- name
- role type
- Active Directory account id
- login email / work email
- LinkedIn credentials reference

Notes:
- Current user types are Hiring Manager and HR.
- A user has one fixed role in MVP.
- Users authenticate with Active Directory.
- LinkedIn credentials can be added during onboarding.

### Contact Attempt
Represents an outreach attempt by HR for a specific workflow stage.

Likely fields:
- contact attempt id
- candidate reference
- stage reference
- attempt number
- attempt date/time
- result
- notes, if needed

Notes:
- Contact attempts belong to a stage, not just to the candidate generally.
- This supports logging retries for both department interview outreach and HR interview outreach.
- The product should be able to show number of tries and last attempted time.

### Interview
Represents a scheduled interview instance.

Likely fields:
- interview id
- candidate reference
- interview type
- scheduled date/time
- meeting link
- scheduling status
- reschedule count
- rescheduling history

Notes:
- The system should support at least two interview types:
  - Department Interview
  - HR Interview
- An interview record is created only after the interview is scheduled.
- HR enters scheduling details and meeting link.
- Full rescheduling history can be stored, even if the UI later shows only summary information.

### Rejection Notice Follow-up
Represents that a candidate is eligible to be sent a rejection notice after cooldown.

Likely fields:
- follow-up id
- candidate reference
- reason eligible
- cooldown start date
- eligible date
- follow-up status

Notes:
- The initial version does not need to generate or send rejection notices.
- It only needs to track which candidates are ready for that follow-up.

## 4. Relationships Between Entities
- A Project / Position has one Hiring Manager.
- A Project / Position can have multiple associated HR users.
- A Project / Position has many Candidates.
- A Candidate belongs to one Project / Position in MVP.
- A Candidate may also appear in other projects, but MVP only needs to show a warning rather than fully manage that case.
- A Candidate can have many Contact Attempts.
- A Candidate can have multiple Interviews over time.
- A Candidate can become eligible for Rejection Notice Follow-up.
- A User belongs to one role type in MVP.

## 5. Important Status-Bearing Objects
These are the objects that carry important workflow state.

### Project / Position
Likely stores:
- project status
- project closure reason
- LinkedIn sync status
- last LinkedIn sync date

### Candidate
Likely stores:
- current stage
- current status
- offer priority
- offer status
- final closure reason
- duplicate warning flag
- LinkedIn sync status
- last LinkedIn sync date

### Contact Attempt
Likely stores:
- stage reference
- contact result
- attempt date/time

### Interview
Likely stores:
- interview type
- scheduling status
- scheduled date/time
- rescheduling information

### Rejection Notice Follow-up
Likely stores:
- cooldown status
- eligibility state

## 6. Information Visibility by User Need
This section captures what each user needs to see in order to do their work effectively.

### HR needs
- candidate full name
- phone number
- email
- LinkedIn profile link
- CV / resume
- current stage and status
- contact attempt history
- interview meeting details
- offer priority and offer status

### Hiring Manager needs
- candidate full name
- phone number
- email
- LinkedIn profile link
- CV / resume
- current stage and status
- hiring manager notes
- HR notes
- candidate offer decision state

## 7. Notes for the Next Stage
This information model suggests the product will likely need:
- a project dashboard
- a candidate list / pipeline view
- a candidate detail page
- interview scheduling forms
- notes areas for HR and Hiring Manager
- an offer priority / offer queue view
- a rejection notice follow-up list
- duplicate candidate warnings
- sync status visibility for LinkedIn imports

## 8. Open Points to Clarify
These points are not fully finalized yet and should be reviewed next:
- exact fields imported from LinkedIn
- exact shape of LinkedIn sync handling, depending on API support
- exact naming of stages and statuses
- whether any additional candidate profile fields are needed later
- whether rescheduling history should be a simple log or a more structured record
