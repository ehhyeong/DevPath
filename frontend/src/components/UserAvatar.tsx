type UserAvatarProps = {
  name: string
  imageUrl?: string | null
  className?: string
  iconClassName?: string
  alt?: string
  fallback?: 'icon' | 'initials'
}

function resolveImageUrl(imageUrl?: string | null) {
  const normalized = imageUrl?.trim()
  return normalized ? normalized : null
}

export default function UserAvatar({
  name,
  imageUrl,
  className = 'h-9 w-9',
  iconClassName = 'text-sm',
  alt,
  fallback = 'icon',
}: UserAvatarProps) {
  const resolvedImageUrl = resolveImageUrl(imageUrl)
  const baseClassName = `shrink-0 overflow-hidden rounded-full border border-gray-200 ${className}`

  if (resolvedImageUrl) {
    return <img src={resolvedImageUrl} alt={alt ?? `${name} profile`} className={`${baseClassName} object-cover`} />
  }

  if (fallback === 'initials') {
    const label = name.trim() || '팀원'
    const parts = label.split(/\s+/)
    const initials = /[가-힣]/.test(label) ? label.replace(/\s/g, '').slice(-2) : parts.map(part => part[0]).join('').slice(0, 2).toUpperCase()
    const palette = [{ backgroundColor: '#E0E7FF', color: '#3730A3' }, { backgroundColor: '#D1FAE5', color: '#065F46' }, { backgroundColor: '#FFEDD5', color: '#9A3412' }, { backgroundColor: '#F3E8FF', color: '#6B21A8' }]
    const hash = Array.from(label).reduce((sum, character) => sum + character.charCodeAt(0), 0)
    return <span role="img" aria-label={alt ?? `${name} profile`} title={name} style={palette[hash % palette.length]} className={`${baseClassName} inline-flex items-center justify-center text-xs font-bold`}>{initials}</span>
  }

  return (
    <span
      role="img"
      aria-label={alt ?? `${name} default profile`}
      className={`${baseClassName} inline-flex items-center justify-center bg-gray-100 text-gray-400`}
    >
      <i className={`fas fa-user ${iconClassName}`} />
    </span>
  )
}
