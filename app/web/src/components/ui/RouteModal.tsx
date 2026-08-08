import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface RouteModalProps {
  closeTo: string
  className?: string
  showCloseButton?: boolean
  children: ReactNode
}

export function RouteModal({ closeTo, className = '', showCloseButton = false, children }: RouteModalProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-backdrop px-[18px] py-[42px] backdrop-blur-[3px]" role="presentation">
      <Link className="fixed inset-0 z-0" to={closeTo} aria-label="Close modal" />
      <div className={`relative z-[1] max-h-[calc(100vh-64px)] overflow-auto rounded-lg shadow-modal ${className}`}>
        {showCloseButton && (
          <Link className="absolute top-[18px] right-[18px] z-[3] grid h-[34px] w-[34px] place-items-center rounded-full bg-surface-muted text-ink" to={closeTo} aria-label="Close modal">
            <X size={18} />
          </Link>
        )}
        {children}
      </div>
    </div>
  )
}
