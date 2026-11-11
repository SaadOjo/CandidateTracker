import { DateTimeField } from '../../../../components/ui/DateTimeField'

interface ContactAttemptOption<T extends string> {
  value: T
  label: string
}

interface ContactAttemptFieldsProps<T extends string> {
  options: ContactAttemptOption<T>[]
  result: T
  radioName: string
  attemptedAt: string
  notes: string
  onResultChange: (value: T) => void
  onAttemptedAtChange: (value: string) => void
  onNotesChange: (value: string) => void
  interview?: {
    startAt: string
    meetingUrl: string
    onStartAtChange: (value: string) => void
    onMeetingUrlChange: (value: string) => void
  }
}

const sectionClasses = 'mb-[34px] grid gap-3.5'
const sectionHeadingClasses = 'm-0 text-xs font-extrabold tracking-[0.12em] text-muted uppercase'
const fieldClasses = 'flex min-h-11 w-full items-center rounded border-0 bg-surface-muted px-3.5 text-sm text-muted outline-0'

export function ContactAttemptFields<T extends string>({
  options,
  result,
  radioName,
  attemptedAt,
  notes,
  onResultChange,
  onAttemptedAtChange,
  onNotesChange,
  interview,
}: ContactAttemptFieldsProps<T>) {
  return (
    <>
      <div className={sectionClasses}>
        <h2 className={sectionHeadingClasses}>Attempt Result</h2>
        <div className="grid gap-3">
          {options.map((option) => (
            <label className="flex items-center gap-3 text-sm text-ink" key={option.value}>
              <input className="h-5 w-5" checked={result === option.value} name={radioName} type="radio" onChange={() => onResultChange(option.value)} />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <div className={sectionClasses}>
        <DateTimeField label="Attempt Date & Time" value={attemptedAt} onChange={onAttemptedAtChange} />
      </div>

      {interview && (
        <>
          <div className={sectionClasses}>
            <DateTimeField label="Interview Date & Time" value={interview.startAt} onChange={interview.onStartAtChange} />
          </div>
          <div className={sectionClasses}>
            <h2 className={sectionHeadingClasses}>Meeting URL*</h2>
            <input className={fieldClasses} value={interview.meetingUrl} onChange={(event) => interview.onMeetingUrlChange(event.target.value)} placeholder="Paste meeting URL" />
          </div>
        </>
      )}

      <div className={sectionClasses}>
        <h2 className={`${sectionHeadingClasses} flex items-center justify-between`}>
          <span>Notes</span>
          <em className="text-[11px] font-bold text-faint normal-case not-italic">Optional</em>
        </h2>
        <textarea
          className="min-h-[105px] w-full resize-y rounded border-0 bg-surface-muted px-4 py-3.5 text-sm leading-5 text-muted outline-0"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Briefly describe the outcome of the call..."
        />
      </div>
    </>
  )
}
