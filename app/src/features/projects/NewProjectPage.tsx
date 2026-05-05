import { ChevronDown, Download, Info, Link as LinkIcon, Search, UsersRound, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function NewProjectPage() {
  return (
    <main className="new-project-standalone">
      <section className="new-project-modal">
        <h1>Create New Project</h1>

        <FormSection icon={<Info size={14} />} title="Basic Information">
          <div className="two-col">
            <label><span>Project Name <em>*</em></span><input placeholder="e.g. Q4 Engineering Expansion" /></label>
            <label><span>Job Position Name <em>*</em></span><input placeholder="e.g. Senior Backend Engineer" /></label>
          </div>
          <label className="notes-label"><span>Notes <small>Optional</small></span><textarea placeholder="Briefly describe the project" /></label>
        </FormSection>

        <FormSection icon={<UsersRound size={15} />} title="Team Assignment">
          <div className="two-col">
            <label><span>Hiring Manager <em>*</em></span><div className="field-with-icon"><Search size={20} /><input placeholder="Search for hiring manager..." /></div></label>
            <label><span>Assigned HR Users <em>*</em></span><div className="member-field"><span>Sarah Chen <X size={12} /></span><span>James Wilson <X size={12} /></span><input placeholder="Add members..." /></div></label>
          </div>
        </FormSection>

        <FormSection icon={<LinkIcon size={14} />} title="LinkedIn Setup">
          <button className="import-button"><Download size={14} /> Import Shortlisted Candidates from LinkedIn</button>
          <div className="two-col linkedin-row">
            <label>Recruiter Project ID <div className="select-field">Select LinkedIn Project... <ChevronDown size={18} /></div></label>
            <label>Import Source <div className="radio-row"><span><i className="checked" /> Auto-Sync</span><span><i /> Manual Import</span></div></label>
          </div>
        </FormSection>

        <div className="modal-actions">
          <Link to="/projects">Cancel</Link>
          <Link className="create-button" to="/projects/p-designer/pipeline/department_interview">Create Project</Link>
        </div>
      </section>
    </main>
  )
}

function FormSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <section className="new-form-section"><h2><span>{icon}</span>{title}</h2>{children}</section>
}
