import { LoadingState } from '../../../../components/feedback/LoadingState'
import { userRoleLabels } from '../../../../domain/labels'
import type { User } from '../../../../domain/types'

interface ProjectAssignmentFieldsProps {
  loading: boolean
  hiringManagers: User[]
  humanResourceUsers: User[]
  hiringManagerUserId: string
  assignedHumanResourceUserIds: string[]
  onHiringManagerChange: (userId: string) => void
  onHumanResourceToggle: (userId: string) => void
}

const fieldClasses = 'grid gap-[7px]'
const labelClasses = 'text-xs font-extrabold text-body'
const inputClasses = 'h-[42px] rounded-md border border-border-strong bg-white px-[11px] text-ink outline-none'

export function ProjectAssignmentFields({
  loading,
  hiringManagers,
  humanResourceUsers,
  hiringManagerUserId,
  assignedHumanResourceUserIds,
  onHiringManagerChange,
  onHumanResourceToggle,
}: ProjectAssignmentFieldsProps) {
  return (
    <section className="grid gap-3.5">
      <h3 className="m-0 text-sm font-bold text-ink">Team Assignment</h3>
      {loading ? (
        <LoadingState size={16} />
      ) : (
        <div className="grid grid-cols-2 gap-4 max-[820px]:grid-cols-1">
          <label className={fieldClasses}>
            <span className={labelClasses}>Hiring Manager</span>
            <select className={inputClasses} value={hiringManagerUserId} onChange={(event) => onHiringManagerChange(event.target.value)}>
              <option value="">Select hiring manager</option>
              {hiringManagers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <div className={fieldClasses}>
            <span className={labelClasses}>Assigned Human Resource Users</span>
            <div className="grid min-h-[42px] overflow-hidden rounded-md border border-border-strong">
              {humanResourceUsers.map((user, index) => (
                <label className={`flex items-center gap-[9px] px-[11px] py-2.5 ${index > 0 ? 'border-t border-divider' : ''}`} key={user.id}>
                  <input
                    className="h-4 w-4"
                    type="checkbox"
                    checked={assignedHumanResourceUserIds.includes(user.id)}
                    onChange={() => onHumanResourceToggle(user.id)}
                  />
                  <span>
                    {user.name}
                    <small className="mt-px block text-[11px] font-semibold text-muted">{userRoleLabels[user.role]}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
