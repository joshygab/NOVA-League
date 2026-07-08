import { Trophy } from 'lucide-react'
import Badge from './Badge'
import Crest from './Crest'
import { playoffStageLabel } from '../lib/labels'

export default function PlayoffBracket({ matches, teamsById }) {
  const groups = ['semifinal', 'final', 'third_place']
  const final = matches.find((match) => match.stage === 'final')
  const champion = final?.winner_team_id ? teamsById.get(final.winner_team_id) : null

  return (
    <div className="space-y-6">
      {champion && (
        <section className="panel border-gold/40 bg-gold/[0.08] p-6 shadow-gold">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-lg bg-gold text-ink"><Trophy /></div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Campeón</p>
              <h2 className="text-3xl font-black">{champion.name}</h2>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {groups.map((stage) => {
          const stageMatches = matches.filter((match) => match.stage === stage).sort((a, b) => a.slot - b.slot)
          if (!stageMatches.length) return null
          return (
            <section key={stage} className="space-y-4">
              <h2 className="text-xl font-black">{playoffStageLabel(stage)}</h2>
              {stageMatches.map((match) => <PlayoffCard key={match.id} match={match} teamsById={teamsById} />)}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function PlayoffCard({ match, teamsById }) {
  const home = teamsById.get(match.home_team_id)
  const away = teamsById.get(match.away_team_id)
  const winner = match.winner_team_id

  return (
    <article className="panel p-4 transition hover:-translate-y-1 hover:border-electric/50">
      <div className="mb-4 flex items-center justify-between text-xs text-slate-400">
        <span>{playoffStageLabel(match.stage)} {match.slot}</span>
        <Badge tone={match.status === 'finalized' ? 'gold' : 'slate'}>{match.status}</Badge>
      </div>
      <TeamLine team={home} score={match.home_score} penalties={match.home_penalties} winner={winner === match.home_team_id} />
      <TeamLine team={away} score={match.away_score} penalties={match.away_penalties} winner={winner === match.away_team_id} />
      <div className="mt-4 border-t border-white/10 pt-3 text-xs text-slate-400">
        {match.match_date ? new Date(match.match_date).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Fecha por definir'}
        {match.venue && <span> · {match.venue}</span>}
      </div>
    </article>
  )
}

function TeamLine({ team, score, penalties, winner }) {
  return (
    <div className={`mb-2 flex items-center justify-between rounded-lg border px-3 py-3 ${winner ? 'border-gold/50 bg-gold/10' : 'border-white/10 bg-white/5'}`}>
      <div className="flex items-center gap-3">
        <Crest src={team?.crest_url} name={team?.name} size="sm" />
        <p className="font-bold">{team?.name || 'Por definir'}</p>
      </div>
      <div className="text-right">
        <p className="text-xl font-black">{score ?? '-'}</p>
        {penalties != null && <p className="text-xs text-gold">Pen {penalties}</p>}
      </div>
    </div>
  )
}
