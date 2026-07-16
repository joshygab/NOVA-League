import { Link } from 'react-router-dom'
import DivisionTabs from '../components/DivisionTabs'
import MatchCard from '../components/MatchCard'
import PageTitle from '../components/PageTitle'
import { useDivisionLeague } from '../lib/divisionFilters'
import { isCountedMatch } from '../lib/standings'

export default function MatchesPage({ league }) {
  const { divisions, selectedDivision, setDivision, filteredLeague } = useDivisionLeague(league)
  const played = filteredLeague.matches.filter(isCountedMatch)
  const scheduled = filteredLeague.matches.filter((match) => !isCountedMatch(match))

  return (
    <>
      <PageTitle kicker="Calendario" title={selectedDivision ? `Partidos ${selectedDivision.name}` : 'Partidos y resultados'} />
      <DivisionTabs divisions={divisions} activeDivision={selectedDivision} onChange={setDivision} />
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-black">Resultados</h2>
          <div className="space-y-4">{played.map((match) => <Link key={match.id} to={`/match/${match.id}`} className="block"><MatchCard match={match} teamsById={filteredLeague.teamsById} playersById={filteredLeague.playersById} /></Link>)}</div>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-black">Próximos</h2>
          <div className="space-y-4">{scheduled.map((match) => <Link key={match.id} to={`/match/${match.id}`} className="block"><MatchCard match={match} teamsById={filteredLeague.teamsById} playersById={filteredLeague.playersById} /></Link>)}</div>
        </div>
      </section>
    </>
  )
}
