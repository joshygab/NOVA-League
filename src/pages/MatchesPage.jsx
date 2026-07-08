import { Link } from 'react-router-dom'
import MatchCard from '../components/MatchCard'
import PageTitle from '../components/PageTitle'

export default function MatchesPage({ league }) {
  const played = league.matches.filter((match) => match.status === 'played')
  const scheduled = league.matches.filter((match) => match.status !== 'played')

  return (
    <>
      <PageTitle kicker="Calendario" title="Partidos y resultados" />
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-black">Resultados</h2>
          <div className="space-y-4">{played.map((match) => <Link key={match.id} to={`/partidos/${match.id}`} className="block"><MatchCard match={match} teamsById={league.teamsById} playersById={league.playersById} /></Link>)}</div>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-black">Próximos</h2>
          <div className="space-y-4">{scheduled.map((match) => <Link key={match.id} to={`/partidos/${match.id}`} className="block"><MatchCard match={match} teamsById={league.teamsById} playersById={league.playersById} /></Link>)}</div>
        </div>
      </section>
    </>
  )
}
