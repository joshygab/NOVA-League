export default function Badge({ children, tone = 'blue' }) {
  const tones = {
    blue: 'border-electric/40 bg-electric/15 text-blue-200',
    gold: 'border-gold/40 bg-gold/15 text-gold',
    green: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
    yellow: 'border-yellow-300/40 bg-yellow-300/15 text-yellow-200',
    red: 'border-red-400/40 bg-red-500/15 text-red-200',
    slate: 'border-white/10 bg-white/5 text-slate-300',
  }
  return <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-black ${tones[tone]}`}>{children}</span>
}
