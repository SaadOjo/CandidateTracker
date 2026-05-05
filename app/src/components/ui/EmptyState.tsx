interface Props {
  title: string
  description?: string
}

export function EmptyState({ title, description }: Props) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </section>
  )
}
