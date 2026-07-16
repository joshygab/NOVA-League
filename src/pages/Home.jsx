import { motion } from 'framer-motion'
import { ArrowRight, Radio, ShieldCheck, Sparkles, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import ChampionSpotlight from '../components/ChampionSpotlight'
import MatchCard from '../components/MatchCard'
import StatCard from '../components/StatCard'
import StandingsTable from '../components/StandingsTable'

export default function Home({ league }) {
  const liveMatch = league.matches.find((match) => match.status === 'in_progress' || match.status === 'live')
  const nextMatches = league.matches
    .filter((match) => !['played', 'official'].includes(match.status))
    .sort((a, b) => new Date(a.match_date || 0) - new Date(b.match_date || 0))
    .slice(0, 2)
  const recentResults = league.matches
    .filter((match) => ['played', 'official'].includes(match.status))
    .sort((a, b) => new Date(b.match_date || 0) - new Date(a.match_date || 0))
    .slice(0, 3)
  const teamOfWeek = (league.teamOfWeek || []).slice(0, 4)
  const settings = league.settings || {}
  const championSpotlight = league.championSpotlight
  const championTeam = championSpotlight?.champion_team_id ? league.teamsById.get(championSpotlight.champion_team_id) : null
  const championMode = Boolean(championSpotlight?.is_active && championTeam)

  return (
    <div className="space-y-8">
      <section className="grid min-h-[auto] items-center gap-6 overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(11,140,255,.28),rgba(5,7,12,.9)),url('https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center p-5 shadow-glow sm:min-h-[520px] md:grid-cols-[1.1fr_.9fr] md:p-10">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="mb-4 inline-flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-black uppercase tracking-[0.24em] text-gold">
            <Radio size={14} /> En vivo con Realtime
          </p>
          {settings.logo_url && <img src={settings.logo_url} alt={settings.name} className="mb-5 h-20 w-20 rounded-lg object-cover ring-1 ring-white/20" />}
          <h1 className="max-w-3xl text-4xl font-black tracking-normal text-white sm:text-5xl md:text-7xl">{settings.name || 'Liga Pro Futbol'}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg sm:leading-8">
            {settings.description || 'Resultados, tabla, estadísticas, noticias y administración profesional para una liga moderna.'}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/tabla" className="button">Ver tabla <ArrowRight size={18} /></Link>
            <Link to="/partidos" className="button-secondary">Calendario</Link>
            <Link to="/registro" className="button-secondary">Registrarse</Link>
            <Link to="/login" className="button-secondary">Iniciar sesión</Link>
          </div>
        </motion.div>
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
          <StatCard label="Equipos" value={league.teams.length} />
          <StatCard label="Partidos" value={league.matches.length} tone="gold" />
          <StatCard label="Jugadores" value={league.players.length} />
        </div>
      </section>

      {championMode ? (
        <section className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <ChampionSpotlight spotlight={championSpotlight} team={championTeam} />
          <div>
            <Link to="/tabla" className="button mb-4 w-full">Ver tabla general</Link>
            <div className="mb-4 flex items-center gap-2 text-lg font-black text-white"><Sparkles className="text-gold" /> Próximos partidos</div>
            <div className="space-y-4">
              {nextMatches.map((match) => <MatchCard key={match.id} match={match} teamsById={league.teamsById} playersById={league.playersById} />)}
            </div>
          </div>
        </section>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <div>
            {liveMatch && (
              <section className="mb-6 rounded-lg border border-red-400/40 bg-red-500/10 p-4">
                <p className="mb-3 inline-flex rounded-lg bg-red-500 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">EN VIVO</p>
                <Link to={`/match/${liveMatch.id}`} className="block"><MatchCard match={liveMatch} teamsById={league.teamsById} playersById={league.playersById} /></Link>
              </section>
            )}
            <div className="mb-4 flex items-center gap-2 text-lg font-black text-white"><ShieldCheck className="text-electric" /> Clasificación por división</div>
            <div className="space-y-5">
              {league.divisionTables.map((division) => (
                <section key={division.id}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-xl font-black">{division.name}</h2>
                    <Link to={`/tabla?division=${division.slug || division.id}`} className="button-secondary min-h-9 px-3 py-1 text-xs">Ver completa</Link>
                  </div>
                  <StandingsTable standings={division.standings.slice(0, 5)} compact championsTeamIds={league.novaChampionsTeamIds} />
                </section>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-4 flex items-center gap-2 text-lg font-black text-white"><Sparkles className="text-gold" /> Próximos partidos</div>
            <div className="space-y-4">
              {nextMatches.map((match) => <Link key={match.id} to={`/match/${match.id}`} className="block"><MatchCard match={match} teamsById={league.teamsById} playersById={league.playersById} /></Link>)}
              {nextMatches.length === 0 && <p className="panel p-4 text-sm text-slate-400">No hay próximos partidos programados.</p>}
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <div className="panel p-5">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><Radio className="text-electric" /> Resultados recientes</h2>
          <div className="space-y-3">
            {recentResults.map((match) => <Link key={match.id} to={`/match/${match.id}`} className="block"><MatchCard match={match} teamsById={league.teamsById} playersById={league.playersById} /></Link>)}
            {recentResults.length === 0 && <p className="text-sm text-slate-400">Todavía no hay resultados recientes.</p>}
          </div>
        </div>
        <div className="rounded-lg border border-gold/30 bg-black p-5 shadow-gold">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><Trophy className="text-gold" /> Equipo de la Jornada</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {teamOfWeek.map((row) => {
              const player = league.playersById.get(row.player_id)
              const team = league.teamsById.get(row.team_id)
              return (
                <Link key={row.id} to={player ? `/jugadores/${player.id}` : '/jugadores'} className="rounded-lg border border-white/10 bg-white/5 p-3 transition hover:border-gold/50">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-gold">J{row.round} · {row.slot}</p>
                  <p className="mt-2 font-black">{player?.name || 'Jugador'}</p>
                  <p className="text-sm text-slate-400">{team?.name || 'Equipo'}</p>
                </Link>
              )
            })}
            {teamOfWeek.length === 0 && <p className="text-sm text-slate-400">Aún no hay selección publicada.</p>}
          </div>
        </div>
      </section>
    </div>
  )
}
