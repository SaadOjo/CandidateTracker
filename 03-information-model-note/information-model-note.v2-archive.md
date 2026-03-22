# Information Model Note

## 1. Information Model Summary
Candidate Tracker needs to store the minimum information required to run the post-shortlist hiring workflow in one place.

The model should support:
- projects / positions imported or referenced from LinkedIn
- shortlisted candidates imported from LinkedIn
- the candidate's current stage and status
- the contact information HR needs for outreach
- stage-specific contact attempts
- scheduled interview details
- simple notes from HR and the Hiring Manager
- offer-related data on the candidate
- project closure and candidate closure data
- LinkedIn sync tracking

The main design decision for this stage is:
- keep the model simple
- store workflow state primarily on the candidate
- use stage + status rather than one long flat state list
- keep notes simple in MVP
- keep offer data on the candidate in MVP

## 2. Core Entities
The main entities for MVP are:
- Project / Position
- Candidate
- User
- Contact Attempt
- Interview
- Rejection Notice Follow-up

These are enough for the current workflow. We do not need separate MVP entities for interview notes or offers.

## 3. Key Fields per Entity

### Project / Position
Represents one open position. In this product, the project is the open position.

Likely fields:
- project id
- LinkedIn project id
- project name
- job position name
- hiring manager reference
- associated HR user references
- project status
- project closure reason
- hired candidate reference, if any
- imported date
- closed date
- last LinkedIn sync date
- LinkedIn sync status

Notes:
- One project corresponds to one open position.
- A project has one Hiring Manager and can have multiple HR users.
- A project may close either with a successful hire or with no one hired.
- Project status and project closure reason should be stored separately.
- A simple project status model such as **Active / Closed** is enough for MVP.

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
- HR notes
- Hiring Manager notes
- offer priority
- offer status
- offer sent date, if applicable
- offer response date, if applicable
- final closure reason
- imported date
- last LinkedIn sync date
- LinkedIn sync status
- duplicate warning flag, if candidate appears in another project

Notes:
- Candidate is the main workflow object.
- The candidate carries the current stage and current status.
- Phone number should be visible to HR during outreach.
- If phone number is not available from LinkedIn, HR can use the CV.
- CV should be stored in Candidate Tracker.
- LinkedIn profile link should be visible in the product.
- Both HR and Hiring Manager can view all candidate information.
- Notes are simple text areas in MVP and are not linked to a specific stage.
- Offer-related information lives directly on the candidate in MVP.

### User
Represents a person using Candidate Tracker.

Likely fields:
- user id
- name
- role type
- Active Directory account id
- work email
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
- This supports retries for both department interview outreach and HR interview outreach.
- The UI may later show only the number of tries and the last attempt time, but the model can store each attempt.

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
- HR enters the scheduling details and meeting link.
- Full rescheduling history can be stored even if the UI later shows only summary information.

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
- MVP does not need to generate or send rejection notices.
- It only needs to track which candidates are ready for that follow-up.

## 4. Relationships Between Entities
- A Project / Position has one Hiring Manager.
- A Project / Position can have multiple associated HR users.
- A Project / Position has many Candidates.
- A Candidate belongs to one Project / Position in MVP.
- A Candidate may also appear in other projects, but MVP only needs to show a warning rather than fully manage that case.
- A Candidate can have many Contact Attempts.
- A Candidate can have multiple Interviews over time.
- A Candidate can have one Rejection Notice Follow-up record when relevant.
- A User belongs to one role type in MVP.

## 5. Important Status-Bearing Objects
These are the objects that carry important workflow state.

### Project / Position
Likely stores:
- project status
- project closure reason
- hired candidate reference
- LinkedIn sync status
- last LinkedIn sync date

### Candidate
Likely stores:
- current stage
- current status
- offer priority
- offer status
- offer dates
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
- HR notes
- Hiring Manager notes
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
- LinkedIn sync status visibility

## 8. Open Points to Clarify
These points are not fully finalized yet and should be reviewed later:
- exact fields imported from LinkedIn
- exact shape of LinkedIn sync handling, depending on API support
- exact naming of stages and statuses
- whether any additional candidate profile fields are needed later
- whether rescheduling history should be a simple log or a more structured record
