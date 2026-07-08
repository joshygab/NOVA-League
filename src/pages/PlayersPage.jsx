import { UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import Badge from '../components/Badge'
import DivisionTabs from '../components/DivisionTabs'
import PageTitle from '../components/PageTitle'
import { useDivisionLeague } from '../lib/divisionFilters'

export default function PlayersPage({ league }) {
  const { divisions, selectedDivision, setDivision, filteredLeague } = useDivisionLeague(league)
  return (
    <>
      <PageTitle kicker="Plantillas" title={selectedDivision ? `Jugadores ${selectedDivision.name}` : 'Jugadores'} />
      <DivisionTabs divisions={divisions} activeDivision={selectedDivision} onChange={setDivision} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filteredLeague.players.map((player) => {
          const team = filteredLeague.teamsById.get(player.team_id)
          return (
            <Link key={player.id} to={`/jugadores/${player.id}`} className="panel block overflow-hidden transition hover:-translate-y-1 hover:border-gold/50">
              <div className="grid aspect-[4/3] place-items-center bg-white/5">
                {player.photo_url ? <img src={player.photo_url} alt={player.name} className="h-full w-full object-cover" /> : <UserRound size={54} className="text-slate-500" />}
              </div>
              <div className="p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">#{player.number || '--'} {player.position}</p>
                <h2 className="mt-2 text-lg font-black">{player.name}</h2>
                <p className="text-sm text-slate-400">{team?.name || 'Sin equipo'}</p>
                {filteredLeague.playerStatsById.get(player.id)?.activeSanctions.length > 0 && <div className="mt-3"><Badge tone="red">Sanción activa</Badge></div>}
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
