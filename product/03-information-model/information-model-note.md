# Information Model Note

## 1. Information Model Summary
Candidate Tracker needs a simple information model that cleanly separates:
- stable candidate information
- project information
- project-specific workflow information

The main design decision for this stage is:
- keep the model simple
- store person-level data on **Candidate**
- store project-specific workflow state on **CandidatePipeline**
- keep notes as their own entity
- keep offer-related workflow data on **CandidatePipeline** in MVP
- use stage + status for workflow state

At a high level, the system needs to manage:
- projects / positions imported or referenced from LinkedIn
- shortlisted candidates imported from LinkedIn
- a candidate's participation in a specific project's hiring workflow
- contact information needed for outreach
- stage-specific contact attempts
- scheduled interview details
- notes from HR and Hiring Managers
- offer-related workflow data
- project closure and candidate closure data
- LinkedIn sync tracking

## 2. Core Entities
The main entities for MVP are:
- Project / Position
- Candidate
- CandidatePipeline
- User
- Note
- Contact Attempt
- Interview
- Rejection Notice Follow-up

These are enough for the current workflow. We do not need a separate Pipeline entity or a separate Offer entity in MVP.

## 3. Key Fields per Entity

### Project / Position
Represents one open position. In this product, the project is the open position.

Likely fields:
- project id
- LinkedIn project id
- project name
- job position name
- hiring manager references
- associated HR user references
- project status
- project closure reason
- hired candidate pipeline reference, if any
- imported date
- closed date
- last LinkedIn sync date
- LinkedIn sync status

Notes:
- One project corresponds to one open position.
- A project can have multiple Hiring Managers and multiple HR users.
- A project may close either with a successful hire or with no one hired.
- Project status and project closure reason should be stored separately.
- A simple project status model such as **Active / Closed** is enough for MVP.

### Candidate
Represents the stable person-level candidate record.

Likely fields:
- candidate id
- LinkedIn candidate id
- full name
- LinkedIn profile URL
- phone number
- email
- CV / resume
- last LinkedIn sync date
- LinkedIn sync status

Notes:
- Candidate stores person-level information, not project workflow state.
- CV should be stored in Candidate Tracker.
- LinkedIn profile link should be visible in the product.
- Phone number should be visible to HR during outreach.
- If phone number is not available from LinkedIn, HR can use the CV.

### CandidatePipeline
Represents a candidate's participation in a specific project's hiring workflow.

Likely fields:
- candidate pipeline id
- candidate reference
- project reference
- current stage
- current status
- offer priority
- offer status
- offer sent date, if applicable
- offer response date, if applicable
- final closure reason
- imported date
- duplicate warning flag, if candidate appears in another project
- last LinkedIn sync date
- LinkedIn sync status

Notes:
- CandidatePipeline is the main workflow object.
- It stores the candidate's current stage and current status for a specific project.
- Offer-related information lives on CandidatePipeline in MVP.
- A candidate may have multiple CandidatePipeline records across different projects, even if MVP only surfaces that as a warning.
- Closure information belongs here because it is project-specific.

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

### Note
Represents a note attached to a candidate within a specific project workflow.

Likely fields:
- note id
- candidate pipeline reference
- note type / author role
- note text
- created date/time
- updated date/time

Notes:
- Use one Note entity rather than separate HR Note and Hiring Manager Note entities.
- Notes belong to CandidatePipeline, not just to Candidate.
- Notes should support history, but the exact versioning mechanism does not need to be finalized at this stage.
- Notes are simple text in MVP.

### Contact Attempt
Represents an outreach attempt by HR for a specific workflow stage.

Likely fields:
- contact attempt id
- candidate pipeline reference
- stage reference
- attempt number
- attempt date/time
- result
- notes, if needed

Notes:
- Contact attempts belong to a stage within a candidate pipeline.
- This supports retries for both department interview outreach and HR interview outreach.
- The UI may later show only the number of tries and the last attempt time, but the model can store each attempt.

### Interview
Represents a scheduled interview instance.

Likely fields:
- interview id
- candidate pipeline reference
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
Represents that a candidate in a project workflow is eligible to be sent a rejection notice after cooldown.

Likely fields:
- follow-up id
- candidate pipeline reference
- reason eligible
- cooldown start date
- eligible date
- follow-up status

Notes:
- MVP does not need to generate or send rejection notices.
- It only needs to track which candidates are ready for that follow-up.

## 4. Relationships Between Entities
- A Project / Position can have multiple Hiring Managers.
- A Project / Position can have multiple associated HR users.
- A Candidate can have multiple CandidatePipeline records.
- A CandidatePipeline belongs to one Candidate.
- A CandidatePipeline belongs to one Project / Position.
- A CandidatePipeline can have many Notes.
- A CandidatePipeline can have many Contact Attempts.
- A CandidatePipeline can have multiple Interviews over time.
- A CandidatePipeline can have one Rejection Notice Follow-up record when relevant.
- A User belongs to one role type in MVP.

## 5. Important Status-Bearing Objects
These are the objects that carry important workflow state.

### Project / Position
Likely stores:
- project status
- project closure reason
- hired candidate pipeline reference
- LinkedIn sync status
- last LinkedIn sync date

### Candidate
Likely stores:
- LinkedIn sync status
- last LinkedIn sync date

### CandidatePipeline
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
- notes from HR and Hiring Managers

### Hiring Manager needs
- candidate full name
- phone number
- email
- LinkedIn profile link
- CV / resume
- current stage and status
- notes from HR and Hiring Managers
- candidate offer decision state

## 7. Notes for the Next Stage
This information model suggests the product will likely need:
- a project dashboard
- a candidate list / pipeline view
- a candidate detail page
- interview scheduling forms
- note entry and note history views
- an offer priority / offer queue view
- a rejection notice follow-up list
- duplicate candidate warnings
- LinkedIn sync status visibility

## 8. Open Points to Clarify
These points are not fully finalized yet and should be reviewed later:
- exact fields imported from LinkedIn
- exact shape of LinkedIn sync handling, depending on API support
- exact naming of stages and statuses
- whether note history should be a simple version log or a more structured model
- whether rescheduling history should be a simple log or a more structured record
