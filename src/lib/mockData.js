export const mockTeams = [
  { id: '1', name: 'Atlético Norte', city: 'Monterrey', crest_url: '', founded: 2017, captain: 'Mateo Salas', category: 'Libre', season: '2026' },
  { id: '2', name: 'Deportivo Azul', city: 'Guadalajara', crest_url: '', founded: 2019, captain: 'Luis Herrera', category: 'Libre', season: '2026' },
  { id: '3', name: 'Real Central', city: 'CDMX', crest_url: '', founded: 2016, captain: 'Diego Cruz', category: 'Libre', season: '2026' },
  { id: '4', name: 'Titanes FC', city: 'Querétaro', crest_url: '', founded: 2021, captain: 'Bruno Vega', category: 'Libre', season: '2026' },
]

export const mockLeagueSettings = {
  id: 1,
  name: 'Liga Pro Futbol',
  short_name: 'LP',
  tagline: 'Fútbol competitivo',
  description: 'Resultados, tabla, estadísticas, noticias y administración profesional para una liga moderna.',
  logo_url: '',
}

export const mockPlayers = [
  { id: '1', team_id: '1', name: 'Mateo Salas', position: 'Delantero', number: 9, age: 25, photo_url: '' },
  { id: '2', team_id: '2', name: 'Luis Herrera', position: 'Medio', number: 10, age: 27, photo_url: '' },
  { id: '3', team_id: '3', name: 'Diego Cruz', position: 'Defensa', number: 4, age: 24, photo_url: '' },
  { id: '4', team_id: '4', name: 'Bruno Vega', position: 'Portero', number: 1, age: 29, photo_url: '' },
]

export const mockMatches = [
  { id: '1', round: 1, match_date: '2026-07-12T18:00:00', home_team_id: '1', away_team_id: '2', home_score: 3, away_score: 1, status: 'played', mvp_player_id: '1', observations: 'Partido intenso con dominio local.' },
  { id: '2', round: 1, match_date: '2026-07-12T20:00:00', home_team_id: '3', away_team_id: '4', home_score: 2, away_score: 2, status: 'played', mvp_player_id: '3', observations: '' },
  { id: '3', round: 2, match_date: '2026-07-19T18:00:00', home_team_id: '1', away_team_id: '3', home_score: null, away_score: null, status: 'scheduled' },
  { id: '4', round: 2, match_date: '2026-07-19T20:00:00', home_team_id: '2', away_team_id: '4', home_score: null, away_score: null, status: 'scheduled' },
]

export const mockEvents = [
  { id: '4', match_id: '1', player_id: '2', team_id: '2', type: 'assist', minute: 71 },
]

export const mockGoals = [
  { id: '1', match_id: '1', player_id: '1', team_id: '1', minute: 12, goal_type: 'open_play', assist_player_id: '2' },
  { id: '2', match_id: '1', player_id: '1', team_id: '1', minute: 64, goal_type: 'penalty', assist_player_id: null },
  { id: '3', match_id: '1', player_id: '2', team_id: '2', minute: 71, goal_type: 'free_kick', assist_player_id: null },
  { id: '4', match_id: '1', player_id: '3', team_id: '1', minute: 88, goal_type: 'header', assist_player_id: '1' },
]

export const mockCards = [
  { id: '1', match_id: '2', player_id: '3', team_id: '3', type: 'yellow', minute: 39, reason: 'Entrada imprudente' },
  { id: '2', match_id: '1', player_id: '2', team_id: '2', type: 'double_yellow', minute: 83, reason: 'Reiteración de faltas' },
]

export const mockSanctions = [
  {
    id: '1',
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
  { id: 'p1', stage: 'semifinal', slot: 1, home_team_id: '1', away_team_id: '4', home_score: null, away_score: null, home_penalties: null, away_penalties: null, winner_team_id: null, status: 'pending', match_date: null, venue: 'Cancha Central', mvp_player_id: null },
  { id: 'p2', stage: 'semifinal', slot: 2, home_team_id: '2', away_team_id: '3', home_score: null, away_score: null, home_penalties: null, away_penalties: null, winner_team_id: null, status: 'pending', match_date: null, venue: 'Cancha Central', mvp_player_id: null },
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
