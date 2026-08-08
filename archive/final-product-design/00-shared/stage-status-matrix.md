# Stage Status Matrix

Valid status combinations for `candidate_applications`.

| Stage | waiting_for_contact | scheduled | not_reached | withdrawn | rejected | assessment_sent | waitlisted | approved_for_offer | final_check_sent | offer_sent | offer_rejected | offer_accepted | proceeded_with_another_candidate |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| pre_interview | yes | yes | yes | yes | yes | no | no | no | no | no | no | no | no |
| department_interview | yes | yes | yes | yes | yes | no | no | no | no | no | no | no | no |
| hr_interview | yes | yes | yes | yes | yes | yes | no | no | no | no | no | no | no |
| manager_review | yes | no | no | no | yes | no | yes | yes | no | no | no | no | no |
| offer_stage | no | no | no | no | yes | no | no | yes | yes | yes | yes | yes | yes |

Notes:

- Pre-interview `scheduled` is displayed as Contact Successful.
- Candidate Review `waiting_for_contact` is displayed as `--`.
- Candidate Review `approved_for_offer` usually transitions into Offer Stage.
- Offer Stage `rejected` is allowed for final-check rejection before an offer is sent.
- Rejection follow-up task status is separate from candidate application status.
