import { supabase, hasSupabaseConfig } from './supabase'
import { mockCards, mockChampionHistory, mockChampionSpotlight, mockDivisions, mockEvents, mockGallery, mockGoals, mockLeagueSettings, mockMatches, mockNews, mockNovaChampionsHistory, mockNovaChampionsMatches, mockNovaChampionsQualifiedTeams, mockNovaChampionsSettings, mockNovaChampionsStats, mockPlayers, mockPlayoffMatches, mockPlayoffSettings, mockSanctions, mockSeasonHistory, mockTeams } from './mockData'

const tables = ['league_settings', 'divisions', 'season_history', 'teams', 'players', 'matches', 'goals', 'match_events', 'match_cards', 'match_lineups', 'match_reports', 'match_roster', 'sanctions', 'playoff_matches', 'playoff_settings', 'news', 'gallery', 'user_profiles', 'nova_champions_settings', 'nova_champions_qualified_teams', 'nova_champions_matches', 'nova_champions_stats', 'nova_champions_champions_history', 'champion_spotlight', 'champion_history']

export async function fetchLeagueData() {
  if (!hasSupabaseConfig) {
    return {
      teams: mockTeams,
      divisions: mockDivisions,
      seasonHistory: mockSeasonHistory,
      players: mockPlayers,
      matches: mockMatches,
      goals: mockGoals,
      events: mockEvents,
      cards: mockCards,
      lineups: [],
      reports: [],
      matchRoster: [],
      sanctions: mockSanctions,
      playoffMatches: mockPlayoffMatches,
      playoffSettings: mockPlayoffSettings,
      news: mockNews,
      gallery: mockGallery,
      novaChampions: {
        settings: mockNovaChampionsSettings,
        qualifiedTeams: mockNovaChampionsQualifiedTeams,
        matches: mockNovaChampionsMatches,
        stats: mockNovaChampionsStats,
        history: mockNovaChampionsHistory,
      },
      championSpotlight: mockChampionSpotlight,
      championHistory: mockChampionHistory,
      settings: mockLeagueSettings,
    }
  }

  const [settings, divisions, seasonHistory, teams, players, matches, goals, events, cards, lineups, reports, matchRoster, sanctions, playoffMatches, playoffSettings, news, gallery, championsSettings, championsQualifiedTeams, championsMatches, championsStats, championsHistory, championSpotlight, championHistory] = await Promise.all([
    supabase.from('league_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('divisions').select('*').order('level'),
    supabase.from('season_history').select('*').order('created_at', { ascending: false }),
    supabase.from('teams').select('*').order('name'),
    supabase.from('players').select('*').order('name'),
    supabase.from('matches').select('*').order('match_date'),
    supabase.from('goals').select('*').order('minute'),
    supabase.from('match_events').select('*').order('minute'),
    supabase.from('match_cards').select('*').order('minute'),
    supabase.from('match_lineups').select('*').order('created_at'),
    supabase.from('match_reports').select('*').order('created_at', { ascending: false }),
    supabase.from('match_roster').select('*').order('confirmed_at', { ascending: false }),
    supabase.from('sanctions').select('*').order('start_date', { ascending: false }),
    supabase.from('playoff_matches').select('*').order('slot'),
    supabase.from('playoff_settings').select('*'),
    supabase.from('news').select('*').order('published_at', { ascending: false }),
    supabase.from('gallery').select('*').order('created_at', { ascending: false }),
    supabase.from('nova_champions_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('nova_champions_qualified_teams').select('*').order('created_at'),
    supabase.from('nova_champions_matches').select('*').order('round').order('match_order'),
    supabase.from('nova_champions_stats').select('*').order('minute'),
    supabase.from('nova_champions_champions_history').select('*').order('created_at', { ascending: false }),
    supabase.from('champion_spotlight').select('*').eq('id', 1).maybeSingle(),
    supabase.from('champion_history').select('*').order('created_at', { ascending: false }),
  ])

  const error = [settings, divisions, seasonHistory, teams, players, matches, goals, events, cards, lineups, reports, matchRoster, sanctions, playoffMatches, playoffSettings, news, gallery, championsSettings, championsQualifiedTeams, championsMatches, championsStats, championsHistory, championSpotlight, championHistory].find((result) => result.error)?.error
  if (error) throw error

  return {
    teams: teams.data ?? [],
    divisions: divisions.data ?? [],
    seasonHistory: seasonHistory.data ?? [],
    players: players.data ?? [],
    matches: matches.data ?? [],
    goals: goals.data ?? [],
    events: events.data ?? [],
    cards: cards.data ?? [],
    lineups: lineups.data ?? [],
    reports: reports.data ?? [],
    matchRoster: matchRoster.data ?? [],
    sanctions: sanctions.data ?? [],
    playoffMatches: playoffMatches.data ?? [],
    playoffSettings: playoffSettings.data ?? [],
    news: news.data ?? [],
    gallery: gallery.data ?? [],
    novaChampions: {
      settings: championsSettings.data ?? mockNovaChampionsSettings,
      qualifiedTeams: championsQualifiedTeams.data ?? [],
      matches: championsMatches.data ?? [],
      stats: championsStats.data ?? [],
      history: championsHistory.data ?? [],
    },
    championSpotlight: championSpotlight.data ?? mockChampionSpotlight,
    championHistory: championHistory.data ?? [],
    settings: settings.data ?? mockLeagueSettings,
  }
}

export function subscribeToLeagueChanges(onChange) {
  if (!hasSupabaseConfig) return () => {}

  const channel = supabase.channel('league-public-realtime')
  tables.forEach((table) => {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
  })
  channel.subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function uploadPublicFile(bucket, path, file) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
