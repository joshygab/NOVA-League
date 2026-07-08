import DivisionTabs from '../components/DivisionTabs'
import PageTitle from '../components/PageTitle'
import { AssistsTable, DisciplineTable, MvpAwardsTable, MvpRankingTable, SanctionsTable, ScorersTable } from '../components/StatsTables'
import { useDivisionLeague } from '../lib/divisionFilters'

export default function StatsPage({ league }) {
  const { divisions, selectedDivision, setDivision, filteredLeague } = useDivisionLeague(league)
  const scorers = [...filteredLeague.playerStats].sort((a, b) => b.goals - a.goals || b.goalAverage - a.goalAverage)
  const assists = [...filteredLeague.playerStats].sort((a, b) => b.assists - a.assists).slice(0, 10)
  const discipline = [...filteredLeague.playerStats].filter((player) => player.totalCards > 0).sort((a, b) => b.totalCards - a.totalCards)
  const activeSanctions = filteredLeague.sanctions.filter((sanction) => sanction.status === 'active')

  return (
    <>
      <PageTitle kicker="Rankings públicos" title={selectedDivision ? `Estadísticas ${selectedDivision.name}` : 'Estadísticas individuales y disciplina'} />
      <DivisionTabs divisions={divisions} activeDivision={selectedDivision} onChange={setDivision} />
      <div className="space-y-6">
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
