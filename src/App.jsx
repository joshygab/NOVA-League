import { Navigate, Route, Routes } from 'react-router-dom'
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
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'

export default function App() {
  const league = useLeagueData()

  return (
    <Routes>
      <Route element={<Layout league={league} />}>
        <Route path="/" element={<Home league={league} />} />
        <Route path="/divisiones" element={<DivisionsPage league={league} />} />
        <Route path="/tabla" element={<StandingsPage league={league} />} />
        <Route path="/partidos" element={<MatchesPage league={league} />} />
        <Route path="/partidos/:id" element={<MatchDetailPage league={league} />} />
        <Route path="/playoffs" element={<PlayoffsPage league={league} />} />
        <Route path="/equipos" element={<TeamsPage league={league} />} />
        <Route path="/equipos/:id" element={<TeamProfilePage league={league} />} />
        <Route path="/jugadores" element={<PlayersPage league={league} />} />
        <Route path="/jugadores/:id" element={<PlayerProfilePage league={league} />} />
        <Route path="/goleadores" element={<ScorersPage league={league} />} />
        <Route path="/estadisticas" element={<StatsPage league={league} />} />
        <Route path="/historial" element={<HistoryPage league={league} />} />
        <Route path="/noticias" element={<NewsPage league={league} />} />
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
