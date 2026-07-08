import { useMemo, useState } from 'react'
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

      {tab === 'inicio' && <ChampionsHome champion={champion} qualified={qualified} league={league} stats={cupStats} />}
      {tab === 'bracket' && <NovaChampionsBracket matches={cup.matches || []} teamsById={league.teamsById} />}
      {tab === 'partidos' && <ChampionsMatches matches={cup.matches || []} league={league} />}
      {tab === 'estadisticas' && <ChampionsStats stats={cupStats} />}
      {tab === 'historia' && <ChampionsHistory history={cup.history || []} league={league} />}
    </div>
  )
}

function ChampionsHome({ champion, qualified, league, stats }) {
  return (
    <section className="space-y-6">
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
    </section>
  )
}

function HeroStat({ icon: Icon, label, value }) {
  return <article className="rounded-lg border border-gold/20 bg-black/80 p-5"><Icon className="text-gold" /><p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-gold">{label}</p><h3 className="mt-2 text-2xl font-black">{value}</h3></article>
}

function ChampionsMatches({ matches, league }) {
  return <section className="grid gap-3">{matches.map((match) => <article key={match.id} className="rounded-lg border border-gold/20 bg-black/80 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-gold">{match.round}</p><h3 className="mt-2 text-xl font-black">{league.teamsById.get(match.home_team_id)?.name || 'Por definir'} vs {league.teamsById.get(match.away_team_id)?.name || 'Por definir'}</h3><p className="text-sm text-slate-400">{match.match_date ? new Date(match.match_date).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Fecha por definir'} · {match.venue || 'Cancha por definir'}</p></article>)}</section>
}

function ChampionsStats({ stats }) {
  return <section className="grid gap-4 md:grid-cols-2"><StatList title="Máximos goleadores" rows={stats.goals} /><StatList title="Asistencias" rows={stats.assists} /><StatList title="MVP" rows={stats.mvps} /><StatList title="Tarjetas" rows={stats.cards} /></section>
}

function StatList({ title, rows }) {
  return <article className="rounded-lg border border-gold/20 bg-black/80 p-5"><h2 className="text-xl font-black">{title}</h2><div className="mt-4 space-y-2">{rows.length ? rows.map((row) => <p key={`${title}-${row.id}`} className="flex justify-between rounded-lg bg-white/5 px-3 py-2"><span>{row.name}</span><b className="text-gold">{row.value}</b></p>) : <p className="text-sm text-slate-400">Sin registros.</p>}</div></article>
}

function ChampionsHistory({ history, league }) {
  return <section className="space-y-3">{history.length ? history.map((item) => <article key={item.id} className="rounded-lg border border-gold/20 bg-black/80 p-5"><p className="text-gold">{item.season_id}</p><h3 className="text-2xl font-black">🏆 {league.teamsById.get(item.champion_team_id)?.name || 'Campeón'}</h3><p className="text-sm text-slate-400">Final: {item.final_score || 'Por registrar'}</p></article>) : <p className="rounded-lg border border-white/10 bg-black/70 p-5 text-slate-400">El museo de campeones se llenará al publicar la primera final.</p>}</section>
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
