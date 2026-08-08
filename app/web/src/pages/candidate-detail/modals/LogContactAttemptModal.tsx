import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorMessage } from '../../../components/feedback/ErrorMessage'
import { RouteFormModal } from '../../../components/ui/RouteFormModal'
import { transitionCandidate } from '../../../data/api'
import { stageLabels } from '../../../domain/labels'
import type { Candidate } from '../../../domain/types'
import {
  defaultInterviewDate,
  getContactResultLabel,
  getContactResultOptions,
  getContactTransitionAction,
  notifyCandidateChanged,
  toDateTimeLocalValue,
} from '../candidateDetailHelpers'
import type { ContactLogResult } from '../candidateDetailHelpers'
import { ContactAttemptFields } from '../components/contact-attempt/ContactAttemptFields'

interface LogContactAttemptModalProps {
  candidate: Candidate
  closeTo: string
  onChanged: () => Promise<void>
}

export function LogContactAttemptModal({ candidate, closeTo, onChanged }: LogContactAttemptModalProps) {
  const navigate = useNavigate()
  const options = getContactResultOptions(candidate)
  const [result, setResult] = useState<ContactLogResult>(options[0])
  const [attemptedAt, setAttemptedAt] = useState(() => toDateTimeLocalValue(new Date()))
  const [interviewStartAt, setInterviewStartAt] = useState(() => toDateTimeLocalValue(defaultInterviewDate()))
  const [meetingUrl, setMeetingUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showInterviewFields = result === 'scheduled'

  async function saveLog() {
    setSaving(true)
    setError(null)
    if (showInterviewFields && !meetingUrl.trim()) {
      setError('Meeting URL is required.')
      setSaving(false)
      return
    }

    try {
      await transitionCandidate(candidate.id, {
        action: getContactTransitionAction(candidate, result),
        notes: notes.trim() || undefined,
        occurredAt: new Date(attemptedAt).toISOString(),
        interviewStartAt: showInterviewFields ? new Date(interviewStartAt).toISOString() : undefined,
        meetingUrl: showInterviewFields ? meetingUrl.trim() || undefined : undefined,
      })
      await onChanged()
      notifyCandidateChanged()
      navigate(closeTo)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save contact log')
    } finally {
      setSaving(false)
    }
  }

  return (
    <RouteFormModal
      closeTo={closeTo}
      submitLabel="Save Log"
      submitting={saving}
      subtitle={`${candidate.name} · ${stageLabels[candidate.stage]}`}
      title="Log Contact Attempt"
      onSubmit={saveLog}
    >
      {error && <ErrorMessage message={error} />}
      <ContactAttemptFields
        attemptedAt={attemptedAt}
        interview={showInterviewFields ? {
          startAt: interviewStartAt,
          meetingUrl,
          onStartAtChange: setInterviewStartAt,
          onMeetingUrlChange: setMeetingUrl,
        } : undefined}
        notes={notes}
        options={options.map((option) => ({ value: option, label: getContactResultLabel(option) }))}
        radioName="result"
        result={result}
        onAttemptedAtChange={setAttemptedAt}
        onNotesChange={setNotes}
        onResultChange={setResult}
      />
    </RouteFormModal>
  )
}
