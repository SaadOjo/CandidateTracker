export type StatusIndicatorTone = 'default' | 'muted' | 'accent' | 'accent-strong' | 'accent-muted' | 'success' | 'danger'

interface StatusIndicatorProps {
  label: string
  tone?: StatusIndicatorTone
  className?: string
}

const toneClasses: Record<StatusIndicatorTone, string> = {
  default: 'text-heading',
  muted: 'text-subtle',
  accent: 'text-accent',
  'accent-strong': 'text-accent-strong',
  'accent-muted': 'text-accent-muted',
  success: 'text-success',
  danger: 'text-danger',
}

export function StatusIndicator({ label, tone = 'default', className = '' }: StatusIndicatorProps) {
  return (
    <span className={`inline-flex items-center gap-[9px] ${toneClasses[tone]} ${className}`}>
      <i className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  )
}
