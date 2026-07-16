import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, CalendarDays, Check, ClipboardList, Home, LogOut, RefreshCcw, Save, Search, ShieldAlert, Trash2, UserRound, Users, X } from 'lucide-react'
import { approveOfficialMatch, approvePlayer, assignPlayerToTeam, closeSeason, deleteRecord, fetchAuditLogs, generateNovaChampionsBracket, generateSemifinals, rejectPlayer, saveCard, saveChampionSpotlight, saveDivision, saveEvent, saveFinanceEntry, saveGoal, saveLeagueSettings, saveMatch, saveMatchAssignment, saveNews, saveNotification, saveNovaChampionsHistory, saveNovaChampionsMatch, saveNovaChampionsSettings, saveNovaChampionsStat, savePlayer, savePlayoffMatch, savePlayoffSetting, saveReferee, saveRosterMovement, saveSanction, saveTeam, saveTeamOfWeekSelection, saveVenue, setNovaChampionsTeam } from '../../lib/adminApi'
import { hasSupabaseConfig } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { hasPermission, permissions } from '../../lib/permissions'
import PageTitle from '../../components/PageTitle'
import PlayoffBracket from '../../components/PlayoffBracket'
import StandingsTable from '../../components/StandingsTable'
import { goalTypes, playoffStageLabel } from '../../lib/labels'
import MatchSheetAdmin from './MatchSheetAdmin'
import NovaIdScannerAdmin from './NovaIdScannerAdmin'

const emptyTeam = { name: '', division_id: '', city: '', founded: '', captain: '', coach: '', category: '', season: '', roster_limit: 18, home_colors: '', away_colors: '', social_url: '', inscription_status: 'active', crest_url: '', crestFile: null }
const emptyDivision = { name: '', slug: '', description: '', active: true, level: '', promotion_slots: 0, relegation_slots: 0, championship_slots: 0 }
const emptyLeagueSettings = { name: '', short_name: '', tagline: '', description: '', logo_url: '', logoFile: null }
const emptyPlayer = { team_id: '', status: 'active', name: '', email: '', phone: '', birth_date: '', requested_team_name: '', position: '', number: '', age: '', approval_status: 'approved', photo_url: '', photoFile: null }
const emptyMatch = { division_id: '', round: 1, match_date: '', venue: '', home_team_id: '', away_team_id: '', home_score: '', away_score: '', status: 'scheduled', mvp_player_id: '', observations: '' }
const emptyEvent = { division_id: '', match_id: '', team_id: '', player_id: '', type: 'goal', minute: '' }
const emptyGoal = { division_id: '', match_id: '', team_id: '', player_id: '', minute: '', goal_type: 'open_play', assist_player_id: '' }
const emptyCard = { division_id: '', match_id: '', team_id: '', player_id: '', type: 'yellow', minute: '', reason: '' }
const emptySanction = { division_id: '', sanction_target: 'player', player_id: '', team_id: '', sanction_type: '', reason: '', suspended_matches: '', start_date: '', status: 'active', notes: '' }
const emptyNews = { title: '', excerpt: '', body: '', category: 'noticia', cover_url: '', coverFile: null }
const emptyChampionsMatch = { season_id: new Date().getFullYear().toString(), round: 'quarterfinal', match_order: 1, home_team_id: '', away_team_id: '', home_score: '', away_score: '', home_penalties: '', away_penalties: '', status: 'scheduled', match_date: '', venue: '', mvp_player_id: '', best_goalkeeper_player_id: '' }
const emptyChampionsStat = { match_id: '', team_id: '', player_id: '', stat_type: 'goal', minute: '', value: 1 }
const emptyChampionSpotlight = { is_active: false, display_mode: 'home_section', tournament_name: '', season_label: '', champion_team_id: '', champion_photo_url: '', championPhotoFile: null, message_title: '¡Felicidades, campeones!', message_body: 'Han conquistado la gloria de NOVA.' }
const emptyRosterMovement = { player_id: '', from_team_id: '', to_team_id: '', movement_type: 'alta', reason: '', status: 'approved' }
const emptyTeamOfWeek = { season_label: new Date().getFullYear().toString(), round: 1, slot: 'mvp', player_id: '', team_id: '', note: '' }
const emptyVenue = { name: '', address: '', map_url: '', capacity: '', status: 'active', notes: '' }
const emptyReferee = { full_name: '', phone: '', email: '', status: 'active', authorized_divisions: [] }
const emptyAssignment = { match_id: '', referee_id: '', venue_id: '', assignment_status: 'pending', notes: '' }
const emptyFinance = { team_id: '', entry_type: 'charge', concept: '', amount: '', status: 'pending', due_date: '', paid_at: '', notes: '' }
const emptyNotification = { title: '', body: '', notification_type: 'general', audience: 'public', team_id: '', publish_at: '', requires_ack: false, status: 'published' }
const emptyChampionsHistory = { season_id: new Date().getFullYear().toString(), champion_team_id: '', runner_up_team_id: '', final_score: '', final_mvp_player_id: '', top_scorer_player_id: '', best_goalkeeper_player_id: '' }

export default function AdminDashboard({ league }) {
  const [tab, setTab] = useState('dashboard')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const { role, signOut } = useAuth()
  const navigate = useNavigate()
  const can = (permission) => !hasSupabaseConfig || hasPermission(role, permission)
  const navItems = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    can(permissions.MATCH_CAPTURE) && { id: 'partidos', label: 'Partidos', icon: CalendarDays },
    can(permissions.TEAMS_MANAGE) && { id: 'equipos', label: 'Equipos', icon: Users },
    can(permissions.PLAYERS_MANAGE) && { id: 'jugadores', label: 'Jugadores', icon: UserRound },
    can(permissions.DISCIPLINE_MANAGE) && { id: 'sanciones', label: 'Sanciones', icon: ShieldAlert },
  ].filter(Boolean)
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
            {can(permissions.AUDIT_READ) && <button className="button-secondary w-full justify-start" onClick={() => setTab('bitacora')}><Activity size={16} />Bitácora</button>}
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

          {tab === 'dashboard' && <AdminSummary league={league} setTab={setTab} run={run} busy={busy} can={can} />}
        {tab === 'partidos' && <PartidosHub league={league} setTab={setTab} />}
        {tab === 'equipos' && <EquiposHub league={league} setTab={setTab} run={run} busy={busy} />}
        {tab === 'jugadores' && <JugadoresHub league={league} setTab={setTab} run={run} busy={busy} />}
        {tab === 'sanciones' && <SancionesHub league={league} setTab={setTab} run={run} busy={busy} />}

        {tab === 'liga' && <LeagueSettingsForm busy={busy} run={run} settings={league.settings} />}
        {tab === 'bitacora' && <AuditLogAdmin />}
        {tab === 'modo campeón' && <ChampionSpotlightAdmin busy={busy} run={run} league={league} />}
        {tab === 'divisiones' && <DivisionAdmin busy={busy} run={run} league={league} />}
        {tab === 'equipos-form' && <TeamForm busy={busy} run={run} teams={league.teams} divisions={league.divisions} />}
        {tab === 'jugadores-form' && <PlayerForm busy={busy} run={run} teams={league.teams} players={league.players} />}
        {tab === 'plantillas' && <RosterAdmin busy={busy} run={run} league={league} />}
        {tab === 'equipo de la jornada' && <TeamOfWeekAdmin busy={busy} run={run} league={league} />}
        {tab === 'aprobaciones' && <PlayerApprovals busy={busy} run={run} teams={league.teams} players={league.players} />}
        {tab === 'partidos-form' && <MatchForm busy={busy} run={run} league={league} />}
        {tab === 'revisión de actas' && <MatchReviewAdmin busy={busy} run={run} league={league} />}
        {tab === 'canchas y árbitros' && <VenuesRefereesAdmin busy={busy} run={run} league={league} />}
        {tab === 'acta digital' && <MatchSheetAdmin busy={busy} run={run} league={league} />}
        {tab === 'escáner nova id' && <NovaIdScannerAdmin busy={busy} run={run} league={league} />}
        {tab === 'estadísticas de jugadores' && <GoalForm busy={busy} run={run} league={league} />}
        {tab === 'playoffs' && <PlayoffsAdmin busy={busy} run={run} league={league} />}
        {tab === 'nova champions cup' && <NovaChampionsAdmin busy={busy} run={run} league={league} />}
        {tab === 'eventos' && <EventForm busy={busy} run={run} league={league} />}
        {tab === 'tarjetas' && <CardForm busy={busy} run={run} league={league} />}
        {tab === 'sanciones-form' && <SanctionForm busy={busy} run={run} league={league} />}
        {tab === 'noticias' && <NewsForm busy={busy} run={run} news={league.news} />}
        {tab === 'finanzas' && <FinanceAdmin busy={busy} run={run} league={league} />}
        {tab === 'nova media' && <NovaMediaAdmin busy={busy} run={run} league={league} />}
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
  if (['partidos-form', 'revisión de actas', 'canchas y árbitros', 'acta digital', 'playoffs', 'nova champions cup', 'eventos', 'tarjetas', 'estadísticas de jugadores', 'escáner nova id'].includes(tab)) return 'partidos'
  if (['equipos-form', 'liga', 'modo campeón', 'divisiones', 'tabla', 'noticias', 'nova media', 'finanzas'].includes(tab)) return 'equipos'
  if (['jugadores-form', 'aprobaciones', 'plantillas', 'equipo de la jornada'].includes(tab)) return 'jugadores'
  if (['sanciones-form'].includes(tab)) return 'sanciones'
  if (['bitacora'].includes(tab)) return 'dashboard'
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
    'revisión de actas': 'Revisión de Actas',
    'canchas y árbitros': 'Canchas y Árbitros',
    'escáner nova id': 'Escáner NOVA ID',
    'nova champions cup': 'NOVA Champions Cup',
    'modo campeón': 'Modo Campeón',
    bitacora: 'Bitácora',
    'partidos-form': 'Crear Partido',
    'equipos-form': 'Gestionar Equipos',
    'jugadores-form': 'Gestionar Jugadores',
    plantillas: 'Control de Plantillas',
    'equipo de la jornada': 'Equipo de la Jornada',
    'sanciones-form': 'Gestionar Sanciones',
    finanzas: 'Finanzas',
    'nova media': 'NOVA Media',
  }
  return titles[tab] || tab
}

function AdminSummary({ league, setTab, run, busy, can }) {
  const pending = league.players.filter((player) => player.approval_status === 'pending').length
  const inReview = league.matches.filter((match) => match.status === 'played').length
  const sanctions = league.sanctions.filter((sanction) => sanction.status === 'active').length
  const today = new Date().toISOString().slice(0, 10)
  const todayMatches = league.matches.filter((match) => match.match_date?.slice(0, 10) === today)
  const pendingToday = todayMatches.filter((match) => !['played', 'official'].includes(match.status)).length
  const upcomingMatches = league.matches
    .filter((match) => !['played', 'official'].includes(match.status) && match.match_date?.slice(0, 10) >= today)
    .sort((a, b) => new Date(a.match_date || 0) - new Date(b.match_date || 0))
  const nextMatch = upcomingMatches[0]
  const incompleteMatches = league.matches.filter((match) => !match.match_date || !match.venue).length
  const draftReports = league.reports.filter((report) => report.status !== 'finalized').length
  const unsignedReports = league.reports.filter((report) => !report.home_captain_signature || !report.away_captain_signature || !report.referee_signature).length
  const calendarConflicts = findCalendarConflicts(league.matches).length

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gold/30 bg-black p-5 shadow-gold">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Hoy</p>
        <h2 className="mt-2 text-3xl font-black">Hola, Admin</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <AdminMetric label="Partidos pendientes" value={pendingToday} />
          <AdminMetric label="Resultados en revisión" value={inReview} />
          <AdminMetric label="Sanciones pendientes" value={sanctions} />
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.1fr_.9fr]">
        <div className="panel p-5">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">Atención</p>
            <h3 className="mt-1 text-2xl font-black">Qué necesita revisión</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {can(permissions.PLAYERS_MANAGE) && <AdminAttentionCard title="Jugadores por aprobar" value={pending} text="Revisa registros nuevos" tone={pending ? 'gold' : 'ok'} onClick={() => setTab('aprobaciones')} />}
            {can(permissions.DISCIPLINE_MANAGE) && <AdminAttentionCard title="Sanciones activas" value={sanctions} text="Disciplina pendiente" tone={sanctions ? 'danger' : 'ok'} onClick={() => setTab('sanciones')} />}
            {can(permissions.MATCH_CAPTURE) && <AdminAttentionCard title="Actas sin cerrar" value={draftReports} text="Borradores guardados" tone={draftReports ? 'gold' : 'ok'} onClick={() => setTab('acta digital')} />}
            {can(permissions.MATCH_CAPTURE) && <AdminAttentionCard title="Actas sin firma" value={unsignedReports} text="Faltan firmas digitales" tone={unsignedReports ? 'gold' : 'ok'} onClick={() => setTab('acta digital')} />}
            {can(permissions.MATCH_REVIEW) && <AdminAttentionCard title="Partidos incompletos" value={incompleteMatches} text="Sin cancha o fecha" tone={incompleteMatches ? 'gold' : 'ok'} onClick={() => setTab('partidos-form')} />}
            {can(permissions.MATCH_REVIEW) && <AdminAttentionCard title="Choques de calendario" value={calendarConflicts} text="Misma cancha y hora" tone={calendarConflicts ? 'danger' : 'ok'} onClick={() => setTab('partidos')} />}
          </div>
        </div>

        <div className="panel p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">Próximo partido</p>
          {nextMatch ? (
            <div className="mt-4 space-y-4">
              <AdminMatchCard match={nextMatch} league={league} onStart={can(permissions.MATCH_CAPTURE) ? () => setTab('acta digital') : null} />
              <p className="text-sm text-slate-400">Abre el acta digital cuando el árbitro esté listo para confirmar jugadores.</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">No hay próximos partidos programados.</p>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {can(permissions.MATCH_CAPTURE) && <AdminAction title="Iniciar partido" text="Abrir acta digital" onClick={() => setTab('acta digital')} />}
        {can(permissions.MATCH_REVIEW) && <AdminAction title="Revisar actas" text="Publicar resultado oficial" onClick={() => setTab('revisión de actas')} />}
        {can(permissions.MATCH_REVIEW) && <AdminAction title="Crear partido" text="Programar jornada" onClick={() => setTab('partidos-form')} />}
        {can(permissions.PLAYERS_MANAGE) && <AdminAction title="Registrar jugador" text={`${pending} pendientes`} onClick={() => setTab('jugadores')} />}
        {can(permissions.SETTINGS_MANAGE) && <AdminAction title="Modo Campeón" text="Presentación del campeón" onClick={() => setTab('modo campeón')} />}
        {can(permissions.AUDIT_READ) && <AdminAction title="Bitácora" text="Acciones recientes" onClick={() => setTab('bitacora')} />}
        {can(permissions.FINANCE_MANAGE) && <AdminAction title="Finanzas" text="Pagos y adeudos" onClick={() => setTab('finanzas')} />}
        {can(permissions.MEDIA_MANAGE) && <AdminAction title="NOVA Media" text="Noticias y avisos" onClick={() => setTab('nova media')} />}
      </section>

      {can(permissions.SETTINGS_MANAGE) && <ChampionsAdminStatus league={league} setTab={setTab} run={run} busy={busy} />}

      {can(permissions.AUDIT_READ) && <section className="rounded-lg border border-gold/30 bg-black p-5 shadow-gold">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Control interno</p>
            <h3 className="mt-2 text-2xl font-black">Bitácora de acciones</h3>
            <p className="mt-1 text-sm text-slate-400">Consulta quién cambió resultados, jugadores, sanciones, equipos y actas.</p>
          </div>
          <button className="button" onClick={() => setTab('bitacora')}><Activity size={16} />Abrir bitácora</button>
        </div>
      </section>}

      <section className="panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardList className="text-gold" size={20} />
          <h3 className="text-xl font-black">Partidos de hoy</h3>
        </div>
        <div className="grid gap-3">
          {todayMatches.length === 0 && <p className="text-sm text-slate-400">No hay partidos programados hoy.</p>}
          {todayMatches.map((match) => <AdminMatchCard key={match.id} match={match} league={league} onStart={can(permissions.MATCH_CAPTURE) ? () => setTab('acta digital') : null} />)}
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

function AdminAttentionCard({ title, value, text, tone = 'gold', onClick }) {
  const toneClass = {
    ok: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
    gold: 'border-gold/30 bg-gold/10 text-gold',
    danger: 'border-red-400/30 bg-red-500/10 text-red-100',
  }[tone]

  return (
    <button onClick={onClick} className={`rounded-lg border p-4 text-left transition hover:-translate-y-0.5 ${toneClass}`}>
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-2 font-black text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-300">{text}</p>
    </button>
  )
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
      {onStart && <button className="button min-h-12 w-full md:w-auto" onClick={onStart}>INICIAR</button>}
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
        <AdminAction title="Revisar actas" text="Publicar oficial" onClick={() => setTab('revisión de actas')} />
        <AdminAction title="Crear partido" text="Calendario y resultados" onClick={() => setTab('partidos-form')} />
        <AdminAction title="Canchas y árbitros" text="Asignaciones" onClick={() => setTab('canchas y árbitros')} />
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

function VenuesRefereesAdmin({ league, run, busy }) {
  const [venueForm, setVenueForm] = useState(emptyVenue)
  const [refereeForm, setRefereeForm] = useState(emptyReferee)
  const [assignment, setAssignment] = useState(emptyAssignment)
  const match = league.matches.find((item) => item.id === assignment.match_id)
  const conflicts = match ? findAssignmentConflicts(match, assignment, league) : []

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-gold/30 bg-black p-5 shadow-gold">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Calendario operativo</p>
        <h2 className="mt-2 text-2xl font-black">Canchas, árbitros y asignaciones</h2>
        <p className="mt-1 text-sm text-slate-400">Asigna cancha y árbitro antes de publicar jornadas.</p>
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="panel space-y-4 p-5">
          <h3 className="text-lg font-black">Canchas</h3>
          <EntityPicker label="Editar cancha" items={league.venues || []} getLabel={(venue) => venue.name} onPick={(venue) => setVenueForm({ ...emptyVenue, ...venue, capacity: venue.capacity || '' })} />
          <Field label="Nombre" value={venueForm.name} onChange={(name) => setVenueForm({ ...venueForm, name })} />
          <Field label="Dirección" value={venueForm.address || ''} onChange={(address) => setVenueForm({ ...venueForm, address })} />
          <Field label="Mapa" value={venueForm.map_url || ''} onChange={(map_url) => setVenueForm({ ...venueForm, map_url })} />
          <Field label="Capacidad" value={venueForm.capacity || ''} onChange={(capacity) => setVenueForm({ ...venueForm, capacity })} />
          <Select label="Estado" value={venueForm.status} onChange={(status) => setVenueForm({ ...venueForm, status })} options={[{ id: 'active', name: 'Activa' }, { id: 'maintenance', name: 'Mantenimiento' }, { id: 'inactive', name: 'Inactiva' }]} />
          <Field label="Notas" value={venueForm.notes || ''} onChange={(notes) => setVenueForm({ ...venueForm, notes })} />
          <button className="button" disabled={busy || !venueForm.name} onClick={() => run(() => saveVenue(venueForm), 'Cancha guardada')}>Guardar cancha</button>
        </div>

        <div className="panel space-y-4 p-5">
          <h3 className="text-lg font-black">Árbitros</h3>
          <EntityPicker label="Editar árbitro" items={league.referees || []} getLabel={(referee) => referee.full_name} onPick={(referee) => setRefereeForm({ ...emptyReferee, ...referee })} />
          <Field label="Nombre completo" value={refereeForm.full_name} onChange={(full_name) => setRefereeForm({ ...refereeForm, full_name })} />
          <Field label="Teléfono" value={refereeForm.phone || ''} onChange={(phone) => setRefereeForm({ ...refereeForm, phone })} />
          <Field label="Correo" value={refereeForm.email || ''} onChange={(email) => setRefereeForm({ ...refereeForm, email })} />
          <Select label="Estado" value={refereeForm.status} onChange={(status) => setRefereeForm({ ...refereeForm, status })} options={[{ id: 'active', name: 'Activo' }, { id: 'inactive', name: 'Inactivo' }, { id: 'suspended', name: 'Suspendido' }]} />
          <button className="button" disabled={busy || !refereeForm.full_name} onClick={() => run(() => saveReferee(refereeForm), 'Árbitro guardado')}>Guardar árbitro</button>
        </div>

        <div className="panel space-y-4 p-5">
          <h3 className="text-lg font-black">Asignar partido</h3>
          <Select label="Partido" value={assignment.match_id} onChange={(match_id) => {
            const current = (league.matchAssignments || []).find((item) => item.match_id === match_id)
            setAssignment({ ...emptyAssignment, ...(current || {}), match_id })
          }} options={league.matches.map((item) => ({ id: item.id, name: `J${item.round} ${league.teamsById.get(item.home_team_id)?.name || 'Local'} vs ${league.teamsById.get(item.away_team_id)?.name || 'Visitante'}` }))} />
          <Select label="Cancha" value={assignment.venue_id} onChange={(venue_id) => setAssignment({ ...assignment, venue_id })} options={league.venues || []} />
          <Select label="Árbitro" value={assignment.referee_id} onChange={(referee_id) => setAssignment({ ...assignment, referee_id })} options={(league.referees || []).map((item) => ({ id: item.id, name: item.full_name }))} />
          <Select label="Estado" value={assignment.assignment_status} onChange={(assignment_status) => setAssignment({ ...assignment, assignment_status })} options={[{ id: 'pending', name: 'Pendiente' }, { id: 'accepted', name: 'Aceptada' }, { id: 'declined', name: 'Rechazada' }, { id: 'completed', name: 'Completada' }]} />
          <Field label="Notas" value={assignment.notes || ''} onChange={(notes) => setAssignment({ ...assignment, notes })} />
          {conflicts.length > 0 && <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{conflicts.map((item) => <p key={item}>{item}</p>)}</div>}
          <button className="button" disabled={busy || !assignment.match_id} onClick={() => run(() => saveMatchAssignment(assignment), 'Asignación guardada')}>Guardar asignación</button>
        </div>
      </section>
    </section>
  )
}

function findAssignmentConflicts(match, assignment, league) {
  const conflicts = []
  if (!match.match_date) return conflicts
  const sameSlot = (other) => other.id !== match.id && other.match_date?.slice(0, 16) === match.match_date.slice(0, 16)
  const sameVenueAssignments = (league.matchAssignments || []).filter((item) => item.match_id !== match.id && item.venue_id && item.venue_id === assignment.venue_id)
  const sameRefereeAssignments = (league.matchAssignments || []).filter((item) => item.match_id !== match.id && item.referee_id && item.referee_id === assignment.referee_id)
  if (assignment.venue_id && sameVenueAssignments.some((item) => sameSlot(league.matches.find((row) => row.id === item.match_id) || {}))) conflicts.push('Choque de cancha en el mismo horario.')
  if (assignment.referee_id && sameRefereeAssignments.some((item) => sameSlot(league.matches.find((row) => row.id === item.match_id) || {}))) conflicts.push('El árbitro ya tiene partido en ese horario.')
  if (league.matches.some((other) => sameSlot(other) && [other.home_team_id, other.away_team_id].some((teamId) => [match.home_team_id, match.away_team_id].includes(teamId)))) conflicts.push('Un equipo ya tiene partido en ese horario.')
  return conflicts
}

function MatchReviewAdmin({ league, run, busy }) {
  const reports = league.reports
    .filter((report) => report.status === 'finalized' || report.status === 'official')
    .map((report) => ({ report, match: league.matches.find((match) => match.id === report.match_id) }))
    .filter((row) => row.match)
    .sort((a, b) => new Date(b.match.match_date || 0) - new Date(a.match.match_date || 0))

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-gold/30 bg-black p-5 shadow-gold">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Validación oficial</p>
        <h2 className="mt-2 text-2xl font-black">Revisión de actas</h2>
        <p className="mt-1 text-sm text-slate-400">Revisa el acta finalizada antes de publicar el resultado como oficial.</p>
      </div>

      <div className="grid gap-3">
        {reports.length === 0 && <p className="panel p-5 text-sm text-slate-400">No hay actas finalizadas para revisar.</p>}
        {reports.map(({ report, match }) => {
          const official = match.status === 'official' || report.status === 'official'
          const home = league.teamsById.get(match.home_team_id)
          const away = league.teamsById.get(match.away_team_id)
          const signaturesReady = report.home_captain_signature && report.away_captain_signature && report.referee_signature
          return (
            <article key={report.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">{official ? 'Resultado oficial' : 'En revisión'}</p>
                  <h3 className="mt-2 text-xl font-black">{home?.name || 'Local'} {match.home_score ?? 0} - {match.away_score ?? 0} {away?.name || 'Visitante'}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {formatAdminDate(match.match_date)} · {match.venue || report.venue || 'Cancha sin registrar'} · Árbitro: {report.referee_name || 'Sin registrar'}
                  </p>
                  <p className={`mt-3 inline-flex rounded-lg border px-3 py-1 text-xs font-black ${signaturesReady ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100' : 'border-gold/30 bg-gold/10 text-gold'}`}>
                    {signaturesReady ? 'Firmas completas' : 'Faltan firmas'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="button-secondary" onClick={() => window.open(`/match/${match.id}#acta`, '_blank', 'noopener,noreferrer')}>Ver acta</button>
                  <button className="button" disabled={busy || official || !signaturesReady} onClick={() => run(() => approveOfficialMatch({ match, report }), 'Resultado publicado como oficial')}>
                    {official ? 'Publicado' : 'Publicar oficial'}
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
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
        <AdminAction title="NOVA Media" text="Noticias y avisos" onClick={() => setTab('nova media')} />
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
        <AdminAction title="Plantillas" text="Altas, bajas y transferencias" onClick={() => setTab('plantillas')} />
        <AdminAction title="Equipo Jornada" text="Selección manual" onClick={() => setTab('equipo de la jornada')} />
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
  if (status === 'official') return '🟢 Oficial'
  if (status === 'played') return '🟢 Publicado'
  if (status === 'in_progress') return '🔵 En curso'
  if (status === 'problem') return '🔴 Problema'
  return '🟡 Pendiente'
}

function formatAdminDate(value) {
  if (!value) return 'Fecha por definir'
  return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

function findCalendarConflicts(matches = []) {
  const slots = new Map()
  matches
    .filter((match) => !['played', 'official'].includes(match.status) && match.match_date && match.venue)
    .forEach((match) => {
      const slot = `${match.match_date.slice(0, 16)}-${match.venue.toLowerCase().trim()}`
      slots.set(slot, [...(slots.get(slot) || []), match])
    })
  return [...slots.values()].filter((slotMatches) => slotMatches.length > 1)
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

function AuditLogAdmin() {
  const [rows, setRows] = useState([])
  const [module, setModule] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (!hasSupabaseConfig) {
        setError('Modo demo: conecta Supabase para consultar la bitácora real.')
        setRows([])
        return
      }
      setLoading(true)
      setError('')
      const result = await fetchAuditLogs({ module, search, limit: 120 })
      if (!active) return
      setLoading(false)
      if (result.error) {
        setRows([])
        setError(result.error.message?.includes('audit_logs') ? 'Ejecuta primero la migración supabase/add_platform_foundation.sql para crear la tabla audit_logs.' : result.error.message)
        return
      }
      setRows(result.data || [])
    }
    load()
    return () => { active = false }
  }, [module, search])

  const modules = ['teams', 'players', 'matches', 'match_sheet', 'discipline', 'playoffs', 'nova_champions', 'nova_champions_stats', 'nova_id', 'champion_spotlight', 'media', 'settings', 'divisions']

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-gold/30 bg-black p-5 shadow-gold">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Control interno</p>
            <h2 className="mt-2 text-2xl font-black">Bitácora de acciones</h2>
            <p className="mt-1 text-sm text-slate-400">Consulta cambios administrativos sin exponerlos en la app pública.</p>
          </div>
          <button className="button-secondary" onClick={() => { setModule(''); setSearch('') }}><RefreshCcw size={16} />Limpiar filtros</button>
        </div>
      </div>

      <div className="panel grid gap-3 p-4 md:grid-cols-[1fr_240px]">
        <label className="relative block">
          <Search className="absolute left-3 top-3 text-slate-500" size={18} />
          <input className="input pl-10" placeholder="Buscar por usuario, acción, módulo o entidad" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <select className="input" value={module} onChange={(event) => setModule(event.target.value)}>
          <option value="">Todos los módulos</option>
          {modules.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {error && <p className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">{error}</p>}
      {loading && <div className="panel p-5 text-sm text-slate-400">Cargando bitácora...</div>}
      {!loading && !error && rows.length === 0 && <div className="panel p-5 text-sm text-slate-400">Aún no hay acciones registradas.</div>}

      <div className="space-y-3">
        {rows.map((row) => <AuditLogCard key={row.id} row={row} />)}
      </div>
    </section>
  )
}

function AuditLogCard({ row }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-gold/30 bg-gold/10 text-gold"><Activity size={18} /></div>
          <div>
            <p className="font-black">{actionLabel(row.action)} <span className="text-gold">{row.module}</span></p>
            <p className="mt-1 text-sm text-slate-400">{row.actor_email || 'Usuario sin correo'} · {row.entity_table || 'sin tabla'} {row.entity_id ? `· ${row.entity_id}` : ''}</p>
            {row.reason && <p className="mt-2 rounded-lg bg-black/30 px-3 py-2 text-sm text-slate-300">Motivo: {row.reason}</p>}
          </div>
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{formatDateTime(row.created_at)}</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <AuditValue title="Antes" value={row.previous_value} />
        <AuditValue title="Después" value={row.new_value} />
      </div>
    </article>
  )
}

function AuditValue({ title, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-gold">{title}</p>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-300">{value ? JSON.stringify(value, null, 2) : 'Sin datos'}</pre>
    </div>
  )
}

function actionLabel(action) {
  const labels = {
    create: 'Creó',
    update: 'Actualizó',
    delete: 'Eliminó',
    approve: 'Aprobó',
    reject: 'Rechazó',
    assign_team: 'Asignó equipo',
    finalize_match: 'Finalizó partido',
    save_report: 'Guardó acta',
    finalize_report: 'Finalizó acta',
    create_event: 'Registró evento',
    delete_event: 'Eliminó evento',
    generate_bracket: 'Generó bracket',
    generate_semifinals: 'Generó semifinales',
    qualify_team: 'Clasificó equipo',
    unqualify_team: 'Quitó clasificación',
    confirm_attendance: 'Confirmó asistencia',
    set_mvp: 'Asignó MVP',
  }
  return labels[action] || action || 'Acción'
}

function formatDateTime(value) {
  if (!value) return 'Sin fecha'
  return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
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
    <Field label="Entrenador" value={form.coach || ''} onChange={(coach) => setForm({ ...form, coach })} />
    <Field label="Categoría" value={form.category || ''} onChange={(category) => setForm({ ...form, category })} />
    <Field label="Temporada" value={form.season || ''} onChange={(season) => setForm({ ...form, season })} />
    <Field label="Límite de jugadores" value={form.roster_limit || 18} onChange={(roster_limit) => setForm({ ...form, roster_limit })} />
    <Field label="Colores local" value={form.home_colors || ''} onChange={(home_colors) => setForm({ ...form, home_colors })} />
    <Field label="Colores visitante" value={form.away_colors || ''} onChange={(away_colors) => setForm({ ...form, away_colors })} />
    <Field label="Red social" value={form.social_url || ''} onChange={(social_url) => setForm({ ...form, social_url })} />
    <Select label="Estado de inscripción" value={form.inscription_status || 'active'} onChange={(inscription_status) => setForm({ ...form, inscription_status })} options={[{ id: 'active', name: 'Activa' }, { id: 'pending', name: 'Pendiente' }, { id: 'blocked', name: 'Bloqueada' }]} />
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
    <Select label="Estado deportivo" value={form.status || 'active'} onChange={(status) => setForm({ ...form, status })} options={[{ id: 'active', name: 'Activo' }, { id: 'injured', name: 'Lesionado' }, { id: 'suspended', name: 'Suspendido' }]} />
    <FileField label="Foto" onChange={(photoFile) => setForm({ ...form, photoFile })} />
    <ActionRow busy={busy} canDelete={Boolean(form.id)} onSave={() => run(() => savePlayer(form))} onDelete={() => run(() => deleteRecord('players', form.id), 'Jugador eliminado correctamente')} />
  </AdminGrid>
}

function RosterAdmin({ league, run, busy }) {
  const [form, setForm] = useState(emptyRosterMovement)
  const player = league.playersById.get(form.player_id)
  const fromTeam = form.from_team_id || player?.team_id || ''
  const teamPlayers = league.players.filter((item) => item.team_id === form.to_team_id)
  const rosterLimit = 18
  const duplicateActive = form.to_team_id && league.players.some((item) => item.id === form.player_id && item.team_id === form.to_team_id && item.approval_status === 'approved')
  const validation = !form.player_id ? 'Selecciona un jugador.' : !form.to_team_id && form.movement_type !== 'baja' ? 'Selecciona equipo destino.' : duplicateActive ? 'El jugador ya está activo en ese equipo.' : teamPlayers.length >= rosterLimit && form.movement_type !== 'baja' ? 'El equipo destino ya alcanzó el límite sugerido de plantilla.' : ''

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
      <div className="panel space-y-4 p-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">Plantillas</p>
          <h2 className="text-2xl font-black">Altas, bajas y transferencias</h2>
          <p className="mt-1 text-sm text-slate-400">Registra movimientos sin borrar historial del jugador.</p>
        </div>
        <Select label="Jugador" value={form.player_id} onChange={(player_id) => {
          const selected = league.playersById.get(player_id)
          setForm({ ...form, player_id, from_team_id: selected?.team_id || '' })
        }} options={league.players} />
        <Select label="Movimiento" value={form.movement_type} onChange={(movement_type) => setForm({ ...form, movement_type })} options={[{ id: 'alta', name: 'Alta' }, { id: 'baja', name: 'Baja' }, { id: 'transferencia', name: 'Transferencia' }, { id: 'cesion', name: 'Cesión' }]} />
        <Select label="Equipo origen" value={fromTeam} onChange={(from_team_id) => setForm({ ...form, from_team_id })} options={league.teams} />
        <Select label="Equipo destino" value={form.to_team_id} onChange={(to_team_id) => setForm({ ...form, to_team_id })} options={league.teams} />
        <Field label="Motivo" value={form.reason} onChange={(reason) => setForm({ ...form, reason })} />
        <Select label="Estado" value={form.status} onChange={(status) => setForm({ ...form, status })} options={[{ id: 'pending', name: 'Pendiente' }, { id: 'approved', name: 'Aprobado' }, { id: 'rejected', name: 'Rechazado' }]} />
        {validation && <p className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold">{validation}</p>}
        <button className="button" disabled={busy || Boolean(validation)} onClick={() => run(() => saveRosterMovement({ ...form, from_team_id: fromTeam }), 'Movimiento de plantilla guardado')}>Guardar movimiento</button>
      </div>
      <div className="panel p-5">
        <h3 className="text-lg font-black">Últimos movimientos</h3>
        <div className="mt-4 space-y-2">
          {(league.rosterMovements || []).slice(0, 10).map((movement) => (
            <div key={movement.id} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
              <p className="font-bold">{league.playersById.get(movement.player_id)?.name || 'Jugador'} · {movement.movement_type}</p>
              <p className="text-slate-400">{league.teamsById.get(movement.from_team_id)?.name || 'Libre'} → {league.teamsById.get(movement.to_team_id)?.name || 'Sin equipo'}</p>
            </div>
          ))}
          {(league.rosterMovements || []).length === 0 && <p className="text-sm text-slate-400">Sin movimientos registrados.</p>}
        </div>
      </div>
    </section>
  )
}

function TeamOfWeekAdmin({ league, run, busy }) {
  const [form, setForm] = useState(emptyTeamOfWeek)
  const teamPlayers = league.players.filter((player) => !form.team_id || player.team_id === form.team_id)
  const selectedPlayer = league.playersById.get(form.player_id)
  const prepared = { ...form, team_id: form.team_id || selectedPlayer?.team_id || '' }
  const slots = [
    { id: 'por', name: 'Portero' },
    { id: 'def_1', name: 'Defensa 1' },
    { id: 'def_2', name: 'Defensa 2' },
    { id: 'mid_1', name: 'Medio 1' },
    { id: 'mid_2', name: 'Medio 2' },
    { id: 'del_1', name: 'Delantero 1' },
    { id: 'mvp', name: 'MVP Jornada' },
  ]

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
      <div className="panel space-y-4 p-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">Reconocimientos</p>
          <h2 className="text-2xl font-black">Equipo de la Jornada</h2>
          <p className="mt-1 text-sm text-slate-400">Selección manual inicial; después podrá sugerirse por estadísticas.</p>
        </div>
        <Field label="Temporada" value={form.season_label} onChange={(season_label) => setForm({ ...form, season_label })} />
        <Field label="Jornada" value={form.round} onChange={(round) => setForm({ ...form, round })} />
        <Select label="Lugar" value={form.slot} onChange={(slot) => setForm({ ...form, slot })} options={slots} />
        <Select label="Equipo" value={form.team_id} onChange={(team_id) => setForm({ ...form, team_id, player_id: '' })} options={league.teams} />
        <Select label="Jugador" value={form.player_id} onChange={(player_id) => setForm({ ...form, player_id })} options={teamPlayers} />
        <Field label="Nota" value={form.note} onChange={(note) => setForm({ ...form, note })} />
        <button className="button" disabled={busy || !prepared.player_id || !prepared.team_id} onClick={() => run(() => saveTeamOfWeekSelection(prepared), 'Equipo de la Jornada actualizado')}>Guardar selección</button>
      </div>
      <div className="panel p-5">
        <h3 className="text-lg font-black">Selecciones guardadas</h3>
        <div className="mt-4 space-y-2">
          {(league.teamOfWeek || []).slice(0, 12).map((row) => (
            <div key={row.id} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
              <p className="font-bold">J{row.round} · {row.slot} · {league.playersById.get(row.player_id)?.name || 'Jugador'}</p>
              <p className="text-slate-400">{league.teamsById.get(row.team_id)?.name || 'Equipo'} {row.note ? `· ${row.note}` : ''}</p>
            </div>
          ))}
          {(league.teamOfWeek || []).length === 0 && <p className="text-sm text-slate-400">Aún no hay selección.</p>}
        </div>
      </div>
    </section>
  )
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
    <Select label="Estado" value={form.status} onChange={(status) => setForm({ ...form, status })} options={[{ id: 'scheduled', name: 'Programado' }, { id: 'in_progress', name: 'En vivo' }, { id: 'played', name: 'En revisión' }, { id: 'official', name: 'Resultado oficial' }, { id: 'problem', name: 'Problema' }]} />
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
  if (!match.id || !['played', 'official'].includes(match.status)) return ''
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
  const [historyForm, setHistoryForm] = useState(emptyChampionsHistory)
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

      <AdminGrid title="Publicar campeón Champions" list={(cup.history || []).map((item) => `${item.season_id} · ${league.teamsById.get(item.champion_team_id)?.name || 'Campeón'}`)}>
        <Field label="Temporada" value={historyForm.season_id} onChange={(season_id) => setHistoryForm({ ...historyForm, season_id })} />
        <Select label="Campeón" value={historyForm.champion_team_id} onChange={(champion_team_id) => setHistoryForm({ ...historyForm, champion_team_id })} options={qualifiedTeams.length ? qualifiedTeams : league.teams} />
        <Select label="Subcampeón" value={historyForm.runner_up_team_id} onChange={(runner_up_team_id) => setHistoryForm({ ...historyForm, runner_up_team_id })} options={qualifiedTeams.length ? qualifiedTeams : league.teams} />
        <Field label="Marcador final" value={historyForm.final_score} onChange={(final_score) => setHistoryForm({ ...historyForm, final_score })} />
        <Select label="MVP Final" value={historyForm.final_mvp_player_id} onChange={(final_mvp_player_id) => setHistoryForm({ ...historyForm, final_mvp_player_id })} options={league.players} />
        <Select label="Campeón goleador" value={historyForm.top_scorer_player_id} onChange={(top_scorer_player_id) => setHistoryForm({ ...historyForm, top_scorer_player_id })} options={league.players} />
        <Select label="Mejor portero" value={historyForm.best_goalkeeper_player_id} onChange={(best_goalkeeper_player_id) => setHistoryForm({ ...historyForm, best_goalkeeper_player_id })} options={league.players} />
        <button className="button" disabled={busy || !historyForm.champion_team_id} onClick={() => run(() => saveNovaChampionsHistory(historyForm), 'Campeón Champions publicado')}>Publicar campeón</button>
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
    <Select label="Categoría" value={form.category || 'noticia'} onChange={(category) => setForm({ ...form, category })} options={[{ id: 'noticia', name: 'Noticia' }, { id: 'previa', name: 'Previa' }, { id: 'cronica', name: 'Crónica' }, { id: 'fichaje', name: 'Fichaje' }, { id: 'sancion', name: 'Sanción' }, { id: 'comunicado', name: 'Comunicado' }]} />
    <label className="block text-sm font-bold">Cuerpo</label>
    <textarea className="input min-h-32" value={form.body || ''} onChange={(event) => setForm({ ...form, body: event.target.value })} />
    <FileField label="Portada" onChange={(coverFile) => setForm({ ...form, coverFile })} />
    <SaveButton busy={busy} onClick={() => run(() => saveNews(form))} />
  </AdminGrid>
}

function FinanceAdmin({ league, run, busy }) {
  const [form, setForm] = useState(emptyFinance)
  const rows = league.financeEntries || []
  const totalDebt = rows.filter((row) => row.status !== 'paid' && row.entry_type === 'charge').reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const paid = rows.filter((row) => row.status === 'paid').reduce((sum, row) => sum + Number(row.amount || 0), 0)

  return (
    <section className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminMetric label="Adeudos" value={`$${totalDebt}`} />
        <AdminMetric label="Pagado" value={`$${paid}`} />
        <AdminMetric label="Movimientos" value={rows.length} />
      </div>
      <AdminGrid title="Finanzas privadas" list={rows.slice(0, 12).map((row) => `${league.teamsById.get(row.team_id)?.name || 'Liga'} · ${row.concept} · $${row.amount} · ${row.status}`)}>
        <EntityPicker label="Editar movimiento" items={rows} getLabel={(row) => `${row.concept} · $${row.amount}`} onPick={(row) => setForm({ ...emptyFinance, ...row, due_date: row.due_date || '', paid_at: row.paid_at || '' })} />
        <Select label="Equipo" value={form.team_id || ''} onChange={(team_id) => setForm({ ...form, team_id })} options={league.teams} />
        <Select label="Tipo" value={form.entry_type} onChange={(entry_type) => setForm({ ...form, entry_type })} options={[{ id: 'charge', name: 'Cargo' }, { id: 'payment', name: 'Pago' }, { id: 'expense', name: 'Gasto' }]} />
        <Field label="Concepto" value={form.concept} onChange={(concept) => setForm({ ...form, concept })} />
        <Field label="Monto" value={form.amount} onChange={(amount) => setForm({ ...form, amount })} />
        <Select label="Estado" value={form.status} onChange={(status) => setForm({ ...form, status })} options={[{ id: 'pending', name: 'Pendiente' }, { id: 'paid', name: 'Pagado' }, { id: 'overdue', name: 'Vencido' }, { id: 'cancelled', name: 'Cancelado' }]} />
        <Field label="Fecha límite" type="date" value={form.due_date || ''} onChange={(due_date) => setForm({ ...form, due_date })} />
        <Field label="Fecha de pago" type="date" value={form.paid_at || ''} onChange={(paid_at) => setForm({ ...form, paid_at })} />
        <label className="block text-sm font-bold">Notas</label>
        <textarea className="input min-h-24" value={form.notes || ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        <ActionRow busy={busy} canDelete={Boolean(form.id)} onSave={() => run(() => saveFinanceEntry(form), 'Movimiento financiero guardado')} onDelete={() => run(() => deleteRecord('finance_entries', form.id), 'Movimiento eliminado')} />
      </AdminGrid>
    </section>
  )
}

function NovaMediaAdmin({ league, run, busy }) {
  const [notification, setNotification] = useState(emptyNotification)
  return (
    <section className="space-y-6">
      <NewsForm run={run} busy={busy} news={league.news} />
      <AdminGrid title="Enviar aviso" list={(league.notifications || []).slice(0, 10).map((item) => `${item.title} · ${item.audience}`)}>
        <Field label="Título" value={notification.title} onChange={(title) => setNotification({ ...notification, title })} />
        <label className="block text-sm font-bold">Mensaje</label>
        <textarea className="input min-h-28" value={notification.body} onChange={(event) => setNotification({ ...notification, body: event.target.value })} />
        <Select label="Tipo" value={notification.notification_type} onChange={(notification_type) => setNotification({ ...notification, notification_type })} options={[{ id: 'general', name: 'General' }, { id: 'schedule_change', name: 'Cambio de horario' }, { id: 'result', name: 'Resultado oficial' }, { id: 'sanction', name: 'Sanción' }, { id: 'payment', name: 'Pago' }, { id: 'champions', name: 'Champions Cup' }]} />
        <Select label="Audiencia" value={notification.audience} onChange={(audience) => setNotification({ ...notification, audience })} options={[{ id: 'public', name: 'Público' }, { id: 'teams', name: 'Equipos' }, { id: 'captains', name: 'Capitanes' }, { id: 'admins', name: 'Admins' }]} />
        <Select label="Equipo opcional" value={notification.team_id || ''} onChange={(team_id) => setNotification({ ...notification, team_id })} options={league.teams} />
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={notification.requires_ack} onChange={(event) => setNotification({ ...notification, requires_ack: event.target.checked })} /> Requiere confirmación de lectura</label>
        <button className="button" disabled={busy || !notification.title || !notification.body} onClick={() => run(() => saveNotification(notification), 'Aviso publicado')}>Publicar aviso</button>
      </AdminGrid>
    </section>
  )
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
