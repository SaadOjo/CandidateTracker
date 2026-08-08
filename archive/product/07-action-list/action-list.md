# Action List

Running product and QA actions that should be resolved before treating the current workflow as stable.

## Open

### Candidate Movement Navigation

Status: partly fixed, needs more journey testing.

When a candidate moves to another stage, the UI should not leave stale stage context visible.

Expected behavior:

- candidate detail breadcrumb reflects the candidate's current stage
- old pipeline stage no longer shows the moved candidate
- stage counts update after movement

Current implementation refreshes candidate-detail breadcrumbs after transitions. Full pipeline-count behavior still needs end-to-end testing across HR and hiring-manager accounts.

### Contact And Scheduling Defaults

Status: partly fixed, needs more journey testing.

Default/example values must not behave like real user-entered data.

Current implementation:

- meeting URL is blank by default
- scheduled contact logs require a meeting URL before saving

Still to check:

- any other form fields that contain example-like defaults
- whether placeholders are visually distinct from saved values everywhere

### Interview Time Granularity

Status: open.

Interview scheduling currently allows any minute value from `00` to `59`.

Expected behavior:

- interview time selection should only allow 15-minute intervals
- valid minute values are `00`, `15`, `30`, and `45`

### HR Rubric Notes

Status: implemented in backend-backed note form.

The HR Add Note form should use the actual HR rubric rather than demo interview questions.

Current form captures:

- culture fit
- presence and representation
- motivation
- rating per rubric item
- comments per rubric item
- candidate strengths
- development areas
- general HR findings

Excluded because they already live elsewhere in the system:

- candidate name
- position
- department
- interviewer names
- dates
- positive / negative / priority decision fields
- technical interview comments

Current implementation stores the rubric as the current user's candidate note.

### Internal Notes Author Grouping And Editing

Status: implemented, needs visual review.

Internal Notes should not create duplicate note cards every time the same company user clicks `Add Note`.

Expected behavior:

- notes are grouped by role: Human Resource and Hiring Manager
- inside each role group, each company user has one editable note section
- the same user edits their existing note for that candidate instead of creating duplicate cards
- different users can still have separate note sections under the same role group
- notes are stored in the backend, not browser local storage

Backend direction:

- upsert one `candidate_notes` row per `candidate_application_id + author_user_id`
- use `created_at` for first creation and `updated_at` for later edits
- add revision/history only later if the product needs it

### Resume Button Visual State

Status: fixed, needs visual review.

The Resume button looked too close to a disabled/secondary control.

Current implementation makes it an active dark button with hover/focus styling.

### Modal Primary Button Color

Status: open.

Primary commit actions in modals can look too gray.

Observed example:

- `Save Log` uses a medium gray color and can visually feel disabled even when enabled.

Expected behavior:

- modal primary commit actions should use the same active primary/dark color as other main actions
- disabled state should be communicated only by disabled styling, not by the normal enabled color

## Done

### Human Resource Role Label

Product-facing labels now use `Human Resource` instead of `HR Manager`.

Reason:

- `HR Manager` and `Hiring Manager` are too visually and semantically close
- `Human Resource` makes the role distinction clearer in navigation, notes, permissions, and assignment UI

Internal role enum values also use `human_resource`. The old `hr_manager`, project-member `hr`, and note visibility `hr_only` values were migrated to `human_resource`, `human_resource`, and `human_resource_only`.

### Activity History Subtext Cleanup

Activity-history subtext now hides redundant copies of the main event title and keeps only useful extra information.

Current behavior:

- custom/details subtitles remain visible
- source details remain visible, for example `Source: Manual test data`
- movement, scheduling, contact, offer, rejection, and review events show actor context when available
- repeated subtitles such as `Candidate moved from Pre-Interview to Department Interview.` are not shown

### No Fake Meeting URL

The scheduling modal no longer pre-fills a fake `meet.example.com` URL.

### Empty HR Rubric Cannot Save

The HR rubric form disables Save until the user enters a rating or text.
