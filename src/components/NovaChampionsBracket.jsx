import { Trophy } from 'lucide-react'
import Badge from './Badge'
import Crest from './Crest'

const roundLabels = {
  round_of_16: 'Octavos',
  quarterfinal: 'Cuartos',
  semifinal: 'Semifinal',
  final: 'Final',
}

export default function NovaChampionsBracket({ matches, teamsById }) {
  const rounds = ['round_of_16', 'quarterfinal', 'semifinal', 'final']
  const final = matches.find((match) => match.round === 'final')
  const champion = final?.winner_team_id ? teamsById.get(final.winner_team_id) : null

  return (
    <div className="space-y-6">
      {champion && (
        <section className="rounded-lg border border-gold/50 bg-black p-6 shadow-gold">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-lg bg-gold text-black"><Trophy /></div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">Campeón NOVA Champions Cup</p>
              <h2 className="text-3xl font-black">{champion.name}</h2>
            </div>
          </div>
        </section>
      )}
      <div className="grid gap-5 lg:grid-cols-4">
        {rounds.map((round) => {
          const rows = matches.filter((match) => match.round === round).sort((a, b) => a.match_order - b.match_order)
          if (!rows.length) return null
          return (
            <section key={round} className="space-y-3">
              <h2 className="text-lg font-black text-gold">{roundLabels[round]}</h2>
              {rows.map((match) => <CupMatchCard key={match.id} match={match} teamsById={teamsById} />)}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function CupMatchCard({ match, teamsById }) {
  const home = teamsById.get(match.home_team_id)
  const away = teamsById.get(match.away_team_id)
  return (
    <article className="rounded-lg border border-gold/20 bg-black/80 p-4 shadow-glow">
      <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
        <span>{roundLabels[match.round]} {match.match_order}</span>
        <Badge tone={match.status === 'finalized' ? 'gold' : 'slate'}>{match.status}</Badge>
      </div>
      <TeamRow team={home} score={match.home_score} penalties={match.home_penalties} winner={match.winner_team_id === match.home_team_id} />
      <TeamRow team={away} score={match.away_score} penalties={match.away_penalties} winner={match.winner_team_id === match.away_team_id} />
      <p className="mt-3 border-t border-gold/20 pt-3 text-xs text-slate-400">
        {match.match_date ? new Date(match.match_date).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Fecha por definir'}
        {match.venue && ` · ${match.venue}`}
      </p>
    </article>
  )
}

function TeamRow({ team, score, penalties, winner }) {
  return (
    <div className={`mb-2 flex items-center justify-between rounded-lg border px-3 py-3 ${winner ? 'border-gold bg-gold/15' : 'border-white/10 bg-white/5'}`}>
      <div className="flex min-w-0 items-center gap-3">
        <Crest src={team?.crest_url} name={team?.name} size="sm" />
        <p className="truncate font-bold">{team?.name || 'Por definir'}</p>
      </div>
      <div className="text-right">
        <p className="text-xl font-black">{score ?? '-'}</p>
        {penalties != null && <p className="text-xs text-gold">Pen {penalties}</p>}
      </div>
    </div>
  )
}
