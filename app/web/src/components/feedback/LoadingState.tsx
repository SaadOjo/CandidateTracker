import { LoaderCircle } from 'lucide-react'

interface LoadingStateProps {
  label?: string
  size?: number
  className?: string
}

export function LoadingState({ label = 'Loading', size = 18, className = '' }: LoadingStateProps) {
  return (
    <div className={`flex items-center gap-2 text-muted ${className}`} role="status">
      <LoaderCircle className="animate-spin" size={size} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
