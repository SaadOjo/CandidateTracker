interface ErrorMessageProps {
  message: string
  className?: string
}

export function ErrorMessage({ message, className = '' }: ErrorMessageProps) {
  return <p className={`m-0 flex items-center gap-2 font-bold text-danger ${className}`} role="alert">{message}</p>
}
