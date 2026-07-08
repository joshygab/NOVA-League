import Crest from '../components/Crest'
import DivisionTabs from '../components/DivisionTabs'
import PageTitle from '../components/PageTitle'
import PlayerAvatar from '../components/PlayerAvatar'
import { useDivisionLeague } from '../lib/divisionFilters'

export default function ScorersPage({ league }) {
  const { divisions, selectedDivision, setDivision, filteredLeague } = useDivisionLeague(league)
  const rows = [...filteredLeague.playerStats].sort((a, b) => b.goals - a.goals || b.goalAverage - a.goalAverage || a.name.localeCompare(b.name))

  return (
    <>
      <PageTitle kicker="Tabla de goleo" title={selectedDivision ? `Goleadores ${selectedDivision.name}` : 'Goleadores'} />
      <DivisionTabs divisions={divisions} activeDivision={selectedDivision} onChange={setDivision} />
      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.18em] text-slate-400">
              <tr><th className="px-4 py-4">Pos</th><th className="px-4 py-4">Jugador</th><th className="px-4 py-4">Equipo</th><th className="px-3 py-4 text-center">Número</th><th className="px-4 py-4">Posición</th><th className="px-3 py-4 text-center">PJ</th><th className="px-3 py-4 text-center">Goles</th><th className="px-3 py-4 text-center">Prom.</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((player, index) => {
                const team = filteredLeague.teamsById.get(player.team_id)
                const topThree = index < 3
                return (
                  <tr key={player.id} className={`transition hover:bg-white/[0.05] ${topThree ? 'bg-gold/[0.07]' : ''}`}>
                    <td className={`px-4 py-4 text-lg font-black ${topThree ? 'text-gold' : 'text-slate-400'}`}>{index + 1}</td>
                    <td className="px-4 py-4"><div className="flex items-center gap-3"><PlayerAvatar src={player.photo_url} name={player.name} size="sm" /><p className="font-bold text-white">{player.name}</p></div></td>
                    <td className="px-4 py-4"><div className="flex items-center gap-2"><Crest src={team?.crest_url} name={team?.name} size="sm" /><span>{team?.name || 'Sin equipo'}</span></div></td>
                    <td className="px-3 py-4 text-center">{player.number || '--'}</td>
                    <td className="px-4 py-4 text-slate-300">{player.position || 'N/D'}</td>
                    <td className="px-3 py-4 text-center">{player.playedMatches}</td>
                    <td className="px-3 py-4 text-center text-xl font-black text-gold">{player.goals}</td>
                    <td className="px-3 py-4 text-center">{player.goalAverage.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
