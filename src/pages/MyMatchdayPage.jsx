import { Navigate } from 'react-router-dom'
import PageTitle from '../components/PageTitle'
import MatchCard from '../components/MatchCard'
import StatCard from '../components/StatCard'
import { useAuth } from '../lib/AuthContext'
import { hasSupabaseConfig } from '../lib/supabase'

export default function MyMatchdayPage({ league }) {
  const { loading, user, player } = useAuth()
  if (!hasSupabaseConfig) return <Navigate to="/login" replace />
  if (loading || league.loading) return <div className="panel p-5">Cargando mi jornada...</div>
  if (!user) return <Navigate to="/login" replace />

  const authPlayer = league.allPlayers.find((item) => item.auth_user_id === user.id) || player
  if (!authPlayer) return <Navigate to="/perfil" replace />
  const team = league.teamsById.get(authPlayer.team_id)
  const stats = league.playerStatsById.get(authPlayer.id)
  const next = league.matches.find((match) => !['played', 'official'].includes(match.status) && [match.home_team_id, match.away_team_id].includes(authPlayer.team_id))
  const standing = league.standings.find((row) => row.id === authPlayer.team_id)

  return (
    <>
      <PageTitle kicker="Mi Jornada" title={team?.name || 'Mi equipo'} />
      <section className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
        <div className="space-y-5">
          <section className="panel p-5">
            <h2 className="mb-4 text-xl font-black">Próximo partido</h2>
            {next ? <MatchCard match={next} teamsById={league.teamsById} playersById={league.playersById} /> : <p className="text-sm text-slate-400">No tienes partido pendiente.</p>}
          </section>
          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Posición equipo" value={standing?.position || '-'} />
            <StatCard label="Goles" value={stats?.goals || 0} tone="gold" />
            <StatCard label="MVP" value={stats?.mvpAwards || 0} />
          </section>
        </div>
        <section className="panel p-5">
          <h2 className="text-xl font-black">Avisos personales</h2>
          <div className="mt-4 space-y-2">
            {(stats?.activeSanctions || []).map((sanction) => <p key={sanction.id} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{sanction.reason}</p>)}
            {(stats?.activeSanctions || []).length === 0 && <p className="text-sm text-slate-400">No tienes sanciones activas.</p>}
          </div>
        </section>
      </section>
    </>
  )
}
