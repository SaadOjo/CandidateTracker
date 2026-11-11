import { CheckCircle2 } from 'lucide-react'
import type { ImportMode } from '../../../../domain/types'

interface ProjectSourceFieldsProps {
  linkedinProjectId: string
  importMode: ImportMode
  onLinkedinProjectIdChange: (value: string) => void
  onImportModeChange: (mode: ImportMode) => void
}

const fieldClasses = 'grid gap-[7px]'
const labelClasses = 'text-xs font-extrabold text-body'
const inputClasses = 'h-[42px] rounded-md border border-border-strong bg-white px-[11px] text-ink outline-none'

export function ProjectSourceFields({ linkedinProjectId, importMode, onLinkedinProjectIdChange, onImportModeChange }: ProjectSourceFieldsProps) {
  return (
    <section className="grid gap-3.5">
      <h3 className="m-0 text-sm font-bold text-ink">LinkedIn Setup</h3>
      <div className="grid grid-cols-2 gap-4 max-[820px]:grid-cols-1">
        <label className={fieldClasses}>
          <span className={labelClasses}>Recruiter Project ID</span>
          <input
            className={inputClasses}
            value={linkedinProjectId}
            onChange={(event) => onLinkedinProjectIdChange(event.target.value)}
            placeholder="LI-2026-0042"
          />
        </label>
        <div className={fieldClasses}>
          <span className={labelClasses}>Import Source</span>
          <div className="grid grid-cols-2 gap-1 rounded-md bg-surface-muted p-1">
            <button
              type="button"
              className={`inline-flex h-[34px] items-center justify-center gap-1.5 rounded-compact border-0 px-2.5 control-selectable ${importMode === 'auto_sync' ? 'font-extrabold' : ''}`}
              aria-pressed={importMode === 'auto_sync'}
              onClick={() => onImportModeChange('auto_sync')}
            >
              {importMode === 'auto_sync' && <CheckCircle2 size={15} />}
              Auto-Sync
            </button>
            <button
              type="button"
              className={`inline-flex h-[34px] items-center justify-center gap-1.5 rounded-compact border-0 px-2.5 control-selectable ${importMode === 'manual_import' ? 'font-extrabold' : ''}`}
              aria-pressed={importMode === 'manual_import'}
              onClick={() => onImportModeChange('manual_import')}
            >
              {importMode === 'manual_import' && <CheckCircle2 size={15} />}
              Manual Import
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
