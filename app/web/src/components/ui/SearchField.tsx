import { Search } from 'lucide-react'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  variant?: 'bordered' | 'muted' | 'subtle' | 'toolbar'
  iconSize?: number
  padding?: 'default' | 'compact'
  className?: string
}

const variantClasses = {
  toolbar: {
    field: 'rounded-full border border-transparent bg-surface-muted text-muted transition-colors focus-within:border-border-strong focus-within:bg-surface-subtle focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-action-focus',
    input: 'bg-transparent p-0 text-sm text-ink',
  },
  subtle: {
    field: 'rounded-md border border-border bg-surface-subtle text-muted focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-action-focus',
    input: 'bg-transparent p-0 text-sm text-ink',
  },
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
  const heightClassName = variant === 'toolbar' ? 'h-10' : 'h-11'

  return (
    <label className={`flex ${heightClassName} items-center gap-2.5 ${paddingClassName} ${classes.field} ${className}`}>
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
