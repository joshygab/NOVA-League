import { Navigate, useNavigate } from 'react-router-dom'
import { Award, CircleAlert, Goal, Hand, IdCard, LogOut, Shield, UserRound } from 'lucide-react'
import PageTitle from '../components/PageTitle'
import Badge from '../components/Badge'
import Crest from '../components/Crest'
import MatchCard from '../components/MatchCard'
import StatCard from '../components/StatCard'
import NovaRatingCard from '../components/NovaRatingCard'
import { useAuth } from '../lib/AuthContext'
import { hasSupabaseConfig } from '../lib/supabase'
import { calculateNovaRating, getPlayerAchievements } from '../lib/playerProgression'

export default function MyPlayerProfilePage({ league }) {
  const { loading, user, player: authPlayer, signOut } = useAuth()
  const navigate = useNavigate()

  if (!hasSupabaseConfig) return <Navigate to="/login" replace />
  if (loading || league.loading) return <div className="panel p-5">Cargando perfil...</div>
  if (!user) return <Navigate to="/login" replace />

  const player = league.allPlayers.find((item) => item.auth_user_id === user.id) || authPlayer
  if (!player) {
    return (
      <section className="panel p-5">
        <h1 className="text-2xl font-black">Perfil no encontrado</h1>
        <p className="mt-2 text-sm text-slate-400">Tu cuenta existe, pero no tiene perfil de jugador asociado.</p>
        <button className="button-secondary mt-4" onClick={async () => { await signOut(); navigate('/login') }}><LogOut size={16} />Cerrar sesión</button>
      </section>
    )
  }

  const team = league.teamsById.get(player.team_id)
  const stats = league.playerStatsById.get(player.id)
  const activeSanctions = stats?.activeSanctions || []
  const matchHistory = stats?.matchHistory || []
  const standing = league.standings.find((row) => row.id === player.team_id)
  const rating = calculateNovaRating(stats || player, standing)
  const achievements = getPlayerAchievements(stats || player)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      <PageTitle kicker="Cuenta de jugador" title="Mi Perfil">
        <button className="button-secondary" onClick={handleSignOut}><LogOut size={16} />Cerrar sesión</button>
      </PageTitle>

      <section className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
        <div className="panel overflow-hidden">
          <div className="grid aspect-square place-items-center bg-white/5 p-6">
            {player.photo_url ? (
              <img src={player.photo_url} alt={player.name} className="h-44 w-44 rounded-full object-cover ring-4 ring-electric/30" />
            ) : (
              <div className="grid h-44 w-44 place-items-center rounded-full bg-white/5 ring-4 ring-white/10">
                <UserRound size={72} className="text-slate-500" />
              </div>
            )}
          </div>
          <div className="space-y-4 p-5">
            <Badge tone={player.approval_status === 'approved' ? 'green' : 'gold'}>{player.approval_status === 'approved' ? 'Aprobado' : 'Pendiente'}</Badge>
            <div>
              <h2 className="text-3xl font-black">{player.name}</h2>
              <p className="text-sm text-slate-400">{user.email}</p>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
              <Crest src={team?.crest_url} name={team?.name} size="md" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">Equipo</p>
                <p className="font-bold">{team?.name || 'Sin equipo'}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Info icon={IdCard} label="Número" value={player.number || '--'} />
              <Info icon={Shield} label="Posición" value={player.position || '--'} />
              <Info icon={UserRound} label="Edad" value={player.age || '--'} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Partidos" value={stats?.playedMatches || 0} />
            <StatCard label="Goles" value={stats?.goals || 0} tone="gold" />
            <StatCard label="Asistencias" value={stats?.assists || 0} />
            <StatCard label="MVP" value={stats?.mvpAwards || 0} tone="gold" />
          </section>

          <NovaRatingCard rating={rating} />

          <section className="panel p-5">
            <h2 className="text-xl font-black">Logros desbloqueables</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {achievements.map((achievement) => (
                <div key={achievement.id} className={`rounded-lg border p-3 ${achievement.unlocked ? 'border-gold/40 bg-gold/10 text-gold shadow-gold' : 'border-white/10 bg-white/5 text-slate-500'}`}>
                  <p className="font-black">{achievement.icon} {achievement.name}</p>
                  <p className="mt-1 text-xs">{achievement.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <SmallMetric icon={Hand} label="Amarillas" value={stats?.yellowCards || 0} />
            <SmallMetric icon={CircleAlert} label="Rojas" value={stats?.redCards || 0} />
            <SmallMetric icon={Award} label="Sanciones activas" value={activeSanctions.length} />
          </section>

          <section className="panel p-5">
            <h2 className="text-xl font-black">Historial de partidos jugados</h2>
            <div className="mt-4 space-y-3">
              {matchHistory.length === 0 && <p className="text-sm text-slate-400">Todavía no hay partidos registrados para este jugador.</p>}
              {matchHistory.map((match) => <MatchCard key={match.id} match={match} teamsById={league.teamsById} playersById={league.playersById} />)}
            </div>
          </section>

          {activeSanctions.length > 0 && (
            <section className="panel p-5">
              <h2 className="text-xl font-black">Sanciones activas</h2>
              <div className="mt-4 space-y-2">
                {activeSanctions.map((sanction) => (
                  <div key={sanction.id} className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
                    <p className="font-black">{sanction.sanction_type}</p>
                    <p>{sanction.reason}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </>
  )
}

function Info({ icon: Icon, label, value }) {
  return <div className="rounded-lg border border-white/10 bg-white/5 p-3"><Icon size={16} className="text-gold" /><p className="mt-2 text-xs text-slate-400">{label}</p><p className="font-black">{value}</p></div>
}

function SmallMetric({ icon: Icon, label, value }) {
  return <div className="panel flex items-center gap-3 p-4"><div className="grid h-11 w-11 place-items-center rounded-lg bg-white/5 text-gold"><Icon size={18} /></div><div><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="text-2xl font-black">{value}</p></div></div>
}
