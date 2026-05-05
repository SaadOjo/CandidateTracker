# Screen discrepancy pass

Compared implemented screens against `figma/example-ss`.

## Projects Page
- Mostly aligned after previous pass.
- Remaining known mismatch: project card avatars are generated initials instead of exact Figma headshots.

## Project Pipeline
- Mostly aligned after previous pass.
- Remaining known mismatch: candidate avatars are generated initials instead of exact Figma headshots.

## Candidate Detail
- `Contact Info` quick action was not connected to the contact-card modal.
- Rejected candidate `Process` action navigated away instead of opening the rejection contact log modal.
- Some action/modal flows were represented as page navigation instead of overlay state.

## New Project / Edit Project
- Edit modal used the wrong submit label: `Save Changes` instead of Figma `Save`.
- Create/edit modal is intentionally now an overlay; Figma screenshot is the modal content itself.
- Edit fields stay populated with current dummy data by product decision.

## Log Contact Attempt Modal
- Used horizontal button chips instead of vertical radio buttons.
- Text labels did not match Figma all-caps labels: `ATTEMPT RESULT`, `ATTEMPT DATE & TIME*`, `NOTES`.
- Had extra `Interview Info` section that is not in the Figma modal.
- Date/time was split into two fields instead of one combined field.
- Save button label was `Save` instead of `Save Contact Log`.
- Footer did not match the Figma grey action bar.

## Contact Card Modal
- Missing / not connected.

## Rejection Contact Attempt Modal
- Missing / not connected.
- Needs Figma-specific title/options/button: `Log Rejection Contact Attempt`, `Not Reached`, `Rejection Handled`, `Save Rejection Log`.
