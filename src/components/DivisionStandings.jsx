import Badge from './Badge'
import Crest from './Crest'

const zoneMeta = {
  promotion: { label: 'Zona de ascenso', tone: 'blue' },
  relegation: { label: 'Zona de descenso', tone: 'red' },
  championship: { label: 'Zona de campeonato', tone: 'gold' },
  neutral: { label: '', tone: 'slate' },
}

export default function DivisionStandings({ division }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black">{division.name}</h2>
          <p className="text-sm text-slate-400">{division.teams.length} equipos · {division.matches.length} partidos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {division.promotion_slots > 0 && <Badge tone="blue">🟢 {division.promotion_slots} asciende(n)</Badge>}
          {division.championship_slots > 0 && <Badge tone="gold">🏆 {division.championship_slots} liguilla</Badge>}
          {division.relegation_slots > 0 && <Badge tone="red">🔴 {division.relegation_slots} desciende(n)</Badge>}
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.18em] text-slate-400">
            <tr><th className="px-4 py-4">Pos</th><th className="px-4 py-4">Equipo</th><th className="px-3 py-4 text-center">PJ</th><th className="px-3 py-4 text-center">G</th><th className="px-3 py-4 text-center">E</th><th className="px-3 py-4 text-center">P</th><th className="px-3 py-4 text-center">GF</th><th className="px-3 py-4 text-center">GC</th><th className="px-3 py-4 text-center">DG</th><th className="px-3 py-4 text-center">PTS</th><th className="px-4 py-4">Zona</th></tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {division.standings.map((team) => <DivisionRow key={team.id} team={team} />)}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-3 md:hidden">
        {division.standings.map((team) => <DivisionCard key={team.id} team={team} />)}
      </div>
    </section>
  )
}

function DivisionRow({ team }) {
  const meta = zoneMeta[team.zone]
  return (
    <tr className={`${team.zone !== 'neutral' ? 'bg-white/[0.035]' : ''} transition hover:bg-white/[0.055]`}>
      <td className="px-4 py-4 font-black text-gold">#{team.position}</td>
      <td className="px-4 py-4"><div className="flex items-center gap-3"><Crest src={team.crest_url} name={team.name} size="sm" /><span className="font-bold text-white">{team.name}</span></div></td>
      <Cell>{team.played}</Cell><Cell>{team.won}</Cell><Cell>{team.drawn}</Cell><Cell>{team.lost}</Cell><Cell>{team.goalsFor}</Cell><Cell>{team.goalsAgainst}</Cell><Cell>{team.goalDifference}</Cell><Cell strong>{team.points}</Cell>
      <td className="px-4 py-4">{meta.label && <Badge tone={meta.tone}>{meta.label}</Badge>}</td>
    </tr>
  )
}

function DivisionCard({ team }) {
  const meta = zoneMeta[team.zone]
  return (
    <article className={`rounded-lg border p-4 ${team.zone !== 'neutral' ? 'border-gold/30 bg-white/[0.055]' : 'border-white/10 bg-white/[0.03]'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Crest src={team.crest_url} name={team.name} size="sm" />
          <div>
            <p className="font-black">#{team.position} {team.name}</p>
            {meta.label && <p className="mt-1 text-xs text-gold">{meta.label}</p>}
          </div>
        </div>
        <div className="text-right"><p className="text-2xl font-black text-gold">{team.points}</p><p className="text-xs text-slate-500">PTS</p></div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
        <Mini label="PJ" value={team.played} /><Mini label="G" value={team.won} /><Mini label="E" value={team.drawn} /><Mini label="P" value={team.lost} />
        <Mini label="GF" value={team.goalsFor} /><Mini label="GC" value={team.goalsAgainst} /><Mini label="DG" value={team.goalDifference} /><Mini label="PTS" value={team.points} gold />
      </div>
    </article>
  )
}

function Cell({ children, strong = false }) {
  return <td className={`px-3 py-4 text-center ${strong ? 'font-black text-gold' : 'text-slate-200'}`}>{children}</td>
}

function Mini({ label, value, gold = false }) {
  return <div className="rounded-lg bg-ink/70 px-2 py-2"><p className="text-[11px] text-slate-500">{label}</p><p className={`font-black ${gold ? 'text-gold' : 'text-white'}`}>{value}</p></div>
}
