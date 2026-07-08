import { Navigate, useParams } from 'react-router-dom'
import Badge from '../components/Badge'
import MatchCard from '../components/MatchCard'
import PageTitle from '../components/PageTitle'
import PlayerAvatar from '../components/PlayerAvatar'
import StatCard from '../components/StatCard'
import { goalTypeLabel } from '../lib/labels'

export default function PlayerProfilePage({ league }) {
  const { id } = useParams()
  const player = league.playerStatsById.get(id)
  if (!player) return <Navigate to="/jugadores" replace />

  const team = league.teamsById.get(player.team_id)

  return (
    <>
      <PageTitle kicker={team?.name || 'Jugador'} title={player.name} />
      <section className="mb-6 grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
        <div className="panel p-5">
          <PlayerAvatar src={player.photo_url} name={player.name} size="lg" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-gold">#{player.number || '--'} {player.position}</p>
          <h2 className="mt-2 text-2xl font-black">{player.name}</h2>
          <p className="text-slate-400">{team?.name || 'Sin equipo'}</p>
          {player.activeSanctions.length > 0 && (
            <div className="mt-5 rounded-lg border border-red-400/30 bg-red-500/10 p-4">
              <Badge tone="red">Sanción activa</Badge>
              <p className="mt-3 text-sm text-red-100">{player.activeSanctions[0].reason}</p>
            </div>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Goles" value={player.goals} tone="gold" />
          <StatCard label="Asistencias" value={player.assists} />
          <StatCard label="MVP" value={player.mvpAwards} tone="gold" />
          <StatCard label="Amarillas" value={player.yellowCards} />
          <StatCard label="Rojas" value={player.redCards} />
          <StatCard label="PJ" value={player.playedMatches} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-black">Historial de partidos</h2>
          <div className="space-y-4">
            {player.matchHistory.map((match) => <MatchCard key={match.id} match={match} teamsById={league.teamsById} playersById={league.playersById} />)}
          </div>
        </div>
        <div className="space-y-6">
          <div className="panel p-5">
            <h2 className="mb-4 text-xl font-black">Historial de goles</h2>
            <div className="space-y-3">
              {player.goalHistory.length === 0 && <p className="text-sm text-slate-400">Sin goles registrados.</p>}
              {player.goalHistory.map((goal) => {
                const match = league.matches.find((item) => item.id === goal.match_id)
                return <div key={goal.id} className="rounded-lg border border-white/10 bg-white/5 p-4"><p className="font-bold">⚽ {goal.minute}' · {goalTypeLabel(goal.goal_type)}</p><p className="mt-1 text-sm text-slate-400">Jornada {match?.round || '-'} · {match ? new Date(match.match_date).toLocaleDateString('es-MX') : 'Partido'}</p></div>
              })}
            </div>
          </div>
          <div className="panel p-5">
            <h2 className="mb-4 text-xl font-black">Sanciones activas</h2>
            <div className="space-y-3">
              {player.activeSanctions.length === 0 && <p className="text-sm text-slate-400">Sin sanciones activas.</p>}
              {player.activeSanctions.map((sanction) => (
                <div key={sanction.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="font-bold">{sanction.sanction_type}</p>
                  <p className="mt-1 text-sm text-slate-300">{sanction.reason}</p>
                  <p className="mt-2 text-xs text-slate-500">{sanction.suspended_matches} partido(s), desde {sanction.start_date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
