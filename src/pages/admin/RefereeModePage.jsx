import { useEffect, useMemo, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Camera, CheckCircle, Clock, Pause, Play, Search, ShieldAlert, Square, TimerReset, Wifi, WifiOff } from 'lucide-react'
import Badge from '../../components/Badge'
import Crest from '../../components/Crest'
import PlayerAvatar from '../../components/PlayerAvatar'
import { saveRefereeAttendance, updateMatchLiveState } from '../../lib/adminApi'
import { useAuth } from '../../lib/AuthContext'
import { roles } from '../../lib/auth'
import { parseNovaId, playerNovaId, playerStatus } from '../../lib/novaId'
import { queueOfflineAction, readOfflineQueue } from '../../lib/offlineQueue'
import { syncOfflineQueue } from '../../lib/offlineSync'
import { hasSupabaseConfig } from '../../lib/supabase'

const filters = ['Hoy', 'Próximos', 'En vivo', 'Pendientes', 'Finalizados']
const periods = ['1T', 'Descanso', '2T', 'Finalizado', 'Suspendido']
const defaultTimer = { period: '1T', started_at: null, paused_at: null, accumulated_seconds: 0, running: false, stoppage_seconds: 0 }

export default function RefereeModePage({ league }) {
  const auth = useAuth()
  const [filter, setFilter] = useState('Hoy')
  const [manualCode, setManualCode] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [step, setStep] = useState('seleccion')
  const [online, setOnline] = useState(navigator.onLine)
  const [message, setMessage] = useState('')
  const canOpenAll = ['admin', 'superadmin', 'league_president', 'sports_coordinator', 'division_admin'].includes(auth.role)
  const referee = findRefereeForUser(league, auth)
  const assignedMatches = useMemo(() => getAssignedMatches({ league, referee, canOpenAll, filter }), [league, referee, canOpenAll, filter])
  const selectedMatch = league.matches.find((match) => match.id === selectedId)

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
            online={online}
            setMessage={setMessage}
            onBack={() => setStep('preparacion')}
          />
        )}
      </div>
    </main>
  )
}

function MatchSelection({ league, matches, filter, setFilter, manualCode, setManualCode, openManualCode, openMatch, referee, canOpenAll }) {
  return (
    <section className="space-y-5">
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

function LiveRefereeMatch({ league, match, online, setMessage, onBack }) {
  const [timer, setTimer] = useState(() => loadTimer(match))
  const [now, setNow] = useState(Date.now())
  const home = league.teamsById.get(match.home_team_id)
  const away = league.teamsById.get(match.away_team_id)
  const elapsed = currentElapsed(timer, now)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(timerKey(match.id), JSON.stringify(timer))
  }, [match.id, timer])

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
      queueOfflineAction({ type: 'match_live_state', payload: { matchId: match.id, patch, reason } })
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

  return (
    <section className="space-y-4">
      <button className="button-secondary" onClick={onBack}>Volver a preparación</button>
      <div className="sticky top-3 z-10 rounded-lg border border-gold/30 bg-black/95 p-4 shadow-gold">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Badge tone={timer.period === 'Finalizado' ? 'gold' : 'red'}>{timer.period === 'Finalizado' ? 'Finalizado' : 'EN VIVO'}</Badge>
          <span className="inline-flex items-center gap-2 text-xs text-slate-300">{online ? <Wifi size={16} /> : <WifiOff size={16} />}{online ? 'Sincronizado' : 'Pendiente de sincronizar'}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          <ScoreTeam team={home} score={match.home_score_live ?? match.home_score ?? 0} />
          <div>
            <p className="text-5xl font-black text-gold">{formatClock(elapsed)}</p>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{timer.period}</p>
          </div>
          <ScoreTeam team={away} score={match.away_score_live ?? match.away_score ?? 0} />
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
        <p className="mt-1 text-sm text-slate-400">Fase A deja listo el reloj profesional. Goles, tarjetas, cambios y deshacer entran en Fase B usando esta misma pantalla.</p>
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
