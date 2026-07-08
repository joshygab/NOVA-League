import PageTitle from '../components/PageTitle'
import StandingsTable from '../components/StandingsTable'
import DivisionTabs from '../components/DivisionTabs'
import { useDivisionLeague } from '../lib/divisionFilters'

export default function StandingsPage({ league }) {
  const { divisions, selectedDivision, setDivision, filteredLeague } = useDivisionLeague(league)
  return (
    <>
      <PageTitle kicker="Clasificación" title={selectedDivision ? `Tabla ${selectedDivision.name}` : 'Tabla'} />
      <DivisionTabs divisions={divisions} activeDivision={selectedDivision} onChange={setDivision} />
      <StandingsTable standings={filteredLeague.standings} />
    </>
  )
}
