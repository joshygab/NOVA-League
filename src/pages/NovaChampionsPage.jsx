import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Star, Target, Trophy } from 'lucide-react'
import Badge from '../components/Badge'
import Crest from '../components/Crest'
import NovaChampionsBracket from '../components/NovaChampionsBracket'
import PageTitle from '../components/PageTitle'
import PremiumComingSoon from '../components/PremiumComingSoon'

export default function NovaChampionsPage({ league }) {
  const [tab, setTab] = useState('inicio')
  const cup = league.novaChampions || {}
  const settings = cup.settings || {}
  const active = settings.is_active || settings.status === 'active'
  const qualified = (cup.qualifiedTeams || []).map((row) => league.teamsById.get(row.team_id)).filter(Boolean)
  const final = (cup.matches || []).find((match) => match.round === 'final')
  const champion = final?.winner_team_id ? league.teamsById.get(final.winner_team_id) : null
  const cupStats = useMemo(() => buildCupStats(cup.stats || [], league), [cup.stats, league])
  const records = useMemo(() => buildCupRecords(cup, league, cupStats), [cup, league, cupStats])

  if (!active) return (
    <PremiumComingSoon
      title="NOVA Champions Cup"
      subtitle="La copa más importante de NOVA League está por comenzar"
      body="Los mejores equipos de cada división competirán por la gloria."
      features={['Clasificados elite', 'Bracket premium', 'Campeón histórico']}
    />
  )

  return (
    <div className="space-y-8">
      <PageTitle kicker="Torneo internacional" title="NOVA Champions Cup" />
      <section className="rounded-lg border border-gold/30 bg-black p-6 shadow-gold">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge tone="gold">Activa</Badge>
            <h1 className="mt-3 text-4xl font-black uppercase tracking-normal">NOVA Champions Cup</h1>
            <p className="mt-2 text-slate-300">El campeón de campeones.</p>
          </div>
          <div className="grid h-20 w-20 place-items-center rounded-lg border border-gold/40 bg-gold/10 text-gold"><Trophy size={42} /></div>
        </div>
      </section>

      <nav className="flex gap-2 overflow-x-auto pb-2">
        {[
          ['inicio', 'Inicio'],
          ['bracket', 'Bracket'],
          ['partidos', 'Partidos'],
          ['estadisticas', 'Estadísticas'],
          ['historia', 'Historia'],
        ].map(([id, label]) => <button key={id} className={tab === id ? 'button whitespace-nowrap' : 'button-secondary whitespace-nowrap'} onClick={() => setTab(id)}>{label}</button>)}
      </nav>

      {tab === 'inicio' && <ChampionsHome champion={champion} qualified={qualified} league={league} stats={cupStats} matches={cup.matches || []} records={records} />}
      {tab === 'bracket' && <NovaChampionsBracket matches={cup.matches || []} teamsById={league.teamsById} />}
      {tab === 'partidos' && <ChampionsMatches matches={cup.matches || []} league={league} />}
      {tab === 'estadisticas' && <ChampionsStats stats={cupStats} />}
      {tab === 'historia' && <ChampionsHistory history={cup.history || []} league={league} records={records} />}
    </div>
  )
}

function ChampionsHome({ champion, qualified, league, stats, matches, records }) {
  const final = matches.find((match) => match.round === 'final')
  const pots = buildPots(qualified, league)
  return (
    <section className="space-y-6">
      {final && <ChampionsFinal match={final} league={league} />}
      <div className="grid gap-4 md:grid-cols-3">
        <HeroStat icon={Trophy} label="Campeón actual" value={champion?.name || 'Por definir'} />
        <HeroStat icon={Star} label="Jugador del torneo" value={stats.mvps[0]?.name || 'Por definir'} />
        <HeroStat icon={Target} label="Goleador" value={stats.goals[0]?.name || 'Por definir'} />
      </div>
      <section>
        <h2 className="mb-4 text-2xl font-black">Equipos participantes</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {qualified.map((team) => (
            <article key={team.id} className="rounded-lg border border-gold/20 bg-black/80 p-4">
              <Crest src={team.crest_url} name={team.name} size="lg" />
              <h3 className="mt-3 text-lg font-black">{team.name}</h3>
              <p className="text-sm text-slate-400">{league.divisionsById.get(team.division_id)?.name}</p>
            </article>
          ))}
          {qualified.length === 0 && <p className="text-sm text-slate-400">Aún no hay equipos clasificados.</p>}
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <PotsView pots={pots} league={league} />
        <GroupPreview teams={qualified} league={league} />
      </section>
      <ChampionsRecords records={records} />
    </section>
  )
}

function HeroStat({ icon: Icon, label, value }) {
  return <article className="rounded-lg border border-gold/20 bg-black/80 p-5"><Icon className="text-gold" /><p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-gold">{label}</p><h3 className="mt-2 text-2xl font-black">{value}</h3></article>
}

function ChampionsMatches({ matches, league }) {
  return <section className="grid gap-3">{matches.map((match) => <article key={match.id} className="rounded-lg border border-gold/20 bg-black/80 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-gold">{match.round}</p><h3 className="mt-2 text-xl font-black">{league.teamsById.get(match.home_team_id)?.name || 'Por definir'} vs {league.teamsById.get(match.away_team_id)?.name || 'Por definir'}</h3><p className="text-sm text-slate-400">{match.match_date ? new Date(match.match_date).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Fecha por definir'} · {match.venue || 'Cancha por definir'}</p><Link className="button-secondary mt-3" to={`/match/${match.id}`}>Abrir Match Center</Link></article>)}</section>
}

function ChampionsStats({ stats }) {
  return <section className="grid gap-4 md:grid-cols-2"><StatList title="Máximos goleadores" rows={stats.goals} /><StatList title="Asistencias" rows={stats.assists} /><StatList title="MVP" rows={stats.mvps} /><StatList title="Tarjetas" rows={stats.cards} /></section>
}

function StatList({ title, rows }) {
  return <article className="rounded-lg border border-gold/20 bg-black/80 p-5"><h2 className="text-xl font-black">{title}</h2><div className="mt-4 space-y-2">{rows.length ? rows.map((row) => <p key={`${title}-${row.id}`} className="flex justify-between rounded-lg bg-white/5 px-3 py-2"><span>{row.name}</span><b className="text-gold">{row.value}</b></p>) : <p className="text-sm text-slate-400">Sin registros.</p>}</div></article>
}

function ChampionsHistory({ history, league, records }) {
  return <section className="space-y-6"><div className="space-y-3">{history.length ? history.map((item) => <article key={item.id} className="rounded-lg border border-gold/20 bg-black/80 p-5"><p className="text-gold">{item.season_id}</p><h3 className="text-2xl font-black">🏆 {league.teamsById.get(item.champion_team_id)?.name || 'Campeón'}</h3><p className="text-sm text-slate-400">Final: {item.final_score || 'Por registrar'}</p></article>) : <p className="rounded-lg border border-white/10 bg-black/70 p-5 text-slate-400">El museo de campeones se llenará al publicar la primera final.</p>}</div><ChampionsRecords records={records} /></section>
}

function buildCupStats(stats, league) {
  const groups = { goals: {}, assists: {}, mvps: {}, cards: {} }
  stats.forEach((row) => {
    const bucket = row.stat_type === 'goal' ? 'goals' : row.stat_type === 'assist' ? 'assists' : row.stat_type === 'mvp' ? 'mvps' : row.stat_type?.includes('card') ? 'cards' : null
    if (!bucket || !row.player_id) return
    groups[bucket][row.player_id] = (groups[bucket][row.player_id] || 0) + Number(row.value || 1)
  })
  return Object.fromEntries(Object.entries(groups).map(([key, value]) => [key, Object.entries(value).map(([id, total]) => ({ id, name: league.playersById.get(id)?.name || 'Jugador', value: total })).sort((a, b) => b.value - a.value)]))
}

function ChampionsFinal({ match, league }) {
  const home = league.teamsById.get(match.home_team_id)
  const away = league.teamsById.get(match.away_team_id)
  const countdown = match.match_date ? daysUntil(match.match_date) : null
  return (
    <section className="rounded-lg border border-gold/40 bg-black p-6 text-center shadow-gold">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">Gran Final</p>
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <FinalTeam team={home} />
        <div>
          <Trophy className="mx-auto text-gold" size={40} />
          <p className="mt-2 text-2xl font-black">VS</p>
          {countdown != null && <p className="mt-1 text-xs text-slate-400">{countdown > 0 ? `Faltan ${countdown} días` : 'Hoy se juega la final'}</p>}
        </div>
        <FinalTeam team={away} />
      </div>
    </section>
  )
}

function FinalTeam({ team }) {
  return <div className="min-w-0"><Crest src={team?.crest_url} name={team?.name} size="lg" /><p className="mt-2 truncate text-lg font-black">{team?.name || 'Por definir'}</p></div>
}

function PotsView({ pots, league }) {
  return <section className="rounded-lg border border-gold/20 bg-black/80 p-5"><h2 className="text-xl font-black">Bombos</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{pots.map((pot) => <div key={pot.name} className="rounded-lg bg-white/5 p-3"><p className="font-black text-gold">{pot.name}</p>{pot.teams.map((team) => <p key={team.id} className="mt-2 text-sm">{team.name} · {league.divisionsById.get(team.division_id)?.name || 'División'}</p>)}</div>)}</div></section>
}

function GroupPreview({ teams, league }) {
  const groups = ['A', 'B', 'C', 'D'].map((name, index) => ({ name, teams: teams.filter((_, teamIndex) => teamIndex % 4 === index) }))
  return <section className="rounded-lg border border-gold/20 bg-black/80 p-5"><h2 className="text-xl font-black">Fase de grupos</h2><p className="mt-1 text-sm text-slate-400">Vista preparada para cuando la copa use grupos.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{groups.map((group) => <div key={group.name} className="rounded-lg bg-white/5 p-3"><p className="font-black text-gold">Grupo {group.name}</p>{group.teams.map((team) => <p key={team.id} className="mt-2 text-sm">{team.name} · {league.divisionsById.get(team.division_id)?.name || 'División'}</p>)}</div>)}</div></section>
}

function ChampionsRecords({ records }) {
  return <section className="rounded-lg border border-gold/20 bg-black/80 p-5"><h2 className="text-xl font-black">Récords Champions</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{records.map((record) => <div key={record.label} className="rounded-lg bg-white/5 p-3"><p className="text-xs font-black uppercase tracking-[0.16em] text-gold">{record.label}</p><p className="mt-2 text-lg font-black">{record.value}</p></div>)}</div></section>
}

function buildPots(teams, league) {
  const sorted = [...teams].sort((a, b) => {
    const aStanding = league.standings.find((row) => row.id === a.id)
    const bStanding = league.standings.find((row) => row.id === b.id)
    return (aStanding?.position || 999) - (bStanding?.position || 999)
  })
  return [
    { name: 'Bombo 1', teams: sorted.slice(0, Math.ceil(sorted.length / 2)) },
    { name: 'Bombo 2', teams: sorted.slice(Math.ceil(sorted.length / 2)) },
  ]
}

function buildCupRecords(cup, league, stats) {
  const matches = cup.matches || []
  const biggest = [...matches].filter((match) => match.home_score != null && match.away_score != null).sort((a, b) => Math.abs((b.home_score || 0) - (b.away_score || 0)) - Math.abs((a.home_score || 0) - (a.away_score || 0)))[0]
  const titles = {}
  ;(cup.history || []).forEach((item) => { titles[item.champion_team_id] = (titles[item.champion_team_id] || 0) + 1 })
  const topTitle = Object.entries(titles).sort((a, b) => b[1] - a[1])[0]
  return [
    { label: 'Máximo goleador histórico', value: stats.goals[0] ? `${stats.goals[0].name} · ${stats.goals[0].value}` : 'Por definir' },
    { label: 'Equipo con más títulos', value: topTitle ? `${league.teamsById.get(topTitle[0])?.name || 'Equipo'} · ${topTitle[1]}` : 'Por definir' },
    { label: 'Jugador con más MVP', value: stats.mvps[0] ? `${stats.mvps[0].name} · ${stats.mvps[0].value}` : 'Por definir' },
    { label: 'Mayor goleada', value: biggest ? `${league.teamsById.get(biggest.home_team_id)?.name || 'Local'} ${biggest.home_score}-${biggest.away_score} ${league.teamsById.get(biggest.away_team_id)?.name || 'Visitante'}` : 'Por definir' },
    { label: 'Partidos jugados', value: matches.filter((match) => ['played', 'finalized'].includes(match.status)).length },
    { label: 'Equipos clasificados', value: (cup.qualifiedTeams || []).length },
  ]
}

function daysUntil(value) {
  return Math.max(0, Math.ceil((new Date(value) - new Date()) / 86400000))
}
