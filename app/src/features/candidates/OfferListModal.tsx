import { GripVertical } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ModalOverlay } from '../../components/ui/ModalOverlay'
import { candidateTrackerRepository } from '../../data/repository'
import type { Candidate } from '../../domain/types'

interface OfferListModalProps {
  candidate: Candidate
  closeTo: string
}

export function OfferListModal({ candidate, closeTo }: OfferListModalProps) {
  const [items, setItems] = useState<Candidate[]>([])
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [rankOffset, setRankOffset] = useState(0)

  useEffect(() => {
    candidateTrackerRepository.listCandidates({ projectId: candidate.projectId, stage: 'offer_stage' }).then((offerCandidates) => {
      const queue = offerCandidates.filter((item) => item.status === 'approved_for_offer')
      const hasCandidate = queue.some((item) => item.id === candidate.id)
      setItems(hasCandidate ? queue : [candidate, ...queue])
      setRankOffset(offerCandidates.some((item) => item.status === 'offer_sent') ? 1 : 0)
    })
  }, [candidate])

  function moveItem(overId: string) {
    if (!draggedId || draggedId === overId) return
    setItems((current) => {
      const fromIndex = current.findIndex((item) => item.id === draggedId)
      const toIndex = current.findIndex((item) => item.id === overId)
      if (fromIndex < 0 || toIndex < 0) return current
      const next = [...current]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
    setDirty(true)
  }

  return (
    <ModalOverlay closeTo={closeTo} labelledBy="offer-list-title" surfaceClassName="offer-list-surface">
      <div className="offer-list-modal">
        <h1 id="offer-list-title">Offer List</h1>
        <div className="offer-list-stack">
          {items.map((item, index) => (
            <div
              className={`offer-list-row ${item.id === candidate.id ? 'offer-list-row--active' : ''}`}
              key={item.id}
              draggable
              onDragStart={() => setDraggedId(item.id)}
              onDragOver={(event) => {
                event.preventDefault()
                moveItem(item.id)
              }}
              onDragEnd={() => setDraggedId(null)}
            >
              <span className="offer-list-handle" aria-hidden="true"><GripVertical size={18} /></span>
              <div className="offer-list-copy">
                <small>{getOfferRankLabel(index + rankOffset)}</small>
                <strong>{item.name}</strong>
              </div>
              <span className={`offer-list-state ${item.id === candidate.id ? 'offer-list-state--pending' : `offer-list-state--${item.status}`}`}>{item.id === candidate.id ? 'Pending Approval' : item.status === 'offer_sent' ? 'Offer Sent' : 'Approved for Offer'}</span>
            </div>
          ))}
        </div>

        <div className="offer-list-footer">
          <Link to={closeTo}>Cancel</Link>
          {dirty ? <button className="offer-list-save" onClick={() => setConfirmOpen(true)}>Save</button> : <Link className="offer-list-save" to={closeTo}>Done</Link>}
        </div>

        {confirmOpen && dirty && <div className="confirmation-popover confirmation-popover--offer-list">
          <h3>Save offer list order?</h3>
          <p>The order of approved-for-offer candidates will be updated for the hiring manager review flow.</p>
          <div className="confirmation-popover-actions">
            <button onClick={() => setConfirmOpen(false)}>Cancel</button>
            <Link className="confirmation-approve" to={closeTo}>Confirm</Link>
          </div>
        </div>}
      </div>
    </ModalOverlay>
  )
}

function getOfferRankLabel(index: number) {
  if (index === 0) return 'First Candidate'
  if (index === 1) return 'Second Candidate'
  if (index === 2) return 'Third Candidate'
  if (index === 3) return 'Fourth Candidate'
  if (index === 4) return 'Fifth Candidate'
  if (index === 5) return 'Sixth Candidate'
  return `${index + 1}th Candidate`
}

