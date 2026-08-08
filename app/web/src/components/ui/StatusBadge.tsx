interface StatusBadgeProps {
  label: string
  tone: string
}

const toneClasses: Record<string, string> = {
  active: 'bg-accent-soft text-accent',
  archived: 'bg-surface-muted text-body',
  muted: 'bg-surface-muted text-body',
  closed: 'bg-surface-closed text-ink',
  success: 'bg-success-soft text-success-strong',
  candidate_accepted: 'bg-success-muted text-success',
  scheduled: 'bg-accent-soft text-accent',
  final_check_sent: 'bg-success-muted text-success',
  offer_sent: 'bg-success-muted text-success',
  offer_accepted: 'bg-success-muted text-success',
  waiting_for_contact: 'bg-surface-neutral text-body',
  withdrawn: 'bg-surface-neutral text-body',
  not_reached: 'bg-danger-soft text-danger-muted',
  rejected: 'bg-danger-soft text-danger-muted',
  offer_rejected: 'bg-neutral-soft text-body',
  approved_for_offer: 'bg-accent-soft text-accent',
  assessment_sent: 'bg-accent-soft text-accent',
  waitlisted: 'bg-accent-soft text-accent-strong',
  proceeded_with_another_candidate: 'bg-surface-closed text-action-secondary',
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  const toneClassName = toneClasses[tone]
  if (!toneClassName) throw new Error(`Unsupported status badge tone: ${tone}`)

  return (
    <span className={`inline-flex h-[22px] w-fit items-center rounded-full px-2.5 text-[11px] font-extrabold tracking-normal ${toneClassName}`}>
      {label}
    </span>
  )
}
