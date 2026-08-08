interface ProjectBasicFieldsProps {
  name: string
  position: string
  notes: string
  onNameChange: (value: string) => void
  onPositionChange: (value: string) => void
  onNotesChange: (value: string) => void
}

const fieldClasses = 'grid gap-[7px]'
const labelClasses = 'text-xs font-extrabold text-body'
const inputClasses = 'h-[42px] rounded-md border border-border-strong bg-white px-[11px] text-ink outline-none'
const textareaClasses = 'min-h-[92px] resize-y rounded-md border border-border-strong px-[11px] py-[11px] text-ink outline-none'

export function ProjectBasicFields({ name, position, notes, onNameChange, onPositionChange, onNotesChange }: ProjectBasicFieldsProps) {
  return (
    <section className="grid gap-3.5">
      <h3 className="m-0 text-sm font-bold text-ink">Basic Information</h3>
      <div className="grid grid-cols-2 gap-4 max-[820px]:grid-cols-1">
        <label className={fieldClasses}>
          <span className={labelClasses}>Project Name</span>
          <input className={inputClasses} value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="Q4 Engineering Expansion" />
        </label>
        <label className={fieldClasses}>
          <span className={labelClasses}>Job Position Name</span>
          <input className={inputClasses} value={position} onChange={(event) => onPositionChange(event.target.value)} placeholder="Senior Backend Engineer" />
        </label>
      </div>
      <label className={fieldClasses}>
        <span className={labelClasses}>Notes</span>
        <textarea className={textareaClasses} value={notes} onChange={(event) => onNotesChange(event.target.value)} placeholder="Brief project notes" />
      </label>
    </section>
  )
}
