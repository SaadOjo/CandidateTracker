interface DateTimeFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
}

const hours = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'))
const minutes = ['00', '15', '30', '45']

export function DateTimeField({ label, value, onChange }: DateTimeFieldProps) {
  const [date, time] = value.split('T')
  const [hour, minute] = time.split(':')

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-3.5 p-0 text-xs font-extrabold tracking-[0.12em] text-muted uppercase">{label}*</legend>
      <div className="grid grid-cols-[minmax(0,1fr)_80px_80px] gap-3 max-[480px]:grid-cols-2">
        <label className="grid min-w-0 gap-1.5 text-xs font-bold text-body max-[480px]:col-span-2">
          Date
          <input
            className="date-time-input"
            type="date"
            required
            value={date}
            onChange={(event) => onChange(`${event.target.value}T${hour}:${minute}`)}
          />
        </label>
        <label className="grid min-w-0 gap-1.5 text-xs font-bold text-body">
          Hour
          <select className="date-time-input" value={hour} onChange={(event) => onChange(`${date}T${event.target.value}:${minute}`)}>
            {hours.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label className="grid min-w-0 gap-1.5 text-xs font-bold text-body">
          Minute
          <select className="date-time-input" value={minute} onChange={(event) => onChange(`${date}T${hour}:${event.target.value}`)}>
            {minutes.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      </div>
    </fieldset>
  )
}
