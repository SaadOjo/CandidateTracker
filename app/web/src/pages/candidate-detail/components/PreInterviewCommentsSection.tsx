import type { Project } from '../../../domain/types'

export function PreInterviewCommentsSection({ project }: { project: Project }) {
  const hiringManagerComments = project.stageComments?.filter((comment) => comment.stage === 'pre_interview' && comment.authorRole === 'hiring_manager') ?? []
  if (hiringManagerComments.length === 0) return null

  return (
    <CommentColumn title="Hiring Manager Comments" items={hiringManagerComments} />
  )
}

function CommentColumn({ title, items }: { title: string; items: Array<{ id: string; body: string }> }) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-white p-6 max-[760px]:p-4">
      <h3 className="mt-0 mb-3 text-xs font-extrabold tracking-[0.12em] text-muted uppercase">{title}</h3>
      {items.length > 0
        ? items.map((item) => <p className="mt-0 mb-2.5 text-sm leading-[22px] text-body" key={item.id}>{item.body}</p>)
        : <p className="mt-0 mb-2.5 text-sm leading-[22px] text-muted italic">No comments yet.</p>}
    </section>
  )
}
