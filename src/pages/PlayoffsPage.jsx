import DivisionTabs from '../components/DivisionTabs'
import PageTitle from '../components/PageTitle'
import PlayoffBracket from '../components/PlayoffBracket'
import PremiumComingSoon from '../components/PremiumComingSoon'
import { useDivisionLeague } from '../lib/divisionFilters'

export default function PlayoffsPage({ league }) {
  const { divisions, selectedDivision, setDivision, filteredLeague } = useDivisionLeague(league)
  const playoffSetting = league.playoffSettings?.find((setting) => setting.division_id === selectedDivision?.id)
  const active = playoffSetting?.is_active || playoffSetting?.status === 'active'
  return (
    <>
      <PageTitle kicker="Fase final" title={selectedDivision ? `Playoffs ${selectedDivision.name}` : 'Playoffs'} />
      <DivisionTabs divisions={divisions} activeDivision={selectedDivision} onChange={setDivision} />
      {!active ? (
        <PremiumComingSoon
          title={`Playoffs ${selectedDivision?.name || ''}`}
          subtitle="La fase final de esta división está por comenzar"
          body="Los mejores equipos competirán por el campeonato cuando el administrador active los cruces oficiales."
          features={['Semifinales', 'Final', 'Campeón de división']}
        />
      ) : filteredLeague.playoffMatches.length ? (
        <PlayoffBracket matches={filteredLeague.playoffMatches} teamsById={filteredLeague.teamsById} />
      ) : (
        <section className="panel p-6 text-slate-300">Los cruces de semifinales aparecerán cuando el administrador genere playoffs.</section>
      )}
    </>
  )
}
