import { stageOrder } from '../../domain/labels'
import type { Candidate, CandidateStatus, PipelineStage } from '../../domain/types'

export type PipelineColumn = 'candidate' | 'status' | 'contact' | 'interview' | 'actions'

export function getStageCounts(candidates: Candidate[]) {
  const counts = Object.fromEntries(stageOrder.map((stage) => [stage, 0])) as Record<PipelineStage, number>
  candidates.forEach((candidate) => {
    counts[candidate.stage] += 1
  })
  return counts
}

export function getStageColumns(role: 'human_resource' | 'hiring_manager', stage: PipelineStage): PipelineColumn[] {
  if (role === 'hiring_manager') {
    if (stage === 'department_interview' || stage === 'hr_interview') return ['candidate', 'status', 'interview', 'actions']
    return ['candidate', 'status', 'actions']
  }

  if (stage === 'department_interview' || stage === 'hr_interview') {
    return ['candidate', 'status', 'contact', 'interview', 'actions']
  }

  if (stage === 'offer_stage') return ['candidate', 'status', 'contact', 'actions']
  return ['candidate', 'status', 'actions']
}

export function showAddLog(role: 'human_resource' | 'hiring_manager', stage: PipelineStage, status: CandidateStatus) {
  return role === 'human_resource' && stage !== 'offer_stage' && stage !== 'manager_review' && status !== 'rejected' && status !== 'withdrawn'
}

export function sortCandidatePriority(left: Candidate, right: Candidate) {
  const priority = (status: CandidateStatus) => {
    if (status === 'waiting_for_contact') return 0
    if (status === 'not_reached') return 1
    if (status === 'withdrawn' || status === 'rejected') return 3
    return 2
  }

  return priority(left.status) - priority(right.status)
}

export function getOfferRankLabel(index: number) {
  if (index === 0) return 'First Candidate'
  if (index === 1) return 'Second Candidate'
  if (index === 2) return 'Third Candidate'
  return ''
}

export function isPipelineStage(value: string | undefined): value is PipelineStage {
  return Boolean(value && stageOrder.includes(value as PipelineStage))
}

export function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid pipeline date: ${value}`)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(date)
}

export function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid pipeline time: ${value}`)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
}
