import { Navigate, useParams } from 'react-router-dom'
import Badge from '../components/Badge'
import Crest from '../components/Crest'
import PageTitle from '../components/PageTitle'
import PlayerAvatar from '../components/PlayerAvatar'
import StatCard from '../components/StatCard'
import { playerNovaId, playerStatus, shortPosition } from '../lib/novaId'

export default function NovaIdPublicProfilePage({ league }) {
  const { novaId } = useParams()
  const player = league.playerStats.find((item, index) => playerNovaId(item, index) === novaId?.toUpperCase())
  if (!player) return <Navigate to="/jugadores" replace />

  const team = league.teamsById.get(player.team_id)
  const division = league.divisionsById.get(player.division_id || team?.division_id)
  const status = playerStatus(player, player)
  const achievements = [
    { label: 'Debut NOVA', ok: player.playedMatches >= 1 },
    { label: 'Goleador', ok: player.goals >= 10 },
    { label: 'Crack', ok: player.mvpAwards >= 5 },
    { label: 'Muro', ok: player.cleanSheets >= 5 },
    { label: 'Leyenda NOVA', ok: player.playedMatches >= 100 },
  ]

  return (
    <>
      <PageTitle kicker={playerNovaId(player, league.playerStats.findIndex((item) => item.id === player.id))} title="Perfil NOVA ID" />
      <section className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
        <div className="panel p-5 text-center">
          <PlayerAvatar src={player.photo_url} name={player.name} size="lg" />
          <h1 className="mt-4 text-3xl font-black">{player.name}</h1>
          <p className="text-gold">#{player.number || '--'} · {shortPosition(player.position)}</p>
          <div className="mt-4 flex justify-center"><Badge tone={status.tone}>{status.icon} {status.label}</Badge></div>
          <div className="mt-5 flex items-center justify-center gap-3 rounded-lg bg-white/5 p-3">
            <Crest src={team?.crest_url} name={team?.name} size="md" />
            <div className="text-left"><p className="font-bold">{team?.name}</p><p className="text-sm text-slate-400">{division?.name}</p></div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Goles" value={player.goals} tone="gold" />
            <StatCard label="Asistencias" value={player.assists} />
            <StatCard label="Partidos" value={player.playedMatches} />
            <StatCard label="MVP" value={player.mvpAwards} tone="gold" />
            <StatCard label="Amarillas" value={player.yellowCards} />
            <StatCard label="Rojas" value={player.redCards} />
          </div>
          <section className="panel p-5">
            <h2 className="text-xl font-black">Logros</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {achievements.map((badge) => <div key={badge.label} className={`rounded-lg border p-3 ${badge.ok ? 'border-gold/40 bg-gold/10 text-gold' : 'border-white/10 bg-white/5 text-slate-500'}`}>{badge.ok ? '🏅' : '○'} {badge.label}</div>)}
            </div>
          </section>
          <section className="panel p-5">
            <h2 className="text-xl font-black">Historial</h2>
            <p className="mt-3 text-sm text-slate-300">Temporadas jugadas: {team?.season || 'Actual'}</p>
            <p className="text-sm text-slate-300">Equipos anteriores: por registrar</p>
            <p className="text-sm text-slate-300">Títulos conseguidos: por registrar</p>
          </section>
        </div>
      </section>
    </>
  )
}
