export default function StatCard({ label, value, tone = 'blue' }) {
  return (
    <div className="panel p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={['mt-2 text-3xl font-black', tone === 'gold' ? 'text-gold' : 'text-white'].join(' ')}>{value}</p>
    </div>
  )
}
