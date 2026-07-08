import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, LogOut, RefreshCcw, Save, Trash2, X } from 'lucide-react'
import { approvePlayer, assignPlayerToTeam, closeSeason, deleteRecord, generateSemifinals, rejectPlayer, saveCard, saveDivision, saveEvent, saveGoal, saveLeagueSettings, saveMatch, saveNews, savePlayer, savePlayoffMatch, saveSanction, saveTeam } from '../../lib/adminApi'
import { hasSupabaseConfig } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import PageTitle from '../../components/PageTitle'
import PlayoffBracket from '../../components/PlayoffBracket'
import StandingsTable from '../../components/StandingsTable'
import { goalTypes, playoffStageLabel } from '../../lib/labels'

const emptyTeam = { name: '', division_id: '', city: '', founded: '', captain: '', category: '', season: '', crest_url: '', crestFile: null }
const emptyDivision = { name: '', level: '', promotion_slots: 0, relegation_slots: 0, championship_slots: 0 }
const emptyLeagueSettings = { name: '', short_name: '', tagline: '', description: '', logo_url: '', logoFile: null }
const emptyPlayer = { team_id: '', name: '', email: '', phone: '', birth_date: '', requested_team_name: '', position: '', number: '', age: '', approval_status: 'approved', photo_url: '', photoFile: null }
const emptyMatch = { round: 1, match_date: '', venue: '', home_team_id: '', away_team_id: '', home_score: '', away_score: '', status: 'scheduled', mvp_player_id: '', observations: '' }
const emptyEvent = { match_id: '', team_id: '', player_id: '', type: 'goal', minute: '' }
const emptyGoal = { match_id: '', team_id: '', player_id: '', minute: '', goal_type: 'open_play', assist_player_id: '' }
const emptyCard = { match_id: '', team_id: '', player_id: '', type: 'yellow', minute: '', reason: '' }
const emptySanction = { sanction_target: 'player', player_id: '', team_id: '', sanction_type: '', reason: '', suspended_matches: '', start_date: '', status: 'active', notes: '' }
const emptyNews = { title: '', excerpt: '', body: '', cover_url: '', coverFile: null }

export default function AdminDashboard({ league }) {
  const [tab, setTab] = useState('dashboard')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function run(action, done = 'Guardado correctamente') {
    if (!hasSupabaseConfig) {
      setMessage('Modo demo: configura Supabase para guardar cambios reales.')
      return
    }
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
    <main className="min-h-screen bg-ink px-4 py-6 text-white">
      <div className="mx-auto max-w-7xl">
        <PageTitle kicker="Zona privada" title="Dashboard Admin">
          <div className="flex gap-2">
            <button className="button-secondary" onClick={league.reload}><RefreshCcw size={16} />Actualizar</button>
            {hasSupabaseConfig && <button className="button-secondary" onClick={async () => { await signOut(); navigate('/login') }}><LogOut size={16} />Cerrar sesión</button>}
          </div>
        </PageTitle>

        <div className="mb-6 flex flex-wrap gap-2">
          {['dashboard', 'liga', 'divisiones', 'equipos', 'jugadores', 'aprobaciones', 'partidos', 'estadísticas de jugadores', 'playoffs', 'eventos', 'tarjetas', 'sanciones', 'noticias', 'tabla'].map((item) => (
            <button key={item} onClick={() => setTab(item)} className={tab === item ? 'button' : 'button-secondary'}>{item}</button>
          ))}
        </div>

        {message && <p className="mb-4 rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">{message}</p>}

        {tab === 'dashboard' && <AdminSummary league={league} />}
        {tab === 'liga' && <LeagueSettingsForm busy={busy} run={run} settings={league.settings} />}
        {tab === 'divisiones' && <DivisionAdmin busy={busy} run={run} league={league} />}
        {tab === 'equipos' && <TeamForm busy={busy} run={run} teams={league.teams} divisions={league.divisions} />}
        {tab === 'jugadores' && <PlayerForm busy={busy} run={run} teams={league.teams} players={league.players} />}
        {tab === 'aprobaciones' && <PlayerApprovals busy={busy} run={run} teams={league.teams} players={league.players} />}
        {tab === 'partidos' && <MatchForm busy={busy} run={run} league={league} />}
        {tab === 'estadísticas de jugadores' && <GoalForm busy={busy} run={run} league={league} />}
        {tab === 'playoffs' && <PlayoffsAdmin busy={busy} run={run} league={league} />}
        {tab === 'eventos' && <EventForm busy={busy} run={run} league={league} />}
        {tab === 'tarjetas' && <CardForm busy={busy} run={run} league={league} />}
        {tab === 'sanciones' && <SanctionForm busy={busy} run={run} league={league} />}
        {tab === 'noticias' && <NewsForm busy={busy} run={run} news={league.news} />}
        {tab === 'tabla' && <StandingsTable standings={league.standings} />}
      </div>
    </main>
  )
}

function AdminSummary({ league }) {
  const pending = league.players.filter((player) => player.approval_status === 'pending').length
  const played = league.matches.filter((match) => match.status === 'played').length
  const scheduled = league.matches.filter((match) => match.status !== 'played').length

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <AdminMetric label="Equipos" value={league.teams.length} />
      <AdminMetric label="Jugadores pendientes" value={pending} />
      <AdminMetric label="Partidos jugados" value={played} />
      <AdminMetric label="Partidos por cerrar" value={scheduled} />
    </section>
  )
}

function AdminMetric({ label, value }) {
  return <div className="panel p-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-gold">{label}</p><p className="mt-3 text-4xl font-black">{value}</p></div>
}

function LeagueSettingsForm({ run, busy, settings }) {
  const [form, setForm] = useState({ ...emptyLeagueSettings, ...(settings || {}) })

  return <AdminGrid title="Configuración de la liga" list={['Nombre público', 'Logo', 'Texto principal']}>
    <Field label="Nombre de la liga" value={form.name || ''} onChange={(name) => setForm({ ...form, name })} />
    <Field label="Iniciales / nombre corto" value={form.short_name || ''} onChange={(short_name) => setForm({ ...form, short_name })} />
    <Field label="Subtítulo" value={form.tagline || ''} onChange={(tagline) => setForm({ ...form, tagline })} />
    <label className="block text-sm font-bold">Descripción de portada</label>
    <textarea className="input min-h-28" value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} />
    <FileField label="Logo de la liga" onChange={(logoFile) => setForm({ ...form, logoFile })} />
    {form.logo_url && <img src={form.logo_url} alt={form.name} className="h-20 w-20 rounded-lg object-cover ring-1 ring-white/10" />}
    <SaveButton busy={busy} onClick={() => run(() => saveLeagueSettings(form), 'Configuración de liga actualizada')} />
  </AdminGrid>
}

function TeamForm({ run, busy, teams, divisions }) {
  const [form, setForm] = useState(emptyTeam)
  return <AdminGrid title="Crear o editar equipos" list={teams.map((team) => team.name)}>
    <EntityPicker label="Editar equipo" items={teams} onPick={(team) => setForm({ ...emptyTeam, ...team })} />
    <Field label="Nombre" value={form.name} onChange={(name) => setForm({ ...form, name })} />
    <Select label="División" value={form.division_id || ''} onChange={(division_id) => setForm({ ...form, division_id })} options={divisions} />
    <Field label="Ciudad" value={form.city} onChange={(city) => setForm({ ...form, city })} />
    <Field label="Capitán" value={form.captain || ''} onChange={(captain) => setForm({ ...form, captain })} />
    <Field label="Categoría" value={form.category || ''} onChange={(category) => setForm({ ...form, category })} />
    <Field label="Temporada" value={form.season || ''} onChange={(season) => setForm({ ...form, season })} />
    <Field label="Fundado" value={form.founded || ''} onChange={(founded) => setForm({ ...form, founded })} />
    <FileField label="Escudo" onChange={(crestFile) => setForm({ ...form, crestFile })} />
    <ActionRow busy={busy} canDelete={Boolean(form.id)} onSave={() => run(() => saveTeam(form))} onDelete={() => run(() => deleteRecord('teams', form.id), 'Equipo eliminado correctamente')} />
  </AdminGrid>
}

function DivisionAdmin({ run, busy, league }) {
  const [form, setForm] = useState(emptyDivision)
  const [season, setSeason] = useState(new Date().getFullYear().toString())

  return (
    <section className="space-y-6">
      <AdminGrid title="Crear o editar divisiones" list={league.divisions.map((division) => `${division.level}. ${division.name}`)}>
        <EntityPicker label="Editar división" items={league.divisions} getLabel={(division) => `${division.level}. ${division.name}`} onPick={(division) => setForm({ ...emptyDivision, ...division })} />
        <Field label="Nombre" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Field label="Nivel / orden" value={form.level} onChange={(level) => setForm({ ...form, level })} />
        <Field label="Equipos que ascienden" value={form.promotion_slots} onChange={(promotion_slots) => setForm({ ...form, promotion_slots })} />
        <Field label="Equipos que descienden" value={form.relegation_slots} onChange={(relegation_slots) => setForm({ ...form, relegation_slots })} />
        <Field label="Zona campeonato / liguilla" value={form.championship_slots} onChange={(championship_slots) => setForm({ ...form, championship_slots })} />
        <ActionRow busy={busy} canDelete={Boolean(form.id)} onSave={() => run(() => saveDivision(form), 'División guardada')} onDelete={() => run(() => deleteRecord('divisions', form.id), 'División eliminada')} />
      </AdminGrid>

      <div className="panel p-5">
        <h2 className="text-xl font-black">Cerrar temporada</h2>
        <p className="mt-2 text-sm text-slate-400">Guarda campeones, ascensos, descensos y tabla final. Después mueve equipos y reinicia partidos/estadísticas para una nueva temporada.</p>
        <div className="mt-4 max-w-sm">
          <Field label="Temporada / año" value={season} onChange={setSeason} />
        </div>
        <button className="button mt-4" disabled={busy} onClick={() => run(() => closeSeason({ season, divisionTables: league.divisionTables }), 'Temporada cerrada y divisiones actualizadas')}>Aplicar ascensos y descensos</button>
      </div>
    </section>
  )
}

function PlayerForm({ run, busy, teams, players }) {
  const [form, setForm] = useState(emptyPlayer)
  return <AdminGrid title="Crear o editar jugadores" list={players.map((player) => `${player.name} · ${statusLabel(player.approval_status)}`)}>
    <EntityPicker label="Editar jugador" items={players} onPick={(player) => setForm({ ...emptyPlayer, ...player })} />
    <Select label="Equipo" value={form.team_id} onChange={(team_id) => setForm({ ...form, team_id })} options={teams} />
    <Field label="Nombre" value={form.name} onChange={(name) => setForm({ ...form, name })} />
    <Field label="Gmail" value={form.email || ''} onChange={(email) => setForm({ ...form, email })} />
    <Field label="Teléfono" value={form.phone || ''} onChange={(phone) => setForm({ ...form, phone })} />
    <Field label="Fecha de nacimiento" type="date" value={form.birth_date || ''} onChange={(birth_date) => setForm({ ...form, birth_date })} />
    <Field label="Solicitud de equipo" value={form.requested_team_name || ''} onChange={(requested_team_name) => setForm({ ...form, requested_team_name })} />
    <Field label="Posición" value={form.position} onChange={(position) => setForm({ ...form, position })} />
    <Field label="Número" value={form.number || ''} onChange={(number) => setForm({ ...form, number })} />
    <Field label="Edad" value={form.age || ''} onChange={(age) => setForm({ ...form, age })} />
    <Select label="Estado de aprobación" value={form.approval_status || 'approved'} onChange={(approval_status) => setForm({ ...form, approval_status })} options={[{ id: 'pending', name: 'Pendiente' }, { id: 'approved', name: 'Aprobado' }, { id: 'rejected', name: 'Rechazado' }]} />
    <FileField label="Foto" onChange={(photoFile) => setForm({ ...form, photoFile })} />
    <ActionRow busy={busy} canDelete={Boolean(form.id)} onSave={() => run(() => savePlayer(form))} onDelete={() => run(() => deleteRecord('players', form.id), 'Jugador eliminado correctamente')} />
  </AdminGrid>
}

function PlayerApprovals({ run, busy, teams, players }) {
  const [teamByPlayer, setTeamByPlayer] = useState({})
  const pending = players.filter((player) => player.approval_status === 'pending')

  return (
    <section className="panel p-5">
      <h2 className="text-xl font-black">Aprobación de registros de jugadores</h2>
      <div className="mt-5 grid gap-3">
        {pending.length === 0 && <p className="text-sm text-slate-400">No hay jugadores pendientes.</p>}
        {pending.map((player) => (
          <div key={player.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-black">{player.name}</p>
                <p className="text-sm text-slate-400">{player.email || 'Sin Gmail'} · {player.position || 'Sin posición'} · #{player.number || '--'}</p>
                <p className="mt-1 text-sm text-gold">Solicitud: {player.requested_team_name || teams.find((team) => team.id === player.team_id)?.name || 'Sin equipo'}</p>
              </div>
              <div className="flex min-w-[220px] flex-1 flex-wrap justify-end gap-2">
                <select className="input max-w-xs" value={teamByPlayer[player.id] || player.team_id || ''} onChange={(event) => setTeamByPlayer({ ...teamByPlayer, [player.id]: event.target.value })}>
                  <option value="">Seleccionar equipo</option>
                  {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
                <button className="button" disabled={busy} onClick={() => run(() => approvePlayer(player.id, teamByPlayer[player.id] || player.team_id), 'Jugador aprobado')}><Check size={16} />Aprobar</button>
                <button className="button-secondary border-red-400/30 text-red-200" disabled={busy} onClick={() => run(() => rejectPlayer(player.id), 'Jugador rechazado')}><X size={16} />Rechazar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <h3 className="mt-8 text-lg font-black">Asignar jugadores aprobados</h3>
      <div className="mt-3 grid gap-2">
        {players.filter((player) => player.approval_status === 'approved').map((player) => (
          <div key={player.id} className="grid gap-2 rounded-lg bg-white/5 p-3 md:grid-cols-[1fr_260px_auto] md:items-center">
            <p className="font-semibold">{player.name}</p>
            <select className="input" value={teamByPlayer[player.id] || player.team_id || ''} onChange={(event) => setTeamByPlayer({ ...teamByPlayer, [player.id]: event.target.value })}>
              <option value="">Seleccionar equipo</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
            <button className="button-secondary" disabled={busy} onClick={() => run(() => assignPlayerToTeam(player.id, teamByPlayer[player.id] || player.team_id), 'Jugador asignado')}>Asignar</button>
          </div>
        ))}
      </div>
    </section>
  )
}

function MatchForm({ run, busy, league }) {
  const [form, setForm] = useState(emptyMatch)
  const [goalForm, setGoalForm] = useState(emptyGoal)
  const matchPlayers = league.players.filter((player) => [form.home_team_id, form.away_team_id].includes(player.team_id))
  const validation = validateMatchGoals(form, league.goals)
  return <AdminGrid title="Jornadas, calendario y resultados" list={league.matches.map((match) => `J${match.round}`)}>
    <EntityPicker label="Editar partido" items={league.matches} getLabel={(match) => `J${match.round} - ${match.match_date}`} onPick={(match) => setForm({ ...emptyMatch, ...match, venue: match.venue || '', home_score: match.home_score ?? '', away_score: match.away_score ?? '', mvp_player_id: match.mvp_player_id || '', observations: match.observations || '' })} />
    <Field label="Jornada" value={form.round} onChange={(round) => setForm({ ...form, round })} />
    <Field label="Fecha y hora" type="datetime-local" value={form.match_date} onChange={(match_date) => setForm({ ...form, match_date })} />
    <Field label="Cancha" value={form.venue || ''} onChange={(venue) => setForm({ ...form, venue })} />
    <Select label="Local" value={form.home_team_id} onChange={(home_team_id) => setForm({ ...form, home_team_id })} options={league.teams} />
    <Select label="Visitante" value={form.away_team_id} onChange={(away_team_id) => setForm({ ...form, away_team_id })} options={league.teams} />
    <Field label="Goles local" value={form.home_score} onChange={(home_score) => setForm({ ...form, home_score })} />
    <Field label="Goles visitante" value={form.away_score} onChange={(away_score) => setForm({ ...form, away_score })} />
    <Select label="Estado" value={form.status} onChange={(status) => setForm({ ...form, status })} options={[{ id: 'scheduled', name: 'Programado' }, { id: 'played', name: 'Jugado' }]} />
    <Select label="MVP del partido" value={form.mvp_player_id || ''} onChange={(mvp_player_id) => setForm({ ...form, mvp_player_id })} options={matchPlayers} />
    <label className="block text-sm font-bold">Observaciones del partido</label>
    <textarea className="input min-h-28" value={form.observations || ''} onChange={(event) => setForm({ ...form, observations: event.target.value })} />
    {validation && <p className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold">{validation}</p>}
    <SaveButton busy={busy} onClick={() => run(() => validation ? Promise.resolve({ error: { message: validation } }) : saveMatch(form))} />
    {form.id && <InlineMatchGoals match={form} goalForm={goalForm} setGoalForm={setGoalForm} busy={busy} run={run} league={league} />}
  </AdminGrid>
}

function validateMatchGoals(match, goals) {
  if (!match.id || match.status !== 'played') return ''
  const homeScore = match.home_score === '' ? null : Number(match.home_score)
  const awayScore = match.away_score === '' ? null : Number(match.away_score)
  if (homeScore == null || awayScore == null) return ''
  const homeGoals = goals.filter((goal) => goal.match_id === match.id && goal.team_id === match.home_team_id).length
  const awayGoals = goals.filter((goal) => goal.match_id === match.id && goal.team_id === match.away_team_id).length
  if (homeGoals < homeScore || awayGoals < awayScore) return 'Falta asignar goleadores'
  if (homeGoals > homeScore || awayGoals > awayScore) return 'Hay más goles registrados que el marcador'
  return ''
}

function MatchGoalsSummary({ match, league }) {
  const rows = league.goals.filter((goal) => goal.match_id === match.id)
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 font-black">Goles del partido</h3>
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-slate-400">Aún no hay goles registrados.</p>}
        {rows.map((goal) => <p key={goal.id} className="text-sm text-slate-300">⚽ {goal.minute}' {league.playersById.get(goal.player_id)?.name} · {league.teamsById.get(goal.team_id)?.name}</p>)}
      </div>
    </div>
  )
}

function InlineMatchGoals({ match, goalForm, setGoalForm, busy, run, league }) {
  const teams = league.teams.filter((team) => [match.home_team_id, match.away_team_id].includes(team.id))
  const players = league.players.filter((player) => player.team_id === goalForm.team_id)
  const assists = players.filter((player) => player.id !== goalForm.player_id)
  const preparedGoal = { ...goalForm, match_id: match.id }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <MatchGoalsSummary match={match} league={league} />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Select label="Equipo que anotó" value={goalForm.team_id} onChange={(team_id) => setGoalForm({ ...emptyGoal, match_id: match.id, team_id })} options={teams} />
        <Select label="Jugador que anotó" value={goalForm.player_id} onChange={(player_id) => setGoalForm({ ...goalForm, player_id, assist_player_id: '' })} options={players} />
        <Field label="Minuto" value={goalForm.minute} onChange={(minute) => setGoalForm({ ...goalForm, minute })} />
        <Select label="Tipo de gol" value={goalForm.goal_type} onChange={(goal_type) => setGoalForm({ ...goalForm, goal_type })} options={goalTypes} />
        <Select label="Asistencia opcional" value={goalForm.assist_player_id || ''} onChange={(assist_player_id) => setGoalForm({ ...goalForm, assist_player_id })} options={assists} />
      </div>
      <div className="mt-3">
        <button className="button" disabled={busy} onClick={() => run(() => saveGoal(preparedGoal), 'Gol agregado')}>Agregar gol</button>
      </div>
    </div>
  )
}

function GoalForm({ run, busy, league }) {
  const [form, setForm] = useState(emptyGoal)
  const selectedMatch = league.matches.find((match) => match.id === form.match_id)
  const matchTeamIds = selectedMatch ? [selectedMatch.home_team_id, selectedMatch.away_team_id] : []
  const teams = selectedMatch ? league.teams.filter((team) => matchTeamIds.includes(team.id)) : league.teams
  const players = league.players.filter((player) => !form.team_id || player.team_id === form.team_id)
  const assists = players.filter((player) => player.id !== form.player_id)

  return <AdminGrid title="Estadísticas de jugadores" list={league.goals.map((goal) => `Gol ${goal.minute}' - ${league.playersById.get(goal.player_id)?.name || 'Jugador'}`)}>
    <EntityPicker label="Editar gol" items={league.goals} getLabel={(goal) => `${league.playersById.get(goal.player_id)?.name || 'Jugador'} ${goal.minute}'`} onPick={(goal) => setForm({ ...emptyGoal, ...goal, assist_player_id: goal.assist_player_id || '' })} />
    <Select label="Partido" value={form.match_id} onChange={(match_id) => setForm({ ...form, match_id, team_id: '', player_id: '', assist_player_id: '' })} options={league.matches.map((match) => ({ id: match.id, name: `J${match.round} ${league.teamsById.get(match.home_team_id)?.name || 'Local'} vs ${league.teamsById.get(match.away_team_id)?.name || 'Visitante'}` }))} />
    <Select label="Equipo que anotó" value={form.team_id} onChange={(team_id) => setForm({ ...form, team_id, player_id: '', assist_player_id: '' })} options={teams} />
    <Select label="Jugador que anotó" value={form.player_id} onChange={(player_id) => setForm({ ...form, player_id, assist_player_id: '' })} options={players} />
    <Field label="Minuto del gol" value={form.minute} onChange={(minute) => setForm({ ...form, minute })} />
    <Select label="Tipo de gol" value={form.goal_type} onChange={(goal_type) => setForm({ ...form, goal_type })} options={goalTypes} />
    <Select label="Asistencia opcional" value={form.assist_player_id || ''} onChange={(assist_player_id) => setForm({ ...form, assist_player_id })} options={assists} />
    <ActionRow busy={busy} canDelete={Boolean(form.id)} onSave={() => run(() => saveGoal(form))} onDelete={() => run(() => deleteRecord('goals', form.id), 'Gol eliminado correctamente')} />
  </AdminGrid>
}

function PlayoffsAdmin({ run, busy, league }) {
  const [form, setForm] = useState(null)
  const [thirdPlace, setThirdPlace] = useState(false)
  const selectedPlayers = form ? league.players.filter((player) => [form.home_team_id, form.away_team_id].includes(player.team_id)) : []

  return (
    <section className="space-y-6">
      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Playoffs</h2>
            <p className="mt-1 text-sm text-slate-400">Genera semifinales bloqueando los primeros 4 puestos actuales.</p>
          </div>
          <button className="button" disabled={busy} onClick={() => run(() => generateSemifinals(league.standings), 'Semifinales generadas')}>Generar semifinales</button>
        </div>
      </div>

      <PlayoffBracket matches={league.playoffMatches} teamsById={league.teamsById} />

      <section className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <div className="panel p-5">
          <h3 className="mb-4 text-lg font-black">Partidos de playoff</h3>
          <div className="space-y-2">
            {league.playoffMatches.map((match) => (
              <button key={match.id} className="button-secondary w-full justify-start" onClick={() => setForm({ ...match, home_score: match.home_score ?? '', away_score: match.away_score ?? '', home_penalties: match.home_penalties ?? '', away_penalties: match.away_penalties ?? '', match_date: match.match_date || '', venue: match.venue || '', mvp_player_id: match.mvp_player_id || '' })}>
                {playoffStageLabel(match.stage)} {match.slot}
              </button>
            ))}
          </div>
        </div>

        <div className="panel space-y-4 p-5">
          <h3 className="text-lg font-black">Editar playoff</h3>
          {!form && <p className="text-sm text-slate-400">Selecciona un partido para editar fecha, cancha, resultado, penales y MVP.</p>}
          {form && <>
            <Field label="Fecha y hora" type="datetime-local" value={form.match_date || ''} onChange={(match_date) => setForm({ ...form, match_date })} />
            <Field label="Cancha" value={form.venue || ''} onChange={(venue) => setForm({ ...form, venue })} />
            <Field label="Marcador local" value={form.home_score} onChange={(home_score) => setForm({ ...form, home_score })} />
            <Field label="Marcador visitante" value={form.away_score} onChange={(away_score) => setForm({ ...form, away_score })} />
            <Field label="Penales local" value={form.home_penalties} onChange={(home_penalties) => setForm({ ...form, home_penalties })} />
            <Field label="Penales visitante" value={form.away_penalties} onChange={(away_penalties) => setForm({ ...form, away_penalties })} />
            <Select label="Estado" value={form.status} onChange={(status) => setForm({ ...form, status })} options={[{ id: 'pending', name: 'Pendiente' }, { id: 'played', name: 'Jugado' }, { id: 'finalized', name: 'Finalizado' }]} />
            <Select label="MVP" value={form.mvp_player_id || ''} onChange={(mvp_player_id) => setForm({ ...form, mvp_player_id })} options={selectedPlayers} />
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={thirdPlace} onChange={(event) => setThirdPlace(event.target.checked)} /> Crear tercer lugar al cerrar semifinales</label>
            <ActionRow busy={busy} canDelete={Boolean(form.id)} onSave={() => run(() => savePlayoffMatch(form, league.playoffMatches, thirdPlace))} onDelete={() => run(() => deleteRecord('playoff_matches', form.id), 'Partido eliminado')} />
          </>}
        </div>
      </section>
    </section>
  )
}

function EventForm({ run, busy, league }) {
  const [form, setForm] = useState(emptyEvent)
  const players = useMemo(() => league.players.filter((player) => !form.team_id || player.team_id === form.team_id), [league.players, form.team_id])
  return <AdminGrid title="Goleadores y asistencias" list={league.events.map((event) => `${event.type} ${event.minute}'`)}>
    <EntityPicker label="Editar evento" items={league.events} getLabel={(event) => `${event.type} ${event.minute}'`} onPick={(event) => setForm({ ...emptyEvent, ...event })} />
    <Select label="Partido" value={form.match_id} onChange={(match_id) => setForm({ ...form, match_id })} options={league.matches.map((match) => ({ id: match.id, name: `J${match.round} ${match.match_date}` }))} />
    <Select label="Equipo" value={form.team_id} onChange={(team_id) => setForm({ ...form, team_id, player_id: '' })} options={league.teams} />
    <Select label="Jugador" value={form.player_id} onChange={(player_id) => setForm({ ...form, player_id })} options={players} />
    <Select label="Tipo" value={form.type} onChange={(type) => setForm({ ...form, type })} options={[{ id: 'goal', name: 'Gol' }, { id: 'assist', name: 'Asistencia' }]} />
    <Field label="Minuto" value={form.minute} onChange={(minute) => setForm({ ...form, minute })} />
    <ActionRow busy={busy} canDelete={Boolean(form.id)} onSave={() => run(() => saveEvent(form))} onDelete={() => run(() => deleteRecord('match_events', form.id), 'Eliminado correctamente')} />
  </AdminGrid>
}

function CardForm({ run, busy, league }) {
  const [form, setForm] = useState(emptyCard)
  const players = useMemo(() => league.players.filter((player) => !form.team_id || player.team_id === form.team_id), [league.players, form.team_id])
  return <AdminGrid title="Tarjetas por partido" list={league.cards.map((card) => `${card.type} ${card.minute}'`)}>
    <EntityPicker label="Editar tarjeta" items={league.cards} getLabel={(card) => `${card.type} ${card.minute}'`} onPick={(card) => setForm({ ...emptyCard, ...card, reason: card.reason || '' })} />
    <Select label="Partido" value={form.match_id} onChange={(match_id) => setForm({ ...form, match_id })} options={league.matches.map((match) => ({ id: match.id, name: `J${match.round} ${match.match_date}` }))} />
    <Select label="Equipo" value={form.team_id} onChange={(team_id) => setForm({ ...form, team_id, player_id: '' })} options={league.teams} />
    <Select label="Jugador" value={form.player_id} onChange={(player_id) => setForm({ ...form, player_id })} options={players} />
    <Select label="Tipo de tarjeta" value={form.type} onChange={(type) => setForm({ ...form, type })} options={[{ id: 'yellow', name: 'Tarjeta amarilla' }, { id: 'red', name: 'Tarjeta roja' }, { id: 'double_yellow', name: 'Doble amarilla' }]} />
    <Field label="Minuto" value={form.minute} onChange={(minute) => setForm({ ...form, minute })} />
    <Field label="Motivo opcional" value={form.reason} onChange={(reason) => setForm({ ...form, reason })} />
    <ActionRow busy={busy} canDelete={Boolean(form.id)} onSave={() => run(() => saveCard(form))} onDelete={() => run(() => deleteRecord('match_cards', form.id), 'Eliminado correctamente')} />
  </AdminGrid>
}

function SanctionForm({ run, busy, league }) {
  const [form, setForm] = useState(emptySanction)
  return <AdminGrid title="Sanciones" list={league.sanctions.map((sanction) => `${sanction.sanction_type} - ${sanction.status}`)}>
    <EntityPicker label="Editar sanción" items={league.sanctions} getLabel={(sanction) => `${sanction.sanction_type} - ${sanction.status}`} onPick={(sanction) => setForm({ ...emptySanction, ...sanction, sanction_target: sanction.team_id ? 'team' : 'player' })} />
    <Select label="Sancionado" value={form.sanction_target} onChange={(sanction_target) => setForm({ ...form, sanction_target })} options={[{ id: 'player', name: 'Jugador' }, { id: 'team', name: 'Equipo' }]} />
    {form.sanction_target === 'player' ? (
      <Select label="Jugador" value={form.player_id || ''} onChange={(player_id) => setForm({ ...form, player_id })} options={league.players} />
    ) : (
      <Select label="Equipo" value={form.team_id || ''} onChange={(team_id) => setForm({ ...form, team_id })} options={league.teams} />
    )}
    <Field label="Tipo de sanción" value={form.sanction_type} onChange={(sanction_type) => setForm({ ...form, sanction_type })} />
    <Field label="Motivo" value={form.reason} onChange={(reason) => setForm({ ...form, reason })} />
    <Field label="Partidos suspendidos" value={form.suspended_matches || ''} onChange={(suspended_matches) => setForm({ ...form, suspended_matches })} />
    <Field label="Fecha de inicio" type="date" value={form.start_date || ''} onChange={(start_date) => setForm({ ...form, start_date })} />
    <Select label="Estado" value={form.status} onChange={(status) => setForm({ ...form, status })} options={[{ id: 'active', name: 'Activa' }, { id: 'served', name: 'Cumplida' }, { id: 'cancelled', name: 'Cancelada' }]} />
    <label className="block text-sm font-bold">Observaciones</label>
    <textarea className="input min-h-28" value={form.notes || ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
    <ActionRow busy={busy} canDelete={Boolean(form.id)} onSave={() => run(() => saveSanction(form))} onDelete={() => run(() => deleteRecord('sanctions', form.id), 'Eliminado correctamente')} />
  </AdminGrid>
}

function NewsForm({ run, busy, news }) {
  const [form, setForm] = useState(emptyNews)
  return <AdminGrid title="Publicar noticias" list={news.map((item) => item.title)}>
    <EntityPicker label="Editar noticia" items={news} onPick={(item) => setForm({ ...emptyNews, ...item })} />
    <Field label="Título" value={form.title} onChange={(title) => setForm({ ...form, title })} />
    <Field label="Resumen" value={form.excerpt} onChange={(excerpt) => setForm({ ...form, excerpt })} />
    <label className="block text-sm font-bold">Cuerpo</label>
    <textarea className="input min-h-32" value={form.body || ''} onChange={(event) => setForm({ ...form, body: event.target.value })} />
    <FileField label="Portada" onChange={(coverFile) => setForm({ ...form, coverFile })} />
    <SaveButton busy={busy} onClick={() => run(() => saveNews(form))} />
  </AdminGrid>
}

function AdminGrid({ title, list, children }) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_.7fr]">
      <div className="panel space-y-4 p-5">
        <h2 className="text-xl font-black">{title}</h2>
        {children}
      </div>
      <div className="panel p-5">
        <h3 className="mb-4 text-lg font-black">Registros</h3>
        <div className="space-y-2">{list.map((item, index) => <p key={`${item}-${index}`} className="rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-300">{item}</p>)}</div>
      </div>
    </section>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  return <label className="block text-sm font-bold">{label}<input className="input mt-2" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

function FileField({ label, onChange }) {
  return <label className="block text-sm font-bold">{label}<input className="input mt-2" type="file" accept="image/*" onChange={(event) => onChange(event.target.files?.[0] || null)} /></label>
}

function Select({ label, value, onChange, options }) {
  return <label className="block text-sm font-bold">{label}<select className="input mt-2" value={value} onChange={(event) => onChange(event.target.value)}><option value="">Seleccionar</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
}

function EntityPicker({ label, items, onPick, getLabel = (item) => item.name }) {
  return <label className="block text-sm font-bold">{label}<select className="input mt-2" onChange={(event) => { const item = items.find((entry) => entry.id === event.target.value); if (item) onPick(item) }}><option value="">Nuevo registro</option>{items.map((item) => <option key={item.id} value={item.id}>{getLabel(item)}</option>)}</select></label>
}

function SaveButton({ busy, onClick }) {
  return <button className="button" disabled={busy} onClick={onClick}><Save size={16} />{busy ? 'Guardando...' : 'Guardar'}</button>
}

function ActionRow({ busy, canDelete, onSave, onDelete }) {
  return (
    <div className="flex flex-wrap gap-2">
      <SaveButton busy={busy} onClick={onSave} />
      {canDelete && <button className="button-secondary border-red-400/30 text-red-200 hover:border-red-400" disabled={busy} onClick={onDelete}><Trash2 size={16} />Eliminar</button>}
    </div>
  )
}

function statusLabel(status) {
  if (status === 'approved') return 'Aprobado'
  if (status === 'rejected') return 'Rechazado'
  return 'Pendiente'
}
