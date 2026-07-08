import Crest from './Crest'
import Badge from './Badge'

export default function StandingsTable({ standings }) {
  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.18em] text-slate-400">
            <tr>
              <th className="px-4 py-4">#</th>
              <th className="px-4 py-4">Equipo</th>
              <th className="px-3 py-4 text-center">PJ</th>
              <th className="px-3 py-4 text-center">G</th>
              <th className="px-3 py-4 text-center">E</th>
              <th className="px-3 py-4 text-center">P</th>
              <th className="px-3 py-4 text-center">GF</th>
              <th className="px-3 py-4 text-center">GC</th>
              <th className="px-3 py-4 text-center">DG</th>
              <th className="px-3 py-4 text-center text-gold">PTS</th>
              <th className="px-4 py-4">Zona</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {standings.map((team, index) => {
              const semifinalist = index < 4
              return (
              <tr key={team.id} className={`transition hover:bg-white/[0.055] ${semifinalist ? 'bg-gold/[0.075] shadow-gold' : ''}`}>
                <td className={`px-4 py-4 font-black ${semifinalist ? 'text-gold' : 'text-slate-400'}`}>{semifinalist ? '🏆 ' : ''}{index + 1}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Crest src={team.crest_url} name={team.name} size="sm" />
                    <div>
                      <p className="font-bold text-white">{team.name}</p>
                      <p className="text-xs text-slate-500">{team.city}</p>
                    </div>
                  </div>
                </td>
                <Cell>{team.played}</Cell>
                <Cell>{team.won}</Cell>
                <Cell>{team.drawn}</Cell>
                <Cell>{team.lost}</Cell>
                <Cell>{team.goalsFor}</Cell>
                <Cell>{team.goalsAgainst}</Cell>
                <Cell>{team.goalDifference}</Cell>
                <Cell strong>{team.points}</Cell>
                <td className="px-4 py-4">{semifinalist && <Badge tone="gold">SEMIFINALES</Badge>}</td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
      <div className="border-t border-white/10 px-4 py-3 text-sm text-slate-300">
        <span className="font-black text-emerald-300">●</span> Puestos 1-4: Clasificación a semifinales
      </div>
    </div>
  )
}

function Cell({ children, strong = false }) {
  return <td className={`px-3 py-4 text-center ${strong ? 'font-black text-gold' : 'text-slate-200'}`}>{children}</td>
}
