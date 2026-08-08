import type { Project } from '../../../domain/types'

export function PreInterviewCommentsSection({ project }: { project: Project }) {
  const comments = project.stageComments?.filter((comment) => comment.stage === 'pre_interview') ?? []
  const hiringManagerComments = comments.filter((comment) => comment.authorRole === 'hiring_manager')
  const humanResourceComments = comments.filter((comment) => comment.authorRole === 'human_resource')
  if (hiringManagerComments.length === 0 && humanResourceComments.length === 0) return null

  return (
    <section className="mt-[26px] ml-0 w-[min(694px,100%)] max-w-full">
      <div className="grid grid-cols-2 gap-4 max-[760px]:grid-cols-1">
        <CommentColumn title="Hiring Manager Comments" items={hiringManagerComments} />
        <CommentColumn title="Human Resource Comments" items={humanResourceComments} />
      </div>
    </section>
  )
}

function CommentColumn({ title, items }: { title: string; items: Array<{ id: string; body: string }> }) {
  return (
    <section className="min-h-[152px] rounded-panel bg-surface-muted px-5 py-[18px]">
      <h3 className="mt-0 mb-3 text-xs font-extrabold tracking-[0.12em] text-muted uppercase">{title}</h3>
      {items.length > 0
        ? items.map((item) => <p className="mt-0 mb-2.5 text-sm leading-[22px] text-body" key={item.id}>{item.body}</p>)
        : <p className="mt-0 mb-2.5 text-sm leading-[22px] text-muted italic">No comments yet.</p>}
    </section>
  )
}
