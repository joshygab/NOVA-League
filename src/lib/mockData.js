export const mockTeams = [
  { id: '1', division_id: 'd1', name: 'Atlético Norte', city: 'Monterrey', crest_url: '', founded: 2017, captain: 'Mateo Salas', category: 'Libre', season: '2026' },
  { id: '2', division_id: 'd1', name: 'Deportivo Azul', city: 'Guadalajara', crest_url: '', founded: 2019, captain: 'Luis Herrera', category: 'Libre', season: '2026' },
  { id: '3', division_id: 'd2', name: 'Real Central', city: 'CDMX', crest_url: '', founded: 2016, captain: 'Diego Cruz', category: 'Libre', season: '2026' },
  { id: '4', division_id: 'd2', name: 'Titanes FC', city: 'Querétaro', crest_url: '', founded: 2021, captain: 'Bruno Vega', category: 'Libre', season: '2026' },
]

// Configura aquí los cupos de ascenso/descenso para pruebas locales.
// En producción estos valores se editan desde Supabase/Admin.
export const mockDivisions = [
  { id: 'd1', name: 'Primera División', level: 1, promotion_slots: 0, relegation_slots: 1, championship_slots: 4 },
  { id: 'd2', name: 'Segunda División', level: 2, promotion_slots: 1, relegation_slots: 1, championship_slots: 2 },
  { id: 'd3', name: 'Tercera División', level: 3, promotion_slots: 1, relegation_slots: 0, championship_slots: 2 },
]

export const mockSeasonHistory = []

export const mockLeagueSettings = {
  id: 1,
  name: 'NOVA League',
  short_name: 'NOVA',
  tagline: 'Liga competitiva de fútbol',
  description: 'Divisiones, calendario, tabla, estadísticas y registro de jugadores en una plataforma conectada.',
  logo_url: '',
}

export const mockPlayers = [
  { id: '1', division_id: 'd1', team_id: '1', name: 'Mateo Salas', email: 'mateo@gmail.com', phone: '', birth_date: '2001-03-10', position: 'Delantero', number: 9, age: 25, photo_url: '', approval_status: 'approved' },
  { id: '2', division_id: 'd1', team_id: '2', name: 'Luis Herrera', email: 'luis@gmail.com', phone: '', birth_date: '1999-08-21', position: 'Medio', number: 10, age: 27, photo_url: '', approval_status: 'approved' },
  { id: '3', division_id: 'd2', team_id: '3', name: 'Diego Cruz', email: 'diego@gmail.com', phone: '', birth_date: '2002-01-15', position: 'Defensa', number: 4, age: 24, photo_url: '', approval_status: 'approved' },
  { id: '4', division_id: 'd2', team_id: '4', name: 'Bruno Vega', email: 'bruno@gmail.com', phone: '', birth_date: '1997-05-04', position: 'Portero', number: 1, age: 29, photo_url: '', approval_status: 'approved' },
  { id: '5', division_id: 'd1', team_id: '1', name: 'Carlos Méndez', email: 'carlos@gmail.com', phone: '555-0101', birth_date: '2004-09-12', position: 'Extremo', number: 11, age: 21, photo_url: '', approval_status: 'pending' },
]

export const mockMatches = [
  { id: '1', division_id: 'd1', round: 1, match_date: '2026-07-12T18:00:00', home_team_id: '1', away_team_id: '2', home_score: 3, away_score: 1, status: 'played', mvp_player_id: '1', observations: 'Partido intenso con dominio local.' },
  { id: '2', division_id: 'd2', round: 1, match_date: '2026-07-12T20:00:00', home_team_id: '3', away_team_id: '4', home_score: 2, away_score: 2, status: 'played', mvp_player_id: '3', observations: '' },
]

export const mockEvents = [
  { id: '4', division_id: 'd1', match_id: '1', player_id: '2', team_id: '2', type: 'assist', minute: 71 },
]

export const mockGoals = [
  { id: '1', division_id: 'd1', match_id: '1', player_id: '1', team_id: '1', minute: 12, goal_type: 'open_play', assist_player_id: '2' },
  { id: '2', division_id: 'd1', match_id: '1', player_id: '1', team_id: '1', minute: 64, goal_type: 'penalty', assist_player_id: null },
  { id: '3', division_id: 'd1', match_id: '1', player_id: '2', team_id: '2', minute: 71, goal_type: 'free_kick', assist_player_id: null },
  { id: '4', division_id: 'd1', match_id: '1', player_id: '1', team_id: '1', minute: 88, goal_type: 'header', assist_player_id: null },
]

export const mockCards = [
  { id: '1', division_id: 'd2', match_id: '2', player_id: '3', team_id: '3', type: 'yellow', minute: 39, reason: 'Entrada imprudente' },
  { id: '2', division_id: 'd1', match_id: '1', player_id: '2', team_id: '2', type: 'double_yellow', minute: 83, reason: 'Reiteración de faltas' },
]

export const mockSanctions = [
  {
    id: '1',
    division_id: 'd1',
    player_id: '2',
    team_id: null,
    sanction_type: 'Suspensión disciplinaria',
    reason: 'Doble amarilla',
    suspended_matches: 1,
    start_date: '2026-07-13',
    status: 'active',
    notes: 'Pendiente de cumplir en jornada 2',
  },
]

export const mockPlayoffMatches = [
  { id: 'p1', division_id: 'd1', stage: 'semifinal', slot: 1, home_team_id: '1', away_team_id: '2', home_score: null, away_score: null, home_penalties: null, away_penalties: null, winner_team_id: null, status: 'pending', match_date: null, venue: 'Cancha Central', mvp_player_id: null },
]

export const mockNews = [
  {
    id: '1',
    title: 'La liga abre temporada con marcador encendido',
    excerpt: 'La primera jornada dejó goles, intensidad y una tabla general que ya empieza a moverse.',
    cover_url: '',
    published_at: '2026-07-13T09:30:00',
  },
]

export const mockGallery = [
  { id: '1', title: 'Final de jornada', image_url: '', created_at: '2026-07-13T12:00:00' },
]
