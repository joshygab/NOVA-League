import Crest from './Crest'
import Badge from './Badge'

export default function MatchCard({ match, teamsById, playersById }) {
  const home = teamsById.get(match.home_team_id)
  const away = teamsById.get(match.away_team_id)
  const played = match.status === 'played' || match.status === 'official'

  return (
    <article className="panel p-4 transition hover:-translate-y-1 hover:border-electric/50">
      <div className="mb-4 flex items-center justify-between text-xs text-slate-400">
        <span>Jornada {match.round}</span>
        <span>{match.match_date ? new Date(match.match_date).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Fecha por definir'}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamSide team={home} align="right" />
        <div className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-center">
          {played ? (
            <p className="text-2xl font-black text-white">{match.home_score} - {match.away_score}</p>
          ) : (
            <p className="text-sm font-black uppercase tracking-[0.18em] text-gold">VS</p>
          )}
        </div>
        <TeamSide team={away} />
      </div>
      {(match.mvp_player_id || match.observations) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-sm text-slate-300">
          {match.status === 'official' && <Badge tone="green">Resultado oficial</Badge>}
          {match.mvp_player_id && <Badge tone="gold">MVP: {playersById?.get(match.mvp_player_id)?.name || 'Jugador'}</Badge>}
          {match.observations && <span className="text-slate-400">{match.observations}</span>}
        </div>
      )}
    </article>
  )
}

function TeamSide({ team, align = 'left' }) {
  return (
    <div className={`flex items-center gap-3 ${align === 'right' ? 'justify-end text-right' : ''}`}>
      {align === 'right' && <p className="text-sm font-bold text-white">{team?.name ?? 'Equipo'}</p>}
      <Crest src={team?.crest_url} name={team?.name} size="sm" />
      {align !== 'right' && <p className="text-sm font-bold text-white">{team?.name ?? 'Equipo'}</p>}
    </div>
  )
}
