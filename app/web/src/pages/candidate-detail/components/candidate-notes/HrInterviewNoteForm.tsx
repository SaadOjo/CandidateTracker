import { hrRubricItems, hrRubricRatings, hrRubricTextFields } from '../../candidateDetailHelpers'

interface HrInterviewNoteFormProps {
  values: Record<string, string>
  onChange: (next: Record<string, string>) => void
}

const noteInputClasses = 'min-h-24 w-full rounded border border-border bg-surface-subtle px-3 py-2.5 text-sm leading-5 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus'

export function HrInterviewNoteForm({ values, onChange }: HrInterviewNoteFormProps) {
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-5">
      {hrRubricItems.map((item) => (
        <fieldset className="m-0 grid min-w-0 content-start gap-3 border-0 p-0" key={item}>
          <legend className="mb-3 min-h-10 p-0 text-sm leading-5 font-bold text-ink">{item}</legend>
          <label className="grid gap-2">
            <span className="text-xs font-extrabold text-body">Rating</span>
            <select className="min-h-10 w-full rounded border border-border bg-surface-subtle px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus" value={values[`${item} rating`] ?? ''} onChange={(event) => onChange({ ...values, [`${item} rating`]: event.target.value })}>
              <option value="">Select rating</option>
              {hrRubricRatings.map((rating) => (
                <option key={rating.value} value={rating.value}>{rating.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-extrabold text-body">Comments</span>
            <textarea className={`${noteInputClasses} resize-y`} value={values[`${item} comments`] ?? ''} onChange={(event) => onChange({ ...values, [`${item} comments`]: event.target.value })} placeholder="Add Human Resource observation..." />
          </label>
        </fieldset>
      ))}
      {hrRubricTextFields.map((field) => (
        <label className="grid gap-2" key={field}>
          <span className="text-xs font-extrabold text-body">{field}</span>
          <textarea className={`${noteInputClasses} resize-y`} value={values[field] ?? ''} onChange={(event) => onChange({ ...values, [field]: event.target.value })} placeholder="Add Human Resource notes..." />
        </label>
      ))}
    </div>
  )
}
