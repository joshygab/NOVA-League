import { Navigate } from 'react-router-dom'
import NovaIdCard from '../components/NovaIdCard'
import PageTitle from '../components/PageTitle'
import { useAuth } from '../lib/AuthContext'

export default function NovaIdPage({ league }) {
  const { loading, user, player: authPlayer } = useAuth()
  if (loading || league.loading) return <div className="panel p-5">Cargando NOVA ID...</div>
  if (!user) return <Navigate to="/login" replace />

  const player = league.allPlayers.find((item) => item.auth_user_id === user.id) || authPlayer
  if (!player) return <section className="panel p-5">No encontramos tu perfil de jugador.</section>

  const index = league.allPlayers.findIndex((item) => item.id === player.id)
  const team = league.teamsById.get(player.team_id)
  const division = league.divisionsById.get(player.division_id || team?.division_id)
  const stats = league.playerStatsById.get(player.id)

  return (
    <>
      <PageTitle kicker="Credencial digital" title="NOVA ID" />
      <NovaIdCard player={player} team={team} division={division} stats={stats} index={index} />
    </>
  )
}
