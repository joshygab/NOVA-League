import { useEffect, useRef, useState } from 'react'
import { Clock, FileText, Printer, Save, Search, ShieldCheck } from 'lucide-react'
import MatchCard from '../../components/MatchCard'
import { deleteDigitalMatchEvent, finalizeDigitalMatch, saveDigitalMatchEvent, saveMatchLineups, saveMatchReport } from '../../lib/adminApi'
import { goalTypes } from '../../lib/labels'
import { queueOfflineAction, readOfflineQueue } from '../../lib/offlineQueue'
import { syncOfflineQueue } from '../../lib/offlineSync'

const steps = ['Confirmar', 'Partido', 'Resumen', 'Firmas']
const quickEvents = [
  { id: 'goal', label: 'Gol', icon: '⚽' },
  { id: 'yellow_card', label: 'Tarjeta', icon: '🟨' },
  { id: 'substitution', label: 'Cambio', icon: '↔' },
  { id: 'injury', label: 'Lesión', icon: '+' },
  { id: 'observation', label: 'Observación', icon: '📝' },
  { id: 'mvp', label: 'MVP', icon: '★' },
]
const periodLimit = { '1T': 25 * 60, Descanso: 5 * 60, '2T': 25 * 60 }

export default function MatchSheetAdmin({ league, run, busy }) {
  const [step, setStep] = useState(0)
  const [matchId, setMatchId] = useState('')
  const match = league.matches.find((item) => item.id === matchId)
  const home = match ? league.teamsById.get(match.home_team_id) : null
  const away = match ? league.teamsById.get(match.away_team_id) : null
  const players = match ? league.players.filter((player) => [match.home_team_id, match.away_team_id].includes(player.team_id)) : []
  const homePlayers = players.filter((player) => player.team_id === match?.home_team_id)
  const awayPlayers = players.filter((player) => player.team_id === match?.away_team_id)
  const existingReport = league.reports.find((report) => report.match_id === matchId)
  const existingLineups = league.lineups.filter((lineup) => lineup.match_id === matchId)
  const [presentIds, setPresentIds] = useState(new Set(existingLineups.filter((row) => row.is_present).map((row) => row.player_id)))
  const [captains, setCaptains] = useState({})
  const [query, setQuery] = useState('')
  const [report, setReport] = useState({ referee_name: '', venue: '', start_time: '', observations: '', ...existingReport })
  const [eventForm, setEventForm] = useState({ event_type: 'goal', team_id: '', player_id: '', related_player_id: '', minute: '', goal_type: 'open_play', detail: '' })
  const [signatures, setSignatures] = useState({ referee_signature: existingReport?.referee_signature || '', home_captain_signature: existingReport?.home_captain_signature || '', away_captain_signature: existingReport?.away_captain_signature || '' })
  const [activeTeam, setActiveTeam] = useState('home')
  const [activeEvent, setActiveEvent] = useState('')
  const [published, setPublished] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const savedTimer = existingReport?.report_data?.timer || {}
  const [timer, setTimer] = useState({ seconds: savedTimer.seconds || 0, period: savedTimer.period || '1T', running: false, extra: savedTimer.extra || 0 })

  const matchEvents = league.events.filter((event) => event.match_id === matchId)
  const goals = league.goals.filter((goal) => goal.match_id === matchId)
  const cards = league.cards.filter((card) => card.match_id === matchId)
  const homeScore = goals.filter((goal) => goal.team_id === match?.home_team_id).length
  const awayScore = goals.filter((goal) => goal.team_id === match?.away_team_id).length
  const selectedTeamPlayers = players.filter((player) => player.team_id === eventForm.team_id)

  useEffect(() => {
    const lineups = league.lineups.filter((lineup) => lineup.match_id === matchId)
    setPresentIds(new Set(lineups.filter((row) => row.is_present).map((row) => row.player_id)))
    const currentReport = league.reports.find((item) => item.match_id === matchId)
    setReport({ referee_name: '', venue: '', start_time: '', observations: '', ...(currentReport || {}) })
    setSignatures({
      referee_signature: currentReport?.referee_signature || '',
      home_captain_signature: currentReport?.home_captain_signature || '',
      away_captain_signature: currentReport?.away_captain_signature || '',
    })
    const localTimer = readTimer(matchId)
    const reportTimer = currentReport?.report_data?.timer
    setTimer({ seconds: localTimer?.seconds ?? reportTimer?.seconds ?? 0, period: localTimer?.period || reportTimer?.period || '1T', running: false, extra: localTimer?.extra ?? reportTimer?.extra ?? 0 })
    setPublished(false)
  }, [matchId, league.lineups, league.reports])

  useEffect(() => {
    if (!matchId || !timer.running) return undefined
    const tick = window.setInterval(() => {
      setTimer((current) => {
        const limit = (periodLimit[current.period] || 0) + Number(current.extra || 0) * 60
        const seconds = current.seconds + 1
        const next = { ...current, seconds, running: limit ? seconds < limit : current.running }
        persistTimer(matchId, next)
        return next
      })
    }, 1000)
    return () => window.clearInterval(tick)
  }, [matchId, timer.running])

  useEffect(() => {
    if (matchId) persistTimer(matchId, timer)
  }, [matchId, timer])

  useEffect(() => {
    async function updateOnline() {
      setOnline(navigator.onLine)
      if (navigator.onLine && readOfflineQueue().length > 0) {
        await syncOfflineQueue()
        league.reload?.()
      }
    }
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  function togglePlayer(playerId) {
    const next = new Set(presentIds)
    if (next.has(playerId)) next.delete(playerId)
    else next.add(playerId)
    setPresentIds(next)
  }

  function selectTeam(teamPlayers, selected) {
    const next = new Set(presentIds)
    teamPlayers.forEach((player) => selected ? next.add(player.id) : next.delete(player.id))
    setPresentIds(next)
  }

  async function savePreparation() {
    if (!match) return
    const presentPlayers = players.filter((player) => presentIds.has(player.id))
    await run(() => saveMatchLineups({ match, presentPlayers, captains }), 'Alineaciones guardadas')
    await run(() => saveMatchReport({ ...report, ...signatures, match_id: match.id, status: 'draft', report_data: { ...(report.report_data || {}), timer } }), 'Acta preparada')
    setStep(1)
  }

  async function addEvent(type = eventForm.event_type) {
    if (!match) return
    const payload = { ...eventForm, event_type: type, minute: eventForm.minute || currentMinute(timer), match_id: match.id, division_id: match.division_id }
    if (!online) {
      queueOfflineAction({ type: 'match_event', payload })
      setEventForm({ event_type: type, team_id: '', player_id: '', related_player_id: '', minute: '', goal_type: 'open_play', detail: '' })
      setActiveEvent('')
      return
    }
    await run(() => saveDigitalMatchEvent(payload), 'Evento guardado')
    setEventForm({ event_type: type, team_id: '', player_id: '', related_player_id: '', minute: '', goal_type: 'open_play', detail: '' })
    setActiveEvent('')
  }

  async function removeEvent(event) {
    await run(() => deleteDigitalMatchEvent(event), 'Evento eliminado')
  }

  function printReport() {
    window.print()
  }

  async function finishMatch() {
    if (!match) return
    await run(() => finalizeDigitalMatch({ match, report: { ...report, ...signatures, report_data: { ...(report.report_data || {}), timer } }, score: { home: homeScore, away: awayScore } }), 'Partido finalizado y acta guardada')
    setPublished(true)
  }

  return (
    <>
    <section className="screen-only space-y-5">
      <div className="panel p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Acta Digital de Partido</h2>
            <p className="text-sm text-gold">Si no hay internet, usa la hoja NOVA-F04 como respaldo.</p>
            {!online && <p className="mt-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold">Sin conexión: los eventos se guardarán en este dispositivo para sincronizarlos después.</p>}
          </div>
          <button className="button-secondary" onClick={printReport}><Printer size={16} />PDF</button>
        </div>
        <select className="input" value={matchId} onChange={(event) => setMatchId(event.target.value)}>
          <option value="">Seleccionar partido</option>
          {league.matches.map((item) => <option key={item.id} value={item.id}>J{item.round} {league.teamsById.get(item.home_team_id)?.name} vs {league.teamsById.get(item.away_team_id)?.name}</option>)}
        </select>
      </div>

      {match && (
        <>
          <div className="rounded-lg border border-gold/20 bg-black/70 p-3">
            <p className="mb-3 text-sm font-black text-gold">Paso {step + 1} de 4 · {steps[step]}</p>
            <div className="grid grid-cols-4 gap-2">
              {steps.map((label, index) => <button key={label} onClick={() => setStep(index)} className={step === index ? 'button min-h-10 px-2 text-xs sm:text-sm' : 'button-secondary min-h-10 px-2 text-xs sm:text-sm'}>{label}</button>)}
            </div>
          </div>

          <div className="print:block">
            {step === 0 && <PrepareStep match={match} home={home} away={away} homePlayers={homePlayers} awayPlayers={awayPlayers} presentIds={presentIds} captains={captains} setCaptains={setCaptains} togglePlayer={togglePlayer} selectTeam={selectTeam} query={query} setQuery={setQuery} report={report} setReport={setReport} onSave={savePreparation} busy={busy} activeTeam={activeTeam} setActiveTeam={setActiveTeam} sanctions={league.sanctions} />}
            {step === 1 && <ActionsStep match={match} home={home} away={away} homeScore={homeScore} awayScore={awayScore} form={eventForm} setForm={setEventForm} players={selectedTeamPlayers} teams={[home, away].filter(Boolean)} allPlayers={players} onAdd={addEvent} onDelete={removeEvent} busy={busy} events={matchEvents} league={league} timer={timer} setTimer={setTimer} activeEvent={activeEvent} setActiveEvent={setActiveEvent} />}
            {step === 2 && <ReviewStep match={match} league={league} goals={goals} cards={cards} events={matchEvents} homeScore={homeScore} awayScore={awayScore} report={report} setReport={setReport} onNext={() => setStep(3)} />}
            {step === 3 && <SignStep signatures={signatures} setSignatures={setSignatures} match={match} league={league} homeScore={homeScore} awayScore={awayScore} onPrint={printReport} onFinish={finishMatch} busy={busy} published={published} />}
          </div>
        </>
      )}
    </section>
    {match && <PrintableReport match={match} league={league} homeScore={homeScore} awayScore={awayScore} goals={goals} cards={cards} events={matchEvents} report={report} signatures={signatures} lineups={league.lineups.filter((lineup) => lineup.match_id === match.id)} />}
    </>
  )
}

function readTimer(matchId) {
  if (!matchId) return null
  try {
    return JSON.parse(window.localStorage.getItem(`nova-match-timer-${matchId}`) || 'null')
  } catch {
    return null
  }
}

function persistTimer(matchId, timer) {
  if (!matchId) return
  window.localStorage.setItem(`nova-match-timer-${matchId}`, JSON.stringify(timer))
}

function currentMinute(timer) {
  if (!timer.seconds) return ''
  const offset = timer.period === '2T' ? 25 : 0
  return Math.max(1, Math.ceil(timer.seconds / 60) + offset)
}

function PrepareStep({ match, home, away, homePlayers, awayPlayers, presentIds, captains, setCaptains, togglePlayer, selectTeam, query, setQuery, report, setReport, onSave, busy, activeTeam, setActiveTeam, sanctions }) {
  const activePlayers = activeTeam === 'home' ? homePlayers : awayPlayers
  const activeTitle = activeTeam === 'home' ? home?.name : away?.name
  const activeId = activeTeam === 'home' ? home?.id : away?.id
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="panel space-y-4 p-4">
        <MatchCard match={match} teamsById={new Map([[home?.id, home], [away?.id, away]])} playersById={new Map()} />
        <p className="text-sm text-slate-400">Marca a los jugadores que llegaron al partido.</p>
        <input className="input" placeholder="Árbitro" value={report.referee_name || ''} onChange={(event) => setReport({ ...report, referee_name: event.target.value })} />
        <input className="input" placeholder="Cancha" value={report.venue || ''} onChange={(event) => setReport({ ...report, venue: event.target.value })} />
        <input className="input" type="time" value={report.start_time || ''} onChange={(event) => setReport({ ...report, start_time: event.target.value })} />
        <button className="button w-full" disabled={busy} onClick={onSave}><Save size={16} />CONTINUAR AL PARTIDO</button>
      </div>
      <div className="space-y-4">
        <label className="relative block"><Search className="absolute left-3 top-3 text-slate-500" size={18} /><input className="input pl-10" placeholder="Buscar jugador" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <div className="grid grid-cols-2 gap-2 lg:hidden">
          <button className={activeTeam === 'home' ? 'button' : 'button-secondary'} onClick={() => setActiveTeam('home')}>Local</button>
          <button className={activeTeam === 'away' ? 'button' : 'button-secondary'} onClick={() => setActiveTeam('away')}>Visitante</button>
        </div>
        <div className="lg:hidden">
          <Roster title={activeTitle} players={activePlayers} query={query} presentIds={presentIds} captain={captains[activeId]} onCaptain={(playerId) => setCaptains({ ...captains, [activeId]: playerId })} togglePlayer={togglePlayer} selectAll={(rows) => selectTeam(rows, true)} clear={() => selectTeam(activePlayers, false)} sanctions={sanctions} />
        </div>
        <div className="hidden space-y-4 lg:block">
          <Roster title={home?.name} players={homePlayers} query={query} presentIds={presentIds} captain={captains[home?.id]} onCaptain={(playerId) => setCaptains({ ...captains, [home.id]: playerId })} togglePlayer={togglePlayer} selectAll={(rows) => selectTeam(rows, true)} clear={() => selectTeam(homePlayers, false)} sanctions={sanctions} />
          <Roster title={away?.name} players={awayPlayers} query={query} presentIds={presentIds} captain={captains[away?.id]} onCaptain={(playerId) => setCaptains({ ...captains, [away.id]: playerId })} togglePlayer={togglePlayer} selectAll={(rows) => selectTeam(rows, true)} clear={() => selectTeam(awayPlayers, false)} sanctions={sanctions} />
        </div>
      </div>
    </section>
  )
}

function Roster({ title, players, query, presentIds, captain, onCaptain, togglePlayer, selectAll, clear, sanctions }) {
  const rows = players.filter((player) => player.name.toLowerCase().includes(query.toLowerCase()))
  const availableRows = rows.filter((player) => !sanctions?.some((sanction) => sanction.player_id === player.id && sanction.status === 'active'))
  return (
    <div className="panel p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-black">{title}</h3><div className="flex gap-2"><button className="button-secondary min-h-9 px-3 py-1 text-xs" onClick={() => selectAll(availableRows)}>Todos</button><button className="button-secondary min-h-9 px-3 py-1 text-xs" onClick={clear}>Limpiar</button></div></div>
      <div className="space-y-2">{rows.map((player) => {
        const suspended = sanctions?.some((sanction) => sanction.player_id === player.id && sanction.status === 'active')
        return (
          <label key={player.id} className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${suspended ? 'border-red-400/30 bg-red-500/10 text-red-100' : 'border-white/10 bg-white/5'}`}>
            <span>
              <input className="mr-2" type="checkbox" disabled={suspended} checked={!suspended && presentIds.has(player.id)} onChange={() => togglePlayer(player.id)} />
              #{player.number || '--'} {player.name}
              <span className="ml-2 text-xs">{suspended ? '🔴 Suspendido' : '🟢 Activo'}</span>
            </span>
            <input type="radio" name={`captain-${title}`} disabled={suspended} checked={captain === player.id} onChange={() => onCaptain(player.id)} />
          </label>
        )
      })}</div>
    </div>
  )
}

function ActionsStep({ home, away, homeScore, awayScore, form, setForm, players, teams, allPlayers, onAdd, onDelete, busy, events, league, timer, setTimer, activeEvent, setActiveEvent }) {
  function openEvent(type) {
    setActiveEvent(type)
    setForm({ ...form, event_type: type, minute: currentMinute(timer) })
  }

  return (
    <section className="space-y-4">
      <div className="panel p-5 text-center">
        <p className="text-sm text-slate-400">Registra lo que acaba de pasar.</p>
        <h2 className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xl font-black sm:text-3xl">
          <span className="truncate text-right">{home?.name}</span>
          <span className="rounded-lg border border-gold/30 bg-black px-4 py-2 text-4xl text-gold">{homeScore} - {awayScore}</span>
          <span className="truncate text-left">{away?.name}</span>
        </h2>
        <TimerPanel timer={timer} setTimer={setTimer} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {quickEvents.map((event) => <button key={event.id} className="button min-h-20 flex-col text-base" onClick={() => openEvent(event.id)}><span className="text-2xl">{event.icon}</span>{event.label}</button>)}
        <button className="button-secondary min-h-20 flex-col border-gold/30 text-gold" onClick={() => setActiveEvent('finalizar')}><span className="text-2xl">✓</span>Finalizar</button>
      </div>

      <Timeline events={events} league={league} onDelete={onDelete} busy={busy} />

      {activeEvent && activeEvent !== 'finalizar' && (
        <ActionSheet form={form} setForm={setForm} players={players} allPlayers={allPlayers} teams={teams} onAdd={onAdd} busy={busy} onClose={() => setActiveEvent('')} />
      )}
      {activeEvent === 'finalizar' && (
        <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-gold/30 bg-black p-5 shadow-gold sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2">
          <h3 className="text-xl font-black">¿Terminó el partido?</h3>
          <p className="mt-1 text-sm text-slate-400">Pasa al resumen para revisar antes de publicar.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="button-secondary" onClick={() => setActiveEvent('')}>Cancelar</button>
            <button className="button" onClick={() => { setTimer({ ...timer, running: false, period: 'Finalizado' }); setActiveEvent('') }}>Finalizar tiempo</button>
          </div>
        </div>
      )}
    </section>
  )
}

function TimerPanel({ timer, setTimer }) {
  const limit = (periodLimit[timer.period] || 0) + Number(timer.extra || 0) * 60
  const ended = limit > 0 && timer.seconds >= limit
  function nextPeriod() {
    if (timer.period === '1T') setTimer({ seconds: 0, period: 'Descanso', running: false, extra: 0 })
    else if (timer.period === 'Descanso') setTimer({ seconds: 0, period: '2T', running: false, extra: 0 })
    else setTimer({ ...timer, running: false, period: 'Finalizado' })
  }
  return (
    <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-center gap-2 text-gold"><Clock size={22} /><span className="text-4xl font-black tabular-nums">{formatTime(timer.seconds)}</span></div>
      <p className="mt-1 text-sm font-bold text-slate-300">{timer.period}{timer.extra ? ` +${timer.extra}` : ''}</p>
      {ended && <p className="mt-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold">Alerta: terminó {timer.period}. El tiempo oficial lo decide el árbitro.</p>}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button className="button-secondary" onClick={() => setTimer({ ...timer, running: true })}>{timer.seconds ? 'Reanudar' : 'Iniciar'}</button>
        <button className="button-secondary" onClick={() => setTimer({ ...timer, running: false })}>Pausar</button>
        <button className="button-secondary" onClick={nextPeriod}>Finalizar tiempo</button>
        <button className="button-secondary" onClick={() => setTimer({ ...timer, extra: Number(timer.extra || 0) + 1 })}>+ Tiempo extra</button>
      </div>
    </div>
  )
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const rest = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${rest}`
}

function Timeline({ events, league, onDelete, busy }) {
  const last = [...events].sort((a, b) => Number(b.minute || 0) - Number(a.minute || 0)).slice(0, 5)
  return (
    <div className="panel p-4">
      <h3 className="mb-3 font-black">Últimos eventos</h3>
      <div className="space-y-2">
        {last.length === 0 && <p className="text-sm text-slate-400">Aún no hay eventos.</p>}
        {last.map((event) => (
          <div key={event.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm">
            <p>{event.minute}' {eventIcon(event.event_type || event.type)} {league.playersById.get(event.player_id)?.name || 'Jugador'} · {league.teamsById.get(event.team_id)?.name || ''}</p>
            <button className="text-xs font-bold text-red-200" disabled={busy} onClick={() => onDelete(event)}>Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function eventIcon(type) {
  if (type === 'goal') return '⚽'
  if (type === 'yellow_card') return '🟨'
  if (type === 'red_card') return '🟥'
  if (type === 'substitution') return '↔'
  if (type === 'mvp') return '★'
  return '•'
}

function ActionSheet({ form, setForm, players, allPlayers, teams, onAdd, busy, onClose }) {
  const isCard = form.event_type === 'yellow_card' || form.event_type === 'red_card'
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 max-h-[86vh] overflow-y-auto rounded-t-2xl border border-gold/30 bg-black p-5 shadow-gold sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xl font-black">¿Qué pasó?</h3>
        <button className="button-secondary min-h-9 px-3 py-1" onClick={onClose}>Cerrar</button>
      </div>
      <div className="space-y-3">
        <Select label="Equipo" value={form.team_id} onChange={(team_id) => setForm({ ...form, team_id, player_id: '', related_player_id: '' })} options={teams} />
        <Select label="Jugador" value={form.player_id} onChange={(player_id) => setForm({ ...form, player_id })} options={players} />
        <input className="input" placeholder="Minuto" value={form.minute} onChange={(event) => setForm({ ...form, minute: event.target.value })} />
        {form.event_type === 'goal' && <Select label="Tipo de gol" value={form.goal_type} onChange={(goal_type) => setForm({ ...form, goal_type })} options={goalTypes} />}
        {form.event_type === 'goal' && <Select label="Asistencia opcional" value={form.related_player_id} onChange={(related_player_id) => setForm({ ...form, related_player_id })} options={players.filter((player) => player.id !== form.player_id)} />}
        {isCard && <Select label="Tipo de tarjeta" value={form.card_type || 'yellow_card'} onChange={(card_type) => setForm({ ...form, event_type: card_type, card_type })} options={[{ id: 'yellow_card', name: 'Amarilla' }, { id: 'red_card', name: 'Roja' }]} />}
        {isCard && <Select label="Motivo rápido" value={form.detail || ''} onChange={(detail) => setForm({ ...form, detail })} options={['Conducta antideportiva', 'Juego brusco', 'Reclamos', 'Insultos', 'Agresión', 'Doble amarilla', 'Otro'].map((name) => ({ id: name, name }))} />}
        {form.event_type === 'substitution' && <Select label="Jugador que entra" value={form.related_player_id} onChange={(related_player_id) => setForm({ ...form, related_player_id })} options={allPlayers.filter((player) => player.team_id === form.team_id && player.id !== form.player_id)} />}
        <textarea className="input min-h-24" placeholder="Observación opcional" value={form.detail || ''} onChange={(event) => setForm({ ...form, detail: event.target.value })} />
        <button className="button min-h-14 w-full" disabled={busy} onClick={() => onAdd(form.event_type)}>Guardar</button>
      </div>
    </div>
  )
}

function ReviewStep({ league, goals, cards, events, homeScore, awayScore, report, setReport, onNext }) {
  return <section className="panel space-y-4 p-4"><h2 className="text-2xl font-black">Revisa antes de publicar</h2><p className="text-3xl font-black text-gold">Resultado: {homeScore} - {awayScore}</p><Summary title="Goles" rows={goals.map((goal) => `${goal.minute}' ${league.playersById.get(goal.player_id)?.name || 'Jugador'}`)} /><Summary title="Tarjetas" rows={cards.map((card) => `${card.minute}' ${league.playersById.get(card.player_id)?.name || 'Jugador'} · ${card.type}`)} /><Summary title="Incidencias" rows={events.filter((event) => !['goal', 'assist'].includes(event.type)).map((event) => `${event.minute}' ${event.event_type || event.type} · ${event.detail || ''}`)} /><textarea className="input min-h-32" placeholder="Observaciones finales" value={report.observations || ''} onChange={(event) => setReport({ ...report, observations: event.target.value })} /><button className="button min-h-14 w-full" onClick={onNext}>Continuar a firmas</button></section>
}

function Summary({ title, rows }) {
  return <div><h3 className="mb-2 font-black">{title}</h3><div className="space-y-2">{rows.length ? rows.map((row, index) => <p key={`${row}-${index}`} className="rounded-lg bg-white/5 px-3 py-2 text-sm">{row}</p>) : <p className="text-sm text-slate-400">Sin registros.</p>}</div></div>
}

function SignStep({ signatures, setSignatures, match, league, homeScore, awayScore, onPrint, onFinish, busy, published }) {
  if (published) {
    return (
      <section className="panel space-y-4 p-6 text-center">
        <ShieldCheck className="mx-auto text-gold" size={48} />
        <h2 className="text-3xl font-black">Resultado publicado correctamente</h2>
        <p className="text-sm text-slate-400">El resultado se actualizará en la app pública, tabla, estadísticas y Match Center.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button className="button-secondary" onClick={onPrint}>Compartir resumen</button>
          <a className="button" href={`/match/${match.id}`}>Ver partido</a>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="panel p-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-gold" />
          <div>
            <p className="text-sm text-slate-400">NOVA-F05</p>
            <h2 className="text-2xl font-black">Firmar y publicar</h2>
          </div>
        </div>
        <p className="mt-3 text-4xl font-black text-gold">{homeScore} - {awayScore}</p>
        <MatchCard match={{ ...match, status: 'played', home_score: homeScore, away_score: awayScore }} teamsById={league.teamsById} playersById={league.playersById} />
      </div>
      <section className="grid gap-4 md:grid-cols-3">
        <SignaturePad title="Firma capitán local" value={signatures.home_captain_signature} onChange={(value) => setSignatures({ ...signatures, home_captain_signature: value })} />
        <SignaturePad title="Firma capitán visitante" value={signatures.away_captain_signature} onChange={(value) => setSignatures({ ...signatures, away_captain_signature: value })} />
        <SignaturePad title="Firma árbitro" value={signatures.referee_signature} onChange={(value) => setSignatures({ ...signatures, referee_signature: value })} />
      </section>
      <div className="grid gap-2 sm:grid-cols-2">
        <button className="button-secondary min-h-14" onClick={onPrint}><Printer size={16} />Guardar borrador / PDF</button>
        <button className="button min-h-14" disabled={busy} onClick={onFinish}><FileText size={16} />Publicar resultado</button>
      </div>
    </section>
  )
}

function SignaturePad({ title, value, onChange }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  function point(event) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const touch = event.touches?.[0]
    return { x: (touch?.clientX ?? event.clientX) - rect.left, y: (touch?.clientY ?? event.clientY) - rect.top }
  }
  function start(event) { drawing.current = true; const ctx = canvasRef.current.getContext('2d'); const p = point(event); ctx.beginPath(); ctx.moveTo(p.x, p.y) }
  function move(event) { if (!drawing.current) return; event.preventDefault(); const ctx = canvasRef.current.getContext('2d'); const p = point(event); ctx.lineWidth = 3; ctx.strokeStyle = '#f5c542'; ctx.lineTo(p.x, p.y); ctx.stroke(); onChange(canvasRef.current.toDataURL('image/png')) }
  function clear() { const canvas = canvasRef.current; canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); onChange('') }
  return <div className="panel p-4"><h3 className="mb-3 font-black">{title}</h3>{value && <img src={value} alt={title} className="mb-3 h-24 w-full rounded-lg border border-gold/30 object-contain" />}<canvas ref={canvasRef} width="420" height="180" className="h-44 w-full touch-none rounded-lg border border-gold/30 bg-black" onMouseDown={start} onMouseMove={move} onMouseUp={() => { drawing.current = false }} onMouseLeave={() => { drawing.current = false }} onTouchStart={start} onTouchMove={move} onTouchEnd={() => { drawing.current = false }} /><button className="button-secondary mt-3 w-full" onClick={clear}>Limpiar firma</button></div>
}

function FinalizeStep({ match, league, homeScore, awayScore, onPrint, onFinish, busy }) {
  return <section className="panel space-y-4 p-5"><div className="flex items-center gap-3"><ShieldCheck className="text-gold" /><div><p className="text-sm text-slate-400">NOVA-F05</p><h2 className="text-2xl font-black">Cédula Oficial del Partido</h2></div></div><p className="text-4xl font-black text-gold">{homeScore} - {awayScore}</p><MatchCard match={{ ...match, status: 'played', home_score: homeScore, away_score: awayScore }} teamsById={league.teamsById} playersById={league.playersById} /><div className="flex flex-wrap gap-2"><button className="button-secondary" onClick={onPrint}><Printer size={16} />Generar PDF</button><button className="button" disabled={busy} onClick={onFinish}><FileText size={16} />Finalizar partido</button></div></section>
}

function Select({ label, value, onChange, options }) {
  return <label className="block text-sm font-bold">{label}<select className="input mt-2" value={value || ''} onChange={(event) => onChange(event.target.value)}><option value="">Seleccionar</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
}

function PrintableReport({ match, league, homeScore, awayScore, goals, cards, events, report, signatures, lineups }) {
  const home = league.teamsById.get(match.home_team_id)
  const away = league.teamsById.get(match.away_team_id)
  const division = league.divisionsById.get(match.division_id)
  const reportData = report.report_data || {}
  const folio = reportData.folio || `NOVA-F05-${String(match.id).slice(0, 8).toUpperCase()}`
  const verification = reportData.verification_code || 'Pendiente'
  const version = reportData.version || 1
  const rows = (title, items) => (
    <section style={{ marginTop: 18 }}>
      <h3 style={{ borderBottom: '1px solid #111827', paddingBottom: 4 }}>{title}</h3>
      {items.length ? items.map((item, index) => <p key={index} style={{ margin: '6px 0' }}>{item}</p>) : <p>Sin registros.</p>}
    </section>
  )

  return (
    <article className="print-only" style={{ padding: 30, fontFamily: 'Arial, sans-serif', color: '#111827' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'center', borderBottom: '4px solid #111827', paddingBottom: 16 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 900, letterSpacing: 2 }}>NOVA LEAGUE</p>
          <h1 style={{ margin: '6px 0 0', fontSize: 28 }}>NOVA-F05 - Cédula Oficial del Partido</h1>
          <p style={{ margin: '6px 0 0', fontSize: 12 }}>Folio: <b>{folio}</b> · Versión: <b>{version}</b></p>
        </div>
        <div style={{ minWidth: 170, border: '2px solid #111827', padding: 10, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800 }}>QR / VERIFICACIÓN</p>
          <div style={{ display: 'grid', placeItems: 'center', height: 76, margin: '8px auto', border: '1px dashed #111827', fontSize: 10 }}>
            {verification}
          </div>
          <p style={{ margin: 0, fontSize: 10 }}>Abrir Match Center: /match/{match.id}</p>
        </div>
        <div style={{ textAlign: 'right', minWidth: 160 }}>
          <p style={{ margin: 0 }}>División: {division?.name || 'N/D'}</p>
          <p style={{ margin: 0 }}>Jornada: {match.round}</p>
          <p style={{ margin: 0 }}>Fecha: {match.match_date ? new Date(match.match_date).toLocaleDateString('es-MX') : 'N/D'}</p>
          <p style={{ margin: 0 }}>Estado: {report.status || 'draft'}</p>
        </div>
      </header>
      <section style={{ marginTop: 20, border: '2px solid #111827', padding: 16, textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800 }}>MARCADOR FINAL</p>
        <h2 style={{ margin: '8px 0', fontSize: 28 }}>{home?.name} {homeScore} - {awayScore} {away?.name}</h2>
        <p style={{ margin: 0 }}>Cancha: {report.venue || match.venue || 'N/D'} · Árbitro: {report.referee_name || 'N/D'} · Hora: {report.start_time || 'N/D'}</p>
      </section>
      {rows('Alineaciones', lineups.map((row) => `${league.teamsById.get(row.team_id)?.name}: ${league.playersById.get(row.player_id)?.name}${row.captain ? ' (Capitán)' : ''}`))}
      {rows('Goleadores', goals.map((goal) => `${goal.minute}' ${league.playersById.get(goal.player_id)?.name} - ${league.teamsById.get(goal.team_id)?.name}`))}
      {rows('Tarjetas', cards.map((card) => `${card.minute}' ${league.playersById.get(card.player_id)?.name} - ${card.type}`))}
      {rows('Incidencias', events.filter((event) => !['goal', 'assist'].includes(event.type)).map((event) => `${event.minute}' ${event.event_type || event.type} ${event.detail || ''}`))}
      {rows('Observaciones', [report.observations || 'Sin observaciones.'])}
      {rows('Historial de versiones', (reportData.versions || []).map((item) => `Versión ${item.version} · ${item.status || 'draft'} · ${item.saved_at ? new Date(item.saved_at).toLocaleString('es-MX') : 'Sin fecha'}`))}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginTop: 36 }}>
        <SignaturePrint title="Árbitro" src={signatures.referee_signature} />
        <SignaturePrint title="Capitán local" src={signatures.home_captain_signature} />
        <SignaturePrint title="Capitán visitante" src={signatures.away_captain_signature} />
      </section>
      <footer style={{ marginTop: 28, borderTop: '1px solid #111827', paddingTop: 10, fontSize: 10 }}>
        Documento generado por NOVA Admin. La aprobación administrativa convierte el resultado en oficial y actualiza estadísticas.
      </footer>
    </article>
  )
}

function SignaturePrint({ title, src }) {
  return <div style={{ textAlign: 'center' }}>{src ? <img src={src} alt={title} style={{ height: 80, maxWidth: '100%', objectFit: 'contain' }} /> : <div style={{ height: 80 }} />}<div style={{ borderTop: '1px solid #111827', paddingTop: 6 }}>{title}</div></div>
}
