interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
}

const colors = [
  'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500',
  'bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 'bg-violet-500',
]

function getColor(name: string) {
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' }

export default function Avatar({ name, size = 'md' }: AvatarProps) {
  const initials = name.slice(0, 2).toUpperCase()
  return (
    <div className={`${sizes[size]} ${getColor(name)} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}>
      {initials}
    </div>
  )
}
