import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorMessage } from '../../../components/feedback/ErrorMessage'
import { RouteFormModal } from '../../../components/ui/RouteFormModal'
import { logRejectionContactAttempt } from '../../../data/api'
import type { Candidate, RejectionContactAttemptInput } from '../../../domain/types'
import { notifyCandidateChanged, toDateTimeLocalValue } from '../candidateDetailHelpers'
import { ContactAttemptFields } from '../components/contact-attempt/ContactAttemptFields'

interface RejectionContactModalProps {
  candidate: Candidate
  closeTo: string
  onChanged: () => Promise<void>
}

export function RejectionContactModal({ candidate, closeTo, onChanged }: RejectionContactModalProps) {
  const navigate = useNavigate()
  const [result, setResult] = useState<RejectionContactAttemptInput['result']>('not_reached')
  const [attemptedAt, setAttemptedAt] = useState(() => toDateTimeLocalValue(new Date()))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveLog() {
    if (!candidate.rejectionFollowUp) {
      setError('Rejection follow-up was not found.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await logRejectionContactAttempt(candidate.rejectionFollowUp.id, {
        result,
        attemptedAt: new Date(attemptedAt).toISOString(),
        notes: notes.trim() || undefined,
      })
      await onChanged()
      notifyCandidateChanged()
      navigate(closeTo)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save rejection contact log')
    } finally {
      setSaving(false)
    }
  }

  return (
    <RouteFormModal
      closeTo={closeTo}
      submitLabel="Save Rejection Log"
      submitting={saving}
      subtitle={candidate.name}
      title="Log Rejection Contact Attempt"
      onSubmit={saveLog}
    >
      {error && <ErrorMessage className="mb-5" message={error} />}
      <ContactAttemptFields
        attemptedAt={attemptedAt}
        notes={notes}
        options={[
          { value: 'not_reached', label: 'Not Reached' },
          { value: 'rejection_handled', label: 'Rejection Handled' },
        ]}
        radioName="rejection-result"
        result={result}
        onAttemptedAtChange={setAttemptedAt}
        onNotesChange={setNotes}
        onResultChange={setResult}
      />
    </RouteFormModal>
  )
}
