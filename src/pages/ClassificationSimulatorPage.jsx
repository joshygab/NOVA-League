import { useMemo, useState } from 'react'
import DivisionTabs from '../components/DivisionTabs'
import PageTitle from '../components/PageTitle'
import StandingsTable from '../components/StandingsTable'
import { calculateStandings } from '../lib/standings'
import { useDivisionLeague } from '../lib/divisionFilters'

export default function ClassificationSimulatorPage({ league }) {
  const { divisions, selectedDivision, setDivision, filteredLeague } = useDivisionLeague(league)
  const [teamId, setTeamId] = useState('')
  const [scenario, setScenario] = useState('win')
  const team = filteredLeague.teams.find((item) => item.id === teamId) || filteredLeague.teams[0]
  const nextMatch = filteredLeague.matches.find((match) => !['played', 'official'].includes(match.status) && [match.home_team_id, match.away_team_id].includes(team?.id))

  const simulated = useMemo(() => {
    if (!team || !nextMatch) return filteredLeague.standings
    const home = nextMatch.home_team_id === team.id
    const scores = scenarioScore(scenario, home)
    const matches = filteredLeague.matches.map((match) => match.id === nextMatch.id ? { ...match, ...scores, status: 'official' } : match)
    return calculateStandings(filteredLeague.teams, matches)
  }, [filteredLeague.matches, filteredLeague.teams, filteredLeague.standings, nextMatch, scenario, team])

  const current = filteredLeague.standings.find((row) => row.id === team?.id)
  const projected = simulated.find((row) => row.id === team?.id)
  const cutoff = simulated[3]?.points || 0

  return (
    <>
      <PageTitle kicker="Simulador" title="Qué necesita para clasificar" />
      <DivisionTabs divisions={divisions} activeDivision={selectedDivision} onChange={setDivision} />
      <section className="mb-6 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
        <div className="panel space-y-4 p-5">
          <label className="block text-sm font-bold">Equipo</label>
          <select className="input" value={team?.id || ''} onChange={(event) => setTeamId(event.target.value)}>
            {filteredLeague.teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <label className="block text-sm font-bold">Escenario próximo partido</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['win', 'Gana'],
              ['draw', 'Empata'],
              ['loss', 'Pierde'],
            ].map(([id, label]) => <button key={id} className={scenario === id ? 'button' : 'button-secondary'} onClick={() => setScenario(id)}>{label}</button>)}
          </div>
          <div className="rounded-lg border border-gold/30 bg-gold/10 p-4 text-sm text-gold">
            <p className="font-black">{team?.name || 'Equipo'}</p>
            {nextMatch ? <p>Próximo: {league.teamsById.get(nextMatch.home_team_id)?.name} vs {league.teamsById.get(nextMatch.away_team_id)?.name}</p> : <p>No hay próximo partido pendiente.</p>}
            <p>Actual: {current?.points || 0} pts · Proyección: {projected?.points || 0} pts</p>
            <p>Corte estimado Top 4: {cutoff} pts</p>
          </div>
        </div>
        <StandingsTable standings={simulated} compact championsTeamIds={league.novaChampionsTeamIds} />
      </section>
    </>
  )
}

function scenarioScore(scenario, home) {
  if (scenario === 'draw') return { home_score: 1, away_score: 1 }
  if (scenario === 'win') return home ? { home_score: 2, away_score: 1 } : { home_score: 1, away_score: 2 }
  return home ? { home_score: 1, away_score: 2 } : { home_score: 2, away_score: 1 }
}
