import { hrRubricItems, hrRubricRatings, hrRubricTextFields } from '../../candidateDetailHelpers'

interface HrInterviewNoteFormProps {
  values: Record<string, string>
  onChange: (next: Record<string, string>) => void
}

const noteInputClasses = 'min-h-[92px] w-full rounded border-0 bg-white px-4 py-3.5 text-[13px] leading-5 text-muted outline-0'

export function HrInterviewNoteForm({ values, onChange }: HrInterviewNoteFormProps) {
  return (
    <div className="grid gap-3">
      {hrRubricItems.map((item) => (
        <fieldset className="m-0 grid gap-2.5 rounded-md border border-muted/45 p-3" key={item}>
          <legend className="px-1 text-xs font-extrabold text-ink">{item}</legend>
          <label className="grid gap-2">
            <span className="text-xs font-extrabold text-body">Rating</span>
            <select className="min-h-[38px] w-full rounded border-0 bg-white px-3 text-[13px] leading-5 text-muted outline-0" value={values[`${item} rating`] ?? ''} onChange={(event) => onChange({ ...values, [`${item} rating`]: event.target.value })}>
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
