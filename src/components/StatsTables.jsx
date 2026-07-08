import Badge from './Badge'
import PlayerAvatar from './PlayerAvatar'

export function ScorersTable({ rows, teamsById }) {
  return (
    <ResponsiveTable title="Goleadores">
      <thead className="bg-white/5 text-xs uppercase tracking-[0.18em] text-slate-400">
        <tr><th className="px-4 py-4">Pos</th><th className="px-4 py-4">Jugador</th><th className="px-4 py-4">Equipo</th><th className="px-3 py-4 text-center">PJ</th><th className="px-3 py-4 text-center">Goles</th><th className="px-3 py-4 text-center">Prom.</th></tr>
      </thead>
      <tbody className="divide-y divide-white/10">{rows.map((player, index) => <tr key={player.id} className="hover:bg-white/[0.035]"><td className="px-4 py-4 font-black text-slate-400">{index + 1}</td><PlayerCell player={player} /><td className="px-4 py-4 text-slate-300">{teamsById.get(player.team_id)?.name || 'Sin equipo'}</td><Center>{player.playedMatches}</Center><Center strong>{player.goals}</Center><Center>{player.goalAverage.toFixed(2)}</Center></tr>)}</tbody>
    </ResponsiveTable>
  )
}

export function AssistsTable({ rows, teamsById }) {
  return (
    <CompactRanking title="Asistencias" rows={rows} teamsById={teamsById} value={(player) => player.assists} tone="blue" />
  )
}

export function MvpRankingTable({ rows, teamsById }) {
  return (
    <CompactRanking title="Ranking MVP" rows={rows} teamsById={teamsById} value={(player) => player.mvpAwards} tone="gold" />
  )
}

export function MvpAwardsTable({ matches, playersById, teamsById }) {
  const rows = matches.filter((match) => match.status === 'played' && match.mvp_player_id)
  return (
    <ResponsiveTable title="MVP por partido">
      <thead className="bg-white/5 text-xs uppercase tracking-[0.18em] text-slate-400">
        <tr><th className="px-4 py-4">Jugador</th><th className="px-4 py-4">Equipo</th><th className="px-4 py-4">Partido</th><th className="px-3 py-4 text-center">Jornada</th><th className="px-3 py-4 text-center">Fecha</th></tr>
      </thead>
      <tbody className="divide-y divide-white/10">{rows.map((match) => {
        const player = playersById.get(match.mvp_player_id)
        const home = teamsById.get(match.home_team_id)
        const away = teamsById.get(match.away_team_id)
        return <tr key={match.id} className="hover:bg-white/[0.035]"><PlayerCell player={player || { name: 'Jugador', photo_url: '' }} /><td className="px-4 py-4 text-slate-300">{teamsById.get(player?.team_id)?.name || 'Sin equipo'}</td><td className="px-4 py-4 text-slate-300">{home?.name || 'Local'} vs {away?.name || 'Visitante'}</td><Center>{match.round}</Center><Center>{new Date(match.match_date).toLocaleDateString('es-MX')}</Center></tr>
      })}</tbody>
    </ResponsiveTable>
  )
}

export function DisciplineTable({ rows, teamsById }) {
  return (
    <ResponsiveTable title="Disciplina">
      <thead className="bg-white/5 text-xs uppercase tracking-[0.18em] text-slate-400">
        <tr><th className="px-4 py-4">Jugador</th><th className="px-4 py-4">Equipo</th><th className="px-3 py-4 text-center">Amarillas</th><th className="px-3 py-4 text-center">Rojas</th><th className="px-3 py-4 text-center">Total</th></tr>
      </thead>
      <tbody className="divide-y divide-white/10">{rows.map((player) => <tr key={player.id} className="hover:bg-white/[0.035]"><PlayerCell player={player} /><td className="px-4 py-4 text-slate-300">{teamsById.get(player.team_id)?.name || 'Sin equipo'}</td><Center><Badge tone="yellow">{player.yellowCards}</Badge></Center><Center><Badge tone="red">{player.redCards}</Badge></Center><Center strong>{player.totalCards}</Center></tr>)}</tbody>
    </ResponsiveTable>
  )
}

export function SanctionsTable({ sanctions, playersById, teamsById }) {
  return (
    <ResponsiveTable title="Sancionados">
      <thead className="bg-white/5 text-xs uppercase tracking-[0.18em] text-slate-400">
        <tr><th className="px-4 py-4">Sancionado</th><th className="px-4 py-4">Tipo</th><th className="px-4 py-4">Motivo</th><th className="px-3 py-4 text-center">Partidos</th><th className="px-3 py-4 text-center">Estado</th></tr>
      </thead>
      <tbody className="divide-y divide-white/10">{sanctions.map((sanction) => {
        const player = sanction.player_id ? playersById.get(sanction.player_id) : null
        const team = sanction.team_id ? teamsById.get(sanction.team_id) : null
        return <tr key={sanction.id} className="hover:bg-white/[0.035]"><td className="px-4 py-4 font-bold">{player?.name || team?.name || 'Sanción'}</td><td className="px-4 py-4 text-slate-300">{sanction.sanction_type}</td><td className="px-4 py-4 text-slate-400">{sanction.reason}</td><Center>{sanction.suspended_matches}</Center><Center><Badge tone={sanction.status === 'active' ? 'red' : 'slate'}>{sanction.status}</Badge></Center></tr>
      })}</tbody>
    </ResponsiveTable>
  )
}

function CompactRanking({ title, rows, teamsById, value, tone }) {
  return (
    <section className="panel overflow-hidden">
      <h2 className="border-b border-white/10 px-4 py-4 text-lg font-black">{title}</h2>
      <div className="divide-y divide-white/10">
        {rows.map((player, index) => (
          <div key={player.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="w-5 text-sm font-black text-slate-500">{index + 1}</span>
              <PlayerAvatar src={player.photo_url} name={player.name} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-bold">{player.name}</p>
                <p className="truncate text-xs text-slate-400">{teamsById.get(player.team_id)?.name || 'Sin equipo'}</p>
              </div>
            </div>
            <Badge tone={tone}>{value(player)}</Badge>
          </div>
        ))}
      </div>
    </section>
  )
}

function ResponsiveTable({ title, children }) {
  return (
    <section className="panel overflow-hidden">
      <h2 className="border-b border-white/10 px-4 py-4 text-lg font-black">{title}</h2>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">{children}</table></div>
    </section>
  )
}

function PlayerCell({ player }) {
  return <td className="px-4 py-4"><div className="flex items-center gap-3"><PlayerAvatar src={player.photo_url} name={player.name} size="sm" /><div><p className="font-bold text-white">{player.name}</p><p className="text-xs text-slate-500">#{player.number || '--'} {player.position}</p></div></div></td>
}

function Center({ children, strong = false }) {
  return <td className={`px-3 py-4 text-center ${strong ? 'font-black text-gold' : 'text-slate-200'}`}>{children}</td>
}
