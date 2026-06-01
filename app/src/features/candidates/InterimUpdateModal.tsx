import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ModalOverlay } from '../../components/ui/ModalOverlay'
import { stageLabels } from '../../domain/labels'
import type { Candidate } from '../../domain/types'

interface Props {
  candidate?: Candidate
  closeTo: string
}

export function InterimUpdateModal({ candidate, closeTo }: Props) {
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <ModalOverlay closeTo={closeTo} labelledBy="interim-update-title" surfaceClassName="log-contact-surface">
      <div className="log-contact-modal figma-log-modal">
        <h1 id="interim-update-title">Interim Update</h1>
        <p className="modal-subtitle">{candidate?.name ?? 'Candidate Name'} - {candidate ? stageLabels[candidate.stage] : 'Candidate Step'}</p>


        <section className="figma-log-section">
          <h2 className="optional-heading"><span>NOTES</span><em>OPTIONAL</em></h2>
          <textarea placeholder="" />
        </section>

        <div className="figma-log-footer">
          <button className="modal-text-button" onClick={() => navigate(closeTo)}>Cancel</button>
          <button className="save-log-button" onClick={() => setConfirmOpen(true)}>Save Interim Update</button>
        </div>

        {confirmOpen && <>
          <div className="pipeline-confirmation-backdrop" onClick={() => setConfirmOpen(false)} />
          <div className="confirmation-popover confirmation-popover--log-contact">
            <h3>Are you sure?</h3>
            <p><strong>{candidate?.name ?? 'Candidate'}</strong> · {candidate ? stageLabels[candidate.stage] : 'Candidate Step'}</p>
            <p>This interim update email will be saved for the waitlisted candidate.</p>
            <div className="confirmation-popover-actions">
              <button onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button className="confirmation-approve" onClick={() => navigate(closeTo)}>Confirm</button>
            </div>
          </div>
        </>}
      </div>
    </ModalOverlay>
  )
}
