import { Shield } from 'lucide-react'

export default function Crest({ src, name, size = 'md' }) {
  const sizes = {
    sm: 'h-9 w-9',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }

  if (src) return <img src={src} alt={name} className={`${sizes[size]} rounded-lg object-cover ring-1 ring-white/10`} />
  return (
    <span className={`${sizes[size]} grid place-items-center rounded-lg bg-white/10 text-gold ring-1 ring-white/10`}>
      <Shield size={size === 'lg' ? 28 : 20} />
    </span>
  )
}
