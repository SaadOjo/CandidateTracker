import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { CandidateDetailPage } from './features/candidates/CandidateDetailPage'
import { ProjectsPage } from './features/projects/ProjectsPage'
import { PipelinePage } from './features/pipeline/PipelinePage'
import { RejectionFollowUpPage } from './features/rejection/RejectionFollowUpPage'
import './styles/app.css'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/archived" element={<ProjectsPage view="archived" />} />
        <Route path="projects/new" element={<ProjectsPage modal="new" />} />
        <Route path="projects/:projectId/edit" element={<ProjectsPage modal="edit" />} />
        <Route path="projects/:projectId/pipeline/:stage" element={<PipelinePage />} />
        <Route path="projects/:projectId/candidates/:candidateId" element={<CandidateDetailPage />} />
        <Route path="rejection-follow-up" element={<RejectionFollowUpPage />} />
      </Route>
    </Routes>
  )
}
