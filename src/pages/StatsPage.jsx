import DivisionTabs from '../components/DivisionTabs'
import PageTitle from '../components/PageTitle'
import PlayerAvatar from '../components/PlayerAvatar'
import { AssistsTable, DisciplineTable, MvpAwardsTable, MvpRankingTable, SanctionsTable, ScorersTable } from '../components/StatsTables'
import { useDivisionLeague } from '../lib/divisionFilters'

export default function StatsPage({ league }) {
  const { divisions, selectedDivision, setDivision, filteredLeague } = useDivisionLeague(league)
  const scorers = [...filteredLeague.playerStats].sort((a, b) => b.goals - a.goals || b.goalAverage - a.goalAverage)
  const assists = [...filteredLeague.playerStats].sort((a, b) => b.assists - a.assists).slice(0, 10)
  const discipline = [...filteredLeague.playerStats].filter((player) => player.totalCards > 0).sort((a, b) => b.totalCards - a.totalCards)
  const activeSanctions = filteredLeague.sanctions.filter((sanction) => sanction.status === 'active')
  const playerIds = new Set(filteredLeague.players.map((player) => player.id))
  const teamOfWeek = (league.teamOfWeek || []).filter((row) => playerIds.has(row.player_id)).slice(0, 7)

  return (
    <>
      <PageTitle kicker="Rankings públicos" title={selectedDivision ? `Estadísticas ${selectedDivision.name}` : 'Estadísticas individuales y disciplina'} />
      <DivisionTabs divisions={divisions} activeDivision={selectedDivision} onChange={setDivision} />
      <div className="space-y-6">
        <TeamOfWeek rows={teamOfWeek} league={league} />
        <ScorersTable rows={scorers} teamsById={filteredLeague.teamsById} />
        <div className="grid gap-6 lg:grid-cols-2">
          <AssistsTable rows={assists} teamsById={filteredLeague.teamsById} />
          <MvpRankingTable rows={filteredLeague.mvpRanking} teamsById={filteredLeague.teamsById} />
        </div>
        <MvpAwardsTable matches={filteredLeague.matches} playersById={filteredLeague.playersById} teamsById={filteredLeague.teamsById} />
        <DisciplineTable rows={discipline} teamsById={filteredLeague.teamsById} />
        <SanctionsTable sanctions={activeSanctions} playersById={filteredLeague.playersById} teamsById={filteredLeague.teamsById} />
      </div>
    </>
  )
}

function TeamOfWeek({ rows, league }) {
  return (
    <section className="rounded-lg border border-gold/30 bg-black p-5 shadow-gold">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Reconocimientos</p>
      <h2 className="mt-2 text-2xl font-black">Equipo de la Jornada</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row) => {
          const player = league.playersById.get(row.player_id)
          const team = league.teamsById.get(row.team_id)
          return (
            <div key={row.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-gold">J{row.round} · {slotLabel(row.slot)}</p>
              <div className="flex items-center gap-3">
                <PlayerAvatar src={player?.photo_url} name={player?.name || 'Jugador'} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-bold">{player?.name || 'Jugador'}</p>
                  <p className="truncate text-xs text-slate-400">{team?.name || 'Equipo'}</p>
                </div>
              </div>
            </div>
          )
        })}
        {rows.length === 0 && <p className="text-sm text-slate-400">Aún no hay Equipo de la Jornada publicado.</p>}
      </div>
    </section>
  )
}

function slotLabel(slot) {
  const labels = {
    por: 'Portero',
    def_1: 'Defensa',
    def_2: 'Defensa',
    mid_1: 'Medio',
    mid_2: 'Medio',
    del_1: 'Delantero',
    mvp: 'MVP',
  }
  return labels[slot] || slot
}
