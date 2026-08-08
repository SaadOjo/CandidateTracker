import { Navigate, Route, Routes } from 'react-router-dom'
import { ErrorMessage } from '../components/feedback/ErrorMessage'
import type { AuthSession } from '../domain/types'
import { CandidateDetailPage } from '../pages/candidate-detail/CandidateDetailPage'
import { ProjectPipelinePage } from '../pages/project-pipeline/ProjectPipelinePage'
import { ProjectsPage } from '../pages/projects/ProjectsPage'
import { RejectionFollowUpPage } from '../pages/rejection-follow-up/RejectionFollowUpPage'

export function AppRoutes({ session }: { session: AuthSession }) {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/projects" replace />} />
      <Route path="/projects" element={<ProjectsPage session={session} />} />
      <Route path="/projects/archived" element={<ProjectsPage session={session} view="archived" />} />
      <Route path="/projects/new" element={<ProjectsPage session={session} modal="new" />} />
      <Route path="/projects/:projectId/edit" element={<ProjectsPage session={session} modal="edit" />} />
      <Route path="/projects/:projectId/pipeline/:stage" element={<ProjectPipelinePage session={session} />} />
      <Route
        path="/projects/:projectId/candidates/:candidateId"
        element={<CandidateDetailPage session={session} />}
      />
      <Route
        path="/rejection-follow-up"
        element={session.appRole === 'hiring_manager' ? <Navigate to="/projects" replace /> : <RejectionFollowUpPage session={session} />}
      />
      <Route path="*" element={<ErrorMessage className="m-10" message="Route not found" />} />
    </Routes>
  )
}
