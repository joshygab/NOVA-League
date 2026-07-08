import { supabase, hasSupabaseConfig } from './supabase'
import { mockCards, mockEvents, mockGallery, mockGoals, mockMatches, mockNews, mockPlayers, mockPlayoffMatches, mockSanctions, mockTeams } from './mockData'

const tables = ['teams', 'players', 'matches', 'goals', 'match_events', 'match_cards', 'sanctions', 'playoff_matches', 'news', 'gallery']

export async function fetchLeagueData() {
  if (!hasSupabaseConfig) {
    return {
      teams: mockTeams,
      players: mockPlayers,
      matches: mockMatches,
      goals: mockGoals,
      events: mockEvents,
      cards: mockCards,
      sanctions: mockSanctions,
      playoffMatches: mockPlayoffMatches,
      news: mockNews,
      gallery: mockGallery,
    }
  }

  const [teams, players, matches, goals, events, cards, sanctions, playoffMatches, news, gallery] = await Promise.all([
    supabase.from('teams').select('*').order('name'),
    supabase.from('players').select('*').order('name'),
    supabase.from('matches').select('*').order('match_date'),
    supabase.from('goals').select('*').order('minute'),
    supabase.from('match_events').select('*').order('minute'),
    supabase.from('match_cards').select('*').order('minute'),
    supabase.from('sanctions').select('*').order('start_date', { ascending: false }),
    supabase.from('playoff_matches').select('*').order('slot'),
    supabase.from('news').select('*').order('published_at', { ascending: false }),
    supabase.from('gallery').select('*').order('created_at', { ascending: false }),
  ])

  const error = [teams, players, matches, goals, events, cards, sanctions, playoffMatches, news, gallery].find((result) => result.error)?.error
  if (error) throw error

  return {
    teams: teams.data ?? [],
    players: players.data ?? [],
    matches: matches.data ?? [],
    goals: goals.data ?? [],
    events: events.data ?? [],
    cards: cards.data ?? [],
    sanctions: sanctions.data ?? [],
    playoffMatches: playoffMatches.data ?? [],
    news: news.data ?? [],
    gallery: gallery.data ?? [],
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
