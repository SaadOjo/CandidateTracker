# Workflow State Transition Tables

## Purpose
This document gives a simple reference for:
- allowed statuses by stage
- visible actions
- next possible statuses
- role ownership
- communication actions vs decision actions

---

# 1. Action Types

## Communication Actions
| Action | Purpose | Main Owner |
|---|---|---|
| Log Contact Attempt | Record outreach result | HR |
| Interim Update | Keep warm / keep in touch with waitlisted candidates | HR |
| Rejection Handling | Track rejection follow-up communication | HR |
| Contact Info | View candidate contact details | HR |
| Add Note | Save stage feedback or structured notes | HR / HM |
| HM Comments | Add pre-interview guidance/questions for HR | HM |
| HR Comments | Add pre-interview reminders or role-specific context | HR |

## Decision Actions
| Action | Purpose | Main Owner |
|---|---|---|
| Move to Department Interview | Advance from pre-interview | HR / HM |
| Move to HR Stage | Advance from department interview | HM |
| Move to Candidate Review | Advance from HR interview | HR |
| Waitlist | Keep candidate active but not primary | HR / HM |
| Reject | End candidate process | HR / HM |
| Approve for Offer | Move candidate into offer queue | HR / HM |
| Send Final Check | Start pre-offer final validation | HR |
| Send Offer | Send formal offer after final check | HR |
| Offer Accepted | Close successfully | HR |
| Offer Rejected | Close unsuccessfully | HR |

---

# 2. Stage-by-Stage State Transition Tables

## A. Pre-Interview
| Status | Visible Actions | Who Can Act | Next Possible Status / Result |
|---|---|---|---|
| Waiting for Contact | Add Note, Add Log | HR | Not Reached, Contact Successful, Withdrawn |
| Not Reached | Add Note, Add Log | HR | Not Reached, Contact Successful, Withdrawn |
| Contact Successful | Add Note, Process | HR, HM | Move to Department Interview, Reject |
| Withdrawn | No normal process actions | HR | Closed |
| Rejected | No normal process actions | HR / HM | Closed |

### Pre-Interview comment rules
| Item | Who Sees / Edits | Notes |
|---|---|---|
| HM Comments | HM | Questions/topics HR should ask in phone screen |
| HR Comments | HR | HR-only reminders or role-specific context |

---

## B. Department Interview
| Status | Visible Actions | Who Can Act | Next Possible Status / Result |
|---|---|---|---|
| Waiting for Contact | Contact Info, Log Contact Attempt, Add Note | HR | Scheduled, Not Reached, Withdrawn |
| Not Reached | Contact Info, Log Contact Attempt, Add Note | HR | Scheduled, Not Reached, Withdrawn |
| Scheduled | Contact Info, Log Contact Attempt, Add Note, Process | HR, HM | Move to HR Stage, Reject |
| Withdrawn | No normal process actions | HR | Closed |
| Rejected | No normal process actions | HR / HM | Closed |

---

## C. HR Interview
| Status | Visible Actions | Who Can Act | Next Possible Status / Result |
|---|---|---|---|
| Waiting for Contact | Contact Info, Log Contact Attempt, Add Note | HR | Scheduled, Not Reached, Withdrawn |
| Not Reached | Contact Info, Log Contact Attempt, Add Note | HR | Scheduled, Not Reached, Withdrawn |
| Scheduled | Contact Info, Log Contact Attempt, Add Note, Process | HR | Assessment Sent, Reject |
| Assessment Sent | Add Note, Process | HR | Move to Candidate Review, Reject |
| Withdrawn | No normal process actions | HR | Closed |
| Rejected | No normal process actions | HR | Closed |

### HR Interview rules
- `Waiting for Assessment` is not used anymore.
- Assessment flow continues through `Scheduled` and `Assessment Sent`.

---

## D. Candidate Review
| Status | Visible Actions | Who Can Act | Next Possible Status / Result |
|---|---|---|---|
| Waiting for Contact (`--`) | Add Note, Process | HR, HM | Approve for Offer, Waitlist, Reject |
| Waitlisted | Add Note, Process, Interim Update | HR, HM (Interim Update = HR only) | Stay Waitlisted, Approve for Offer, Reject |
| Rejected | No normal process actions | HR / HM | Closed |
| Approved for Offer | Usually candidate moves to Offer Stage | HR / HM | Offer Stage |

### Candidate Review rules
- `Waiting for Contact` is shown as blank `--`
- HR should not see Contact Info / Log Contact Attempt in this step
- Interim Update is only for waitlisted candidates

---

## E. Offer Stage
| Status | Visible Actions | Who Can Act | Next Possible Status / Result |
|---|---|---|---|
| Approved for Offer | Offer Handling, reorder in queue | HR (handling), HR/HM (ordering) | Final Check Sent |
| Final Check Sent | Offer Handling, reorder in queue | HR (handling), HR/HM (ordering) | Send Offer, Reject |
| Offer Sent | Offer Handling | HR | Offer Accepted, Offer Rejected |
| Offer Accepted | No active offer handling | HR | Closed successful |
| Offer Rejected | Quick actions hidden | HR | Closed unsuccessful |
| Proceeded with Another Candidate | No active offer handling | HR | Closed |

### Offer Stage rules
| Rule | Meaning |
|---|---|
| Only one active front-runner | Only the first active offer-path candidate should move through final check / offer flow |
| If one candidate is Offer Sent | Other candidates should not also be in Final Check Sent |
| Final Check Sent is controlled | It should only be used for the active first offer candidate |
| Offer Accepted locks process | If one candidate accepts, offer-step process buttons are hidden |
| Waitlisted candidates can be auto-converted | If project has accepted offer, waitlisted candidates can become Proceeded with Another Candidate |

---

## F. Rejection Follow-Up
| Status / Case | Visible Actions | Who Can Act | Next Possible Result |
|---|---|---|---|
| Rejected | View, Rejection Handling | HR | Rejection logged / candidate informed |
| Proceeded with Another Candidate | View, Rejection Handling | HR | Candidate informed |

---

# 3. Global Rules

## Notes Rules
| Rule | Meaning |
|---|---|
| Pre-interview notes stay visible later | Earlier HR notes continue through later stages |
| HM cannot see HR-only wage info | Wage-related fields are hidden from HM |
| Most recent note stays on top | Internal notes are sorted newest first |
| Notes are collapsed by default | Candidate page opens with minimized note cards |

## Activity History Rules
| Rule | Meaning |
|---|---|
| Important actions should create activity | Logs, interim update, reject, final check, offer actions should appear in history |
| Owner should be visible | Activity subtitle should show HR or HM owner when possible |
| Contact attempts should show number + owner | Example: Contact Attempt 3 · HR Manager |

## UI Rules
| Rule | Meaning |
|---|---|
| Negative actions stay last | Reject / Offer Rejected should be at bottom of lists |
| Open action lists use separators | Every option should be visually separated |
| Critical actions use confirmation modal | Example: Withdrawn, Reject |
| Confirmation modal shows context | Candidate name and pipeline step should be visible where relevant |
