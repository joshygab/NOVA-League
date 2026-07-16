import { Navigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react'
import { useState } from 'react'
import PageTitle from '../components/PageTitle'
import MatchCard from '../components/MatchCard'
import { useAuth } from '../lib/AuthContext'
import { hasSupabaseConfig } from '../lib/supabase'
import { saveCaptainAttendance, saveClarificationRequest } from '../lib/adminApi'

export default function CaptainZonePage({ league }) {
  const { loading, user, player } = useAuth()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [clarification, setClarification] = useState({ match_id: '', subject: '', explanation: '', evidence_url: '' })

  if (!hasSupabaseConfig) return <Navigate to="/login" replace />
  if (loading || league.loading) return <div className="panel p-5">Cargando zona de capitán...</div>
  if (!user) return <Navigate to="/login" replace />

  const authPlayer = league.allPlayers.find((item) => item.auth_user_id === user.id) || player
  const team = authPlayer ? league.teamsById.get(authPlayer.team_id) : null
  const isCaptain = Boolean(team && (team.captain || '').toLowerCase().trim() === (authPlayer?.name || '').toLowerCase().trim())
  const teamPlayers = team ? league.playerStats.filter((item) => item.team_id === team.id) : []
  const matches = team ? league.matches
    .filter((match) => [match.home_team_id, match.away_team_id].includes(team.id))
    .sort((a, b) => new Date(a.match_date || 0) - new Date(b.match_date || 0))
    .slice(0, 8) : []
  const sanctions = teamPlayers.flatMap((item) => item.activeSanctions.map((sanction) => ({ ...sanction, playerName: item.name })))

  if (!authPlayer || !team) {
    return <section className="panel p-5"><h1 className="text-2xl font-black">Sin equipo asignado</h1><p className="mt-2 text-slate-400">Necesitas estar aprobado y asignado a un equipo.</p></section>
  }

  async function run(action, done) {
    setBusy(true)
    setMessage('')
    const { error } = await action()
    setBusy(false)
    if (error) setMessage(error.message)
    else {
      setMessage(done)
      league.reload()
    }
  }

  return (
    <>
      <PageTitle kicker="Zona de capitán" title={team.name} />
      {!isCaptain && <p className="mb-4 rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">Tu cuenta puede ver esta zona, pero solo el capitán registrado debe confirmar asistencia oficial.</p>}
      {message && <p className="mb-4 rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">{message}</p>}

      <section className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-5">
          <section className="panel p-5">
            <h2 className="flex items-center gap-2 text-xl font-black"><ClipboardList className="text-gold" /> Próximos partidos</h2>
            <div className="mt-4 space-y-3">
              {matches.map((match) => {
                const attendance = league.captainAttendance.find((row) => row.match_id === match.id && row.team_id === team.id)
                return (
                  <div key={match.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <MatchCard match={match} teamsById={league.teamsById} playersById={league.playersById} />
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {['confirmed', 'doubt', 'out'].map((status) => (
                        <button key={status} className={attendance?.status === status ? 'button' : 'button-secondary'} disabled={busy || !isCaptain} onClick={() => run(() => saveCaptainAttendance({ match_id: match.id, team_id: team.id, captain_player_id: authPlayer.id, status }), 'Asistencia actualizada')}>
                          {attendanceLabel(status)}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
              {matches.length === 0 && <p className="text-sm text-slate-400">No hay partidos próximos para tu equipo.</p>}
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="flex items-center gap-2 text-xl font-black"><AlertTriangle className="text-gold" /> Aclaraciones</h2>
            <div className="mt-4 grid gap-3">
              <select className="input" value={clarification.match_id} onChange={(event) => setClarification({ ...clarification, match_id: event.target.value })}>
                <option value="">Partido relacionado</option>
                {matches.map((match) => <option key={match.id} value={match.id}>J{match.round} {league.teamsById.get(match.home_team_id)?.name} vs {league.teamsById.get(match.away_team_id)?.name}</option>)}
              </select>
              <input className="input" placeholder="Motivo" value={clarification.subject} onChange={(event) => setClarification({ ...clarification, subject: event.target.value })} />
              <textarea className="input min-h-28" placeholder="Explicación" value={clarification.explanation} onChange={(event) => setClarification({ ...clarification, explanation: event.target.value })} />
              <input className="input" placeholder="Link de evidencia opcional" value={clarification.evidence_url} onChange={(event) => setClarification({ ...clarification, evidence_url: event.target.value })} />
              <button className="button" disabled={busy || !clarification.subject || !clarification.explanation} onClick={() => run(() => saveClarificationRequest({ ...clarification, team_id: team.id, player_id: authPlayer.id }), 'Aclaración enviada')}>Enviar aclaración</button>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="panel p-5">
            <h2 className="flex items-center gap-2 text-xl font-black"><CheckCircle2 className="text-gold" /> Plantilla</h2>
            <div className="mt-4 space-y-2">
              {teamPlayers.map((item) => <p key={item.id} className="rounded-lg bg-white/5 px-3 py-2 text-sm">#{item.number || '--'} {item.name} · {item.position || 'N/D'}</p>)}
            </div>
          </section>
          <section className="panel p-5">
            <h2 className="text-xl font-black">Sanciones visibles</h2>
            <div className="mt-4 space-y-2">
              {sanctions.map((sanction) => <p key={sanction.id} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{sanction.playerName}: {sanction.reason}</p>)}
              {sanctions.length === 0 && <p className="text-sm text-slate-400">Tu equipo no tiene sanciones activas.</p>}
            </div>
          </section>
        </div>
      </section>
    </>
  )
}

function attendanceLabel(status) {
  if (status === 'confirmed') return 'Confirmado'
  if (status === 'doubt') return 'En duda'
  return 'No asistirá'
}
