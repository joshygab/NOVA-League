import DivisionTabs from '../components/DivisionTabs'
import PageTitle from '../components/PageTitle'
import PlayoffBracket from '../components/PlayoffBracket'
import { useDivisionLeague } from '../lib/divisionFilters'

export default function PlayoffsPage({ league }) {
  const { divisions, selectedDivision, setDivision, filteredLeague } = useDivisionLeague(league)
  return (
    <>
      <PageTitle kicker="Fase final" title={selectedDivision ? `Playoffs ${selectedDivision.name}` : 'Playoffs'} />
      <DivisionTabs divisions={divisions} activeDivision={selectedDivision} onChange={setDivision} />
      {filteredLeague.playoffMatches.length ? (
        <PlayoffBracket matches={filteredLeague.playoffMatches} teamsById={filteredLeague.teamsById} />
      ) : (
        <section className="panel p-6 text-slate-300">Los cruces de semifinales aparecerán cuando el administrador genere playoffs.</section>
      )}
    </>
  )
}
