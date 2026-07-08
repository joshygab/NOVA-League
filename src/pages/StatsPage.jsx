import PageTitle from '../components/PageTitle'
import { AssistsTable, DisciplineTable, MvpAwardsTable, MvpRankingTable, SanctionsTable, ScorersTable } from '../components/StatsTables'

export default function StatsPage({ league }) {
  const scorers = [...league.playerStats].sort((a, b) => b.goals - a.goals || b.goalAverage - a.goalAverage)
  const assists = [...league.playerStats].sort((a, b) => b.assists - a.assists).slice(0, 10)
  const discipline = [...league.playerStats].filter((player) => player.totalCards > 0).sort((a, b) => b.totalCards - a.totalCards)
  const activeSanctions = league.sanctions.filter((sanction) => sanction.status === 'active')

  return (
    <>
      <PageTitle kicker="Rankings públicos" title="Estadísticas individuales y disciplina" />
      <div className="space-y-6">
        <ScorersTable rows={scorers} teamsById={league.teamsById} />
        <div className="grid gap-6 lg:grid-cols-2">
          <AssistsTable rows={assists} teamsById={league.teamsById} />
          <MvpRankingTable rows={league.mvpRanking} teamsById={league.teamsById} />
        </div>
        <MvpAwardsTable matches={league.matches} playersById={league.playersById} teamsById={league.teamsById} />
        <DisciplineTable rows={discipline} teamsById={league.teamsById} />
        <SanctionsTable sanctions={activeSanctions} playersById={league.playersById} teamsById={league.teamsById} />
      </div>
    </>
  )
}
