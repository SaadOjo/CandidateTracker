import { ChevronDown, Download, Info, Link as LinkIcon, Search, UsersRound, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ModalOverlay } from '../../components/ui/ModalOverlay'
import type { Project } from '../../domain/types'

interface Props {
  mode: 'create' | 'edit'
  closeTo: string
  project?: Project
}

export function ProjectFormModal({ mode, closeTo, project }: Props) {
  const title = mode === 'edit' ? 'Edit Project' : 'Create New Project'
  const submitLabel = mode === 'edit' ? 'Save' : 'Create Project'
  const submitTo = mode === 'edit' ? closeTo : '/projects/p-designer/pipeline/department_interview'
  const requiredMark = mode === 'create' ? <em>*</em> : null

  return (
    <ModalOverlay closeTo={closeTo} labelledBy="project-form-title">
      <div className="new-project-modal modal-project-form">
        <h1 id="project-form-title">{title}</h1>

        <FormSection icon={<Info size={14} />} title="Basic Information">
          <div className="two-col">
            <label><span>Project Name {requiredMark}</span><input defaultValue={project?.name ?? ''} placeholder="e.g. Q4 Engineering Expansion" /></label>
            <label><span>Job Position Name {requiredMark}</span><input defaultValue={project?.position ?? ''} placeholder="e.g. Senior Backend Engineer" /></label>
          </div>
          <label className="notes-label"><span>Notes <small>Optional</small></span><textarea defaultValue={project?.notes ?? ''} placeholder="Briefly describe the project" /></label>
        </FormSection>

        <FormSection icon={<UsersRound size={15} />} title="Team Assignment">
          <div className="two-col">
            <label><span>Hiring Manager {requiredMark}</span><div className="field-with-icon"><Search size={20} /><input defaultValue={project?.hiringManager ?? ''} placeholder="Search for hiring manager..." /></div></label>
            <label><span>Assigned HR Users {requiredMark}</span><div className="member-field"><span>Sarah Chen <X size={12} /></span><span>James Wilson <X size={12} /></span><input placeholder="Add members..." /></div></label>
          </div>
        </FormSection>

        <FormSection icon={<LinkIcon size={14} />} title="LinkedIn Setup">
          <button className="import-button"><Download size={14} /> Import Shortlisted Candidates from LinkedIn</button>
          <div className="two-col linkedin-row">
            <label>Recruiter Project ID <div className="select-field">{project?.linkedinProjectId ?? 'Select LinkedIn Project...'} <ChevronDown size={18} /></div></label>
            <label>Import Source <div className="radio-row"><span><i className="checked" /> Auto-Sync</span><span><i /> Manual Import</span></div></label>
          </div>
        </FormSection>

        <div className="modal-actions">
          <Link to={closeTo}>Cancel</Link>
          <Link className="create-button" to={submitTo}>{submitLabel}</Link>
        </div>
      </div>
    </ModalOverlay>
  )
}

function FormSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <section className="new-form-section"><h2><span>{icon}</span>{title}</h2>{children}</section>
}
