import type {
  AuthSession,
  Candidate,
  CandidateFilters,
  CandidateNoteInput,
  CandidateTransitionAction,
  CandidateTransitionInput,
  Project,
  ProjectFormInput,
  ProjectStatus,
  RejectionContactAttemptInput,
  RejectionFollowUp,
  RejectionFollowUpStatus,
  User,
  UserRole,
} from '../domain/types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
const DEV_AUTH_USER_ID = import.meta.env.VITE_DEV_AUTH_USER_ID
const DEV_AUTH_STORAGE_KEY = 'candidate-tracker:dev-user-id'

export async function getCurrentSession() {
  return apiRequest<AuthSession>('/auth/me')
}

export function getDevAuthUserId() {
  if (typeof window === 'undefined') return DEV_AUTH_USER_ID
  return window.sessionStorage.getItem(DEV_AUTH_STORAGE_KEY) ?? DEV_AUTH_USER_ID
}

export function setDevAuthUserId(userId: string) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(DEV_AUTH_STORAGE_KEY, userId)
}

export async function listUsers(role?: UserRole) {
  const params = new URLSearchParams()
  if (role) params.set('role', role)
  return apiRequest<User[]>(`/users${withQuery(params)}`)
}

export async function listProjects(filters: { status?: ProjectStatus; query?: string } = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.query?.trim()) params.set('query', filters.query.trim())
  return apiRequest<Project[]>(`/projects${withQuery(params)}`)
}

export async function getProject(projectId: string) {
  return apiRequest<Project>(`/projects/${projectId}`)
}

export async function listCandidates(filters: CandidateFilters = {}) {
  const params = new URLSearchParams()
  if (filters.projectId) params.set('projectId', filters.projectId)
  if (filters.stage) params.set('stage', filters.stage)
  if (filters.status) params.set('status', filters.status)
  if (filters.query?.trim()) params.set('query', filters.query.trim())
  return apiRequest<Candidate[]>(`/candidates${withQuery(params)}`)
}

export async function getCandidate(candidateId: string) {
  return apiRequest<Candidate>(`/candidates/${candidateId}`)
}

export async function listRejectionFollowUps(filters: { projectId?: string; status?: RejectionFollowUpStatus; query?: string } = {}) {
  const params = new URLSearchParams()
  if (filters.projectId) params.set('projectId', filters.projectId)
  if (filters.status) params.set('status', filters.status)
  if (filters.query?.trim()) params.set('query', filters.query.trim())
  return apiRequest<RejectionFollowUp[]>(`/rejection-follow-ups${withQuery(params)}`)
}

export async function logRejectionContactAttempt(followUpId: string, input: RejectionContactAttemptInput) {
  return apiRequest<RejectionFollowUp>(`/rejection-follow-ups/${followUpId}/contact-attempts`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function transitionCandidate(candidateId: string, input: CandidateTransitionAction | CandidateTransitionInput) {
  const body = typeof input === 'string' ? { action: input } : input
  return apiRequest<Candidate>(`/candidates/${candidateId}/transition`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function upsertCandidateNote(candidateId: string, input: CandidateNoteInput) {
  return apiRequest<Candidate>(`/candidates/${candidateId}/note`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function updateProjectStageComment(projectId: string, stage: string, body: string) {
  return apiRequest<Project>(`/projects/${projectId}/stage-comments/${stage}`, {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  })
}

export async function createProject(input: ProjectFormInput) {
  return apiRequest<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateProject(projectId: string, input: ProjectFormInput) {
  return apiRequest<Project>(`/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function archiveProject(projectId: string) {
  return apiRequest<Project>(`/projects/${projectId}/archive`, {
    method: 'PATCH',
  })
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: buildHeaders(init),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined)
    throw new Error(payload?.error ?? `Request failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

function buildHeaders(init?: RequestInit) {
  const devAuthUserId = getDevAuthUserId()
  return {
    ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    ...(devAuthUserId ? { 'x-dev-user-id': devAuthUserId } : {}),
    ...init?.headers,
  }
}

function withQuery(params: URLSearchParams) {
  const query = params.toString()
  return query ? `?${query}` : ''
}
