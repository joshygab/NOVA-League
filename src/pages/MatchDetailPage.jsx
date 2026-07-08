import { Navigate, useParams } from 'react-router-dom'
import Badge from '../components/Badge'
import Crest from '../components/Crest'
import MatchCard from '../components/MatchCard'
import PageTitle from '../components/PageTitle'
import { goalTypeLabel } from '../lib/labels'

export default function MatchDetailPage({ league }) {
  const { id } = useParams()
  const match = league.matches.find((item) => item.id === id)
  if (!match) return <Navigate to="/partidos" replace />

  const homeGoals = league.goals.filter((goal) => goal.match_id === match.id && goal.team_id === match.home_team_id)
  const awayGoals = league.goals.filter((goal) => goal.match_id === match.id && goal.team_id === match.away_team_id)
  const cards = league.cards.filter((card) => card.match_id === match.id)
  const mvp = league.playersById.get(match.mvp_player_id)

  return (
    <>
      <PageTitle kicker={`Jornada ${match.round}`} title="Detalle del partido" />
      <div className="space-y-6">
        <MatchCard match={match} teamsById={league.teamsById} playersById={league.playersById} />
        <section className="grid gap-6 lg:grid-cols-2">
          <GoalList title={league.teamsById.get(match.home_team_id)?.name || 'Local'} goals={homeGoals} league={league} />
          <GoalList title={league.teamsById.get(match.away_team_id)?.name || 'Visitante'} goals={awayGoals} league={league} />
        </section>
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="panel p-5">
            <h2 className="mb-4 text-xl font-black">⭐ MVP del partido</h2>
            <p className="text-slate-300">{mvp?.name || 'Sin MVP asignado'}</p>
          </div>
          <div className="panel p-5">
            <h2 className="mb-4 text-xl font-black">Tarjetas</h2>
            <div className="space-y-2">{cards.map((card) => {
              const player = league.playersById.get(card.player_id)
              const team = league.teamsById.get(card.team_id)
              return <div key={card.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"><span>{card.minute}' {player?.name} · {team?.name}</span><Badge tone={card.type === 'red' ? 'red' : 'yellow'}>{card.type}</Badge></div>
            })}</div>
          </div>
        </section>
      </div>
    </>
  )
}

function GoalList({ title, goals, league }) {
  return (
    <div className="panel p-5">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><Crest src={league.teams.find((team) => team.name === title)?.crest_url} name={title} size="sm" /> {title}</h2>
      <div className="space-y-2">
        {goals.length === 0 && <p className="text-sm text-slate-400">Sin goles registrados.</p>}
        {goals.map((goal) => {
          const scorer = league.playersById.get(goal.player_id)
          const assistant = league.playersById.get(goal.assist_player_id)
          return <div key={goal.id} className="rounded-lg bg-white/5 px-3 py-3 text-sm"><span className="font-black text-gold">⚽ {goal.minute}'</span> {scorer?.name || 'Jugador'} <span className="text-slate-500">({goalTypeLabel(goal.goal_type)})</span>{assistant && <p className="mt-1 text-xs text-slate-400">Asistencia: {assistant.name}</p>}</div>
        })}
      </div>
    </div>
  )
}
