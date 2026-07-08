export default function NovaRatingCard({ rating }) {
  if (!rating) return null
  const attrs = [
    ['Ritmo', rating.pace],
    ['Tiro', rating.shooting],
    ['Pase', rating.passing],
    ['Defensa', rating.defending],
    ['Físico', rating.physical],
  ]
  return (
    <section className="rounded-lg border border-gold/30 bg-black p-5 shadow-gold">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">NOVA Rating</p>
          <h2 className="mt-1 text-2xl font-black">OVR General</h2>
        </div>
        <div className="grid h-20 w-20 place-items-center rounded-lg border border-gold/50 bg-gold/10 text-4xl font-black text-gold">{rating.overall}</div>
      </div>
      <div className="mt-5 grid gap-2">
        {attrs.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[80px_1fr_42px] items-center gap-3 text-sm">
            <span className="font-bold text-slate-300">{label}</span>
            <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gold" style={{ width: `${value}%` }} /></div>
            <span className="text-right font-black text-white">{value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
