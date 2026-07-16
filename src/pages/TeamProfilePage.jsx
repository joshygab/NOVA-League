import { Link, Navigate, useParams } from 'react-router-dom'
import Badge from '../components/Badge'
import Crest from '../components/Crest'
import PageTitle from '../components/PageTitle'
import PlayerAvatar from '../components/PlayerAvatar'
import StatCard from '../components/StatCard'

export default function TeamProfilePage({ league }) {
  const { id } = useParams()
  const team = league.teamsById.get(id)
  if (!team) return <Navigate to="/equipos" replace />

  const tableIndex = league.standings.findIndex((entry) => entry.id === id)
  const stats = league.standings[tableIndex] || {}
  const tablePosition = tableIndex >= 0 ? tableIndex + 1 : null
  const division = league.divisionsById.get(team.division_id)
  const players = league.playerStats.filter((player) => player.team_id === id)
  const matches = league.matches
    .filter((match) => match.home_team_id === id || match.away_team_id === id)
    .sort((a, b) => new Date(b.match_date) - new Date(a.match_date))
  const rankings = buildTeamRankings(players)
  const recentForm = buildRecentForm(matches, id)
  const suspended = players.filter((player) => player.activeSanctions.length > 0 || player.status === 'suspended')
  const injured = players.filter((player) => player.status === 'injured')
  const rosterLimit = Number(team.roster_limit || 18)

  return (
    <>
      <PageTitle kicker="Perfil de equipo" title={team.name} />
      <section className="mb-6 grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
        <div className="panel p-5">
          <Crest src={team.crest_url} name={team.name} size="lg" />
          <h2 className="mt-4 text-3xl font-black">{team.name}</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <p>División: <span className="font-bold text-white">{division?.name || 'Sin división'}</span></p>
            <p>Capitán: <span className="font-bold text-white">{team.captain || 'Por definir'}</span></p>
            <p>Categoría: <span className="font-bold text-white">{team.category || 'N/D'}</span></p>
            <p>Temporada: <span className="font-bold text-white">{team.season || 'N/D'}</span></p>
            <p>Fundación: <span className="font-bold text-white">{team.founded || 'N/D'}</span></p>
          </div>
          <div className="mt-5"><Badge tone={tableIndex >= 0 && tableIndex < 4 ? 'gold' : 'blue'}>Posición actual: {tablePosition ? `#${tablePosition}` : 'N/D'}</Badge></div>
          <div className="mt-4 flex flex-wrap gap-2">
            {recentForm.map((result, index) => <Badge key={`${result}-${index}`} tone={result === 'G' ? 'green' : result === 'E' ? 'yellow' : 'red'}>{result}</Badge>)}
            {recentForm.length === 0 && <Badge tone="slate">Sin racha</Badge>}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="PJ" value={stats.played ?? 0} />
          <StatCard label="Ganados" value={stats.won ?? 0} tone="gold" />
          <StatCard label="Empatados" value={stats.drawn ?? 0} />
          <StatCard label="Perdidos" value={stats.lost ?? 0} />
          <StatCard label="GF" value={stats.goalsFor ?? 0} />
          <StatCard label="GC" value={stats.goalsAgainst ?? 0} />
          <StatCard label="DG" value={stats.goalDifference ?? 0} />
          <StatCard label="Puntos" value={stats.points ?? 0} tone="gold" />
          <StatCard label="Plantilla" value={`${players.length}/${rosterLimit}`} />
          <StatCard label="Suspendidos" value={suspended.length} />
          <StatCard label="Lesionados" value={injured.length} />
          <StatCard label="Racha" value={recentForm.join(' ') || '-'} tone="gold" />
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <RankingCard title="Máximo goleador" player={rankings.scorer} value={(player) => `${player.goals} goles`} />
        <RankingCard title="Máximo asistidor" player={rankings.assistant} value={(player) => `${player.assists} asist.`} />
        <RankingCard title="Más MVP" player={rankings.mvp} value={(player) => `${player.mvpAwards} MVP`} />
        <RankingCard title="Más tarjetas" player={rankings.cards} value={(player) => `${player.totalCards} tarjetas`} />
      </section>

      <section className="mb-6 panel overflow-hidden">
        <h2 className="border-b border-white/10 px-4 py-4 text-xl font-black">Plantilla</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.18em] text-slate-400">
              <tr><th className="px-4 py-4">Jugador</th><th className="px-3 py-4 text-center">#</th><th className="px-4 py-4">Posición</th><th className="px-3 py-4 text-center">Edad</th><th className="px-3 py-4 text-center">PJ</th><th className="px-3 py-4 text-center">G</th><th className="px-3 py-4 text-center">A</th><th className="px-3 py-4 text-center">AM</th><th className="px-3 py-4 text-center">RO</th><th className="px-3 py-4 text-center">MVP</th><th className="px-4 py-4">Sanciones</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {players.map((player) => (
                <tr key={player.id} className="transition hover:bg-white/[0.035]">
                  <td className="px-4 py-4"><Link to={`/jugadores/${player.id}`} className="flex items-center gap-3"><PlayerAvatar src={player.photo_url} name={player.name} size="sm" /><span className="font-bold text-white">{player.name}</span></Link></td>
                  <Center>{player.number || '--'}</Center>
                  <td className="px-4 py-4 text-slate-300">{player.position || 'N/D'}</td>
                  <Center>{player.age || '--'}</Center>
                  <Center>{player.playedMatches}</Center>
                  <Center strong>{player.goals}</Center>
                  <Center>{player.assists}</Center>
                  <Center>{player.yellowCards}</Center>
                  <Center>{player.redCards}</Center>
                  <Center>{player.mvpAwards}</Center>
                  <td className="px-4 py-4">{player.activeSanctions.length ? <Badge tone="red">Activa</Badge> : <Badge tone="slate">Sin sanción</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-black">Historial de partidos</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {matches.map((match) => <TeamMatch key={match.id} match={match} teamId={id} league={league} />)}
        </div>
      </section>
    </>
  )
}

function buildTeamRankings(players) {
  const sortBy = (key) => [...players].sort((a, b) => (b[key] || 0) - (a[key] || 0))[0]
  return {
    scorer: sortBy('goals'),
    assistant: sortBy('assists'),
    mvp: sortBy('mvpAwards'),
    cards: sortBy('totalCards'),
  }
}

function buildRecentForm(matches, teamId) {
  return matches
    .filter((match) => ['played', 'official'].includes(match.status))
    .slice(0, 5)
    .map((match) => {
      const home = match.home_team_id === teamId
      const teamScore = home ? match.home_score : match.away_score
      const rivalScore = home ? match.away_score : match.home_score
      if (teamScore > rivalScore) return 'G'
      if (teamScore < rivalScore) return 'P'
      return 'E'
    })
}

function RankingCard({ title, player, value }) {
  return (
    <div className="panel p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">{title}</p>
      {player ? (
        <div className="mt-3 flex items-center gap-3">
          <PlayerAvatar src={player.photo_url} name={player.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-bold">{player.name}</p>
            <p className="text-sm text-slate-400">{value(player)}</p>
          </div>
        </div>
      ) : <p className="mt-3 text-sm text-slate-400">Sin registros</p>}
    </div>
  )
}

function TeamMatch({ match, teamId, league }) {
  const rivalId = match.home_team_id === teamId ? match.away_team_id : match.home_team_id
  const rival = league.teamsById.get(rivalId)
  const home = match.home_team_id === teamId
  const teamScore = home ? match.home_score : match.away_score
  const rivalScore = home ? match.away_score : match.home_score

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
        <span>Jornada {match.round}</span>
        <span>{new Date(match.match_date).toLocaleDateString('es-MX')}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Crest src={rival?.crest_url} name={rival?.name} size="sm" />
          <div>
            <p className="font-bold">Rival: {rival?.name || 'Equipo'}</p>
            <p className="text-xs text-slate-500">Cancha: {match.venue || 'Por definir'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-white">{teamScore ?? '-'} - {rivalScore ?? '-'}</p>
          <Badge tone={['played', 'official'].includes(match.status) ? 'gold' : 'slate'}>{match.status === 'official' ? 'oficial' : match.status}</Badge>
        </div>
      </div>
    </div>
  )
}

function Center({ children, strong = false }) {
  return <td className={`px-3 py-4 text-center ${strong ? 'font-black text-gold' : 'text-slate-200'}`}>{children}</td>
}
