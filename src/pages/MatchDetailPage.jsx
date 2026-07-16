import { Navigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { CalendarDays, FileText, MapPin, ShieldCheck, Star, Users } from 'lucide-react'
import Badge from '../components/Badge'
import Crest from '../components/Crest'
import NovaRatingCard from '../components/NovaRatingCard'
import PageTitle from '../components/PageTitle'
import PlayerAvatar from '../components/PlayerAvatar'
import StatCard from '../components/StatCard'
import { goalTypeLabel } from '../lib/labels'
import { calculateNovaRating } from '../lib/playerProgression'
import { hasSupabaseConfig, supabase } from '../lib/supabase'

export default function MatchDetailPage({ league }) {
  const [now, setNow] = useState(Date.now())
  const { id, matchId } = useParams()
  const targetId = matchId || id
  const match = league.matches.find((item) => item.id === targetId) || league.novaChampions?.matches?.find((item) => item.id === targetId)
  const routeLive = match?.status === 'in_progress' || match?.status === 'live'
  const realtime = useMatchRealtime(targetId)

  useEffect(() => {
    if (!routeLive) return undefined
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [routeLive])

  if (!match) return <Navigate to="/partidos" replace />
  const displayMatch = realtime.matchPatch ? { ...match, ...realtime.matchPatch } : match
  const isChampions = !league.matches.some((item) => item.id === targetId)

  const home = league.teamsById.get(displayMatch.home_team_id)
  const away = league.teamsById.get(displayMatch.away_team_id)
  const division = league.divisionsById.get(displayMatch.division_id || home?.division_id)
  const played = isFinishedMatch(displayMatch.status)
  const live = displayMatch.status === 'in_progress' || displayMatch.status === 'live'
  const liveSeconds = live ? calculateLiveSeconds(displayMatch, now) : 0
  const liveScore = {
    home: Number(displayMatch.home_score_live ?? displayMatch.home_score ?? 0),
    away: Number(displayMatch.away_score_live ?? displayMatch.away_score ?? 0),
  }
  const standings = league.divisionTables.find((item) => item.id === division?.id)?.standings || []
  const homeStanding = standings.find((team) => team.id === home?.id)
  const awayStanding = standings.find((team) => team.id === away?.id)
  const cupStats = league.novaChampions?.stats?.filter((row) => row.match_id === displayMatch.id) || []
  const matchGoals = isChampions ? cupStats.filter((row) => row.stat_type === 'goal') : league.goals.filter((goal) => goal.match_id === displayMatch.id)
  const cards = isChampions ? cupStats.filter((row) => row.stat_type?.includes('card')).map((row) => ({ ...row, type: row.stat_type === 'yellow_card' ? 'yellow' : 'red' })) : league.cards.filter((card) => card.match_id === displayMatch.id)
  const realtimeEvents = mergeEvents(league.events.filter((event) => event.match_id === displayMatch.id), realtime.events)
  const events = realtimeEvents.filter((event) => !event.is_voided)
  const eventGoals = events.filter((event) => (event.event_type || event.type) === 'goal')
  const eventCards = events
    .filter((event) => ['yellow_card', 'second_yellow', 'red_card', 'staff_card'].includes(event.event_type || event.type))
    .map((event) => ({ ...event, type: ['yellow_card', 'staff_card'].includes(event.event_type || event.type) ? 'yellow' : 'red' }))
  const report = league.reports.find((item) => item.match_id === displayMatch.id)
  const lineups = league.lineups.filter((lineup) => lineup.match_id === displayMatch.id)
  const homeLineup = lineups.filter((lineup) => lineup.team_id === home?.id)
  const awayLineup = lineups.filter((lineup) => lineup.team_id === away?.id)
  const timeline = buildTimeline({ goals: mergeEvents(matchGoals, eventGoals), cards: mergeEvents(cards, eventCards), events, league })
  const mvp = league.playersById.get(displayMatch.mvp_player_id)
  const featured = [...league.playerStats]
    .filter((player) => [home?.id, away?.id].includes(player.team_id))
    .sort((a, b) => (b.goals + b.assists + b.mvpAwards) - (a.goals + a.assists + a.mvpAwards))
    .slice(0, 3)

  return (
    <>
      <PageTitle kicker={isChampions ? 'Match Center · NOVA Champions Cup' : 'Match Center'} title={`${home?.name || 'Local'} vs ${away?.name || 'Visitante'}`} />
      <div className="space-y-6">
        <section className="overflow-hidden rounded-lg border border-gold/30 bg-black p-5 shadow-gold">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
            <Badge tone={live ? 'red' : played ? 'gold' : 'blue'}>{matchStatusLabel(displayMatch.status)}</Badge>
            <span className="inline-flex items-center gap-2"><CalendarDays size={16} />{formatMatchDate(displayMatch.match_date)}</span>
            <span className="inline-flex items-center gap-2"><MapPin size={16} />{displayMatch.venue || 'Cancha por definir'}</span>
          </div>
          <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <TeamHero team={home} standing={homeStanding} align="right" />
            <div className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-center">
              {live ? <p className="text-4xl font-black text-white">{liveScore.home} - {liveScore.away}</p> : played ? <p className="text-4xl font-black text-white">{displayMatch.home_score} - {displayMatch.away_score}</p> : <p className="text-xl font-black text-gold">VS</p>}
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gold">Jornada {displayMatch.round}</p>
              {live && <p className="mt-2 rounded bg-red-500/15 px-2 py-1 text-xs font-black text-red-100">Marcador provisional · {displayMatch.current_period || 'En vivo'} · {formatClock(liveSeconds)}</p>}
            </div>
            <TeamHero team={away} standing={awayStanding} />
          </div>
          <p className="mt-5 text-center text-sm text-slate-400">{isChampions ? 'NOVA Champions Cup' : division?.name}</p>
        </section>

        {!played && (
          <section className="grid gap-4 lg:grid-cols-3">
            {live && <LivePublicPanel match={displayMatch} seconds={liveSeconds} />}
            <FormCard title="Últimos resultados local" team={home} matches={recentMatches(league.matches, home?.id)} league={league} />
            <FormCard title="Últimos resultados visitante" team={away} matches={recentMatches(league.matches, away?.id)} league={league} />
            <section className="panel p-5">
              <h2 className="text-xl font-black">Jugadores destacados</h2>
              <div className="mt-4 space-y-3">{featured.map((player) => <PlayerLine key={player.id} player={player} />)}</div>
            </section>
          </section>
        )}

        {live && (
          <section className="panel p-5">
            <h2 className="mb-4 text-xl font-black">Timeline en vivo</h2>
            <div className="space-y-2">
              {timeline.length ? timeline.map((item) => (
                <p key={item.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <span className="font-black text-gold">{item.minute}'</span> {item.icon} {item.text}
                </p>
              )) : <p className="text-sm text-slate-400">Aún no hay eventos en vivo.</p>}
            </div>
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
                  <ShieldCheck size={16} className="mr-1 inline" /> {displayMatch.status === 'official' ? 'Resultado oficial publicado' : 'Acta disponible para revisión'}
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

function useMatchRealtime(matchId) {
  const [matchPatch, setMatchPatch] = useState(null)
  const [events, setEvents] = useState([])

  useEffect(() => {
    if (!hasSupabaseConfig || !matchId) return undefined
    const channel = supabase
      .channel(`match-center-${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, (payload) => {
        if (payload.new) setMatchPatch(payload.new)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_events', filter: `match_id=eq.${matchId}` }, (payload) => {
        const row = payload.new || payload.old
        if (!row) return
        setEvents((current) => {
          const next = current.filter((item) => item.id !== row.id)
          if (payload.eventType === 'DELETE') return next
          return [...next, row]
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId])

  return { matchPatch, events }
}

function mergeEvents(base, realtime) {
  const rows = new Map()
  base.forEach((event) => rows.set(event.id, event))
  realtime.forEach((event) => rows.set(event.id, event))
  return [...rows.values()]
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

function LivePublicPanel({ match, seconds }) {
  const updated = match.last_live_update_at ? secondsAgo(match.last_live_update_at) : null
  const stale = match.last_live_update_at && Date.now() - new Date(match.last_live_update_at).getTime() > 90000
  return (
    <section className="panel p-5 lg:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-200">EN VIVO</p>
          <h2 className="mt-1 text-3xl font-black text-gold">{formatClock(seconds)}</h2>
        </div>
        <Badge tone={stale ? 'gold' : 'red'}>{stale ? 'Transmisión interrumpida' : 'Marcador provisional'}</Badge>
      </div>
      <p className="mt-3 text-sm text-slate-400">
        Periodo: {match.current_period || 'En vivo'} · {updated ? `Última actualización hace ${updated}` : 'Esperando primera actualización'}
      </p>
    </section>
  )
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
      .filter((event) => !['goal', 'yellow_card', 'second_yellow', 'red_card', 'staff_card'].includes(event.event_type || event.type))
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

function calculateLiveSeconds(match, now) {
  const accumulated = Number(match.live_accumulated_seconds || 0)
  if (!match.live_started_at || match.live_paused_at || !['in_progress', 'live'].includes(match.status)) return accumulated
  return accumulated + Math.max(0, Math.floor((now - new Date(match.live_started_at).getTime()) / 1000))
}

function formatClock(seconds) {
  const mins = Math.floor(Math.max(0, seconds) / 60)
  const secs = Math.max(0, seconds) % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function secondsAgo(value) {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (diff < 60) return `${diff}s`
  return `${Math.floor(diff / 60)} min`
}
