import PageTitle from '../components/PageTitle'

export default function HistoryPage({ league }) {
  return (
    <>
      <PageTitle kicker="Temporadas" title="Historial" />
      <div className="space-y-4">
        {league.seasonHistory.length === 0 && <section className="panel p-6 text-slate-300">Cuando cierres una temporada, el historial aparecerá aquí.</section>}
        {league.seasonHistory.map((item) => (
          <article key={item.id} className="panel p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">{item.season}</p>
            <h2 className="mt-2 text-2xl font-black">Temporada cerrada</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <HistoryBlock title="Campeones" rows={item.champions} />
              <HistoryBlock title="Ascendidos" rows={item.promoted} />
              <HistoryBlock title="Descendidos" rows={item.relegated} />
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

function HistoryBlock({ title, rows = [] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="font-black">{title}</h3>
      <div className="mt-3 space-y-2 text-sm text-slate-300">
        {rows.length === 0 && <p className="text-slate-500">Sin registros</p>}
        {rows.map((row, index) => <p key={`${row.team_id}-${index}`}>{row.team_name} · {row.division_name}</p>)}
      </div>
    </div>
  )
}
