import { useEffect, useMemo, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Camera, CheckCircle, Clock, FileText, Pause, Play, Search, ShieldAlert, TimerReset, Undo2, Wifi, WifiOff } from 'lucide-react'
import Badge from '../../components/Badge'
import Crest from '../../components/Crest'
import PlayerAvatar from '../../components/PlayerAvatar'
import { finalizeDigitalMatch, saveRefereeAttendance, saveRefereeMatchEvent, updateMatchLiveState, voidRefereeMatchEvent } from '../../lib/adminApi'
import { useAuth } from '../../lib/AuthContext'
import { roles } from '../../lib/auth'
import { parseNovaId, playerNovaId, playerStatus } from '../../lib/novaId'
import { queueOfflineAction, readOfflineMatchSnapshot, readOfflineQueue, saveOfflineMatchSnapshot } from '../../lib/offlineQueue'
import { syncOfflineQueue } from '../../lib/offlineSync'
import { hasSupabaseConfig } from '../../lib/supabase'

const filters = ['Hoy', 'Próximos', 'En vivo', 'Pendientes', 'Finalizados']
const periods = ['1T', 'Descanso', '2T', 'Finalizado', 'Suspendido']
const defaultTimer = { period: '1T', started_at: null, paused_at: null, accumulated_seconds: 0, running: false, stoppage_seconds: 0 }
const refereeMemoryKey = 'nova-referee-active-match'

export default function RefereeModePage({ league }) {
  const auth = useAuth()
  const [filter, setFilter] = useState('Hoy')
  const [manualCode, setManualCode] = useState('')
  const [selectedId, setSelectedId] = useState(() => readRefereeMemory().matchId || '')
  const [step, setStep] = useState(() => readRefereeMemory().step || 'seleccion')
  const [online, setOnline] = useState(navigator.onLine)
  const [message, setMessage] = useState('')
  const canOpenAll = ['admin', 'superadmin', 'league_president', 'sports_coordinator', 'division_admin'].includes(auth.role)
  const referee = findRefereeForUser(league, auth)
  const assignedMatches = useMemo(() => getAssignedMatches({ league, referee, canOpenAll, filter }), [league, referee, canOpenAll, filter])
  const selectedMatch = league.matches.find((match) => match.id === selectedId)
  const rememberedMatch = league.matches.find((match) => match.id === readRefereeMemory().matchId && !['played', 'official'].includes(match.status))

  useEffect(() => {
    if (selectedId) writeRefereeMemory({ matchId: selectedId, step })
  }, [selectedId, step])

  useEffect(() => {
    async function syncBack() {
      setOnline(navigator.onLine)
      if (navigator.onLine && readOfflineQueue().length) {
        const result = await syncOfflineQueue()
        setMessage(`${result.synced} pendiente(s) sincronizado(s), ${result.failed} por revisar.`)
        league.reload?.()
      }
    }
    window.addEventListener('online', syncBack)
    window.addEventListener('offline', syncBack)
    return () => {
      window.removeEventListener('online', syncBack)
      window.removeEventListener('offline', syncBack)
    }
  }, [league])

  function openManualCode() {
    const code = manualCode.trim().toLowerCase()
    const match = league.matches.find((item) => item.id.toLowerCase().startsWith(code) || String(item.round) === code)
    if (match && (canOpenAll || assignedMatches.some((item) => item.id === match.id))) {
      setSelectedId(match.id)
      setStep('preparacion')
    } else {
      setMessage('No se encontró un partido asignado con ese código.')
    }
  }

  function openMatch(matchId) {
    setSelectedId(matchId)
    setStep('preparacion')
    setMessage('')
  }

  return (
    <main className="min-h-screen bg-[#050608] px-4 pb-24 pt-5 text-white">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="rounded-lg border border-gold/30 bg-black p-5 shadow-gold">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">NOVA Referee</p>
              <h1 className="mt-2 text-3xl font-black">Modo Árbitro</h1>
              <p className="mt-1 text-sm text-slate-400">Captura rápida desde celular. El resultado queda provisional hasta revisión.</p>
            </div>
            <Badge tone={online ? 'green' : 'red'}>{online ? 'Con conexión' : 'Sin conexión'}</Badge>
          </div>
          {message && <p className="mt-3 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold">{message}</p>}
        </header>

        {step === 'seleccion' && (
          <MatchSelection
            league={league}
            matches={assignedMatches}
            rememberedMatch={rememberedMatch}
            filter={filter}
            setFilter={setFilter}
            manualCode={manualCode}
            setManualCode={setManualCode}
            openManualCode={openManualCode}
            openMatch={openMatch}
            referee={referee}
            canOpenAll={canOpenAll}
          />
        )}

        {selectedMatch && step === 'preparacion' && (
          <PreparationWizard
            league={league}
            match={selectedMatch}
            online={online}
            setMessage={setMessage}
            onBack={() => setStep('seleccion')}
            onStart={() => setStep('vivo')}
          />
        )}

        {selectedMatch && step === 'vivo' && (
          <LiveRefereeMatch
            league={league}
            match={selectedMatch}
            referee={referee}
            online={online}
            setMessage={setMessage}
            onBack={() => setStep('preparacion')}
          />
        )}
      </div>
    </main>
  )
}

function MatchSelection({ league, matches, rememberedMatch, filter, setFilter, manualCode, setManualCode, openManualCode, openMatch, referee, canOpenAll }) {
  return (
    <section className="space-y-5">
      {rememberedMatch && (
        <div className="rounded-lg border border-gold/40 bg-gold/10 p-4 shadow-gold">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">Recuperación</p>
          <h2 className="mt-1 text-xl font-black">Continuar partido activo</h2>
          <p className="mt-1 text-sm text-slate-300">Tienes un partido guardado en este dispositivo.</p>
          <button className="button mt-3 w-full" onClick={() => openMatch(rememberedMatch.id)}>Continuar partido</button>
        </div>
      )}
      <div className="panel p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((item) => <button key={item} className={filter === item ? 'button whitespace-nowrap' : 'button-secondary whitespace-nowrap'} onClick={() => setFilter(item)}>{item}</button>)}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input className="input" placeholder="Código manual del partido" value={manualCode} onChange={(event) => setManualCode(event.target.value)} />
          <button className="button-secondary" onClick={openManualCode}><Search size={18} />Abrir</button>
        </div>
        <p className="mt-3 text-xs text-slate-400">{canOpenAll ? 'Modo administrador: puedes abrir cualquier partido visible.' : `Árbitro: ${referee?.full_name || 'sin perfil enlazado'}`}</p>
      </div>

      <div className="grid gap-3">
        {matches.map((match) => <RefereeMatchCard key={match.id} league={league} match={match} onOpen={() => openMatch(match.id)} />)}
        {matches.length === 0 && <p className="panel p-5 text-sm text-slate-400">No hay partidos en este filtro.</p>}
      </div>
    </section>
  )
}

function RefereeMatchCard({ league, match, onOpen }) {
  const home = league.teamsById.get(match.home_team_id)
  const away = league.teamsById.get(match.away_team_id)
  const division = league.divisionsById.get(match.division_id || home?.division_id)
  return (
    <article className="rounded-lg border border-white/10 bg-panel/90 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Badge tone={match.status === 'in_progress' ? 'red' : match.status === 'played' ? 'gold' : 'blue'}>{statusLabel(match.status)}</Badge>
        <span className="text-xs text-slate-400">Jornada {match.round} · {division?.name || 'División'}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamMini team={home} align="right" />
        <div className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-center font-black text-gold">VS</div>
        <TeamMini team={away} />
      </div>
      <p className="mt-3 text-center text-sm text-slate-400">{match.match_date ? new Date(match.match_date).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Fecha pendiente'} · {match.venue || 'Cancha pendiente'}</p>
      <button className="button mt-4 min-h-14 w-full text-base" onClick={onOpen}>Abrir partido</button>
    </article>
  )
}

function PreparationWizard({ league, match, online, setMessage, onBack, onStart }) {
  const [activeTeamId, setActiveTeamId] = useState(match.home_team_id)
  const [phase, setPhase] = useState('confirmar')
  const home = league.teamsById.get(match.home_team_id)
  const away = league.teamsById.get(match.away_team_id)
  const presentIds = new Set(league.matchRoster.filter((row) => row.match_id === match.id && row.confirmed !== false).map((row) => row.player_id))
  const activePlayers = league.players.filter((player) => player.team_id === activeTeamId)
  const activePresent = activePlayers.filter((player) => presentIds.has(player.id)).length

  async function markPlayer(player, method = 'manual') {
    const validation = validatePlayerForMatch({ player, match, league, selectedTeamId: activeTeamId })
    if (validation.status === 'approved') {
      const payload = { match, player, method, validationResult: 'approved', deviceId: deviceId() }
      if (!online || !hasSupabaseConfig) {
        queueOfflineAction({ type: 'attendance_checkin', payload })
        setMessage('Asistencia guardada en este dispositivo. Se sincronizará al volver internet.')
      } else {
        const result = await saveRefereeAttendance(payload)
        setMessage(result.error ? result.error.message : 'Jugador registrado como presente.')
      }
      league.reload?.()
      return validation
    }
    setMessage(validation.message)
    return validation
  }

  return (
    <section className="space-y-4">
      <button className="button-secondary" onClick={onBack}>Volver a partidos</button>
      {phase === 'confirmar' && (
        <div className="panel space-y-4 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">Paso 1 · Confirmar encuentro</p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <TeamMini team={home} align="right" />
            <Clock className="text-gold" />
            <TeamMini team={away} />
          </div>
          <p className="text-center text-sm text-slate-400">Duración sugerida: 2 tiempos de 25 minutos · Descanso 5 minutos</p>
          <button className="button min-h-14 w-full" onClick={() => setPhase('lista')}>Iniciar pase de lista</button>
        </div>
      )}

      {phase === 'lista' && (
        <section className="space-y-4">
          <div className="panel p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">Paso 2 · Pase de lista</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[home, away].map((team) => <button key={team.id} className={activeTeamId === team.id ? 'button' : 'button-secondary'} onClick={() => setActiveTeamId(team.id)}>{team.name}</button>)}
            </div>
            <p className="mt-3 text-center text-lg font-black text-gold">Presentes: {activePresent} de {activePlayers.length}</p>
          </div>
          <RosterQrScanner league={league} match={match} teamId={activeTeamId} onValidated={markPlayer} />
          <ManualRoster players={activePlayers} presentIds={presentIds} league={league} match={match} onMark={markPlayer} />
          <button className="button min-h-14 w-full" onClick={() => setPhase('resumen')}>Finalizar pase de lista</button>
        </section>
      )}

      {phase === 'resumen' && (
        <div className="panel space-y-4 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">Paso 3 · Confirmación final</p>
          <RosterSummary team={home} league={league} match={match} />
          <RosterSummary team={away} league={league} match={match} />
          <button className="button min-h-16 w-full text-base" onClick={onStart}>Iniciar partido</button>
        </div>
      )}
    </section>
  )
}

function RosterQrScanner({ league, match, teamId, onValidated }) {
  const [cameraOn, setCameraOn] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [lockedCode, setLockedCode] = useState('')
  const qrRef = useRef(null)
  const scannerId = `referee-roster-reader-${match.id}`

  useEffect(() => {
    if (!cameraOn) return undefined
    let cancelled = false
    async function start() {
      try {
        setError('')
        const devices = await Html5Qrcode.getCameras()
        if (!devices.length) {
          setError('Este dispositivo no encontró cámara. Usa búsqueda manual o ingresa el código.')
          setCameraOn(false)
          return
        }
        const selected = devices.find((device) => /back|rear|environment|trasera/i.test(device.label))?.id || devices[0].id
        const scanner = new Html5Qrcode(scannerId, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false })
        qrRef.current = scanner
        await scanner.start(selected, { fps: 10, qrbox: 220 }, async (raw) => {
          if (cancelled || raw === lockedCode) return
          setLockedCode(raw)
          const player = findPlayerByQr(league, raw)
          if (!player) {
            setResult({ tone: 'red', message: 'No se encontró al jugador.' })
          } else {
            const validation = await onValidated(player, 'qr')
            setResult({ tone: validation.status === 'approved' ? 'green' : validation.status === 'review' ? 'yellow' : 'red', message: validation.message, player })
            if (validation.status === 'approved') navigator.vibrate?.(120)
          }
          window.setTimeout(() => setLockedCode(''), 1800)
        }, () => {})
      } catch {
        setError('Este dispositivo no permite usar el lector QR. Puedes buscar al jugador manualmente o ingresar el código.')
        setCameraOn(false)
      }
    }
    start()
    return () => {
      cancelled = true
      if (qrRef.current) {
        qrRef.current.stop().catch(() => {})
        qrRef.current.clear().catch(() => {})
        qrRef.current = null
      }
    }
  }, [cameraOn, scannerId, league, onValidated, lockedCode])

  const team = league.teamsById.get(teamId)
  return (
    <div className="panel space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-black">Escaneo QR · {team?.name}</h3>
          <p className="text-sm text-slate-400">El lector queda abierto para escanear varios jugadores seguidos.</p>
        </div>
        <button className="button min-h-12" onClick={() => setCameraOn(!cameraOn)}><Camera size={18} />{cameraOn ? 'Cerrar cámara' : 'Abrir cámara'}</button>
      </div>
      {cameraOn && <div className="overflow-hidden rounded-lg border border-gold/30 bg-black"><div id={scannerId} className="min-h-[260px] [&_video]:rounded-lg [&_video]:object-cover" /></div>}
      {error && <p className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold">{error}</p>}
      {result && <ScanFeedback result={result} league={league} />}
    </div>
  )
}

function ManualRoster({ players, presentIds, league, match, onMark }) {
  const [query, setQuery] = useState('')
  const rows = players.filter((player) => `${player.number || ''} ${player.name}`.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="panel p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-black">Agregar manualmente</h3>
        <input className="input max-w-xs" placeholder="Buscar nombre o número" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="space-y-2">
        {rows.map((player) => {
          const validation = validatePlayerForMatch({ player, match, league, selectedTeamId: player.team_id })
          const present = presentIds.has(player.id)
          return (
            <button key={player.id} className={`w-full rounded-lg border p-3 text-left ${present ? 'border-emerald-400/30 bg-emerald-500/10' : validation.status === 'approved' ? 'border-white/10 bg-white/5' : 'border-red-400/30 bg-red-500/10'}`} disabled={present || validation.status !== 'approved'} onClick={() => onMark(player, 'manual')}>
              <div className="flex items-center gap-3">
                <PlayerAvatar src={player.photo_url} name={player.name} size="sm" />
                <div>
                  <p className="font-black">#{player.number || '--'} {player.name}</p>
                  <p className="text-xs text-slate-400">{present ? 'Presente' : validation.message}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function LiveRefereeMatch({ league, match, referee, online, setMessage, onBack }) {
  const [timer, setTimer] = useState(() => loadTimer(match))
  const [now, setNow] = useState(Date.now())
  const [action, setAction] = useState('')
  const [busyEvent, setBusyEvent] = useState(false)
  const [localEvents, setLocalEvents] = useState([])
  const [queueRows, setQueueRows] = useState(readOfflineQueue())
  const [syncing, setSyncing] = useState(false)
  const [liveScore, setLiveScore] = useState({ home: Number(match.home_score_live ?? match.home_score ?? 0), away: Number(match.away_score_live ?? match.away_score ?? 0) })
  const [reviewOpen, setReviewOpen] = useState(false)
  const [finalForm, setFinalForm] = useState({ mvp_player_id: '', observations: '', referee_signature: '', home_captain_signature: '', away_captain_signature: '' })
  const [submittingReport, setSubmittingReport] = useState(false)
  const home = league.teamsById.get(match.home_team_id)
  const away = league.teamsById.get(match.away_team_id)
  const elapsed = currentElapsed(timer, now)
  const presentRows = league.matchRoster.filter((row) => row.match_id === match.id && row.confirmed !== false)
  const presentIds = new Set(presentRows.map((row) => row.player_id))
  const matchPlayers = league.players.filter((player) => [match.home_team_id, match.away_team_id].includes(player.team_id))
  const availablePlayers = matchPlayers.filter((player) => presentIds.size === 0 || presentIds.has(player.id))
  const allEvents = [...league.events.filter((event) => event.match_id === match.id), ...localEvents]
    .filter((event) => !event.is_voided)
    .sort((a, b) => Number(a.match_second || a.minute || 0) - Number(b.match_second || b.minute || 0))
  const lastEvent = [...allEvents].reverse()[0]
  const pendingForMatch = queueRows.filter((item) => item.payload?.match?.id === match.id || item.payload?.matchId === match.id || item.payload?.event?.match_id === match.id)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(timerKey(match.id), JSON.stringify(timer))
  }, [match.id, timer])

  useEffect(() => {
    function warnBeforeExit(event) {
      if (!timer.running && pendingForMatch.length === 0) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeExit)
    return () => window.removeEventListener('beforeunload', warnBeforeExit)
  }, [timer.running, pendingForMatch.length])

  useEffect(() => {
    function refreshQueue() {
      setQueueRows(readOfflineQueue())
    }
    window.addEventListener('nova-offline-queue', refreshQueue)
    window.addEventListener('storage', refreshQueue)
    return () => {
      window.removeEventListener('nova-offline-queue', refreshQueue)
      window.removeEventListener('storage', refreshQueue)
    }
  }, [])

  function downloadMatch() {
    saveOfflineMatchSnapshot(match.id, { match, teams: [home, away], players: matchPlayers, roster: presentRows, timer, score: liveScore })
    setMessage('Partido guardado en este dispositivo para trabajar con conexión inestable.')
  }

  async function syncNow() {
    setSyncing(true)
    const result = await syncOfflineQueue()
    setSyncing(false)
    setQueueRows(readOfflineQueue())
    setMessage(`${result.synced} sincronizado(s), ${result.failed} pendiente(s).`)
    league.reload?.()
  }

  async function commit(next, reason) {
    setTimer(next)
    const patch = {
      status: next.period === 'Finalizado' ? 'played' : next.period === 'Suspendido' ? 'problem' : 'in_progress',
      current_period: next.period,
      live_started_at: next.started_at,
      live_paused_at: next.paused_at,
      live_accumulated_seconds: next.accumulated_seconds,
      stoppage_seconds: next.stoppage_seconds,
    }
    if (!online || !hasSupabaseConfig) {
      queueOfflineAction({ type: 'match_live_state', dedupe_key: `${match.id}-${reason}-${Date.now()}`, payload: { matchId: match.id, patch, reason } })
      setMessage('Cronómetro guardado en este dispositivo.')
      return
    }
    const result = await updateMatchLiveState(match.id, patch, reason)
    setMessage(result.error ? result.error.message : 'Cronómetro sincronizado.')
    league.reload?.()
  }

  function start() {
    commit({ ...timer, started_at: new Date().toISOString(), paused_at: null, running: true }, 'start_match_clock')
  }

  function pause() {
    commit({ ...timer, accumulated_seconds: elapsed, paused_at: new Date().toISOString(), running: false }, 'pause_match_clock')
  }

  function resume() {
    commit({ ...timer, started_at: new Date().toISOString(), paused_at: null, running: true }, 'resume_match_clock')
  }

  function changePeriod(period) {
    commit({ ...timer, period, accumulated_seconds: elapsed, started_at: period === 'Finalizado' || period === 'Suspendido' ? null : new Date().toISOString(), paused_at: null, running: !['Finalizado', 'Suspendido', 'Descanso'].includes(period) }, 'change_match_period')
  }

  async function registerEvent(event) {
    if (busyEvent) return
    setBusyEvent(true)
    const clientEventId = crypto.randomUUID()
    const nextScore = scoreAfterEvent(liveScore, event, match)
    const payload = {
      match,
      event: {
        ...event,
        client_event_id: clientEventId,
        period: timer.period,
        match_second: elapsed,
        minute: Math.max(1, Math.ceil(elapsed / 60)),
        device_id: deviceId(),
      },
      liveScore: nextScore,
    }
    const optimistic = {
      ...payload.event,
      id: clientEventId,
      match_id: match.id,
      sync_status: online ? 'syncing' : 'pending',
      created_at: new Date().toISOString(),
    }
    setLocalEvents((rows) => [...rows, optimistic])
    setLiveScore(nextScore)
    setAction('')

    if (!online || !hasSupabaseConfig) {
      queueOfflineAction({ type: 'referee_match_event', dedupe_key: clientEventId, payload })
      setMessage(`${eventLabel(event.event_type)} guardado en el dispositivo.`)
      setBusyEvent(false)
      return
    }
    const result = await saveRefereeMatchEvent(payload)
    setBusyEvent(false)
    if (result.error) {
      setMessage(result.error.message)
      return
    }
    setMessage(`${eventLabel(event.event_type)} registrado. Marcador provisional ${nextScore.home}-${nextScore.away}.`)
    league.reload?.()
  }

  async function undoLastEvent() {
    if (!lastEvent) return
    const reason = window.prompt('Motivo para deshacer el último evento:', 'Corrección arbitral')
    if (!reason) return
    const nextScore = scoreBeforeEvent(liveScore, lastEvent, match)
    setLiveScore(nextScore)
    setLocalEvents((rows) => rows.map((row) => row.id === lastEvent.id ? { ...row, is_voided: true, void_reason: reason } : row))
    if (String(lastEvent.id).length < 30 || !online || !hasSupabaseConfig) {
      queueOfflineAction({ type: 'void_referee_match_event', dedupe_key: `void-${lastEvent.client_event_id || lastEvent.id}`, payload: { match, event: lastEvent, liveScore: nextScore, reason } })
      setMessage('Evento marcado para deshacer al sincronizar.')
      return
    }
    const result = await voidRefereeMatchEvent({ match, event: lastEvent, liveScore: nextScore, reason })
    setMessage(result.error ? result.error.message : 'Último evento anulado.')
    league.reload?.()
  }

  async function sendToReview() {
    if (!window.confirm('¿Enviar acta a revisión administrativa? Ya no deberías editar libremente este partido.')) return
    setSubmittingReport(true)
    const result = await finalizeDigitalMatch({
      match,
      score: liveScore,
      report: {
        referee_name: referee?.full_name || 'Árbitro sin perfil enlazado',
        observations: finalForm.observations,
        mvp_player_id: finalForm.mvp_player_id || null,
        referee_signature: finalForm.referee_signature,
        home_captain_signature: finalForm.home_captain_signature,
        away_captain_signature: finalForm.away_captain_signature,
        report_data: {
          timer,
          referee_mode: true,
          source: 'referee_mode',
          mvp_player_id: finalForm.mvp_player_id || null,
          live_score: liveScore,
          event_count: allEvents.length,
          events: allEvents.map((event) => ({
            event_type: event.event_type || event.type,
            minute: event.minute,
            match_second: event.match_second,
            team_id: event.team_id,
            player_id: event.player_id,
            related_player_id: event.related_player_id,
            detail: event.detail || null,
          })),
        },
      },
    })
    setSubmittingReport(false)
    if (result.error) {
      setMessage(result.error.message)
      return
    }
    writeRefereeMemory({ matchId: '', step: 'seleccion' })
    setMessage('Acta enviada a revisión. El administrador podrá aprobar el resultado oficial.')
    league.reload?.()
  }

  async function adjustLiveScore(team, delta) {
    const nextScore = {
      home: team === 'home' ? Math.max(0, liveScore.home + delta) : liveScore.home,
      away: team === 'away' ? Math.max(0, liveScore.away + delta) : liveScore.away,
    }
    setLiveScore(nextScore)
    const patch = {
      status: 'in_progress',
      home_score_live: nextScore.home,
      away_score_live: nextScore.away,
    }
    if (!online || !hasSupabaseConfig) {
      queueOfflineAction({ type: 'match_live_state', dedupe_key: `${match.id}-manual-score-${Date.now()}`, payload: { matchId: match.id, patch, reason: 'manual_score_adjustment' } })
      setMessage('Marcador corregido en este dispositivo. Se sincronizará al volver internet.')
      return
    }
    const result = await updateMatchLiveState(match.id, patch, 'manual_score_adjustment')
    setMessage(result.error ? result.error.message : `Marcador provisional actualizado ${nextScore.home}-${nextScore.away}.`)
    league.reload?.()
  }

  return (
    <section className="space-y-4">
      <button className="button-secondary" onClick={onBack}>Volver a preparación</button>
      <div className="grid gap-2 sm:grid-cols-3">
        <button className="button-secondary" onClick={downloadMatch}>Guardar offline</button>
        <button className="button-secondary" disabled={!online || syncing || pendingForMatch.length === 0} onClick={syncNow}>
          {syncing ? 'Sincronizando...' : `Sincronizar (${pendingForMatch.length})`}
        </button>
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-sm">
          {pendingForMatch.length ? `${pendingForMatch.length} pendiente(s)` : readOfflineMatchSnapshot(match.id) ? 'Copia local lista' : 'Sin copia local'}
        </div>
      </div>
      <div className="sticky top-3 z-10 rounded-lg border border-gold/30 bg-black/95 p-4 shadow-gold">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Badge tone={timer.period === 'Finalizado' ? 'gold' : 'red'}>{timer.period === 'Finalizado' ? 'Finalizado' : 'EN VIVO'}</Badge>
          <span className="inline-flex items-center gap-2 text-xs text-slate-300">{online ? <Wifi size={16} /> : <WifiOff size={16} />}{online ? 'Sincronizado' : 'Pendiente de sincronizar'}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          <ScoreTeam team={home} score={liveScore.home} />
          <div>
            <p className="text-5xl font-black text-gold">{formatClock(elapsed)}</p>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{timer.period}</p>
          </div>
          <ScoreTeam team={away} score={liveScore.away} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {!timer.running && elapsed === 0 && <button className="button min-h-16 text-base" onClick={start}><Play size={20} />Iniciar</button>}
        {timer.running && <button className="button-secondary min-h-16 text-base" onClick={pause}><Pause size={20} />Pausar</button>}
        {!timer.running && elapsed > 0 && timer.period !== 'Finalizado' && <button className="button min-h-16 text-base" onClick={resume}><Play size={20} />Reanudar</button>}
        <button className="button-secondary min-h-16 text-base" onClick={() => commit({ ...timer, stoppage_seconds: timer.stoppage_seconds + 60 }, 'add_stoppage_time')}><TimerReset size={20} />+ Tiempo</button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {periods.map((period) => <button key={period} className={timer.period === period ? 'button' : 'button-secondary'} onClick={() => changePeriod(period)}>{period}</button>)}
      </div>

      <div className="panel p-4">
        <h2 className="text-xl font-black">Acciones rápidas</h2>
        <p className="mt-1 text-sm text-slate-400">Registra lo que acaba de pasar. Todo queda como marcador provisional hasta que el admin apruebe el acta.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="button min-h-16 text-base" disabled={busyEvent} onClick={() => setAction('goal')}>⚽ Gol</button>
          <button className="button-secondary min-h-16 text-base" disabled={busyEvent} onClick={() => setAction('card')}>🟨 Tarjeta</button>
          <button className="button-secondary min-h-16 text-base" disabled={busyEvent} onClick={() => setAction('substitution')}>🔁 Cambio</button>
          <button className="button-secondary min-h-16 text-base" disabled={!lastEvent} onClick={undoLastEvent}><Undo2 size={18} />Deshacer</button>
          <button className="button col-span-2 min-h-16 text-base" onClick={() => setReviewOpen(true)}><FileText size={18} />Finalizar y revisar acta</button>
        </div>
      </div>

      <div className="panel p-4">
        <h2 className="text-xl font-black">Ajustar marcador</h2>
        <p className="mt-1 text-sm text-slate-400">Úsalo para corregir el resultado provisional sin salir del partido.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ScoreAdjuster team={home} score={liveScore.home} onMinus={() => adjustLiveScore('home', -1)} onPlus={() => adjustLiveScore('home', 1)} />
          <ScoreAdjuster team={away} score={liveScore.away} onMinus={() => adjustLiveScore('away', -1)} onPlus={() => adjustLiveScore('away', 1)} />
        </div>
      </div>

      {action === 'goal' && <GoalSheet match={match} teams={[home, away]} players={availablePlayers} onCancel={() => setAction('')} onSave={registerEvent} />}
      {action === 'card' && <CardSheet match={match} teams={[home, away]} players={availablePlayers} events={allEvents} onCancel={() => setAction('')} onSave={registerEvent} />}
      {action === 'substitution' && <SubstitutionSheet match={match} teams={[home, away]} players={availablePlayers} onCancel={() => setAction('')} onSave={registerEvent} />}
      {reviewOpen && (
        <RefereeReviewStep
          events={allEvents}
          finalForm={finalForm}
          league={league}
          match={match}
          onCancel={() => setReviewOpen(false)}
          onChange={setFinalForm}
          onSubmit={sendToReview}
          players={availablePlayers}
          score={liveScore}
          submitting={submittingReport}
          teams={[home, away]}
          timer={timer}
        />
      )}

      <EventTimeline events={allEvents.slice(-8).reverse()} league={league} />
    </section>
  )
}

function GoalSheet({ match, teams, players, onCancel, onSave }) {
  const [teamId, setTeamId] = useState(match.home_team_id)
  const [playerId, setPlayerId] = useState('')
  const [assistId, setAssistId] = useState('')
  const [goalType, setGoalType] = useState('open_play')
  const teamPlayers = players.filter((player) => player.team_id === teamId)
  return (
    <ActionPanel title="Registrar gol" onCancel={onCancel}>
      <TeamChoice teams={teams} value={teamId} onChange={(value) => { setTeamId(value); setPlayerId(''); setAssistId('') }} />
      <PlayerGrid players={teamPlayers} value={playerId} onChange={setPlayerId} />
      <select className="input" value={goalType} onChange={(event) => setGoalType(event.target.value)}>
        <option value="open_play">Gol normal</option>
        <option value="penalty">Penal</option>
        <option value="free_kick">Tiro libre</option>
        <option value="own_goal">Autogol</option>
        <option value="unknown">Gol sin autor identificado</option>
      </select>
      <p className="text-sm font-bold text-slate-300">Asistencia opcional</p>
      <button className={!assistId ? 'button w-full' : 'button-secondary w-full'} onClick={() => setAssistId('')}>Sin asistencia</button>
      <PlayerGrid players={teamPlayers.filter((player) => player.id !== playerId)} value={assistId} onChange={setAssistId} compact />
      <button className="button min-h-14 w-full" disabled={!teamId || (!playerId && goalType !== 'unknown')} onClick={() => onSave({ event_type: 'goal', team_id: teamId, player_id: playerId || null, related_player_id: assistId || null, detail: goalType, metadata: { goal_type: goalType } })}>Guardar gol</button>
    </ActionPanel>
  )
}

function CardSheet({ match, teams, players, events, onCancel, onSave }) {
  const [teamId, setTeamId] = useState(match.home_team_id)
  const [playerId, setPlayerId] = useState('')
  const [cardType, setCardType] = useState('yellow_card')
  const [reason, setReason] = useState('Conducta antideportiva')
  const teamPlayers = players.filter((player) => player.team_id === teamId)
  const previousYellow = events.some((event) => event.player_id === playerId && event.event_type === 'yellow_card')

  function save() {
    if ((cardType === 'red_card' || cardType === 'second_yellow') && !window.confirm('¿Confirmas la expulsión de este jugador?')) return
    onSave({ event_type: cardType, team_id: teamId, player_id: playerId, detail: reason, metadata: { card_type: cardType, reason } })
  }

  return (
    <ActionPanel title="Registrar tarjeta" onCancel={onCancel}>
      <TeamChoice teams={teams} value={teamId} onChange={(value) => { setTeamId(value); setPlayerId('') }} />
      <PlayerGrid players={teamPlayers} value={playerId} onChange={setPlayerId} />
      {previousYellow && <p className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold">Este jugador ya tiene amarilla.</p>}
      <select className="input" value={cardType} onChange={(event) => setCardType(event.target.value)}>
        <option value="yellow_card">Amarilla</option>
        <option value="second_yellow">Segunda amarilla</option>
        <option value="red_card">Roja directa</option>
        <option value="staff_card">Cuerpo técnico</option>
      </select>
      <select className="input" value={reason} onChange={(event) => setReason(event.target.value)}>
        {['Conducta antideportiva', 'Juego brusco', 'Reclamos', 'Insultos', 'Agresión', 'Doble amarilla', 'Otro'].map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <button className="button min-h-14 w-full" disabled={!teamId || !playerId} onClick={save}>Guardar tarjeta</button>
    </ActionPanel>
  )
}

function SubstitutionSheet({ match, teams, players, onCancel, onSave }) {
  const [teamId, setTeamId] = useState(match.home_team_id)
  const [outId, setOutId] = useState('')
  const [inId, setInId] = useState('')
  const teamPlayers = players.filter((player) => player.team_id === teamId)
  return (
    <ActionPanel title="Registrar cambio" onCancel={onCancel}>
      <TeamChoice teams={teams} value={teamId} onChange={(value) => { setTeamId(value); setOutId(''); setInId('') }} />
      <p className="text-sm font-bold text-slate-300">Jugador que sale</p>
      <PlayerGrid players={teamPlayers} value={outId} onChange={setOutId} />
      <p className="text-sm font-bold text-slate-300">Jugador que entra</p>
      <PlayerGrid players={teamPlayers.filter((player) => player.id !== outId)} value={inId} onChange={setInId} />
      <button className="button min-h-14 w-full" disabled={!teamId || !outId || !inId} onClick={() => onSave({ event_type: 'substitution', team_id: teamId, player_id: outId, related_player_id: inId, detail: 'Cambio', metadata: { out_player_id: outId, in_player_id: inId } })}>Guardar cambio</button>
    </ActionPanel>
  )
}

function ActionPanel({ title, children, onCancel }) {
  return (
    <section className="rounded-lg border border-gold/30 bg-black p-4 shadow-gold">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-black">{title}</h2>
        <button className="button-secondary" onClick={onCancel}>Cancelar</button>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function TeamChoice({ teams, value, onChange }) {
  return <div className="grid grid-cols-2 gap-2">{teams.map((team) => <button key={team.id} className={value === team.id ? 'button' : 'button-secondary'} onClick={() => onChange(team.id)}>{team.name}</button>)}</div>
}

function PlayerGrid({ players, value, onChange }) {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()
  const rows = players.filter((player) => {
    if (!normalized) return true
    return `${player.number || ''} ${player.name || ''} ${player.position || ''}`.toLowerCase().includes(normalized)
  })
  return (
    <div className="space-y-2">
      <input className="input" placeholder="Nombre o número del jugador" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
        {rows.map((player) => (
          <button key={player.id} className={`rounded-lg border p-3 text-left ${value === player.id ? 'border-gold bg-gold/15' : 'border-white/10 bg-white/5'}`} onClick={() => onChange(player.id)}>
            <div className="flex items-center gap-3">
              <PlayerAvatar src={player.photo_url} name={player.name} size="sm" />
              <span className="font-black">#{player.number || '--'} {player.name}</span>
            </div>
          </button>
        ))}
        {rows.length === 0 && <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-4 text-sm text-slate-400">No encontramos jugadores con ese nombre o número.</p>}
      </div>
    </div>
  )
}

function RefereeReviewStep({ events, finalForm, league, match, onCancel, onChange, onSubmit, players, score, submitting, teams, timer }) {
  const home = teams[0]
  const away = teams[1]
  const goals = events.filter((event) => event.event_type === 'goal')
  const cards = events.filter((event) => ['yellow_card', 'second_yellow', 'red_card'].includes(event.event_type))
  const substitutions = events.filter((event) => event.event_type === 'substitution')

  function update(field, value) {
    onChange((current) => ({ ...current, [field]: value }))
  }

  return (
    <section className="rounded-lg border border-gold/40 bg-black p-4 shadow-gold">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">Paso final</p>
          <h2 className="text-2xl font-black">Revisar acta</h2>
        </div>
        <button className="button-secondary" onClick={onCancel}>Volver al partido</button>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
        <p className="text-sm text-slate-400">Resultado provisional</p>
        <p className="mt-1 text-3xl font-black text-gold">{home?.name} {score.home} - {score.away} {away?.name}</p>
        <p className="mt-1 text-xs text-slate-400">Periodo: {timer.period} · Tiempo registrado: {formatClock(Number(timer.accumulated_seconds || 0))}</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <SummaryCard title="Goles" rows={goals} league={league} empty="Sin goles registrados" />
        <SummaryCard title="Tarjetas" rows={cards} league={league} empty="Sin tarjetas registradas" />
        <SummaryCard title="Cambios" rows={substitutions} league={league} empty="Sin cambios registrados" />
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="mb-2 text-sm font-bold text-slate-300">MVP del partido</p>
          <PlayerGrid players={players} value={finalForm.mvp_player_id} onChange={(value) => update('mvp_player_id', value)} />
        </div>
        <textarea className="input min-h-28" placeholder="Observaciones arbitrales" value={finalForm.observations} onChange={(event) => update('observations', event.target.value)} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <SignaturePad title="Firma capitán local" value={finalForm.home_captain_signature} onChange={(value) => update('home_captain_signature', value)} />
        <SignaturePad title="Firma capitán visitante" value={finalForm.away_captain_signature} onChange={(value) => update('away_captain_signature', value)} />
        <SignaturePad title="Firma árbitro" value={finalForm.referee_signature} onChange={(value) => update('referee_signature', value)} />
      </div>

      <div className="sticky bottom-3 mt-5 grid gap-2 rounded-lg border border-white/10 bg-black/95 p-3 sm:grid-cols-2">
        <button className="button-secondary min-h-14" onClick={onCancel}>Guardar y seguir editando</button>
        <button className="button min-h-14" disabled={submitting} onClick={onSubmit}>{submitting ? 'Enviando...' : 'Enviar acta a revisión'}</button>
      </div>
    </section>
  )
}

function SummaryCard({ title, rows, league, empty }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <h3 className="font-black text-gold">{title}</h3>
      <div className="mt-2 space-y-2">
        {rows.map((event) => (
          <p key={event.id || event.client_event_id} className="text-sm text-slate-200">
            <span className="font-black">{event.minute || Math.ceil((event.match_second || 0) / 60)}'</span> {eventIcon(event.event_type)} {league.playersById.get(event.player_id)?.name || event.detail || 'Sin jugador'}
          </p>
        ))}
        {rows.length === 0 && <p className="text-sm text-slate-500">{empty}</p>}
      </div>
    </div>
  )
}

function SignaturePad({ title, value, onChange }) {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !value) return
    const context = canvas.getContext('2d')
    const image = new Image()
    image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height)
    image.src = value
  }, [value])

  function point(event) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const touch = event.touches?.[0]
    return {
      x: (touch ? touch.clientX : event.clientX) - rect.left,
      y: (touch ? touch.clientY : event.clientY) - rect.top,
    }
  }

  function start(event) {
    event.preventDefault()
    drawingRef.current = true
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const pos = point(event)
    context.strokeStyle = '#f6c453'
    context.lineWidth = 3
    context.lineCap = 'round'
    context.beginPath()
    context.moveTo(pos.x, pos.y)
  }

  function move(event) {
    if (!drawingRef.current) return
    event.preventDefault()
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const pos = point(event)
    context.lineTo(pos.x, pos.y)
    context.stroke()
  }

  function end() {
    if (!drawingRef.current) return
    drawingRef.current = false
    onChange(canvasRef.current.toDataURL('image/png'))
  }

  function clear() {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    onChange('')
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-black">{title}</p>
        <button className="button-secondary px-3 py-1 text-xs" onClick={clear}>Limpiar</button>
      </div>
      <canvas
        ref={canvasRef}
        width="420"
        height="180"
        className="h-36 w-full touch-none rounded-lg border border-gold/30 bg-black"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
    </div>
  )
}

function EventTimeline({ events, league }) {
  return (
    <section className="panel p-4">
      <h2 className="text-xl font-black">Últimos eventos</h2>
      <div className="mt-3 space-y-2">
        {events.map((event) => <p key={event.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"><span className="font-black text-gold">{event.minute || Math.ceil((event.match_second || 0) / 60)}'</span> {eventIcon(event.event_type || event.type)} {league.playersById.get(event.player_id)?.name || event.detail || 'Evento'} {event.related_player_id && `→ ${league.playersById.get(event.related_player_id)?.name || ''}`}</p>)}
        {events.length === 0 && <p className="text-sm text-slate-400">Sin eventos todavía.</p>}
      </div>
    </section>
  )
}

function TeamMini({ team, align = 'left' }) {
  return <div className={`flex min-w-0 items-center gap-2 ${align === 'right' ? 'justify-end text-right' : ''}`}>{align === 'right' && <p className="truncate font-black">{team?.name}</p>}<Crest src={team?.crest_url} name={team?.name} size="sm" />{align !== 'right' && <p className="truncate font-black">{team?.name}</p>}</div>
}

function ScoreTeam({ team, score }) {
  return <div className="min-w-0"><Crest src={team?.crest_url} name={team?.name} size="md" /><p className="mt-2 truncate text-sm font-black">{team?.name}</p><p className="text-5xl font-black">{score}</p></div>
}

function ScoreAdjuster({ team, score, onMinus, onPlus }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="mb-3 flex items-center gap-2">
        <Crest src={team?.crest_url} name={team?.name} size="sm" />
        <p className="truncate font-black">{team?.name}</p>
      </div>
      <div className="grid grid-cols-[56px_1fr_56px] items-center gap-2">
        <button className="button-secondary min-h-14 text-xl" onClick={onMinus}>-</button>
        <p className="text-center text-4xl font-black text-gold">{score}</p>
        <button className="button min-h-14 text-xl" onClick={onPlus}>+</button>
      </div>
    </div>
  )
}

function RosterSummary({ team, league, match }) {
  const players = league.players.filter((player) => player.team_id === team?.id)
  const present = new Set(league.matchRoster.filter((row) => row.match_id === match.id && row.confirmed !== false).map((row) => row.player_id))
  return <div className="rounded-lg border border-white/10 bg-white/5 p-3"><h3 className="font-black">{team?.name}</h3><p className="text-sm text-slate-400">{players.filter((player) => present.has(player.id)).length} presentes · {players.filter((player) => !present.has(player.id)).length} ausentes</p></div>
}

function ScanFeedback({ result, league }) {
  const team = result.player ? league.teamsById.get(result.player.team_id) : null
  return (
    <div className={`rounded-lg border p-3 ${result.tone === 'green' ? 'border-emerald-400/30 bg-emerald-500/10' : result.tone === 'yellow' ? 'border-gold/30 bg-gold/10' : 'border-red-400/30 bg-red-500/10'}`}>
      <div className="flex items-center gap-3">
        {result.player ? <PlayerAvatar src={result.player.photo_url} name={result.player.name} size="sm" /> : <ShieldAlert />}
        <div>
          <p className="font-black">{result.player ? `#${result.player.number || '--'} ${result.player.name}` : 'QR revisado'}</p>
          <p className="text-sm text-slate-300">{result.message}</p>
          {team && <p className="text-xs text-slate-400">{team.name} · {result.player.position || 'Posición'}</p>}
        </div>
      </div>
    </div>
  )
}

function findRefereeForUser(league, auth) {
  return (league.referees || []).find((referee) => referee.user_id === auth.user?.id || referee.email?.toLowerCase() === auth.user?.email?.toLowerCase())
}

function getAssignedMatches({ league, referee, canOpenAll, filter }) {
  const today = new Date().toISOString().slice(0, 10)
  const assignedIds = new Set((league.matchAssignments || []).filter((row) => canOpenAll || row.referee_id === referee?.id).map((row) => row.match_id))
  return league.matches
    .filter((match) => canOpenAll || assignedIds.has(match.id))
    .filter((match) => {
      const date = match.match_date?.slice(0, 10)
      if (filter === 'Hoy') return date === today
      if (filter === 'Próximos') return !['played', 'official'].includes(match.status) && (!date || date >= today)
      if (filter === 'En vivo') return match.status === 'in_progress'
      if (filter === 'Pendientes') return ['scheduled', 'in_progress', 'played', 'problem'].includes(match.status)
      if (filter === 'Finalizados') return ['played', 'official'].includes(match.status)
      return true
    })
}

function findPlayerByQr(league, raw) {
  const novaId = parseNovaId(raw)
  return league.players.find((player, index) => playerNovaId(player, index) === novaId || player.credential_token === novaId)
}

function validatePlayerForMatch({ player, match, league, selectedTeamId }) {
  if (!player) return { status: 'blocked', message: 'No se encontró al jugador.' }
  if (![match.home_team_id, match.away_team_id].includes(player.team_id)) return { status: 'blocked', message: 'Jugador registrado en otro partido.' }
  if (selectedTeamId && player.team_id !== selectedTeamId) return { status: 'review', message: 'Este jugador pertenece al equipo rival.' }
  if (player.approval_status && player.approval_status !== 'approved') return { status: 'review', message: 'Jugador requiere validación administrativa.' }
  if (player.status && !['active', 'approved'].includes(player.status)) return { status: 'blocked', message: 'Jugador no activo.' }
  const stats = league.playerStatsById.get(player.id)
  if (stats?.activeSanctions?.length) return { status: 'blocked', message: `Jugador suspendido: ${stats.activeSanctions[0].reason || 'no puede ser alineado'}.` }
  return { status: 'approved', message: 'Jugador registrado como presente.' }
}

function loadTimer(match) {
  const saved = window.localStorage.getItem(timerKey(match.id))
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      // Si el guardado local se corrompe, usamos la base.
    }
  }
  return {
    ...defaultTimer,
    period: match.current_period || '1T',
    started_at: match.live_started_at || null,
    paused_at: match.live_paused_at || null,
    accumulated_seconds: Number(match.live_accumulated_seconds || 0),
    running: Boolean(match.live_started_at && !match.live_paused_at && match.status === 'in_progress'),
    stoppage_seconds: Number(match.stoppage_seconds || 0),
  }
}

function currentElapsed(timer, now) {
  if (!timer.running || !timer.started_at) return Number(timer.accumulated_seconds || 0)
  return Number(timer.accumulated_seconds || 0) + Math.floor((now - new Date(timer.started_at).getTime()) / 1000)
}

function formatClock(seconds) {
  const mins = Math.floor(Math.max(0, seconds) / 60)
  const secs = Math.max(0, seconds) % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function timerKey(matchId) {
  return `nova-referee-timer-${matchId}`
}

function readRefereeMemory() {
  try {
    return JSON.parse(window.sessionStorage.getItem(refereeMemoryKey) || window.localStorage.getItem(refereeMemoryKey) || '{}')
  } catch {
    return {}
  }
}

function writeRefereeMemory(value) {
  const next = { ...readRefereeMemory(), ...value, updated_at: new Date().toISOString() }
  window.sessionStorage.setItem(refereeMemoryKey, JSON.stringify(next))
  window.localStorage.setItem(refereeMemoryKey, JSON.stringify(next))
}

function deviceId() {
  const key = 'nova-referee-device-id'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const id = crypto.randomUUID()
  window.localStorage.setItem(key, id)
  return id
}

function statusLabel(status) {
  if (status === 'in_progress') return 'EN VIVO'
  if (status === 'played') return 'En revisión'
  if (status === 'official') return 'Oficial'
  if (status === 'problem') return 'Problema'
  return 'Programado'
}

function eventIcon(type) {
  if (type === 'goal') return '⚽'
  if (type === 'yellow_card') return '🟨'
  if (type === 'red_card' || type === 'second_yellow') return '🟥'
  if (type === 'assist') return '🎯'
  if (type === 'substitution') return '🔁'
  return '📝'
}

function scoreAfterEvent(score, event, match) {
  if (event.event_type !== 'goal') return score
  if (event.team_id === match.home_team_id) return { ...score, home: score.home + 1 }
  if (event.team_id === match.away_team_id) return { ...score, away: score.away + 1 }
  return score
}

function scoreBeforeEvent(score, event, match) {
  const type = event.event_type || event.type
  if (type !== 'goal') return score
  if (event.team_id === match.home_team_id) return { ...score, home: Math.max(0, score.home - 1) }
  if (event.team_id === match.away_team_id) return { ...score, away: Math.max(0, score.away - 1) }
  return score
}

function eventLabel(type) {
  if (type === 'goal') return 'Gol'
  if (type === 'yellow_card') return 'Tarjeta amarilla'
  if (type === 'second_yellow') return 'Segunda amarilla'
  if (type === 'red_card') return 'Tarjeta roja'
  if (type === 'substitution') return 'Cambio'
  return 'Evento'
}
