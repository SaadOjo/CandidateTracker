import { CalendarDays, Clock3, Link as LinkIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { stageLabels } from '../../domain/labels'
import { ModalOverlay } from '../../components/ui/ModalOverlay'
import type { Candidate } from '../../domain/types'

interface Props {
  candidate?: Candidate
  closeTo: string
  kind?: 'contact' | 'rejection'
}

export function LogContactAttemptModal({ candidate, closeTo, kind = 'contact' }: Props) {
  const isRejection = kind === 'rejection'
  const title = isRejection ? 'Log Rejection Contact Attempt' : 'Log Contact Attempt'
  const saveLabel = isRejection ? 'Save Rejection Log' : 'Save Contact Log'
  const subtitle = isRejection ? (candidate?.name ?? 'Candidate Name') : `${candidate?.name ?? 'Candidate Name'} - ${candidate ? stageLabels[candidate.stage] : 'Candidate Step'}`
  const options = isRejection ? ['Not Reached', 'Rejection Handled'] : ['Not Reached', 'Scheduled', 'Withdrawn']
  const [selectedResult, setSelectedResult] = useState<string>(options[0])
  const showInterviewFields = !isRejection && selectedResult === 'Scheduled'

  return (
    <ModalOverlay closeTo={closeTo} labelledBy="log-contact-title" surfaceClassName="log-contact-surface">
      <div className="log-contact-modal figma-log-modal">
        <h1 id="log-contact-title">{title}</h1>
        <p className="modal-subtitle">{subtitle}</p>

        <section className="figma-log-section">
          <h2>ATTEMPT RESULT</h2>
          <div className="radio-stack">
            {options.map((option) => (
              <label className="radio-option" key={option}>
                <input type="radio" name="attempt-result" checked={selectedResult === option} onChange={() => setSelectedResult(option)} />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="figma-log-section">
          <h2>ATTEMPT DATE &amp; TIME*</h2>
          <div className="combined-date-field">
            <span>Oct 24, 2023 • 14:30 PM</span>
            <CalendarDays size={18} />
          </div>
        </section>

        {showInterviewFields && (
          <>
            <section className="figma-log-section interview-meta-grid">
              <label>
                <h2>INTERVIEW DATE*</h2>
                <div className="combined-date-field short-field">
                  <span>15 / 05 / 2026</span>
                  <CalendarDays size={18} />
                </div>
              </label>
              <label>
                <h2>START TIME*</h2>
                <div className="combined-date-field short-field">
                  <span>14 : 00</span>
                  <Clock3 size={18} />
                </div>
              </label>
            </section>

            <section className="figma-log-section">
              <h2>MEETING URL*</h2>
              <div className="combined-date-field url-field">
                <span><LinkIcon size={16} /> https://meet.google.com/abc-defg-hij</span>
              </div>
            </section>
          </>
        )}

        <section className="figma-log-section">
          <h2 className="optional-heading"><span>NOTES</span><em>OPTIONAL</em></h2>
          <textarea placeholder="Briefly describe the outcome of the call..." />
        </section>

        <div className="figma-log-footer">
          <Link to={closeTo}>Cancel</Link>
          <Link className="save-log-button" to={closeTo}>{saveLabel}</Link>
        </div>
      </div>
    </ModalOverlay>
  )
}
