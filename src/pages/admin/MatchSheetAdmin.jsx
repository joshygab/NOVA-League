import { useRef, useState } from 'react'
import { FileText, Printer, Save, Search, ShieldCheck } from 'lucide-react'
import MatchCard from '../../components/MatchCard'
import { finalizeDigitalMatch, saveDigitalMatchEvent, saveMatchLineups, saveMatchReport } from '../../lib/adminApi'
import { goalTypes } from '../../lib/labels'

const steps = ['Preparar', 'Acciones', 'Revisar', 'Firmar', 'Finalizar']
const quickEvents = [
  { id: 'goal', label: 'Gol' },
  { id: 'assist', label: 'Asistencia' },
  { id: 'yellow_card', label: 'Amarilla' },
  { id: 'red_card', label: 'Roja' },
  { id: 'substitution', label: 'Cambio' },
  { id: 'injury', label: 'Lesión' },
  { id: 'mvp', label: 'MVP' },
  { id: 'observation', label: 'Observación' },
]

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

  const matchEvents = league.events.filter((event) => event.match_id === matchId)
  const goals = league.goals.filter((goal) => goal.match_id === matchId)
  const cards = league.cards.filter((card) => card.match_id === matchId)
  const homeScore = goals.filter((goal) => goal.team_id === match?.home_team_id).length
  const awayScore = goals.filter((goal) => goal.team_id === match?.away_team_id).length
  const selectedTeamPlayers = players.filter((player) => player.team_id === eventForm.team_id)

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
    await run(() => saveMatchReport({ ...report, ...signatures, match_id: match.id, status: 'draft' }), 'Acta preparada')
  }

  async function addEvent(type = eventForm.event_type) {
    if (!match) return
    await run(() => saveDigitalMatchEvent({ ...eventForm, event_type: type, match_id: match.id, division_id: match.division_id }), 'Evento guardado')
    setEventForm({ event_type: type, team_id: '', player_id: '', related_player_id: '', minute: '', goal_type: 'open_play', detail: '' })
  }

  function printReport() {
    window.print()
  }

  async function finishMatch() {
    if (!match) return
    await run(() => finalizeDigitalMatch({ match, report: { ...report, ...signatures }, score: { home: homeScore, away: awayScore } }), 'Partido finalizado y acta guardada')
  }

  return (
    <>
    <section className="screen-only space-y-5">
      <div className="panel p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Acta Digital de Partido</h2>
            <p className="text-sm text-gold">Si no hay internet, usa la hoja NOVA-F04 como respaldo.</p>
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
          <div className="flex gap-2 overflow-x-auto pb-2">
            {steps.map((label, index) => <button key={label} onClick={() => setStep(index)} className={step === index ? 'button whitespace-nowrap' : 'button-secondary whitespace-nowrap'}>{label}</button>)}
          </div>

          <div className="print:block">
            {step === 0 && <PrepareStep match={match} home={home} away={away} homePlayers={homePlayers} awayPlayers={awayPlayers} presentIds={presentIds} captains={captains} setCaptains={setCaptains} togglePlayer={togglePlayer} selectTeam={selectTeam} query={query} setQuery={setQuery} report={report} setReport={setReport} onSave={savePreparation} busy={busy} />}
            {step === 1 && <ActionsStep match={match} home={home} away={away} homeScore={homeScore} awayScore={awayScore} form={eventForm} setForm={setEventForm} players={selectedTeamPlayers} teams={[home, away].filter(Boolean)} onAdd={addEvent} busy={busy} />}
            {step === 2 && <ReviewStep match={match} league={league} goals={goals} cards={cards} events={matchEvents} homeScore={homeScore} awayScore={awayScore} report={report} setReport={setReport} />}
            {step === 3 && <SignStep signatures={signatures} setSignatures={setSignatures} />}
            {step === 4 && <FinalizeStep match={match} league={league} homeScore={homeScore} awayScore={awayScore} onPrint={printReport} onFinish={finishMatch} busy={busy} />}
          </div>
        </>
      )}
    </section>
    {match && <PrintableReport match={match} league={league} homeScore={homeScore} awayScore={awayScore} goals={goals} cards={cards} events={matchEvents} report={report} signatures={signatures} lineups={league.lineups.filter((lineup) => lineup.match_id === match.id)} />}
    </>
  )
}

function PrepareStep({ match, home, away, homePlayers, awayPlayers, presentIds, captains, setCaptains, togglePlayer, selectTeam, query, setQuery, report, setReport, onSave, busy }) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="panel space-y-4 p-4">
        <MatchCard match={match} teamsById={new Map([[home?.id, home], [away?.id, away]])} playersById={new Map()} />
        <input className="input" placeholder="Árbitro" value={report.referee_name || ''} onChange={(event) => setReport({ ...report, referee_name: event.target.value })} />
        <input className="input" placeholder="Cancha" value={report.venue || ''} onChange={(event) => setReport({ ...report, venue: event.target.value })} />
        <input className="input" type="time" value={report.start_time || ''} onChange={(event) => setReport({ ...report, start_time: event.target.value })} />
        <button className="button w-full" disabled={busy} onClick={onSave}><Save size={16} />Guardar preparación</button>
      </div>
      <div className="space-y-4">
        <label className="relative block"><Search className="absolute left-3 top-3 text-slate-500" size={18} /><input className="input pl-10" placeholder="Buscar jugador" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <Roster title={home?.name} teamId={home?.id} players={homePlayers} query={query} presentIds={presentIds} captain={captains[home?.id]} onCaptain={(playerId) => setCaptains({ ...captains, [home.id]: playerId })} togglePlayer={togglePlayer} selectAll={() => selectTeam(homePlayers, true)} clear={() => selectTeam(homePlayers, false)} />
        <Roster title={away?.name} teamId={away?.id} players={awayPlayers} query={query} presentIds={presentIds} captain={captains[away?.id]} onCaptain={(playerId) => setCaptains({ ...captains, [away.id]: playerId })} togglePlayer={togglePlayer} selectAll={() => selectTeam(awayPlayers, true)} clear={() => selectTeam(awayPlayers, false)} />
      </div>
    </section>
  )
}

function Roster({ title, players, query, presentIds, captain, onCaptain, togglePlayer, selectAll, clear }) {
  const rows = players.filter((player) => player.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="panel p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-black">{title}</h3><div className="flex gap-2"><button className="button-secondary min-h-9 px-3 py-1 text-xs" onClick={selectAll}>Todos</button><button className="button-secondary min-h-9 px-3 py-1 text-xs" onClick={clear}>Limpiar</button></div></div>
      <div className="space-y-2">{rows.map((player) => <label key={player.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3"><span><input className="mr-2" type="checkbox" checked={presentIds.has(player.id)} onChange={() => togglePlayer(player.id)} />#{player.number || '--'} {player.name}</span><input type="radio" name={`captain-${title}`} checked={captain === player.id} onChange={() => onCaptain(player.id)} /></label>)}</div>
    </div>
  )
}

function ActionsStep({ home, away, homeScore, awayScore, form, setForm, players, teams, onAdd, busy }) {
  return (
    <section className="space-y-4">
      <div className="panel p-5 text-center"><p className="text-sm text-slate-400">Marcador</p><h2 className="mt-2 text-4xl font-black">{home?.name} {homeScore} - {awayScore} {away?.name}</h2></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{quickEvents.map((event) => <button key={event.id} className="button min-h-16 text-base" onClick={() => setForm({ ...form, event_type: event.id })}>{event.label}</button>)}</div>
      <div className="panel grid gap-3 p-4 md:grid-cols-2">
        <Select label="Equipo" value={form.team_id} onChange={(team_id) => setForm({ ...form, team_id, player_id: '', related_player_id: '' })} options={teams} />
        <Select label="Jugador" value={form.player_id} onChange={(player_id) => setForm({ ...form, player_id })} options={players} />
        <input className="input" placeholder="Minuto" value={form.minute} onChange={(event) => setForm({ ...form, minute: event.target.value })} />
        {form.event_type === 'goal' && <Select label="Tipo de gol" value={form.goal_type} onChange={(goal_type) => setForm({ ...form, goal_type })} options={goalTypes} />}
        {form.event_type === 'goal' && <Select label="Asistencia opcional" value={form.related_player_id} onChange={(related_player_id) => setForm({ ...form, related_player_id })} options={players.filter((player) => player.id !== form.player_id)} />}
        <textarea className="input min-h-24 md:col-span-2" placeholder="Motivo u observación" value={form.detail} onChange={(event) => setForm({ ...form, detail: event.target.value })} />
        <button className="button md:col-span-2" disabled={busy} onClick={() => onAdd(form.event_type)}>Guardar acción</button>
      </div>
    </section>
  )
}

function ReviewStep({ league, goals, cards, events, homeScore, awayScore, report, setReport }) {
  return <section className="panel space-y-4 p-4"><h2 className="text-2xl font-black">Resumen del acta</h2><p className="text-3xl font-black text-gold">Marcador final: {homeScore} - {awayScore}</p><Summary title="Goleadores" rows={goals.map((goal) => `${goal.minute}' ${league.playersById.get(goal.player_id)?.name || 'Jugador'}`)} /><Summary title="Tarjetas" rows={cards.map((card) => `${card.minute}' ${league.playersById.get(card.player_id)?.name || 'Jugador'} · ${card.type}`)} /><Summary title="Incidencias" rows={events.filter((event) => !['goal', 'assist'].includes(event.type)).map((event) => `${event.minute}' ${event.event_type || event.type} · ${event.detail || ''}`)} /><textarea className="input min-h-32" placeholder="Observaciones finales" value={report.observations || ''} onChange={(event) => setReport({ ...report, observations: event.target.value })} /></section>
}

function Summary({ title, rows }) {
  return <div><h3 className="mb-2 font-black">{title}</h3><div className="space-y-2">{rows.length ? rows.map((row, index) => <p key={`${row}-${index}`} className="rounded-lg bg-white/5 px-3 py-2 text-sm">{row}</p>) : <p className="text-sm text-slate-400">Sin registros.</p>}</div></div>
}

function SignStep({ signatures, setSignatures }) {
  return <section className="grid gap-4 md:grid-cols-3"><SignaturePad title="Firma del árbitro" value={signatures.referee_signature} onChange={(value) => setSignatures({ ...signatures, referee_signature: value })} /><SignaturePad title="Capitán local" value={signatures.home_captain_signature} onChange={(value) => setSignatures({ ...signatures, home_captain_signature: value })} /><SignaturePad title="Capitán visitante" value={signatures.away_captain_signature} onChange={(value) => setSignatures({ ...signatures, away_captain_signature: value })} /></section>
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
  const rows = (title, items) => (
    <section style={{ marginTop: 18 }}>
      <h3 style={{ borderBottom: '1px solid #111827', paddingBottom: 4 }}>{title}</h3>
      {items.length ? items.map((item, index) => <p key={index} style={{ margin: '6px 0' }}>{item}</p>) : <p>Sin registros.</p>}
    </section>
  )

  return (
    <article className="print-only" style={{ padding: 32, fontFamily: 'Arial, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #111827', paddingBottom: 16 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 800 }}>NOVA League</p>
          <h1 style={{ margin: '6px 0 0', fontSize: 28 }}>NOVA-F05 - Cédula Oficial del Partido</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0 }}>División: {division?.name || 'N/D'}</p>
          <p style={{ margin: 0 }}>Jornada: {match.round}</p>
          <p style={{ margin: 0 }}>Fecha: {new Date(match.match_date).toLocaleDateString('es-MX')}</p>
        </div>
      </header>
      <section style={{ marginTop: 20, textAlign: 'center' }}>
        <h2 style={{ fontSize: 24 }}>{home?.name} {homeScore} - {awayScore} {away?.name}</h2>
        <p>Cancha: {report.venue || match.venue || 'N/D'} · Árbitro: {report.referee_name || 'N/D'}</p>
      </section>
      {rows('Alineaciones', lineups.map((row) => `${league.teamsById.get(row.team_id)?.name}: ${league.playersById.get(row.player_id)?.name}${row.captain ? ' (Capitán)' : ''}`))}
      {rows('Goleadores', goals.map((goal) => `${goal.minute}' ${league.playersById.get(goal.player_id)?.name} - ${league.teamsById.get(goal.team_id)?.name}`))}
      {rows('Tarjetas', cards.map((card) => `${card.minute}' ${league.playersById.get(card.player_id)?.name} - ${card.type}`))}
      {rows('Incidencias', events.filter((event) => !['goal', 'assist'].includes(event.type)).map((event) => `${event.minute}' ${event.event_type || event.type} ${event.detail || ''}`))}
      {rows('Observaciones', [report.observations || 'Sin observaciones.'])}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginTop: 36 }}>
        <SignaturePrint title="Árbitro" src={signatures.referee_signature} />
        <SignaturePrint title="Capitán local" src={signatures.home_captain_signature} />
        <SignaturePrint title="Capitán visitante" src={signatures.away_captain_signature} />
      </section>
    </article>
  )
}

function SignaturePrint({ title, src }) {
  return <div style={{ textAlign: 'center' }}>{src ? <img src={src} alt={title} style={{ height: 80, maxWidth: '100%', objectFit: 'contain' }} /> : <div style={{ height: 80 }} />}<div style={{ borderTop: '1px solid #111827', paddingTop: 6 }}>{title}</div></div>
}
