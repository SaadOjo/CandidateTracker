interface AvatarProps {
  name: string
  size?: 'small' | 'large'
}

export function Avatar({ name, size = 'small' }: AvatarProps) {
  const initial = name.trim()[0]?.toUpperCase() ?? '?'
  const sizeClasses = size === 'large' ? 'h-9 w-9 text-[13px]' : 'h-[30px] w-[30px] text-xs'

  return (
    <span className={`inline-grid shrink-0 place-items-center rounded-full border-2 border-white bg-linear-to-br from-avatar-start to-success font-extrabold text-white ${sizeClasses}`}>
      {initial}
    </span>
  )
}
