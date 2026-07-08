import { Link } from 'react-router-dom'
import Badge from '../components/Badge'
import Crest from '../components/Crest'
import DivisionTabs from '../components/DivisionTabs'
import PageTitle from '../components/PageTitle'
import { useDivisionLeague } from '../lib/divisionFilters'

export default function TeamsPage({ league }) {
  const { divisions, selectedDivision, setDivision, filteredLeague } = useDivisionLeague(league)
  const standingsById = new Map(filteredLeague.standings.map((team, index) => [team.id, { ...team, tablePosition: index + 1 }]))

  return (
    <>
      <PageTitle kicker="Índice" title={selectedDivision ? `Equipos ${selectedDivision.name}` : 'Equipos'} />
      <DivisionTabs divisions={divisions} activeDivision={selectedDivision} onChange={setDivision} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredLeague.teams.map((team) => {
          const stats = standingsById.get(team.id)
          return (
            <Link key={team.id} to={`/equipos/${team.id}`} className="panel block p-5 transition hover:-translate-y-1 hover:border-electric/50">
              <div className="flex items-start justify-between gap-4">
                <Crest src={team.crest_url} name={team.name} size="lg" />
                <Badge tone="gold">#{stats?.tablePosition || '-'}</Badge>
              </div>
              <h2 className="mt-4 text-2xl font-black">{team.name}</h2>
              <p className="mt-1 text-sm text-slate-400">Capitán: {team.captain || 'Por definir'}</p>
              <p className="text-sm text-slate-400">Categoría: {team.category || 'N/D'}</p>
              <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
                <Metric label="PJ" value={stats?.played ?? 0} />
                <Metric label="PTS" value={stats?.points ?? 0} gold />
                <Metric label="GF" value={stats?.goalsFor ?? 0} />
                <Metric label="GC" value={stats?.goalsAgainst ?? 0} />
                <Metric label="DG" value={stats?.goalDifference ?? 0} />
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}

function Metric({ label, value, gold = false }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-black ${gold ? 'text-gold' : 'text-white'}`}>{value}</p>
    </div>
  )
}
