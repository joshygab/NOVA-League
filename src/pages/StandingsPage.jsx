import PageTitle from '../components/PageTitle'
import StandingsTable from '../components/StandingsTable'

export default function StandingsPage({ league }) {
  return (
    <>
      <PageTitle kicker="Clasificación" title="Tabla general" />
      <StandingsTable standings={league.standings} />
    </>
  )
}
