import { ChevronDown, ListFilter, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { candidateTrackerRepository } from '../../data/repository'
import type { Candidate } from '../../domain/types'

export function RejectionFollowUpPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])

  useEffect(() => {
    candidateTrackerRepository.listCandidates({ status: 'rejected' }).then((items) => {
      setCandidates([
        ...items,
        { ...items[0], id: 'c-ayca', name: 'Ayça Berra' },
        { ...items[0], id: 'c-jess-rej', name: 'Jessica M' },
      ].slice(0, 4))
    })
  }, [])

  return (
    <div className="rejection-screen">
      <h1>Rejection Follow-Up</h1>
      <div className="rejection-controls">
        <div className="search-input rejection-search"><Search size={20} /><input placeholder="Search candidate name..." /></div>
        <button>All Projects <ChevronDown size={16} /></button>
        <button>Status: All <ChevronDown size={16} /></button>
        <button className="filter-icon"><ListFilter size={20} /></button>
      </div>

      <section className="rejection-table">
        <div className="rejection-row rejection-header">
          <span>Candidate Name</span><span>Project Name</span><span>Status</span><span>Eligible Date</span><span>Actions</span>
        </div>
        {candidates.map((candidate, index) => (
          <div className="rejection-row" key={candidate.id}>
            <div className="candidate-cell"><span className={`avatar avatar-${candidate.name[0].toLowerCase()}`}>{candidate.name[0]}</span><strong>{candidate.name.replace('.', '')}</strong></div>
            <span className="project-name-cell">Senior Product Designer<br />Hiring</span>
            <span className={`status-dot ${index < 2 ? 'status-dot--not_reached' : 'status-dot--withdrawn'}`}><i />{index < 2 ? 'Not Reached' : 'Rejection Handled'}</span>
            <span>22.04.2026</span>
            <Link className="outline-button" to={`/projects/${candidate.projectId}/candidates/${index === 2 ? 'c-marcus' : index === 3 ? 'c-jessica' : 'c-alp'}`}>View</Link>
          </div>
        ))}
        <footer className="figma-table-footer rejection-footer"><span>Showing 4 of 42 candidates</span><span className="pager">‹ <b>1</b> 2 3 ›</span></footer>
      </section>
    </div>
  )
}
