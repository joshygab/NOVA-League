import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Check, ClipboardList, Home, LogOut, RefreshCcw, Save, ShieldAlert, Trash2, UserRound, Users, X } from 'lucide-react'
import { approvePlayer, assignPlayerToTeam, closeSeason, deleteRecord, generateNovaChampionsBracket, generateSemifinals, rejectPlayer, saveCard, saveChampionSpotlight, saveDivision, saveEvent, saveGoal, saveLeagueSettings, saveMatch, saveNews, saveNovaChampionsMatch, saveNovaChampionsSettings, saveNovaChampionsStat, savePlayer, savePlayoffMatch, savePlayoffSetting, saveSanction, saveTeam, setNovaChampionsTeam } from '../../lib/adminApi'
import { hasSupabaseConfig } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import PageTitle from '../../components/PageTitle'
import PlayoffBracket from '../../components/PlayoffBracket'
import StandingsTable from '../../components/StandingsTable'
import { goalTypes, playoffStageLabel } from '../../lib/labels'
import MatchSheetAdmin from './MatchSheetAdmin'
import NovaIdScannerAdmin from './NovaIdScannerAdmin'

const emptyTeam = { name: '', division_id: '', city: '', founded: '', captain: '', category: '', season: '', crest_url: '', crestFile: null }
const emptyDivision = { name: '', slug: '', description: '', active: true, level: '', promotion_slots: 0, relegation_slots: 0, championship_slots: 0 }
const emptyLeagueSettings = { name: '', short_name: '', tagline: '', description: '', logo_url: '', logoFile: null }
const emptyPlayer = { team_id: '', name: '', email: '', phone: '', birth_date: '', requested_team_name: '', position: '', number: '', age: '', approval_status: 'approved', photo_url: '', photoFile: null }
const emptyMatch = { division_id: '', round: 1, match_date: '', venue: '', home_team_id: '', away_team_id: '', home_score: '', away_score: '', status: 'scheduled', mvp_player_id: '', observations: '' }
const emptyEvent = { division_id: '', match_id: '', team_id: '', player_id: '', type: 'goal', minute: '' }
const emptyGoal = { division_id: '', match_id: '', team_id: '', player_id: '', minute: '', goal_type: 'open_play', assist_player_id: '' }
const emptyCard = { division_id: '', match_id: '', team_id: '', player_id: '', type: 'yellow', minute: '', reason: '' }
const emptySanction = { division_id: '', sanction_target: 'player', player_id: '', team_id: '', sanction_type: '', reason: '', suspended_matches: '', start_date: '', status: 'active', notes: '' }
const emptyNews = { title: '', excerpt: '', body: '', cover_url: '', coverFile: null }
const emptyChampionsMatch = { season_id: new Date().getFullYear().toString(), round: 'quarterfinal', match_order: 1, home_team_id: '', away_team_id: '', home_score: '', away_score: '', home_penalties: '', away_penalties: '', status: 'scheduled', match_date: '', venue: '', mvp_player_id: '', best_goalkeeper_player_id: '' }
const emptyChampionsStat = { match_id: '', team_id: '', player_id: '', stat_type: 'goal', minute: '', value: 1 }
const emptyChampionSpotlight = { is_active: false, display_mode: 'home_section', tournament_name: '', season_label: '', champion_team_id: '', champion_photo_url: '', championPhotoFile: null, message_title: '¡Felicidades, campeones!', message_body: 'Han conquistado la gloria de NOVA.' }

export default function AdminDashboard({ league }) {
  const [tab, setTab] = useState('dashboard')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const navItems = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'partidos', label: 'Partidos', icon: CalendarDays },
    { id: 'equipos', label: 'Equipos', icon: Users },
    { id: 'jugadores', label: 'Jugadores', icon: UserRound },
    { id: 'sanciones', label: 'Sanciones', icon: ShieldAlert },
  ]
  const activeNav = navItems.some((item) => item.id === tab) ? tab : sectionForTool(tab)

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
    <main className="min-h-screen bg-[#050608] px-4 pb-24 pt-5 text-white lg:pb-8">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[240px_1fr]">
        <aside className="screen-only sticky top-5 hidden h-[calc(100vh-2.5rem)] rounded-lg border border-gold/20 bg-black/70 p-4 shadow-gold lg:block">
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">NOVA Admin</p>
            <h1 className="mt-2 text-2xl font-black">Panel de Liga</h1>
          </div>
          <nav className="space-y-2">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} className={`w-full justify-start ${activeNav === id ? 'button' : 'button-secondary'}`}>
                <Icon size={18} />{label}
              </button>
            ))}
          </nav>
          <div className="absolute bottom-4 left-4 right-4 space-y-2">
            <button className="button-secondary w-full justify-start" onClick={league.reload}><RefreshCcw size={16} />Actualizar</button>
            {hasSupabaseConfig && <button className="button-secondary w-full justify-start" onClick={async () => { await signOut(); navigate('/login') }}><LogOut size={16} />Cerrar sesión</button>}
          </div>
        </aside>

        <section className="min-w-0">
          <PageTitle kicker="Zona privada" title={adminTitle(tab)}>
            <div className="flex gap-2">
              <button className="button-secondary lg:hidden" onClick={league.reload}><RefreshCcw size={16} /></button>
              {hasSupabaseConfig && <button className="button-secondary lg:hidden" onClick={async () => { await signOut(); navigate('/login') }}><LogOut size={16} /></button>}
            </div>
          </PageTitle>

          {message && <p className="mb-4 rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">{message}</p>}

          {tab === 'dashboard' && <AdminSummary league={league} setTab={setTab} run={run} busy={busy} />}
        {tab === 'partidos' && <PartidosHub league={league} setTab={setTab} />}
        {tab === 'equipos' && <EquiposHub league={league} setTab={setTab} run={run} busy={busy} />}
        {tab === 'jugadores' && <JugadoresHub league={league} setTab={setTab} run={run} busy={busy} />}
        {tab === 'sanciones' && <SancionesHub league={league} setTab={setTab} run={run} busy={busy} />}

        {tab === 'liga' && <LeagueSettingsForm busy={busy} run={run} settings={league.settings} />}
        {tab === 'modo campeón' && <ChampionSpotlightAdmin busy={busy} run={run} league={league} />}
        {tab === 'divisiones' && <DivisionAdmin busy={busy} run={run} league={league} />}
        {tab === 'equipos-form' && <TeamForm busy={busy} run={run} teams={league.teams} divisions={league.divisions} />}
        {tab === 'jugadores-form' && <PlayerForm busy={busy} run={run} teams={league.teams} players={league.players} />}
        {tab === 'aprobaciones' && <PlayerApprovals busy={busy} run={run} teams={league.teams} players={league.players} />}
        {tab === 'partidos-form' && <MatchForm busy={busy} run={run} league={league} />}
        {tab === 'acta digital' && <MatchSheetAdmin busy={busy} run={run} league={league} />}
        {tab === 'escáner nova id' && <NovaIdScannerAdmin busy={busy} run={run} league={league} />}
        {tab === 'estadísticas de jugadores' && <GoalForm busy={busy} run={run} league={league} />}
        {tab === 'playoffs' && <PlayoffsAdmin busy={busy} run={run} league={league} />}
        {tab === 'nova champions cup' && <NovaChampionsAdmin busy={busy} run={run} league={league} />}
        {tab === 'eventos' && <EventForm busy={busy} run={run} league={league} />}
        {tab === 'tarjetas' && <CardForm busy={busy} run={run} league={league} />}
        {tab === 'sanciones-form' && <SanctionForm busy={busy} run={run} league={league} />}
        {tab === 'noticias' && <NewsForm busy={busy} run={run} news={league.news} />}
        {tab === 'tabla' && <StandingsTable standings={league.standings} />}
        </section>
      </div>
      <nav className="screen-only fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-white/10 bg-black/95 px-2 pb-3 pt-2 backdrop-blur lg:hidden">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-black ${activeNav === id ? 'bg-gold text-black' : 'text-slate-300'}`}>
            <Icon size={19} />{label}
          </button>
        ))}
      </nav>
    </main>
  )
}

function sectionForTool(tab) {
  if (['partidos-form', 'acta digital', 'playoffs', 'nova champions cup', 'eventos', 'tarjetas', 'estadísticas de jugadores', 'escáner nova id'].includes(tab)) return 'partidos'
  if (['equipos-form', 'liga', 'modo campeón', 'divisiones', 'tabla', 'noticias'].includes(tab)) return 'equipos'
  if (['jugadores-form', 'aprobaciones'].includes(tab)) return 'jugadores'
  if (['sanciones-form'].includes(tab)) return 'sanciones'
  return 'dashboard'
}

function adminTitle(tab) {
  const titles = {
    dashboard: 'Inicio Admin',
    partidos: 'Partidos',
    equipos: 'Equipos',
    jugadores: 'Jugadores',
    sanciones: 'Sanciones',
    'acta digital': 'Captura de Partido',
    'escáner nova id': 'Escáner NOVA ID',
    'nova champions cup': 'NOVA Champions Cup',
    'modo campeón': 'Modo Campeón',
    'partidos-form': 'Crear Partido',
    'equipos-form': 'Gestionar Equipos',
    'jugadores-form': 'Gestionar Jugadores',
    'sanciones-form': 'Gestionar Sanciones',
  }
  return titles[tab] || tab
}

function AdminSummary({ league, setTab, run, busy }) {
  const pending = league.players.filter((player) => player.approval_status === 'pending').length
  const unpublished = league.matches.filter((match) => match.status === 'played').length
  const sanctions = league.sanctions.filter((sanction) => sanction.status === 'active').length
  const today = new Date().toISOString().slice(0, 10)
  const todayMatches = league.matches.filter((match) => match.match_date?.slice(0, 10) === today)
  const pendingToday = todayMatches.filter((match) => match.status !== 'played').length

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gold/30 bg-black p-5 shadow-gold">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Hoy</p>
        <h2 className="mt-2 text-3xl font-black">Hola, Admin</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <AdminMetric label="Partidos pendientes" value={pendingToday} />
          <AdminMetric label="Resultados por publicar" value={unpublished} />
          <AdminMetric label="Sanciones pendientes" value={sanctions} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminAction title="Iniciar partido" text="Abrir acta digital" onClick={() => setTab('acta digital')} />
        <AdminAction title="Crear partido" text="Programar jornada" onClick={() => setTab('partidos')} />
        <AdminAction title="Registrar jugador" text={`${pending} pendientes`} onClick={() => setTab('jugadores')} />
        <AdminAction title="Modo Campeón" text="Presentación del campeón" onClick={() => setTab('modo campeón')} />
      </section>

      <ChampionsAdminStatus league={league} setTab={setTab} run={run} busy={busy} />

      <section className="panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardList className="text-gold" size={20} />
          <h3 className="text-xl font-black">Partidos de hoy</h3>
        </div>
        <div className="grid gap-3">
          {todayMatches.length === 0 && <p className="text-sm text-slate-400">No hay partidos programados hoy.</p>}
          {todayMatches.map((match) => <AdminMatchCard key={match.id} match={match} league={league} onStart={() => setTab('acta digital')} />)}
        </div>
      </section>
    </div>
  )
}

function ChampionsAdminStatus({ league, setTab, run, busy }) {
  const settings = league.novaChampions?.settings || {}
  const active = settings.is_active || settings.status === 'active'
  const season = settings.season_id || new Date().getFullYear().toString()
  return (
    <section className="rounded-lg border border-gold/30 bg-black p-5 shadow-gold">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Torneo especial</p>
          <h3 className="mt-2 text-2xl font-black">NOVA Champions Cup</h3>
          <p className="mt-1 text-sm text-slate-400">{active ? 'Activa públicamente con bracket y clasificados.' : 'Está en modo próximamente en la app pública.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="button-secondary" onClick={() => setTab('nova champions cup')}>Gestionar</button>
          <button className={active ? 'button-secondary' : 'button'} disabled={busy} onClick={() => run(() => saveNovaChampionsSettings({ ...settings, season_id: season, is_active: !active }), active ? 'Champions Cup desactivada' : 'Champions Cup activada')}>
            {active ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      </div>
    </section>
  )
}

function AdminMetric({ label, value }) {
  return <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-gold">{label}</p><p className="mt-3 text-4xl font-black">{value}</p></div>
}

function AdminAction({ title, text, onClick }) {
  return <button onClick={onClick} className="rounded-lg border border-gold/20 bg-white/[0.06] p-5 text-left shadow-glow transition hover:-translate-y-0.5 hover:border-gold/70"><p className="text-lg font-black">{title}</p><p className="mt-1 text-sm text-slate-400">{text}</p></button>
}

function AdminMatchCard({ match, league, onStart }) {
  const home = league.teamsById.get(match.home_team_id)
  const away = league.teamsById.get(match.away_team_id)
  return (
    <article className="grid gap-3 rounded-lg border border-white/10 bg-black/50 p-4 md:grid-cols-[90px_1fr_auto] md:items-center">
      <p className="text-xl font-black text-gold">{match.match_date ? new Date(match.match_date).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }) : 'Sin hora'}</p>
      <div>
        <p className="text-lg font-black">{home?.name || 'Local'} vs {away?.name || 'Visitante'}</p>
        <p className="text-sm text-slate-400">{match.venue || 'Cancha por definir'} · {statusBadge(match.status)}</p>
      </div>
      <button className="button min-h-12 w-full md:w-auto" onClick={onStart}>INICIAR</button>
    </article>
  )
}

function PartidosHub({ league, setTab }) {
  const today = new Date().toISOString().slice(0, 10)
  const matches = league.matches.filter((match) => match.match_date?.slice(0, 10) === today)
  const visibleMatches = matches.length ? matches : league.matches.slice(0, 8)
  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminAction title="Acta digital" text="Capturar partido en vivo" onClick={() => setTab('acta digital')} />
        <AdminAction title="Crear partido" text="Calendario y resultados" onClick={() => setTab('partidos-form')} />
        <AdminAction title="Escáner NOVA ID" text="Validar jugadores" onClick={() => setTab('escáner nova id')} />
        <AdminAction title="Playoffs" text="Liguilla por división" onClick={() => setTab('playoffs')} />
        <AdminAction title="Champions Cup" text="Activar y generar bracket" onClick={() => setTab('nova champions cup')} />
      </div>
      <section className="panel p-5">
        <h2 className="text-xl font-black">¿Qué partido vas a capturar?</h2>
        <p className="mt-1 text-sm text-slate-400">Elige una tarjeta y abre el acta digital para empezar rápido.</p>
        <div className="mt-4 grid gap-3">
          {visibleMatches.map((match) => <AdminMatchCard key={match.id} match={match} league={league} onStart={() => setTab('acta digital')} />)}
          {visibleMatches.length === 0 && <p className="text-sm text-slate-400">Crea un partido para iniciar la captura.</p>}
        </div>
      </section>
    </section>
  )
}

function EquiposHub({ league, setTab, run, busy }) {
  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminAction title="Equipos" text="Crear o editar" onClick={() => setTab('equipos-form')} />
        <AdminAction title="Divisiones" text="Orden y ascensos" onClick={() => setTab('divisiones')} />
        <AdminAction title="Liga" text="Logo y portada" onClick={() => setTab('liga')} />
        <AdminAction title="Modo Campeón" text="Activar presentación" onClick={() => setTab('modo campeón')} />
        <AdminAction title="Tabla" text="Ver clasificación" onClick={() => setTab('tabla')} />
      </div>
      <TeamForm busy={busy} run={run} teams={league.teams} divisions={league.divisions} />
    </section>
  )
}

function JugadoresHub({ league, setTab, run, busy }) {
  const pending = league.players.filter((player) => player.approval_status === 'pending').length
  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminAction title="Registrar jugador" text="Alta manual" onClick={() => setTab('jugadores-form')} />
        <AdminAction title="Aprobaciones" text={`${pending} pendientes`} onClick={() => setTab('aprobaciones')} />
        <AdminAction title="Estadísticas" text="Goles y asistencias" onClick={() => setTab('estadísticas de jugadores')} />
        <AdminAction title="NOVA ID" text="Escanear credencial" onClick={() => setTab('escáner nova id')} />
      </div>
      <PlayerForm busy={busy} run={run} teams={league.teams} players={league.players} />
    </section>
  )
}

function SancionesHub({ league, setTab, run, busy }) {
  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminAction title="Sanción rápida" text="Registrar castigo" onClick={() => setTab('sanciones-form')} />
        <AdminAction title="Tarjetas" text="Amarillas y rojas" onClick={() => setTab('tarjetas')} />
        <AdminAction title="Eventos" text="Incidencias" onClick={() => setTab('eventos')} />
        <AdminAction title="Noticias" text="Publicar aviso" onClick={() => setTab('noticias')} />
      </div>
      <SanctionForm busy={busy} run={run} league={league} />
    </section>
  )
}

function statusBadge(status) {
  if (status === 'played') return '🟢 Publicado'
  if (status === 'in_progress') return '🔵 En curso'
  if (status === 'problem') return '🔴 Problema'
  return '🟡 Pendiente'
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

function ChampionSpotlightAdmin({ run, busy, league }) {
  const [form, setForm] = useState({ ...emptyChampionSpotlight, ...(league.championSpotlight || {}) })
  const champion = league.teamsById.get(form.champion_team_id)

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_.75fr]">
      <div className="panel space-y-4 p-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Inicio público</p>
          <h2 className="text-2xl font-black">Modo Campeón</h2>
          <p className="mt-1 text-sm text-slate-400">Cuando esté activo, reemplaza las tablas del inicio por una presentación del campeón. Las tablas siguen disponibles en el menú Tabla.</p>
        </div>
        <Select label="Estado" value={String(form.is_active)} onChange={(is_active) => setForm({ ...form, is_active: is_active === 'true' })} options={[{ id: 'false', name: 'Desactivado' }, { id: 'true', name: 'Activado' }]} />
        <Select label="Ubicación" value={form.display_mode || 'home_section'} onChange={(display_mode) => setForm({ ...form, display_mode })} options={[{ id: 'home_section', name: 'Sección principal del inicio' }, { id: 'entry_presentation', name: 'Presentación especial al ingresar' }]} />
        <Field label="Nombre del torneo" value={form.tournament_name || ''} onChange={(tournament_name) => setForm({ ...form, tournament_name })} />
        <Field label="Temporada o edición" value={form.season_label || ''} onChange={(season_label) => setForm({ ...form, season_label })} />
        <Select label="Equipo campeón" value={form.champion_team_id || ''} onChange={(champion_team_id) => setForm({ ...form, champion_team_id })} options={league.teams} />
        <Field label="Mensaje principal" value={form.message_title || ''} onChange={(message_title) => setForm({ ...form, message_title })} />
        <label className="block text-sm font-bold">Mensaje secundario</label>
        <textarea className="input min-h-28" value={form.message_body || ''} onChange={(event) => setForm({ ...form, message_body: event.target.value })} />
        <FileField label="Fotografía oficial del campeón" onChange={(championPhotoFile) => setForm({ ...form, championPhotoFile })} />
        {form.champion_photo_url && <img src={form.champion_photo_url} alt="Campeón" className="h-32 w-full rounded-lg object-cover ring-1 ring-gold/30" />}
        <SaveButton busy={busy} onClick={() => run(() => saveChampionSpotlight(form), 'Modo Campeón actualizado')} />
      </div>

      <div className="panel p-5">
        <h3 className="text-xl font-black">Vista configurada</h3>
        <div className="mt-4 rounded-lg border border-gold/30 bg-black p-5 text-center">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">CAMPEÓN</p>
          <p className="mt-2 text-sm text-slate-400">{form.tournament_name || 'Nombre del torneo'}</p>
          <div className="mx-auto mt-5 grid h-28 w-28 place-items-center rounded-full border border-gold/40 bg-gold/10">
            {champion?.crest_url ? <img src={champion.crest_url} alt={champion.name} className="h-20 w-20 object-contain" /> : <span className="text-4xl">🏆</span>}
          </div>
          <h4 className="mt-4 text-2xl font-black">{champion?.name || 'Selecciona equipo'}</h4>
          <p className="mt-2 text-gold">{form.message_title || '¡Felicidades, campeones!'}</p>
          <p className="mt-1 text-sm text-slate-400">{form.season_label || 'Temporada'}</p>
        </div>
        <h3 className="mt-6 text-lg font-black">Historial de campeones</h3>
        <div className="mt-3 space-y-2">
          {(league.championHistory || []).slice(0, 6).map((item) => (
            <p key={item.id} className="rounded-lg bg-white/5 px-3 py-2 text-sm">
              <span className="font-bold">{league.teamsById.get(item.champion_team_id)?.name || 'Equipo'}</span>
              <span className="text-slate-400"> · {item.tournament_name} · {item.season_label || 'Sin temporada'}</span>
            </p>
          ))}
          {(league.championHistory || []).length === 0 && <p className="text-sm text-slate-400">Aún no hay campeones anteriores guardados.</p>}
        </div>
      </div>
    </section>
  )
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
        <Field label="Slug" value={form.slug || ''} onChange={(slug) => setForm({ ...form, slug })} />
        <Field label="Descripción" value={form.description || ''} onChange={(description) => setForm({ ...form, description })} />
        <Select label="Estado" value={String(form.active !== false)} onChange={(active) => setForm({ ...form, active: active === 'true' })} options={[{ id: 'true', name: 'Activa' }, { id: 'false', name: 'Inactiva' }]} />
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
  const divisionTeams = league.teams.filter((team) => team.division_id === form.division_id)
  const matchPlayers = league.players.filter((player) => [form.home_team_id, form.away_team_id].includes(player.team_id))
  const validation = validateMatch(form, league)
  return <AdminGrid title="Jornadas, calendario y resultados" list={league.matches.map((match) => `J${match.round}`)}>
    <EntityPicker label="Editar partido" items={league.matches} getLabel={(match) => `J${match.round} - ${match.match_date}`} onPick={(match) => setForm({ ...emptyMatch, ...match, division_id: match.division_id || league.teamsById.get(match.home_team_id)?.division_id || '', venue: match.venue || '', home_score: match.home_score ?? '', away_score: match.away_score ?? '', mvp_player_id: match.mvp_player_id || '', observations: match.observations || '' })} />
    <Select label="División" value={form.division_id || ''} onChange={(division_id) => setForm({ ...form, division_id, home_team_id: '', away_team_id: '', mvp_player_id: '' })} options={league.divisions} />
    <Field label="Jornada" value={form.round} onChange={(round) => setForm({ ...form, round })} />
    <Field label="Fecha y hora" type="datetime-local" value={form.match_date} onChange={(match_date) => setForm({ ...form, match_date })} />
    <Field label="Cancha" value={form.venue || ''} onChange={(venue) => setForm({ ...form, venue })} />
    <Select label="Local" value={form.home_team_id} onChange={(home_team_id) => setForm({ ...form, home_team_id, mvp_player_id: '' })} options={divisionTeams} />
    <Select label="Visitante" value={form.away_team_id} onChange={(away_team_id) => setForm({ ...form, away_team_id, mvp_player_id: '' })} options={divisionTeams} />
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

function validateMatch(match, league) {
  if (!match.division_id) return 'Selecciona una división'
  const home = league.teamsById.get(match.home_team_id)
  const away = league.teamsById.get(match.away_team_id)
  if (!home || !away) return 'Selecciona local y visitante'
  if (home.id === away.id) return 'Local y visitante deben ser equipos diferentes'
  if (home.division_id !== match.division_id || away.division_id !== match.division_id) return 'Los equipos deben pertenecer a la división seleccionada'
  if (!match.id || match.status !== 'played') return ''
  const homeScore = match.home_score === '' ? null : Number(match.home_score)
  const awayScore = match.away_score === '' ? null : Number(match.away_score)
  if (homeScore == null || awayScore == null) return ''
  const homeGoals = league.goals.filter((goal) => goal.match_id === match.id && goal.team_id === match.home_team_id).length
  const awayGoals = league.goals.filter((goal) => goal.match_id === match.id && goal.team_id === match.away_team_id).length
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
  const preparedGoal = { ...goalForm, match_id: match.id, division_id: match.division_id }

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
    <Select label="Partido" value={form.match_id} onChange={(match_id) => {
      const match = league.matches.find((item) => item.id === match_id)
      setForm({ ...form, match_id, division_id: match?.division_id || league.teamsById.get(match?.home_team_id)?.division_id || '', team_id: '', player_id: '', assist_player_id: '' })
    }} options={league.matches.map((match) => ({ id: match.id, name: `J${match.round} ${league.divisionsById.get(match.division_id || league.teamsById.get(match.home_team_id)?.division_id)?.name || ''} ${league.teamsById.get(match.home_team_id)?.name || 'Local'} vs ${league.teamsById.get(match.away_team_id)?.name || 'Visitante'}` }))} />
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
  const [divisionId, setDivisionId] = useState(league.divisions[0]?.id || '')
  const [thirdPlace, setThirdPlace] = useState(false)
  const activeDivision = league.divisionTables.find((division) => division.id === divisionId)
  const setting = league.playoffSettings?.find((item) => item.division_id === divisionId)
  const active = setting?.is_active || setting?.status === 'active'
  const playoffMatches = league.playoffMatches.filter((match) => (match.division_id || league.teamsById.get(match.home_team_id)?.division_id) === divisionId)
  const selectedPlayers = form ? league.players.filter((player) => [form.home_team_id, form.away_team_id].includes(player.team_id)) : []

  return (
    <section className="space-y-6">
      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Playoffs</h2>
            <p className="mt-1 text-sm text-slate-400">Activa playoffs cuando estén listos y genera semifinales por división.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="input max-w-xs" value={divisionId} onChange={(event) => { setDivisionId(event.target.value); setForm(null) }}>
              {league.divisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}
            </select>
            <button className="button-secondary" disabled={busy} onClick={() => run(() => savePlayoffSetting({ division_id: divisionId, is_active: !active }), active ? 'Playoffs desactivados' : 'Playoffs activados')}>{active ? 'Desactivar' : 'Activar'} playoffs</button>
            <button className="button" disabled={busy} onClick={() => run(() => generateSemifinals(activeDivision?.standings || [], divisionId), 'Semifinales generadas')}>Generar semifinales</button>
          </div>
        </div>
      </div>

      <PlayoffBracket matches={playoffMatches} teamsById={league.teamsById} />

      <section className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <div className="panel p-5">
          <h3 className="mb-4 text-lg font-black">Partidos de playoff</h3>
          <div className="space-y-2">
            {playoffMatches.map((match) => (
              <button key={match.id} className="button-secondary w-full justify-start" onClick={() => setForm({ ...match, division_id: divisionId, home_score: match.home_score ?? '', away_score: match.away_score ?? '', home_penalties: match.home_penalties ?? '', away_penalties: match.away_penalties ?? '', match_date: match.match_date || '', venue: match.venue || '', mvp_player_id: match.mvp_player_id || '' })}>
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
            <ActionRow busy={busy} canDelete={Boolean(form.id)} onSave={() => run(() => savePlayoffMatch({ ...form, division_id: divisionId }, playoffMatches, thirdPlace))} onDelete={() => run(() => deleteRecord('playoff_matches', form.id), 'Partido eliminado')} />
          </>}
        </div>
      </section>
    </section>
  )
}

function EventForm({ run, busy, league }) {
  const [form, setForm] = useState(emptyEvent)
  const selectedMatch = league.matches.find((match) => match.id === form.match_id)
  const matchTeamIds = selectedMatch ? [selectedMatch.home_team_id, selectedMatch.away_team_id] : []
  const teams = selectedMatch ? league.teams.filter((team) => matchTeamIds.includes(team.id)) : league.teams
  const players = useMemo(() => league.players.filter((player) => !form.team_id || player.team_id === form.team_id), [league.players, form.team_id])
  return <AdminGrid title="Goleadores y asistencias" list={league.events.map((event) => `${event.type} ${event.minute}'`)}>
    <EntityPicker label="Editar evento" items={league.events} getLabel={(event) => `${event.type} ${event.minute}'`} onPick={(event) => setForm({ ...emptyEvent, ...event })} />
    <Select label="Partido" value={form.match_id} onChange={(match_id) => {
      const match = league.matches.find((item) => item.id === match_id)
      setForm({ ...form, match_id, division_id: match?.division_id || league.teamsById.get(match?.home_team_id)?.division_id || '', team_id: '', player_id: '' })
    }} options={league.matches.map((match) => ({ id: match.id, name: `J${match.round} ${league.divisionsById.get(match.division_id || league.teamsById.get(match.home_team_id)?.division_id)?.name || ''} ${match.match_date}` }))} />
    <Select label="Equipo" value={form.team_id} onChange={(team_id) => setForm({ ...form, team_id, player_id: '' })} options={teams} />
    <Select label="Jugador" value={form.player_id} onChange={(player_id) => setForm({ ...form, player_id })} options={players} />
    <Select label="Tipo" value={form.type} onChange={(type) => setForm({ ...form, type })} options={[{ id: 'goal', name: 'Gol' }, { id: 'assist', name: 'Asistencia' }]} />
    <Field label="Minuto" value={form.minute} onChange={(minute) => setForm({ ...form, minute })} />
    <ActionRow busy={busy} canDelete={Boolean(form.id)} onSave={() => run(() => saveEvent(form))} onDelete={() => run(() => deleteRecord('match_events', form.id), 'Eliminado correctamente')} />
  </AdminGrid>
}

function NovaChampionsAdmin({ run, busy, league }) {
  const cup = league.novaChampions || { settings: {}, qualifiedTeams: [], matches: [], stats: [] }
  const [settings, setSettings] = useState({ is_active: Boolean(cup.settings?.is_active), season_id: cup.settings?.season_id || new Date().getFullYear().toString(), format: cup.settings?.format || 8 })
  const [matchForm, setMatchForm] = useState(emptyChampionsMatch)
  const [statForm, setStatForm] = useState(emptyChampionsStat)
  const [drawMode, setDrawMode] = useState('ranking')
  const qualifiedIds = new Set(cup.qualifiedTeams.map((row) => row.team_id))
  const qualifiedTeams = league.teams.filter((team) => qualifiedIds.has(team.id)).map((team) => {
    const standingsRow = league.standings.find((row) => row.id === team.id)
    return { ...team, seed: standingsRow?.position || 999, points: standingsRow?.points || 0 }
  })
  const selectedMatch = cup.matches.find((match) => match.id === statForm.match_id)
  const matchTeamIds = selectedMatch ? [selectedMatch.home_team_id, selectedMatch.away_team_id] : []
  const statTeams = selectedMatch ? league.teams.filter((team) => matchTeamIds.includes(team.id)) : qualifiedTeams
  const statPlayers = league.players.filter((player) => !statForm.team_id || player.team_id === statForm.team_id)
  const matchPlayers = league.players.filter((player) => [matchForm.home_team_id, matchForm.away_team_id].includes(player.team_id))

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-gold/30 bg-black p-5 shadow-gold">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">NOVA Champions Cup</p>
            <h2 className="mt-2 text-3xl font-black">Gestionar Champions Cup</h2>
            <p className="mt-1 text-sm text-slate-400">Activa la copa, selecciona clasificados y genera brackets sin afectar la liga regular.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="button" disabled={busy} onClick={() => run(() => saveNovaChampionsSettings({ ...settings, is_active: true }), 'Copa iniciada')}>Activar Copa</button>
            <button className="button-secondary" disabled={busy} onClick={() => run(() => saveNovaChampionsSettings({ ...settings, is_active: false }), 'Copa desactivada')}>Desactivar</button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Select label="Estado" value={String(settings.is_active)} onChange={(value) => setSettings({ ...settings, is_active: value === 'true' })} options={[{ id: 'false', name: 'Próximamente' }, { id: 'true', name: 'Activa' }]} />
          <Field label="Temporada" value={settings.season_id} onChange={(season_id) => setSettings({ ...settings, season_id })} />
          <Select label="Formato" value={String(settings.format)} onChange={(format) => setSettings({ ...settings, format })} options={[{ id: '8', name: '8 equipos' }, { id: '16', name: '16 equipos' }, { id: '32', name: '32 equipos' }]} />
          <Select label="Sorteo" value={drawMode} onChange={setDrawMode} options={[{ id: 'ranking', name: 'Por Ranking NOVA' }, { id: 'random', name: 'Aleatorio' }]} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="button-secondary" disabled={busy} onClick={() => run(() => saveNovaChampionsSettings(settings), 'Configuración de copa guardada')}>Guardar estado</button>
          <button className="button" disabled={busy} onClick={() => run(() => generateNovaChampionsBracket({ teams: qualifiedTeams, seasonId: settings.season_id, format: settings.format, mode: drawMode }), 'Bracket generado')}>GENERAR TORNEO</button>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
        <div className="panel p-5">
          <h3 className="text-lg font-black">Equipos clasificados</h3>
          <p className="mt-1 text-sm text-slate-400">Selección manual. En el futuro se puede automatizar por Top 2, Top 4 o campeones.</p>
          <button className="button-secondary mt-3" disabled>Clasificar automáticamente</button>
          <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {league.teams.map((team) => (
              <label key={team.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                <span>
                  <span className="font-bold">{team.name}</span>
                  <span className="block text-xs text-slate-400">{league.divisionsById.get(team.division_id)?.name}</span>
                </span>
                <input type="checkbox" checked={qualifiedIds.has(team.id)} onChange={(event) => run(() => setNovaChampionsTeam(team.id, event.target.checked, settings.season_id), event.target.checked ? 'Equipo clasificado' : 'Clasificación removida')} />
              </label>
            ))}
          </div>
        </div>

        <div className="panel space-y-4 p-5">
          <h3 className="text-lg font-black">Crear o editar llaves</h3>
          <EntityPicker label="Editar cruce" items={cup.matches} getLabel={(match) => `${match.round} ${match.match_order}`} onPick={(match) => setMatchForm({ ...emptyChampionsMatch, ...match, home_score: match.home_score ?? '', away_score: match.away_score ?? '', home_penalties: match.home_penalties ?? '', away_penalties: match.away_penalties ?? '', match_date: match.match_date || '', venue: match.venue || '', mvp_player_id: match.mvp_player_id || '', best_goalkeeper_player_id: match.best_goalkeeper_player_id || '' })} />
          <Select label="Ronda" value={matchForm.round} onChange={(round) => setMatchForm({ ...matchForm, round })} options={[{ id: 'round_of_32', name: 'Dieciseisavos' }, { id: 'round_of_16', name: 'Octavos' }, { id: 'quarterfinal', name: 'Cuartos' }, { id: 'semifinal', name: 'Semifinal' }, { id: 'final', name: 'Final' }]} />
          <Field label="Orden del partido" value={matchForm.match_order} onChange={(match_order) => setMatchForm({ ...matchForm, match_order })} />
          <Select label="Local" value={matchForm.home_team_id} onChange={(home_team_id) => setMatchForm({ ...matchForm, home_team_id, mvp_player_id: '', best_goalkeeper_player_id: '' })} options={qualifiedTeams} />
          <Select label="Visitante" value={matchForm.away_team_id} onChange={(away_team_id) => setMatchForm({ ...matchForm, away_team_id, mvp_player_id: '', best_goalkeeper_player_id: '' })} options={qualifiedTeams} />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Goles local" value={matchForm.home_score} onChange={(home_score) => setMatchForm({ ...matchForm, home_score })} />
            <Field label="Goles visitante" value={matchForm.away_score} onChange={(away_score) => setMatchForm({ ...matchForm, away_score })} />
            <Field label="Penales local" value={matchForm.home_penalties} onChange={(home_penalties) => setMatchForm({ ...matchForm, home_penalties })} />
            <Field label="Penales visitante" value={matchForm.away_penalties} onChange={(away_penalties) => setMatchForm({ ...matchForm, away_penalties })} />
          </div>
          <Select label="Estado" value={matchForm.status} onChange={(status) => setMatchForm({ ...matchForm, status })} options={[{ id: 'scheduled', name: 'Programado' }, { id: 'played', name: 'Jugado' }, { id: 'finalized', name: 'Finalizado' }]} />
          <Field label="Fecha y hora" type="datetime-local" value={matchForm.match_date || ''} onChange={(match_date) => setMatchForm({ ...matchForm, match_date })} />
          <Field label="Cancha" value={matchForm.venue || ''} onChange={(venue) => setMatchForm({ ...matchForm, venue })} />
          <Select label="MVP del partido" value={matchForm.mvp_player_id || ''} onChange={(mvp_player_id) => setMatchForm({ ...matchForm, mvp_player_id })} options={matchPlayers} />
          <Select label="Mejor portero" value={matchForm.best_goalkeeper_player_id || ''} onChange={(best_goalkeeper_player_id) => setMatchForm({ ...matchForm, best_goalkeeper_player_id })} options={matchPlayers} />
          <ActionRow busy={busy} canDelete={Boolean(matchForm.id)} onSave={() => run(() => saveNovaChampionsMatch({ ...matchForm, season_id: settings.season_id }), 'Cruce guardado')} onDelete={() => run(() => deleteRecord('nova_champions_matches', matchForm.id), 'Cruce eliminado')} />
        </div>
      </section>

      <AdminGrid title="Estadísticas de copa" list={cup.stats.map((stat) => `${stat.stat_type} · ${league.playersById.get(stat.player_id)?.name || 'Jugador'}`)}>
        <Select label="Partido" value={statForm.match_id} onChange={(match_id) => setStatForm({ ...statForm, match_id, team_id: '', player_id: '' })} options={cup.matches.map((match) => ({ id: match.id, name: `${match.round} ${match.match_order}` }))} />
        <Select label="Equipo" value={statForm.team_id} onChange={(team_id) => setStatForm({ ...statForm, team_id, player_id: '' })} options={statTeams} />
        <Select label="Jugador" value={statForm.player_id} onChange={(player_id) => setStatForm({ ...statForm, player_id })} options={statPlayers} />
        <Select label="Tipo" value={statForm.stat_type} onChange={(stat_type) => setStatForm({ ...statForm, stat_type })} options={[{ id: 'goal', name: 'Gol' }, { id: 'assist', name: 'Asistencia' }, { id: 'yellow_card', name: 'Tarjeta amarilla' }, { id: 'red_card', name: 'Tarjeta roja' }, { id: 'mvp', name: 'MVP' }, { id: 'clean_sheet', name: 'Portería en cero' }]} />
        <Field label="Minuto" value={statForm.minute} onChange={(minute) => setStatForm({ ...statForm, minute })} />
        <Field label="Valor" value={statForm.value} onChange={(value) => setStatForm({ ...statForm, value })} />
        <SaveButton busy={busy} onClick={() => run(() => saveNovaChampionsStat(statForm), 'Estadística de copa guardada')} />
      </AdminGrid>
    </section>
  )
}

function CardForm({ run, busy, league }) {
  const [form, setForm] = useState(emptyCard)
  const selectedMatch = league.matches.find((match) => match.id === form.match_id)
  const matchTeamIds = selectedMatch ? [selectedMatch.home_team_id, selectedMatch.away_team_id] : []
  const teams = selectedMatch ? league.teams.filter((team) => matchTeamIds.includes(team.id)) : league.teams
  const players = useMemo(() => league.players.filter((player) => !form.team_id || player.team_id === form.team_id), [league.players, form.team_id])
  return <AdminGrid title="Tarjetas por partido" list={league.cards.map((card) => `${card.type} ${card.minute}'`)}>
    <EntityPicker label="Editar tarjeta" items={league.cards} getLabel={(card) => `${card.type} ${card.minute}'`} onPick={(card) => setForm({ ...emptyCard, ...card, reason: card.reason || '' })} />
    <Select label="Partido" value={form.match_id} onChange={(match_id) => {
      const match = league.matches.find((item) => item.id === match_id)
      setForm({ ...form, match_id, division_id: match?.division_id || league.teamsById.get(match?.home_team_id)?.division_id || '', team_id: '', player_id: '' })
    }} options={league.matches.map((match) => ({ id: match.id, name: `J${match.round} ${league.divisionsById.get(match.division_id || league.teamsById.get(match.home_team_id)?.division_id)?.name || ''} ${match.match_date}` }))} />
    <Select label="Equipo" value={form.team_id} onChange={(team_id) => setForm({ ...form, team_id, player_id: '' })} options={teams} />
    <Select label="Jugador" value={form.player_id} onChange={(player_id) => setForm({ ...form, player_id })} options={players} />
    <Select label="Tipo de tarjeta" value={form.type} onChange={(type) => setForm({ ...form, type })} options={[{ id: 'yellow', name: 'Tarjeta amarilla' }, { id: 'red', name: 'Tarjeta roja' }, { id: 'double_yellow', name: 'Doble amarilla' }]} />
    <Field label="Minuto" value={form.minute} onChange={(minute) => setForm({ ...form, minute })} />
    <Field label="Motivo opcional" value={form.reason} onChange={(reason) => setForm({ ...form, reason })} />
    <ActionRow busy={busy} canDelete={Boolean(form.id)} onSave={() => run(() => saveCard(form))} onDelete={() => run(() => deleteRecord('match_cards', form.id), 'Eliminado correctamente')} />
  </AdminGrid>
}

function SanctionForm({ run, busy, league }) {
  const [form, setForm] = useState(emptySanction)
  const divisionTeams = form.division_id ? league.teams.filter((team) => team.division_id === form.division_id) : league.teams
  const divisionTeamIds = new Set(divisionTeams.map((team) => team.id))
  const divisionPlayers = form.division_id ? league.players.filter((player) => divisionTeamIds.has(player.team_id)) : league.players
  return <AdminGrid title="Sanciones" list={league.sanctions.map((sanction) => `${sanction.sanction_type} - ${sanction.status}`)}>
    <EntityPicker label="Editar sanción" items={league.sanctions} getLabel={(sanction) => `${sanction.sanction_type} - ${sanction.status}`} onPick={(sanction) => setForm({ ...emptySanction, ...sanction, division_id: sanction.division_id || league.teamsById.get(sanction.team_id)?.division_id || league.playersById.get(sanction.player_id)?.division_id || '', sanction_target: sanction.team_id ? 'team' : 'player' })} />
    <Select label="División" value={form.division_id || ''} onChange={(division_id) => setForm({ ...form, division_id, player_id: '', team_id: '' })} options={league.divisions} />
    <Select label="Sancionado" value={form.sanction_target} onChange={(sanction_target) => setForm({ ...form, sanction_target })} options={[{ id: 'player', name: 'Jugador' }, { id: 'team', name: 'Equipo' }]} />
    {form.sanction_target === 'player' ? (
      <Select label="Jugador" value={form.player_id || ''} onChange={(player_id) => setForm({ ...form, player_id })} options={divisionPlayers} />
    ) : (
      <Select label="Equipo" value={form.team_id || ''} onChange={(team_id) => setForm({ ...form, team_id })} options={divisionTeams} />
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
