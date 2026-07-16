import { Navigate, useParams } from 'react-router-dom'
import { CalendarDays, FileText, MapPin, ShieldCheck, Star, Users } from 'lucide-react'
import Badge from '../components/Badge'
import Crest from '../components/Crest'
import NovaRatingCard from '../components/NovaRatingCard'
import PageTitle from '../components/PageTitle'
import PlayerAvatar from '../components/PlayerAvatar'
import StatCard from '../components/StatCard'
import { goalTypeLabel } from '../lib/labels'
import { calculateNovaRating } from '../lib/playerProgression'

export default function MatchDetailPage({ league }) {
  const { id, matchId } = useParams()
  const targetId = matchId || id
  const match = league.matches.find((item) => item.id === targetId)
  if (!match) return <Navigate to="/partidos" replace />

  const home = league.teamsById.get(match.home_team_id)
  const away = league.teamsById.get(match.away_team_id)
  const division = league.divisionsById.get(match.division_id || home?.division_id)
  const played = isFinishedMatch(match.status)
  const live = match.status === 'in_progress' || match.status === 'live'
  const standings = league.divisionTables.find((item) => item.id === division?.id)?.standings || []
  const homeStanding = standings.find((team) => team.id === home?.id)
  const awayStanding = standings.find((team) => team.id === away?.id)
  const matchGoals = league.goals.filter((goal) => goal.match_id === match.id)
  const cards = league.cards.filter((card) => card.match_id === match.id)
  const events = league.events.filter((event) => event.match_id === match.id)
  const report = league.reports.find((item) => item.match_id === match.id)
  const lineups = league.lineups.filter((lineup) => lineup.match_id === match.id)
  const homeLineup = lineups.filter((lineup) => lineup.team_id === home?.id)
  const awayLineup = lineups.filter((lineup) => lineup.team_id === away?.id)
  const timeline = buildTimeline({ goals: matchGoals, cards, events, league })
  const mvp = league.playersById.get(match.mvp_player_id)
  const featured = [...league.playerStats]
    .filter((player) => [home?.id, away?.id].includes(player.team_id))
    .sort((a, b) => (b.goals + b.assists + b.mvpAwards) - (a.goals + a.assists + a.mvpAwards))
    .slice(0, 3)

  return (
    <>
      <PageTitle kicker="Match Center" title={`${home?.name || 'Local'} vs ${away?.name || 'Visitante'}`} />
      <div className="space-y-6">
        <section className="overflow-hidden rounded-lg border border-gold/30 bg-black p-5 shadow-gold">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
            <Badge tone={live ? 'red' : played ? 'gold' : 'blue'}>{matchStatusLabel(match.status)}</Badge>
            <span className="inline-flex items-center gap-2"><CalendarDays size={16} />{formatMatchDate(match.match_date)}</span>
            <span className="inline-flex items-center gap-2"><MapPin size={16} />{match.venue || 'Cancha por definir'}</span>
          </div>
          <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <TeamHero team={home} standing={homeStanding} align="right" />
            <div className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-center">
              {played ? <p className="text-4xl font-black text-white">{match.home_score} - {match.away_score}</p> : <p className="text-xl font-black text-gold">VS</p>}
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gold">Jornada {match.round}</p>
            </div>
            <TeamHero team={away} standing={awayStanding} />
          </div>
          <p className="mt-5 text-center text-sm text-slate-400">{division?.name}</p>
        </section>

        {!played && (
          <section className="grid gap-4 lg:grid-cols-3">
            <FormCard title="Últimos resultados local" team={home} matches={recentMatches(league.matches, home?.id)} league={league} />
            <FormCard title="Últimos resultados visitante" team={away} matches={recentMatches(league.matches, away?.id)} league={league} />
            <section className="panel p-5">
              <h2 className="text-xl font-black">Jugadores destacados</h2>
              <div className="mt-4 space-y-3">{featured.map((player) => <PlayerLine key={player.id} player={player} />)}</div>
            </section>
          </section>
        )}

        {played && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Goles" value={matchGoals.length} tone="gold" />
              <StatCard label="Asistencias" value={matchGoals.filter((goal) => goal.assist_player_id).length} />
              <StatCard label="Amarillas" value={cards.filter((card) => card.type === 'yellow').length} />
              <StatCard label="Rojas" value={cards.filter((card) => card.type !== 'yellow').length} />
            </section>
            <section className="grid gap-6 lg:grid-cols-2">
              <EventPanel title="Goles" rows={matchGoals.map((goal) => `${goal.minute}' ${league.playersById.get(goal.player_id)?.name || 'Jugador'} · ${goalTypeLabel(goal.goal_type)}`)} />
              <EventPanel title="Tarjetas" rows={cards.map((card) => `${card.minute}' ${league.playersById.get(card.player_id)?.name || 'Jugador'} · ${card.type}`)} />
            </section>
            <section className="panel p-5">
              <h2 className="mb-4 text-xl font-black">Timeline del partido</h2>
              <div className="space-y-2">
                {timeline.length ? timeline.map((item) => (
                  <p key={item.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                    <span className="font-black text-gold">{item.minute}'</span> {item.icon} {item.text}
                  </p>
                )) : <p className="text-sm text-slate-400">Sin eventos registrados.</p>}
              </div>
            </section>
            <section className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
              <div className="panel p-5">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><Star className="text-gold" /> MVP del partido</h2>
                {mvp ? <PlayerLine player={league.playerStatsById.get(mvp.id) || mvp} /> : <p className="text-slate-400">Sin MVP asignado.</p>}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {featured.slice(0, 2).map((player) => <NovaRatingCard key={player.id} rating={calculateNovaRating(player, standings.find((team) => team.id === player.team_id))} />)}
              </div>
            </section>
          </>
        )}

        <section id="acta" className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
          <div className="panel p-5">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><Users className="text-gold" /> Alineaciones</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <LineupPanel title={home?.name || 'Local'} rows={homeLineup} league={league} />
              <LineupPanel title={away?.name || 'Visitante'} rows={awayLineup} league={league} />
            </div>
          </div>
          <div className="panel p-5">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><FileText className="text-gold" /> Acta del partido</h2>
            {report ? (
              <div className="space-y-3 text-sm text-slate-300">
                <p><span className="font-bold text-white">Árbitro:</span> {report.referee_name || 'Sin registrar'}</p>
                <p><span className="font-bold text-white">Estado:</span> {report.status === 'finalized' ? 'Finalizada' : 'Borrador'}</p>
                <p><span className="font-bold text-white">Observaciones:</span> {report.observations || 'Sin observaciones'}</p>
                <p className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-gold">
                  <ShieldCheck size={16} className="mr-1 inline" /> {match.status === 'official' ? 'Resultado oficial publicado' : 'Acta disponible para revisión'}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">El acta aparecerá cuando el árbitro o administrador la guarde.</p>
            )}
          </div>
        </section>
      </div>
    </>
  )
}

function TeamHero({ team, standing, align = 'left' }) {
  return <div className={`flex items-center gap-3 ${align === 'right' ? 'justify-end text-right' : ''}`}>{align === 'right' && <TeamText team={team} standing={standing} />}<Crest src={team?.crest_url} name={team?.name} size="lg" />{align !== 'right' && <TeamText team={team} standing={standing} />}</div>
}

function TeamText({ team, standing }) {
  return <div><h2 className="text-xl font-black sm:text-3xl">{team?.name || 'Equipo'}</h2><p className="text-sm text-gold">Posición #{standing?.position || '-'}</p></div>
}

function recentMatches(matches, teamId) {
  return matches.filter((match) => isFinishedMatch(match.status) && [match.home_team_id, match.away_team_id].includes(teamId)).slice(-3).reverse()
}

function FormCard({ title, matches, league }) {
  return <section className="panel p-5"><h2 className="text-xl font-black">{title}</h2><div className="mt-4 space-y-2">{matches.length ? matches.map((match) => <p key={match.id} className="rounded-lg bg-white/5 px-3 py-2 text-sm">{league.teamsById.get(match.home_team_id)?.name} {match.home_score} - {match.away_score} {league.teamsById.get(match.away_team_id)?.name}</p>) : <p className="text-sm text-slate-400">Sin resultados recientes.</p>}</div></section>
}

function PlayerLine({ player }) {
  return <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3"><PlayerAvatar src={player.photo_url} name={player.name} size="sm" /><div><p className="font-bold">{player.name}</p><p className="text-xs text-slate-400">G {player.goals || 0} · A {player.assists || 0} · MVP {player.mvpAwards || 0}</p></div></div>
}

function EventPanel({ title, rows }) {
  return <section className="panel p-5"><h2 className="text-xl font-black">{title}</h2><div className="mt-4 space-y-2">{rows.length ? rows.map((row, index) => <p key={`${row}-${index}`} className="rounded-lg bg-white/5 px-3 py-2 text-sm">{row}</p>) : <p className="text-sm text-slate-400">Sin registros.</p>}</div></section>
}

function LineupPanel({ title, rows, league }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="font-black">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.map((lineup) => {
          const player = league.playersById.get(lineup.player_id)
          return <p key={lineup.id} className="text-sm text-slate-300">#{player?.number || '--'} {player?.name || 'Jugador'} {lineup.captain ? '· Capitán' : ''}</p>
        }) : <p className="text-sm text-slate-400">Sin alineación registrada.</p>}
      </div>
    </div>
  )
}

function buildTimeline({ goals, cards, events, league }) {
  const rows = [
    ...goals.map((goal) => ({
      id: `goal-${goal.id}`,
      minute: Number(goal.minute || 0),
      icon: '⚽',
      text: `${league.playersById.get(goal.player_id)?.name || 'Jugador'} · ${league.teamsById.get(goal.team_id)?.name || 'Equipo'}`,
    })),
    ...cards.map((card) => ({
      id: `card-${card.id}`,
      minute: Number(card.minute || 0),
      icon: card.type === 'yellow' ? '🟨' : '🟥',
      text: `${league.playersById.get(card.player_id)?.name || 'Jugador'} · ${league.teamsById.get(card.team_id)?.name || 'Equipo'}`,
    })),
    ...events
      .filter((event) => !['goal', 'yellow_card', 'red_card'].includes(event.event_type || event.type))
      .map((event) => ({
        id: `event-${event.id}`,
        minute: Number(event.minute || 0),
        icon: eventIcon(event.event_type || event.type),
        text: `${league.playersById.get(event.player_id)?.name || event.detail || 'Evento'} · ${league.teamsById.get(event.team_id)?.name || 'Equipo'}`,
      })),
  ]
  return rows.sort((a, b) => a.minute - b.minute)
}

function eventIcon(type) {
  if (type === 'assist') return '🎯'
  if (type === 'substitution') return '🔁'
  if (type === 'injury') return '🚑'
  if (type === 'mvp') return '⭐'
  return '📝'
}

function isFinishedMatch(status) {
  return ['played', 'official', 'finalized'].includes(status)
}

function matchStatusLabel(status) {
  if (status === 'official') return 'Resultado oficial'
  if (status === 'played' || status === 'finalized') return 'Finalizado'
  if (status === 'in_progress' || status === 'live') return 'EN VIVO'
  if (status === 'problem') return 'En revisión'
  return 'Próximo'
}

function formatMatchDate(value) {
  if (!value) return 'Fecha por definir'
  return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}
