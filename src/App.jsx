import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import { useLeagueData } from './lib/useLeagueData'
import Layout from './components/Layout'
import AdminRoute from './components/AdminRoute'
import Home from './pages/Home'
import StandingsPage from './pages/StandingsPage'
import DivisionsPage from './pages/DivisionsPage'
import HistoryPage from './pages/HistoryPage'
import MatchesPage from './pages/MatchesPage'
import MatchDetailPage from './pages/MatchDetailPage'
import TeamsPage from './pages/TeamsPage'
import TeamProfilePage from './pages/TeamProfilePage'
import PlayersPage from './pages/PlayersPage'
import PlayerProfilePage from './pages/PlayerProfilePage'
import StatsPage from './pages/StatsPage'
import ScorersPage from './pages/ScorersPage'
import PlayoffsPage from './pages/PlayoffsPage'
import NewsPage from './pages/NewsPage'
import NovaChampionsPage from './pages/NovaChampionsPage'
import PlayerRegisterPage from './pages/PlayerRegisterPage'
import PlayerLoginPage from './pages/PlayerLoginPage'
import MyPlayerProfilePage from './pages/MyPlayerProfilePage'
import NovaIdPage from './pages/NovaIdPage'
import NovaIdPublicProfilePage from './pages/NovaIdPublicProfilePage'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import { useAuth } from './lib/AuthContext'

export default function App() {
  const league = useLeagueData()
  const auth = useAuth()
  const publicLeague = {
    ...league,
    players: league.publicPlayers,
    playersById: league.publicPlayersById,
    playerStats: league.playerStats.filter((player) => league.publicPlayersById.has(player.id)),
    playerStatsById: new Map(league.playerStats.filter((player) => league.publicPlayersById.has(player.id)).map((player) => [player.id, player])),
    mvpRanking: league.mvpRanking.filter((player) => league.publicPlayersById.has(player.id)),
  }

  useEffect(() => {
    if (!auth.loading) league.reload()
  }, [auth.loading, auth.user?.id])

  if (auth.loading) {
    return <div className="grid min-h-screen place-items-center bg-ink px-4 text-center text-white">Cargando sesión...</div>
  }

  return (
    <Routes>
      <Route element={<Layout league={publicLeague} />}>
        <Route path="/" element={<Home league={publicLeague} />} />
        <Route path="/divisiones" element={<DivisionsPage league={publicLeague} />} />
        <Route path="/tabla" element={<StandingsPage league={publicLeague} />} />
        <Route path="/calendario" element={<MatchesPage league={publicLeague} />} />
        <Route path="/partidos" element={<MatchesPage league={publicLeague} />} />
        <Route path="/partidos/:id" element={<MatchDetailPage league={publicLeague} />} />
        <Route path="/playoffs" element={<PlayoffsPage league={publicLeague} />} />
        <Route path="/nova-champions" element={<NovaChampionsPage league={publicLeague} />} />
        <Route path="/equipos" element={<TeamsPage league={publicLeague} />} />
        <Route path="/equipos/:id" element={<TeamProfilePage league={publicLeague} />} />
        <Route path="/jugadores" element={<PlayersPage league={publicLeague} />} />
        <Route path="/jugadores/:id" element={<PlayerProfilePage league={publicLeague} />} />
        <Route path="/goleadores" element={<ScorersPage league={publicLeague} />} />
        <Route path="/estadisticas" element={<StatsPage league={publicLeague} />} />
        <Route path="/historial" element={<HistoryPage league={publicLeague} />} />
        <Route path="/noticias" element={<NewsPage league={publicLeague} />} />
        <Route path="/registro" element={<PlayerRegisterPage league={league} />} />
        <Route path="/login" element={<PlayerLoginPage />} />
        <Route path="/perfil" element={<MyPlayerProfilePage league={league} />} />
        <Route path="/nova-id" element={<NovaIdPage league={league} />} />
        <Route path="/nova-id/:novaId" element={<NovaIdPublicProfilePage league={publicLeague} />} />
        <Route path="/mi-perfil" element={<Navigate to="/perfil" replace />} />
      </Route>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard league={league} />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
