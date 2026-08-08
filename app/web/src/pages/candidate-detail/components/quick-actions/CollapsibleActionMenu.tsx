import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import type { CandidateTransitionAction } from '../../../../domain/types'

export interface ActionMenuItem {
  action: CandidateTransitionAction
  label: string
  tone?: 'default' | 'accent' | 'danger'
}

interface CollapsibleActionMenuProps {
  label: string
  icon: ReactNode
  open: boolean
  items: ActionMenuItem[]
  busyAction: CandidateTransitionAction | null
  onToggle: () => void
  onSelect: (action: CandidateTransitionAction) => void
}

const actionClasses = 'flex min-h-5 items-center gap-3 border-0 bg-transparent px-2.5 text-left text-sm font-bold text-ink no-underline'
const menuButtonClasses = `${actionClasses} h-auto py-2 text-[13px] leading-[18px]`
const toneClasses = {
  default: '',
  accent: 'text-accent',
  danger: 'text-danger',
}

export function CollapsibleActionMenu({ label, icon, open, items, busyAction, onToggle, onSelect }: CollapsibleActionMenuProps) {
  return (
    <div className="grid gap-3">
      <button className={actionClasses} type="button" onClick={onToggle}>
        {icon}
        {label}
        <ChevronDown className={`ml-auto transition-transform duration-180 ${open ? 'rotate-180' : ''}`} size={16} />
      </button>
      {open && (
        <div className="ml-2.5 grid gap-3 rounded-md bg-white/45 px-3.5 py-2">
          {items.map((item) => (
            <button
              className={`${menuButtonClasses} ${toneClasses[item.tone ?? 'default']}`}
              disabled={Boolean(busyAction)}
              key={item.action}
              type="button"
              onClick={() => onSelect(item.action)}
            >
              {busyAction === item.action ? 'Saving...' : item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
