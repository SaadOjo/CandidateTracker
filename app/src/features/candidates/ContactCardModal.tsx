import { Mail, Phone } from 'lucide-react'
import { ModalOverlay } from '../../components/ui/ModalOverlay'
import type { Candidate } from '../../domain/types'

interface Props {
  candidate: Candidate
  closeTo: string
}

export function ContactCardModal({ candidate, closeTo }: Props) {
  const firstName = candidate.name.replace('.', '').split(' ')[0]
  const displayName = firstName === 'Sara' ? 'Sara Khan' : candidate.name

  return (
    <ModalOverlay closeTo={closeTo} labelledBy="contact-card-title" surfaceClassName="contact-card-surface">
      <div className="contact-card-modal">
        <h1 id="contact-card-title">{displayName}</h1>
        <p>Position: Senior Product Designer</p>

        <div className="contact-info-list">
          <div className="contact-info-row">
            <span><Phone size={18} /></span>
            <div><small>MOBILE</small><strong>+971 50 123 4567</strong></div>
          </div>
          <div className="contact-info-row">
            <span><Mail size={18} /></span>
            <div><small>EMAIL</small><strong>{displayName.toLowerCase().replace(' ', '.')}@design.co</strong></div>
          </div>
        </div>

        <button className="copy-info-button">Copy Info</button>
      </div>
    </ModalOverlay>
  )
}
