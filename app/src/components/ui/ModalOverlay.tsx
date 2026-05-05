import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface ModalOverlayProps {
  closeTo: string
  labelledBy: string
  children: ReactNode
  surfaceClassName?: string
}

export function ModalOverlay({ closeTo, labelledBy, children, surfaceClassName }: ModalOverlayProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <Link className="modal-scrim-link" to={closeTo} aria-label="Close modal" />
      <section className={`modal-surface ${surfaceClassName ?? ''}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <Link className="modal-close" to={closeTo} aria-label="Close modal"><X size={18} /></Link>
        {children}
      </section>
    </div>
  )
}
