import { Search } from 'lucide-react'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  variant?: 'bordered' | 'muted'
  iconSize?: number
  padding?: 'default' | 'compact'
  className?: string
}

const variantClasses = {
  bordered: {
    field: 'rounded-md border border-border bg-white text-muted',
    input: 'text-ink',
  },
  muted: {
    field: 'rounded-[3px] bg-surface-muted text-muted',
    input: 'bg-transparent p-0 text-sm text-muted',
  },
}

export function SearchField({ value, onChange, placeholder, variant = 'muted', iconSize = 18, padding = 'default', className = '' }: SearchFieldProps) {
  const classes = variantClasses[variant]
  const paddingClassName = padding === 'compact' ? 'px-2.5' : 'px-3'

  return (
    <label className={`flex h-11 items-center gap-2.5 ${paddingClassName} ${classes.field} ${className}`}>
      <Search className="shrink-0" size={iconSize} />
      <input
        aria-label={placeholder}
        className={`min-w-0 flex-1 border-0 outline-0 ${classes.input}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  )
}
