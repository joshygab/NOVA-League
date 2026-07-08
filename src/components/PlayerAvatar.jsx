import { UserRound } from 'lucide-react'

export default function PlayerAvatar({ src, name, size = 'md' }) {
  const sizes = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-20 w-20',
  }

  if (src) return <img src={src} alt={name} className={`${sizes[size]} rounded-lg object-cover ring-1 ring-white/10`} />
  return (
    <span className={`${sizes[size]} grid place-items-center rounded-lg bg-white/10 text-slate-500 ring-1 ring-white/10`}>
      <UserRound size={size === 'lg' ? 34 : 22} />
    </span>
  )
}
